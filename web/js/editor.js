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

    // Restore font size
    var savedSize = localStorage.getItem('easymarkdown_fontsize');
    if (savedSize) {
      fontSize = parseInt(savedSize, 10);
      applyFontSize();
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