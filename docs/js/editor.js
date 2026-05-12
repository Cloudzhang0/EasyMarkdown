/**
 * Editor module - CodeMirror setup and management
 */
var Editor = (() => {
  var cm = null;
  var fontSize = 14;

  function init() {
    var textarea = document.getElementById('editorTextarea');
    if (!textarea) { console.error('Editor: textarea not found'); return; }
    if (typeof CodeMirror === 'undefined') { console.error('Editor: CodeMirror not loaded'); return; }

    try {
      cm = CodeMirror.fromTextArea(textarea, {
        mode: 'gfm',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        extraKeys: {
          'Enter': 'newlineAndIndentContinueMarkdownList',
          'Ctrl-B': function() { App.exec('bold'); },
          'Cmd-B': function() { App.exec('bold'); },
          'Ctrl-I': function() { App.exec('italic'); },
          'Cmd-I': function() { App.exec('italic'); },
          'Ctrl-K': function() { App.exec('link'); },
          'Cmd-K': function() { App.exec('link'); },
        },
        viewportMargin: Infinity,
        indentUnit: 2,
        tabSize: 2,
        indentWithTabs: false,
      });
    } catch(e) {
      console.error('Editor: CodeMirror init error:', e);
      return;
    }

    cm.on('change', function() {
      try { App.onContentChange(); } catch(e) {}
    });

    cm.on('cursorActivity', function() {
      try { StatusBar.updateCursorPosition(cm); } catch(e) {}
    });

    // Handle image paste from clipboard
    cm.on('paste', function(cmInstance, e) {
      try {
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            var blob = items[i].getAsFile();
            handleImagePaste(blob);
            return;
          }
        }
      } catch(err) { console.error('Paste image error:', err); }
    });

    // Restore font size
    var savedSize = localStorage.getItem('easymarkdown_fontsize');
    if (savedSize) {
      fontSize = parseInt(savedSize, 10);
      applyFontSize();
    }

    // No zoom coordinate fix needed: CSS zoom's clientX and getBoundingClientRect()
    // are both in viewport pixel space, so they're consistent.
  }

  function handleImagePaste(blob) {
    if (!blob) return;
    var ext = 'png';
    if (blob.type === 'image/jpeg') ext = 'jpg';
    else if (blob.type === 'image/gif') ext = 'gif';
    else if (blob.type === 'image/webp') ext = 'webp';

    // Desktop mode: save to images/ directory via IPC
    if (window.electronAPI && window.electronAPI.saveClipboardImage) {
      var currentDir = null;
      try {
        var tab = TabManager.getCurrentTab();
        if (tab && tab.filePath) {
          currentDir = tab.filePath.replace(/[/\\][^/\\]+$/, '');
        }
      } catch(e) {}
      if (!currentDir) {
        try { currentDir = DesktopBridge.getCurrentDirPath(); } catch(e) {}
      }
      if (!currentDir) {
        alert('Please save the file first before pasting images.');
        return;
      }
      blob.arrayBuffer().then(function(buffer) {
        var uint8 = Array.from(new Uint8Array(buffer));
        return window.electronAPI.saveClipboardImage(uint8, currentDir, ext);
      }).then(function(result) {
        if (result && result.success) {
          insertAtCursor('![image](' + result.relativePath + ')');
        } else {
          console.error('Failed to save image:', result && result.error);
        }
      }).catch(function(err) {
        console.error('Image paste error:', err);
      });
    } else {
      // Web mode: convert to base64 data URL
      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        insertAtCursor('![image](' + dataUrl + ')');
      };
      reader.readAsDataURL(blob);
    }
  }

  function getCM() { return cm; }
  function getValue() { return cm ? cm.getValue() : ''; }
  function setValue(text) { if (cm) cm.setValue(text || ''); }
  function replaceSelection(text) { if (cm) cm.replaceSelection(text); }
  function getSelection() { return cm ? cm.getSelection() : ''; }
  function focus() { if (cm) cm.focus(); }
  function undo() { if (cm) cm.undo(); }
  function redo() { if (cm) cm.redo(); }
  function selectAll() { if (cm) cm.execCommand('selectAll'); }

  function toggleLineNumbers() {
    if (cm) cm.setOption('lineNumbers', !cm.getOption('lineNumbers'));
  }

  function applyFontSize() {
    var el = document.querySelector('.CodeMirror');
    if (el) el.style.fontSize = fontSize + 'px';
  }

  function zoomIn() {
    if (fontSize < 32) { fontSize += 2; applyFontSize(); localStorage.setItem('easymarkdown_fontsize', fontSize); }
  }

  function zoomOut() {
    if (fontSize > 10) { fontSize -= 2; applyFontSize(); localStorage.setItem('easymarkdown_fontsize', fontSize); }
  }

  function resetZoom() {
    fontSize = 14; applyFontSize(); localStorage.setItem('easymarkdown_fontsize', fontSize);
  }

  function wrapSelection(prefix, suffix) {
    if (!cm) return;
    var sel = cm.getSelection();
    if (sel) {
      cm.replaceSelection(prefix + sel + suffix);
    } else {
      var cursor = cm.getCursor();
      cm.replaceRange(prefix + suffix, cursor);
      cm.setCursor({ line: cursor.line, ch: cursor.ch + prefix.length });
    }
    cm.focus();
  }

  function insertAtCursor(text) {
    if (!cm) return;
    cm.replaceSelection(text);
    cm.focus();
  }

  function insertLinePrefix(prefix) {
    if (!cm) return;
    var cursor = cm.getCursor();
    var line = cm.getLine(cursor.line);
    cm.replaceRange(prefix + line, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    cm.focus();
  }

  function openSearch() { if (cm) cm.execCommand('find'); }
  function openReplace() { if (cm) cm.execCommand('replace'); }

  return {
    init: init, getCM: getCM, getValue: getValue, setValue: setValue,
    replaceSelection: replaceSelection, getSelection: getSelection,
    focus: focus, undo: undo, redo: redo, selectAll: selectAll,
    toggleLineNumbers: toggleLineNumbers,
    zoomIn: zoomIn, zoomOut: zoomOut, resetZoom: resetZoom,
    wrapSelection: wrapSelection, insertAtCursor: insertAtCursor,
    insertLinePrefix: insertLinePrefix,
    openSearch: openSearch, openReplace: openReplace
  };
})();