/**
 * Main Application module
 * Initializes all modules and handles global actions
 */
var App = (() => {
  var isDark = false;

  function init() {
    // Initialize i18n first
    try { I18n.setLanguage(I18n.detectLanguage()); } catch(e) { console.error('I18n init error:', e); }

    // Initialize modules with individual error handling
    try { Editor.init(); } catch(e) { console.error('Editor init error:', e); }
    try { Preview.init(); } catch(e) { console.error('Preview init error:', e); }
    try { Splitter.init(); } catch(e) { console.error('Splitter init error:', e); }
    try { Toolbar.init(); } catch(e) { console.error('Toolbar init error:', e); }
    try { Menu.init(); } catch(e) { console.error('Menu init error:', e); }
    try { StatusBar.init(); } catch(e) { console.error('StatusBar init error:', e); }
    try { TabManager.init(); } catch(e) { console.error('TabManager init error:', e); }
    try { FileManager.init(); } catch(e) { console.error('FileManager init error:', e); }
    try { Shortcuts.init(); } catch(e) { console.error('Shortcuts init error:', e); }
    try { Help.init(); } catch(e) { console.error('Help init error:', e); }
    try { DesktopBridge.init(); } catch(e) { console.error('DesktopBridge init error:', e); }

    // Apply translations
    try { I18n.applyToDOM(); } catch(e) { console.error('I18n applyToDOM error:', e); }

    // Set initial file name
    try { StatusBar.setFileName(FileManager.getFileName()); } catch(e) {}

    // Initial preview render
    try { Preview.update(Editor.getValue()); } catch(e) {}

    // Restore theme
    var savedTheme = localStorage.getItem('easymarkdown_theme');
    if (savedTheme === 'dark') {
      toggleTheme(true);
    }

    // Restore preview hidden state
    if (localStorage.getItem('easymarkdown_preview_hidden') === 'true') {
      document.getElementById('mainContent').classList.add('preview-hidden');
    }

    // Window close warning
    window.addEventListener('beforeunload', function(e) {
      // Save current tab state
      try { TabManager.saveSession(); } catch(ex) {}
      // Check all tabs for unsaved
      var hasDirty = false;
      try {
        hasDirty = TabManager.getAllTabs().some(function(t) { return t.isDirty; });
      } catch(ex) {}
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Drag and drop file support
    document.body.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    document.body.addEventListener('drop', function(e) {
      e.preventDefault();
      var file = e.dataTransfer.files[0];
      if (file) {
        FileManager.openFile(file);
      }
    });

    // Focus editor
    try { Editor.focus(); } catch(e) {}

    console.log('EasyMarkdown initialized successfully');
  }

  function onContentChange() {
    try {
      var content = Editor.getValue();
      Preview.update(content);
      StatusBar.updateStats(content);
      TabManager.updateCurrentContent();
    } catch(e) {}
  }

  function onLanguageChange() {
    try { I18n.applyToDOM(); } catch(e) {}
    try { StatusBar.setFileName(FileManager.getFileName()); } catch(e) {}
    try { StatusBar.setSaveState(FileManager.isDocumentDirty() ? 'unsaved' : 'saved'); } catch(e) {}
    try { onContentChange(); } catch(e) {}
    try { TabManager.render(); } catch(e) {}
  }

  function toggleTheme(forceDark) {
    isDark = typeof forceDark === 'boolean' ? forceDark : !isDark;
    document.body.className = isDark ? 'theme-dark' : 'theme-light';
    localStorage.setItem('easymarkdown_theme', isDark ? 'dark' : 'light');
    try { Preview.updateTheme(); } catch(e) {}
  }

  // Execute actions from menus, toolbar, shortcuts
  function exec(action) {
    try {
      switch (action) {
        // File operations
        case 'new': FileManager.newFile(); break;
        case 'open': FileManager.openFileDialog(); break;
        case 'save': FileManager.save(); break;
        case 'saveAs': FileManager.saveAs(); break;
        case 'exportHTML': FileManager.exportHTML(); break;
        case 'exportPDF': FileManager.exportPDF(); break;
        case 'print': FileManager.printDoc(); break;
        case 'close': FileManager.closeFile(); break;
        case 'closeAll': FileManager.closeAll(); break;
        case 'exit': execExit(); break;

        // Edit operations
        case 'undo': Editor.undo(); break;
        case 'redo': Editor.redo(); break;
        case 'cut': document.execCommand('cut'); break;
        case 'copy': document.execCommand('copy'); break;
        case 'paste':
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(t) { Editor.insertAtCursor(t); }).catch(function() {});
          }
          break;
        case 'selectAll': Editor.selectAll(); break;
        case 'find': Editor.openSearch(); break;
        case 'replace': Editor.openReplace(); break;
        case 'togglePreview': togglePreview(); break;

        // View operations
        case 'toggleLineNumbers': Editor.toggleLineNumbers(); break;
        case 'zoomIn': Editor.zoomIn(); break;
        case 'zoomOut': Editor.zoomOut(); break;
        case 'resetZoom': Editor.resetZoom(); break;
        case 'toggleTheme': toggleTheme(); break;

        // Formatting
        case 'bold': Editor.wrapSelection('**', '**'); break;
        case 'italic': Editor.wrapSelection('*', '*'); break;
        case 'strikethrough': Editor.wrapSelection('~~', '~~'); break;
        case 'code': Editor.wrapSelection('`', '`'); break;
        case 'codeBlock': Editor.wrapSelection('```\n', '\n```'); break;
        case 'superscript': Editor.wrapSelection('^{', '}'); break;
        case 'subscript': Editor.wrapSelection('_{', '}'); break;
        case 'blockquote': Editor.insertLinePrefix('> '); break;
        case 'unorderedList': Editor.insertLinePrefix('- '); break;
        case 'orderedList': Editor.insertLinePrefix('1. '); break;
        case 'taskList': Editor.insertLinePrefix('- [ ] '); break;
        case 'horizontalRule': Editor.insertAtCursor('\n---\n'); break;
        case 'heading': break; // Handled by toolbar dropdown
        case 'link': showLinkDialog(); break;
        case 'image': showImageDialog(); break;
        case 'table': showTableDialog(); break;

        // Help
        case 'gettingStarted': Help.show('gettingStarted'); break;
        case 'cheatsheet': Help.show('cheatsheet'); break;
        case 'shortcuts': Help.show('shortcuts'); break;
        case 'tools': Help.show('tools'); break;
        case 'about': Help.show('about'); break;
      }
    } catch(e) {
      console.error('Action error:', action, e);
    }
  }

  function execExit() {
    if (window.electronAPI && window.electronAPI.exitApp) {
      window.electronAPI.exitApp();
    }
  }

  function togglePreview() {
    var main = document.getElementById('mainContent');
    var hidden = main.classList.toggle('preview-hidden');
    localStorage.setItem('easymarkdown_preview_hidden', hidden);
  }

  // Dialog helpers
  function showDialog(title, bodyHTML, buttons) {
    var overlay = document.getElementById('dialogOverlay');
    var titleEl = document.getElementById('dialogTitle');
    var bodyEl = document.getElementById('dialogBody');
    var footerEl = document.getElementById('dialogFooter');
    var closeBtn = document.getElementById('dialogClose');

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    footerEl.innerHTML = '';

    buttons.forEach(function(btn) {
      var el = document.createElement('button');
      el.className = 'btn' + (btn.primary ? ' btn-primary' : '');
      el.textContent = btn.label;
      el.addEventListener('click', function() {
        overlay.style.display = 'none';
        if (btn.action) btn.action();
      });
      footerEl.appendChild(el);
    });

    closeBtn.onclick = function() { overlay.style.display = 'none'; };
    overlay.style.display = 'flex';

    // Focus first input
    setTimeout(function() {
      var firstInput = bodyEl.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 50);
  }

  function showLinkDialog() {
    var sel = Editor.getSelection();
    showDialog(
      I18n.t('dialog.insertLink'),
      '<label>' + I18n.t('dialog.linkText') + '</label>' +
      '<input type="text" id="linkTextInput" value="' + Utils.escapeHtml(sel) + '">' +
      '<label>' + I18n.t('dialog.linkURL') + '</label>' +
      '<input type="url" id="linkURLInput" placeholder="https://">',
      [
        { label: I18n.t('dialog.cancel') },
        {
          label: I18n.t('dialog.confirm'), primary: true,
          action: function() {
            var text = document.getElementById('linkTextInput').value;
            var url = document.getElementById('linkURLInput').value;
            if (url) {
              Editor.replaceSelection('[' + (text || url) + '](' + url + ')');
            }
          }
        }
      ]
    );
  }

  function showImageDialog() {
    showDialog(
      I18n.t('dialog.insertImage'),
      '<label>' + I18n.t('dialog.imageAlt') + '</label>' +
      '<input type="text" id="imageAltInput" placeholder="Image description">' +
      '<label>' + I18n.t('dialog.imageURL') + '</label>' +
      '<input type="url" id="imageURLInput" placeholder="https://">',
      [
        { label: I18n.t('dialog.cancel') },
        {
          label: I18n.t('dialog.confirm'), primary: true,
          action: function() {
            var alt = document.getElementById('imageAltInput').value;
            var url = document.getElementById('imageURLInput').value;
            if (url) {
              Editor.replaceSelection('![' + alt + '](' + url + ')');
            }
          }
        }
      ]
    );
  }

  function showTableDialog() {
    showDialog(
      I18n.t('dialog.insertTable'),
      '<label>' + I18n.t('dialog.rows') + '</label>' +
      '<input type="number" id="tableRowsInput" value="3" min="1" max="20">' +
      '<label>' + I18n.t('dialog.cols') + '</label>' +
      '<input type="number" id="tableColsInput" value="3" min="1" max="10">',
      [
        { label: I18n.t('dialog.cancel') },
        {
          label: I18n.t('dialog.confirm'), primary: true,
          action: function() {
            var rows = parseInt(document.getElementById('tableRowsInput').value) || 3;
            var cols = parseInt(document.getElementById('tableColsInput').value) || 3;
            insertTable(rows, cols);
          }
        }
      ]
    );
  }

  function insertTable(rows, cols) {
    var md = '\n';
    md += '| ' + Array.from({length: cols}, function(_, i) { return 'Header ' + (i+1); }).join(' | ') + ' |\n';
    md += '| ' + Array.from({length: cols}, function() { return '---'; }).join(' | ') + ' |\n';
    for (var r = 0; r < rows - 1; r++) {
      md += '| ' + Array.from({length: cols}, function(_, i) { return 'Cell ' + (r+1) + '.' + (i+1); }).join(' | ') + ' |\n';
    }
    Editor.insertAtCursor(md);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init, exec: exec, onContentChange: onContentChange, onLanguageChange: onLanguageChange, toggleTheme: toggleTheme };
})();
