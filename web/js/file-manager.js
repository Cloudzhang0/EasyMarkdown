/**
 * File Manager module - File operations for Web version
 * Uses TabManager for multi-tab state tracking
 * Caches file content in localStorage for recent file reopening
 */
var FileManager = (() => {
  var RECENT_KEY = 'easymarkdown_recent';
  var FILE_CACHE_KEY = 'easymarkdown_file_cache';
  var MAX_RECENT = 10;
  var MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB max per file

  // In-memory file handle cache (session only, for FS Access API)
  var fileHandles = {};

  function init() {
    // Auto-save to localStorage on change
    var autoSave = Utils.debounce(function() {
      try {
        TabManager.saveSession();
        TabManager.setActiveDirty(false);
      } catch(e) {}
    }, 2000);

    // Register auto-save trigger on CodeMirror
    var cm = Editor.getCM();
    if (cm) {
      cm.on('change', function() {
        TabManager.setActiveDirty(true);
        TabManager.updateCurrentContent();
        autoSave();
      });
    }

    // Update recent files menu
    try { updateRecentFilesMenu(); } catch(e) {}

    // File input handler (fallback for browsers without FS Access API)
    var fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
          openFile(file).then(function() { fileInput.value = ''; });
        }
      });
    }
  }

  // File content cache operations
  function getFileCache() {
    try { return JSON.parse(localStorage.getItem(FILE_CACHE_KEY)) || {}; }
    catch(e) { return {}; }
  }

  function saveFileToCache(fileName, content) {
    if (!fileName || !content) return;
    if (content.length > MAX_CACHE_SIZE) return; // Skip very large files
    try {
      var cache = getFileCache();
      cache[fileName] = content;
      localStorage.setItem(FILE_CACHE_KEY, JSON.stringify(cache));
    } catch(e) {
      // localStorage might be full - clear old cache entries
      try {
        var cache = getFileCache();
        var keys = Object.keys(cache);
        if (keys.length > 5) {
          // Remove oldest entries
          keys.slice(0, keys.length - 3).forEach(function(k) { delete cache[k]; });
          cache[fileName] = content;
          localStorage.setItem(FILE_CACHE_KEY, JSON.stringify(cache));
        }
      } catch(e2) {}
    }
  }

  function getFileFromCache(fileName) {
    var cache = getFileCache();
    return cache[fileName] || null;
  }

  function hasFSAccessAPI() {
    return 'showOpenFilePicker' in window;
  }

  function openFile(file) {
    return Utils.readFileAsText(file).then(function(content) {
      // Check if already open
      var existing = TabManager.getAllTabs().find(function(t) { return t.fileName === file.name; });
      if (existing) {
        TabManager.switchTab(existing.id);
      } else {
        var tab = TabManager.createTab(file.name, content);
        // If there's only one tab and it's untitled/empty, close it
        var allTabs = TabManager.getAllTabs();
        if (allTabs.length > 1) {
          var first = allTabs[0];
          if (!first.fileName && !first.content && !first.isDirty) {
            TabManager.closeTab(first.id);
          }
        }
      }
      // Cache file content for recent file reopening
      saveFileToCache(file.name, content);
      addToRecent(file.name, '');
      TabManager.setActiveDirty(false);
    }).catch(function(err) {
      console.error('Failed to open file:', err);
    });
  }

  function newFile() {
    TabManager.createTab('', '');
    Editor.focus();
  }

  async function openFileDialog() {
    // Desktop mode: use native Electron dialog (must check before FS Access API,
    // because Electron's Chrome also supports showOpenFilePicker)
    if (window.electronAPI && window.electronAPI.openFileDialog) {
      window.electronAPI.openFileDialog();
      return;
    }
    if (hasFSAccessAPI()) {
      try {
        var handles = await window.showOpenFilePicker({
          types: [{
            description: 'Markdown Files',
            accept: { 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.txt'] }
          }],
          multiple: false
        });
        var handle = handles[0];
        var file = await handle.getFile();
        var content = await Utils.readFileAsText(file);

        // Store handle for save operations
        fileHandles[file.name] = handle;

        // Open in tab
        var existing = TabManager.getAllTabs().find(function(t) { return t.fileName === file.name; });
        if (existing) {
          TabManager.switchTab(existing.id);
        } else {
          var tab = TabManager.createTab(file.name, content);
          var allTabs = TabManager.getAllTabs();
          if (allTabs.length > 1) {
            var first = allTabs[0];
            if (!first.fileName && !first.content && !first.isDirty) {
              TabManager.closeTab(first.id);
            }
          }
        }
        // Cache file content for recent file reopening
        saveFileToCache(file.name, content);
        addToRecent(file.name, '');
        TabManager.setActiveDirty(false);
      } catch(e) {
        if (e.name !== 'AbortError') {
          console.error('File picker error:', e);
        }
      }
    } else {
      // Fallback: use legacy file input
      var fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.click();
    }
  }

  // Save file using stored handle (FS Access API)
  async function saveWithHandle() {
    var tab = TabManager.getCurrentTab();
    if (!tab || !tab.fileName) return false;

    var handle = fileHandles[tab.fileName];
    if (!handle) return false;

    try {
      if (await handle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
        if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
          return false;
        }
      }
      var writable = await handle.createWritable();
      await writable.write(Editor.getValue());
      await writable.close();
      TabManager.setActiveDirty(false);
      addToRecent(tab.fileName, '');
      TabManager.saveSession();
      return true;
    } catch(e) {
      console.error('Save with handle failed:', e);
      return false;
    }
  }

  function save() {
    // Try save with stored handle first (direct write to file)
    saveWithHandle().then(function(success) {
      if (success) return;
      // Fallback: download
      var tab = TabManager.getCurrentTab();
      if (!tab) return;
      var content = Editor.getValue();
      var filename = tab.fileName || 'untitled.md';
      Utils.downloadFile(content, filename, 'text/markdown;charset=utf-8');
      TabManager.setActiveDirty(false);
      addToRecent(filename, '');
      TabManager.saveSession();
    });
  }

  function saveAs() {
    var tab = TabManager.getCurrentTab();
    if (!tab) return;
    var content = Editor.getValue();
    var filename = tab.fileName || 'untitled.md';
    var newName = prompt(I18n.t('dialog.confirm') + ':', filename);
    if (newName) {
      Utils.downloadFile(content, newName, 'text/markdown;charset=utf-8');
      TabManager.renameTab(tab.id, newName);
      TabManager.setActiveDirty(false);
      addToRecent(newName, '');
    }
  }

  function exportHTML() {
    var tab = TabManager.getCurrentTab();
    var html = Preview.getExportHTML();
    var filename = (tab && tab.fileName ? Utils.getFileNameWithoutExt(tab.fileName) : 'untitled') + '.html';
    Utils.downloadFile(html, filename, 'text/html;charset=utf-8');
  }

  function exportPDF() { window.print(); }
  function printDoc() { window.print(); }

  function closeFile() {
    var tab = TabManager.getCurrentTab();
    if (tab) TabManager.closeTab(tab.id);
  }

  function closeAll() {
    TabManager.closeAll();
  }

  function getFileName() {
    var tab = TabManager.getCurrentTab();
    return tab ? tab.fileName : '';
  }

  function isDocumentDirty() {
    var tab = TabManager.getCurrentTab();
    return tab ? tab.isDirty : false;
  }

  function addToRecent(name, path) {
    var recent = getRecentFiles();
    recent = recent.filter(function(f) { return f.name !== name; });
    recent.unshift({ name: name, path: path, timestamp: Date.now() });
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    updateRecentFilesMenu();
  }

  function getRecentFiles() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch(e) { return []; }
  }

  function updateRecentFilesMenu() {
    try { Menu.updateRecentFiles(getRecentFiles()); } catch(e) {}
  }

  function openRecentFile(file) {
    // 1. Check if already open in a tab
    var existing = TabManager.getAllTabs().find(function(t) { return t.fileName === file.name; });
    if (existing) {
      TabManager.switchTab(existing.id);
      return;
    }

    // 2. Desktop mode: open by path
    if (window.electronAPI && file.path) {
      window.electronAPI.openRecentFile(file.path);
      return;
    }

    // 3. Web mode: try cached content
    var cached = getFileFromCache(file.name);
    if (cached) {
      var tab = TabManager.createTab(file.name, cached);
      var allTabs = TabManager.getAllTabs();
      if (allTabs.length > 1) {
        var first = allTabs[0];
        if (!first.fileName && !first.content && !first.isDirty) {
          TabManager.closeTab(first.id);
        }
      }
      TabManager.setActiveDirty(false);
      return;
    }

    // 4. Fallback: open file dialog
    openFileDialog();
  }

  return {
    init: init, newFile: newFile, openFileDialog: openFileDialog,
    openFile: openFile, save: save, saveAs: saveAs,
    exportHTML: exportHTML, exportPDF: exportPDF, printDoc: printDoc,
    closeFile: closeFile, closeAll: closeAll,
    getFileName: getFileName, isDocumentDirty: isDocumentDirty,
    getRecentFiles: getRecentFiles, openRecentFile: openRecentFile
  };
})();
