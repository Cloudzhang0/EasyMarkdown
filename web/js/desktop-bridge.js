/**
 * Desktop Bridge - Connects web app with Electron native APIs
 * Only active when running in Electron (window.electronAPI exists)
 */
var DesktopBridge = (() => {
  var isElectron = false;
  var currentFilePath = null;
  var currentDirPath = null;
  var contextMenu = null;

  function init() {
    if (!window.electronAPI) return;
    isElectron = true;

    // Show exit button in File menu
    var exitBtn = document.getElementById('menuExitBtn');
    if (exitBtn) exitBtn.style.display = '';

    // Override FileManager methods for native file operations
    overrideFileManager();

    // Listen for events from main process
    window.electronAPI.onFileOpened(function(data) {
      // Open in new tab
      var existing = TabManager.getAllTabs().find(function(t) { return t.filePath === data.path; });
      if (existing) {
        TabManager.switchTab(existing.id);
      } else {
        // Check if a tab with the same fileName exists (e.g. from session restore without filePath)
        var sameName = TabManager.getAllTabs().find(function(t) { return t.fileName === data.name && !t.filePath; });
        if (sameName) {
          // Update existing tab with filePath and content
          sameName.filePath = data.path;
          sameName.content = data.content;
          TabManager.switchTab(sameName.id);
          // Update editor content
          try { Editor.setValue(data.content); } catch(e) {}
        } else {
          TabManager.createTab(data.name, data.content, data.path);
        }
      }
      currentFilePath = data.path;
      currentDirPath = data.path.replace(/[/\\][^/\\]+$/, '');
      TabManager.setActiveDirty(false);
    });

    // NOTE: We do NOT override TabManager.switchTab/createTab/render here because
    // those IIFE-internal functions use local variable references, bypassing any
    // overrides on the exported TabManager object.  Instead, nativeSave() reads
    // filePath directly from the current tab at save time.

    window.electronAPI.onFolderOpened(function(data) {
      showFolderTree(data.path, data.tree);
    });

    window.electronAPI.onMenuAction(function(action) {
      App.exec(action);
    });

    window.electronAPI.onRequestSave(function() {
      nativeSave();
    });

    window.electronAPI.onRequestSaveAs(function() {
      nativeSaveAs();
    });

    // Load recent files from Electron
    loadRecentFiles();

    // Initialize context menu
    initContextMenu();
  }

  function overrideFileManager() {
    FileManager.save = nativeSave;
    FileManager.saveAs = nativeSaveAs;
    FileManager.openFileDialog = function() { return window.electronAPI.openFileDialog(); };
    FileManager.openRecentFile = function(file) { return window.electronAPI.openRecentFile(file.path); };
  }

  async function nativeSave() {
    var content = Editor.getValue();
    // Read filePath DIRECTLY from the current tab — this is the authoritative
    // source and avoids stale-tracking bugs when tabs are created/switched
    // via DOM event handlers that bypass TabManager-exported methods.
    var tab = TabManager.getCurrentTab();
    var filePath = tab && tab.filePath ? tab.filePath : null;
    var result = await window.electronAPI.saveFile(content, filePath);
    if (result.success) {
      currentFilePath = result.path;
      currentDirPath = result.path.replace(/[/\\][^/\\]+$/, '');
      TabManager.setActiveDirty(false);
      TabManager.renameTab(TabManager.getActiveTabId(), result.name, result.path);
    }
  }

  async function nativeSaveAs() {
    var content = Editor.getValue();
    var result = await window.electronAPI.saveFileAs(content);
    if (result.success) {
      currentFilePath = result.path;
      currentDirPath = result.path.replace(/[/\\][^/\\]+$/, '');
      TabManager.setActiveDirty(false);
      TabManager.renameTab(TabManager.getActiveTabId(), result.name, result.path);
    }
  }

  async function loadRecentFiles() {
    var files = await window.electronAPI.getRecentFiles();
    Menu.updateRecentFiles(files);
  }

  function showFolderTree(folderPath, tree) {
    currentDirPath = folderPath;
    var sidebar = document.getElementById('folderSidebar');

    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'folderSidebar';
      sidebar.className = 'folder-sidebar';

      var mainContent = document.getElementById('mainContent');
      mainContent.parentNode.insertBefore(sidebar, mainContent);

      var style = document.createElement('style');
      style.textContent =
        '.folder-sidebar { width: 240px; min-width: 200px; background: var(--bg-secondary); border-right: 1px solid var(--border-color); overflow-y: auto; flex-shrink: 0; display: none; }' +
        '.folder-sidebar.visible { display: block; }' +
        '.folder-sidebar-header { padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); text-transform: uppercase; letter-spacing: 0.5px; }' +
        '.tree-item { display: flex; align-items: center; padding: 4px 12px; cursor: pointer; font-size: 13px; color: var(--text-primary); transition: background 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.tree-item:hover { background: var(--bg-hover); }' +
        '.tree-item.active { background: var(--accent-bg); color: var(--accent); }' +
        '.tree-item .icon { margin-right: 6px; font-size: 14px; flex-shrink: 0; }' +
        '.tree-item.directory .icon { color: var(--warning); }' +
        '.tree-item.file .icon { color: var(--accent); }' +
        '.tree-children { padding-left: 16px; }' +
        '.tree-children.collapsed { display: none; }';
      document.head.appendChild(style);
    }

    sidebar.innerHTML = '<div class="folder-sidebar-header">' + folderPath.split(/[/\\]/).pop() + '</div>';
    sidebar.classList.add('visible');

    function renderTree(items, container) {
      items.forEach(function(item) {
        var el = document.createElement('div');
        el.className = 'tree-item ' + item.type;

        if (item.type === 'directory') {
          el.innerHTML = '<span class="icon">&#128193;</span>' + item.name;
          var children = document.createElement('div');
          children.className = 'tree-children';
          renderTree(item.children || [], children);
          el.addEventListener('click', function() {
            children.classList.toggle('collapsed');
          });
          // Right-click context menu for directories
          el.addEventListener('contextmenu', function(e) {
            showContextMenu(e, item.path, 'directory');
          });
          container.appendChild(el);
          container.appendChild(children);
        } else {
          el.innerHTML = '<span class="icon">&#128196;</span>' + item.name;
          el.addEventListener('click', async function() {
            await window.electronAPI.openFileByPath(item.path);
            container.querySelectorAll('.tree-item.active').forEach(function(e) { e.classList.remove('active'); });
            el.classList.add('active');
          });
          // Right-click context menu for files
          el.addEventListener('contextmenu', function(e) {
            showContextMenu(e, item.path, 'file');
          });
          container.appendChild(el);
        }
      });
    }

    renderTree(tree, sidebar);
  }

  function initContextMenu() {
    // Create context menu element
    contextMenu = document.createElement('div');
    contextMenu.id = 'folderContextMenu';
    contextMenu.className = 'context-menu';
    document.body.appendChild(contextMenu);

    // Add styles
    var style = document.createElement('style');
    style.textContent =
      '.context-menu { position: fixed; background: var(--bg-primary, #fff); border: 1px solid var(--border-color, #e0e0e0); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 4px 0; z-index: 10000; min-width: 200px; max-height: 80vh; overflow-y: auto; display: none; }' +
      '.context-menu-item { display: flex; align-items: center; padding: 8px 16px; cursor: pointer; font-size: 13px; color: var(--text-primary, #333); transition: background 0.15s; }' +
      '.context-menu-item:hover { background: var(--bg-hover, #f5f5f5); }' +
      '.context-menu-item.disabled { color: var(--text-secondary, #999); cursor: default; opacity: 0.5; }' +
      '.context-menu-item.disabled:hover { background: transparent; }' +
      '.context-menu-item .icon { margin-right: 10px; font-size: 14px; width: 18px; text-align: center; }' +
      '.context-menu-item .shortcut { margin-left: auto; font-size: 11px; color: var(--text-secondary, #999); }' +
      '.context-menu-separator { height: 1px; background: var(--border-color, #e0e0e0); margin: 4px 0; }' +
      '.context-menu-item.danger { color: #e74c3c; }' +
      '.context-menu-item.danger:hover { background: #fdf2f2; }';
    document.head.appendChild(style);

    // Close menu when clicking outside
    document.addEventListener('click', function() {
      contextMenu.style.display = 'none';
    });

    // Close menu when pressing Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        contextMenu.style.display = 'none';
      }
    });

    // Initialize editor context menu
    initEditorContextMenu();
  }

  function initEditorContextMenu() {
    // Bind context menu to CodeMirror when ready
    function bindContextMenu() {
      var editorElement = document.querySelector('.CodeMirror');
      if (editorElement && !editorElement._contextMenuBound) {
        editorElement._contextMenuBound = true;
        editorElement.addEventListener('contextmenu', function(e) {
          showEditorContextMenu(e);
        });
        return true;
      }
      return false;
    }

    // Try immediately, then retry with intervals
    if (!bindContextMenu()) {
      var retryCount = 0;
      var retryTimer = setInterval(function() {
        retryCount++;
        if (bindContextMenu() || retryCount > 20) {
          clearInterval(retryTimer);
        }
      }, 200);
    }
  }

  function showContextMenu(e, itemPath, itemType) {
    e.preventDefault();
    e.stopPropagation();

    var items = [];

    if (itemType === 'directory') {
      items = [
        { icon: '📄', label: '新建文件', shortcut: '', action: function() { createNewFile(itemPath); } },
        { icon: '📁', label: '新建文件夹', shortcut: '', action: function() { createNewFolder(itemPath); } },
        { type: 'separator' },
        { icon: '📋', label: '复制路径', shortcut: 'Ctrl+C', action: function() { copyItemPath(itemPath); } },
        { icon: '📂', label: '在资源管理器中打开', shortcut: '', action: function() { openInExplorer(itemPath); } },
        { type: 'separator' },
        { icon: '🔄', label: '刷新', shortcut: 'F5', action: function() { refreshTree(itemPath); } },
        { type: 'separator' },
        { icon: '✏️', label: '重命名', shortcut: 'F2', action: function() { renameItem(itemPath, itemType); } },
        { icon: '🗑️', label: '删除', shortcut: 'Delete', action: function() { deleteItem(itemPath, itemType); }, danger: true }
      ];
    } else {
      items = [
        { icon: '📄', label: '打开', shortcut: '', action: function() { window.electronAPI.openFileByPath(itemPath); } },
        { type: 'separator' },
        { icon: '📋', label: '复制路径', shortcut: 'Ctrl+C', action: function() { copyItemPath(itemPath); } },
        { icon: '📂', label: '在资源管理器中打开', shortcut: '', action: function() { openInExplorer(itemPath); } },
        { type: 'separator' },
        { icon: '✏️', label: '重命名', shortcut: 'F2', action: function() { renameItem(itemPath, itemType); } },
        { icon: '🗑️', label: '删除', shortcut: 'Delete', action: function() { deleteItem(itemPath, itemType); }, danger: true }
      ];
    }

    buildAndShowMenu(e, items);
  }

  function showEditorContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    var cm = Editor.getCM();
    if (!cm) return;

    var hasSelection = cm.getSelection().length > 0;
    var canPaste = true; // We'll assume paste is always available

    var items = [
      { icon: '✂️', label: '剪切', shortcut: 'Ctrl+X', action: function() { document.execCommand('cut'); }, enabled: hasSelection },
      { icon: '📋', label: '复制', shortcut: 'Ctrl+C', action: function() { document.execCommand('copy'); }, enabled: hasSelection },
      { icon: '📌', label: '粘贴', shortcut: 'Ctrl+V', action: function() { document.execCommand('paste'); }, enabled: canPaste },
      { type: 'separator' },
      { icon: '🔘', label: '全选', shortcut: 'Ctrl+A', action: function() { Editor.selectAll(); } },
      { type: 'separator' },
      { icon: '↩️', label: '撤销', shortcut: 'Ctrl+Z', action: function() { Editor.undo(); } },
      { icon: '↪️', label: '重做', shortcut: 'Ctrl+Y', action: function() { Editor.redo(); } },
      { type: 'separator' },
      { icon: '🔤', label: '转为大写', shortcut: '', action: function() { convertCase('upper'); } },
      { icon: '🔡', label: '转为小写', shortcut: '', action: function() { convertCase('lower'); } },
      { type: 'separator' },
      { icon: '🔍', label: '搜索选中文本', shortcut: '', action: function() { searchSelectedText(); }, enabled: hasSelection },
      { icon: '📅', label: '插入时间戳', shortcut: '', action: function() { insertTimestamp(); } },
      { icon: '➖', label: '插入分割线', shortcut: '', action: function() { insertDivider(); } },
      { type: 'separator' },
      { icon: '🔊', label: '语音输入', shortcut: '', action: function() { startVoiceInput(); } },
      { icon: '🎯', label: '滚动到预览位置', shortcut: '', action: function() { scrollToPreview(); } }
    ];

    buildAndShowMenu(e, items);
  }

  function buildAndShowMenu(e, items) {
    // Build menu HTML
    var html = '';
    items.forEach(function(item, index) {
      if (item.type === 'separator') {
        html += '<div class="context-menu-separator"></div>';
      } else {
        var className = 'context-menu-item';
        if (item.danger) className += ' danger';
        if (item.enabled === false) className += ' disabled';
        html += '<div class="' + className + '" data-index="' + index + '">' +
                '<span class="icon">' + item.icon + '</span>' +
                '<span>' + item.label + '</span>' +
                (item.shortcut ? '<span class="shortcut">' + item.shortcut + '</span>' : '') +
                '</div>';
      }
    });

    contextMenu.innerHTML = html;
    contextMenu.style.display = 'block';

    // Position menu - account for page zoom
    var zoom = parseFloat(document.body.style.zoom) || 1;
    var x = e.clientX / zoom;
    var y = e.clientY / zoom;
    var menuWidth = contextMenu.offsetWidth;
    var menuHeight = contextMenu.offsetHeight;
    var viewWidth = window.innerWidth / zoom;
    var viewHeight = window.innerHeight / zoom;

    // Ensure menu stays fully within viewport
    if (x + menuWidth > viewWidth - 8) {
      x = viewWidth - menuWidth - 8;
    }
    if (x < 8) x = 8;
    if (y + menuHeight > viewHeight - 8) {
      y = y - menuHeight;
    }
    if (y < 8) y = 8;

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';

    // Add click handlers
    var menuItems = contextMenu.querySelectorAll('.context-menu-item');
    menuItems.forEach(function(menuItem) {
      menuItem.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-index'));
        contextMenu.style.display = 'none';
        if (items[index].enabled !== false) {
          items[index].action();
        }
      });
    });
  }

  function convertCase(type) {
    var cm = Editor.getCM();
    if (!cm) return;

    var selection = cm.getSelection();
    if (!selection) return;

    var converted = type === 'upper' ? selection.toUpperCase() : selection.toLowerCase();
    cm.replaceSelection(converted);
  }

  function searchSelectedText() {
    var cm = Editor.getCM();
    if (!cm) return;

    var selection = cm.getSelection();
    if (!selection) return;

    // Open search with selected text
    cm.execCommand('find');
    setTimeout(function() {
      var searchField = document.querySelector('.CodeMirror-search-field');
      if (searchField) {
        searchField.value = selection;
        searchField.dispatchEvent(new Event('input'));
      }
    }, 100);
  }

  function insertTimestamp() {
    var cm = Editor.getCM();
    if (!cm) return;

    var now = new Date();
    var timestamp = now.getFullYear() + '-' +
                   String(now.getMonth() + 1).padStart(2, '0') + '-' +
                   String(now.getDate()).padStart(2, '0') + ' ' +
                   String(now.getHours()).padStart(2, '0') + ':' +
                   String(now.getMinutes()).padStart(2, '0');

    cm.replaceSelection(timestamp);
    cm.focus();
  }

  function insertDivider() {
    var cm = Editor.getCM();
    if (!cm) return;

    cm.replaceSelection('\n---\n');
    cm.focus();
  }

  async function startVoiceInput() {
    // Check if Web Speech API is available
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // In Electron, Web Speech API is not available
      // Show a message with alternative options
      showVoiceInputNotAvailable();
      return;
    }

    try {
      var recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;

      // Create recording indicator
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';

      var voiceBtn = document.createElement('div');
      voiceBtn.style.cssText = 'background: #e74c3c; color: white; padding: 30px 40px; border-radius: 15px; font-size: 18px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center;';
      voiceBtn.innerHTML = '🎤 正在录音...<br><small style="font-size: 12px; opacity: 0.8;">点击任意位置停止</small>';

      overlay.appendChild(voiceBtn);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function() {
        recognition.stop();
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      });

      recognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        var cm = Editor.getCM();
        if (cm) {
          cm.replaceSelection(transcript);
          cm.focus();
        }
      };

      recognition.onerror = function(event) {
        console.error('Voice recognition error:', event.error);
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝。请在系统设置中允许麦克风访问。');
        } else if (event.error !== 'aborted') {
          alert('语音识别出错: ' + event.error);
        }
      };

      recognition.onend = function() {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition initialization error:', e);
      showVoiceInputNotAvailable();
    }
  }

  function showVoiceInputNotAvailable() {
    var cm = Editor.getCM();
    if (!cm) return;

    // Insert a placeholder and show info
    var message = '[语音输入需要浏览器支持]\n\n' +
                  '提示：\n' +
                  '1. 在网页版中使用浏览器打开（Chrome/Edge 推荐）\n' +
                  '2. 或使用系统自带的语音输入（Win+H 快捷键）\n' +
                  '3. macOS 可使用 Fn 键两次启动听写功能';

    // Show as a dialog instead of inserting into editor
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background: var(--bg-primary, #fff); padding: 30px; border-radius: 12px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

    dialog.innerHTML = '<h3 style="margin: 0 0 15px 0; color: var(--text-primary, #333);">🎤 语音输入</h3>' +
                       '<p style="color: var(--text-secondary, #666); line-height: 1.6; margin: 0 0 20px 0;">' +
                       '当前环境不支持 Web Speech API。<br><br>' +
                       '<strong>替代方案：</strong></p>' +
                       '<ul style="color: var(--text-secondary, #666); line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">' +
                       '<li>在网页版中使用 Chrome/Edge 浏览器</li>' +
                       '<li>Windows: 按 <kbd style="background: #eee; padding: 2px 6px; border-radius: 3px;">Win + H</kbd> 启动系统语音输入</li>' +
                       '<li>macOS: 按 <kbd style="background: #eee; padding: 2px 6px; border-radius: 3px;">Fn</kbd> 两次启动听写</li>' +
                       '</ul>' +
                       '<button id="voiceDialogClose" style="background: var(--accent, #4a9eff); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;">知道了</button>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('voiceDialogClose').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  function scrollToPreview() {
    var cm = Editor.getCM();
    if (!cm) return;

    var cursor = cm.getCursor();
    var line = cursor.line;
    var previewPanel = document.getElementById('previewPanel');
    if (!previewPanel) return;

    // Simple scroll sync - scroll preview to approximate position
    var totalLines = cm.lineCount();
    var scrollPercent = line / totalLines;
    var maxScroll = previewPanel.scrollHeight - previewPanel.clientHeight;
    previewPanel.scrollTop = maxScroll * scrollPercent;
  }

  async function createNewFile(dirPath) {
    var fileName = prompt('请输入文件名:', 'untitled.md');
    if (!fileName) return;

    if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown') && !fileName.endsWith('.txt')) {
      fileName += '.md';
    }

    var result = await window.electronAPI.createFile(dirPath, fileName);
    if (result.success) {
      await window.electronAPI.openFileByPath(result.path);
      refreshTree(currentDirPath);
    } else {
      alert('创建文件失败: ' + result.error);
    }
  }

  async function createNewFolder(dirPath) {
    var folderName = prompt('请输入文件夹名:', '新建文件夹');
    if (!folderName) return;

    var result = await window.electronAPI.createFolder(dirPath, folderName);
    if (result.success) {
      refreshTree(currentDirPath);
    } else {
      alert('创建文件夹失败: ' + result.error);
    }
  }

  async function copyItemPath(itemPath) {
    await window.electronAPI.copyPath(itemPath);
  }

  async function openInExplorer(itemPath) {
    await window.electronAPI.openInExplorer(itemPath);
  }

  async function refreshTree(dirPath) {
    var result = await window.electronAPI.refreshFolderTree(dirPath || currentDirPath);
    if (result.success) {
      showFolderTree(dirPath || currentDirPath, result.tree);
    }
  }

  async function renameItem(itemPath, itemType) {
    var oldName = itemPath.split(/[/\\]/).pop();
    var newName = prompt('请输入新名称:', oldName);
    if (!newName || newName === oldName) return;

    var result = await window.electronAPI.renameItem(itemPath, newName);
    if (result.success) {
      if (itemType === 'file' && currentFilePath === itemPath) {
        currentFilePath = result.path;
      }
      refreshTree(currentDirPath);
    } else {
      alert('重命名失败: ' + result.error);
    }
  }

  async function deleteItem(itemPath, itemType) {
    var name = itemPath.split(/[/\\]/).pop();
    var confirmMessage = itemType === 'directory'
      ? '确定要删除文件夹 "' + name + '" 及其所有内容吗？'
      : '确定要删除文件 "' + name + '" 吗？';

    if (!confirm(confirmMessage)) return;

    var result = await window.electronAPI.deleteItem(itemPath);
    if (result.success) {
      if (itemType === 'file' && currentFilePath === itemPath) {
        currentFilePath = null;
      }
      refreshTree(currentDirPath);
    } else {
      alert('删除失败: ' + result.error);
    }
  }

  function isActive() { return isElectron; }
  function getCurrentFilePath() { return currentFilePath; }
  function getCurrentDirPath() { return currentDirPath; }

  return { init: init, isActive: isActive, getCurrentFilePath: getCurrentFilePath, getCurrentDirPath: getCurrentDirPath };
})();
