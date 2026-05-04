/**
 * File Manager module - File operations for Web version
 * Uses TabManager for multi-tab state tracking
 */
var FileManager = (() => {
  var RECENT_KEY = 'easymarkdown_recent';
  var MAX_RECENT = 10;

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

    // File input handler
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

  function openFileDialog() {
    var fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.click();
  }

  function save() {
    var tab = TabManager.getCurrentTab();
    if (!tab) return;
    var content = Editor.getValue();
    var filename = tab.fileName || 'untitled.md';
    Utils.downloadFile(content, filename, 'text/markdown;charset=utf-8');
    TabManager.setActiveDirty(false);
    addToRecent(filename, '');
    TabManager.saveSession();
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
    // Check if already open in a tab
    var existing = TabManager.getAllTabs().find(function(t) { return t.fileName === file.name; });
    if (existing) {
      TabManager.switchTab(existing.id);
      return;
    }
    // Desktop mode: open by path
    if (window.electronAPI && file.path) {
      window.electronAPI.openRecentFile(file.path);
      return;
    }
    // Web mode: no file path available, open dialog
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
