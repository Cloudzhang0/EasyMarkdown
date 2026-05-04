/**
 * Keyboard Shortcuts module
 */
var Shortcuts = (() => {
  const shortcuts = [];

  function init() {
    document.addEventListener('keydown', handleKeydown);
  }

  function register(key, action, description) {
    shortcuts.push({ key, action, description });
  }

  function handleKeydown(e) {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl+S - Save
    if (isCtrl && e.key === 's') {
      e.preventDefault();
      App.exec('save');
      return;
    }
    // Ctrl+N - New
    if (isCtrl && e.key === 'n') {
      e.preventDefault();
      App.exec('new');
      return;
    }
    // Ctrl+O - Open
    if (isCtrl && e.key === 'o') {
      e.preventDefault();
      App.exec('open');
      return;
    }
    // Ctrl+Z - Undo (handled by CodeMirror, but catch for menu)
    // Ctrl+Y - Redo (handled by CodeMirror)
    // Ctrl+F - Find
    if (isCtrl && e.key === 'f') {
      e.preventDefault();
      App.exec('find');
      return;
    }
    // Ctrl+H - Replace
    if (isCtrl && e.key === 'h') {
      e.preventDefault();
      App.exec('replace');
      return;
    }
    // Ctrl+Shift+P - Toggle Preview
    if (isCtrl && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      App.exec('togglePreview');
      return;
    }
    // Ctrl+B - Bold
    if (isCtrl && e.key === 'b') {
      e.preventDefault();
      App.exec('bold');
      return;
    }
    // Ctrl+I - Italic
    if (isCtrl && e.key === 'i') {
      e.preventDefault();
      App.exec('italic');
      return;
    }
    // Ctrl+K - Link
    if (isCtrl && e.key === 'k') {
      e.preventDefault();
      App.exec('link');
      return;
    }
    // Ctrl+Shift+I - Image
    if (isCtrl && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      App.exec('image');
      return;
    }
    // Ctrl+Shift+S - Strikethrough
    if (isCtrl && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      App.exec('strikethrough');
      return;
    }
    // Ctrl+Shift+Q - Blockquote
    if (isCtrl && e.shiftKey && e.key === 'Q') {
      e.preventDefault();
      App.exec('blockquote');
      return;
    }
    // Ctrl+Shift+U - Unordered List
    if (isCtrl && e.shiftKey && e.key === 'U') {
      e.preventDefault();
      App.exec('unorderedList');
      return;
    }
    // Ctrl+Shift+O - Ordered List
    if (isCtrl && e.shiftKey && e.key === 'O') {
      e.preventDefault();
      App.exec('orderedList');
      return;
    }
    // Ctrl+= / Ctrl+- / Ctrl+0 - Zoom
    if (isCtrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      App.exec('zoomIn');
      return;
    }
    if (isCtrl && e.key === '-') {
      e.preventDefault();
      App.exec('zoomOut');
      return;
    }
    if (isCtrl && e.key === '0') {
      e.preventDefault();
      App.exec('resetZoom');
      return;
    }
  }

  function getAll() {
    return [
      { action: 'new', keys: ['Ctrl', 'N'], macKeys: ['⌘', 'N'] },
      { action: 'open', keys: ['Ctrl', 'O'], macKeys: ['⌘', 'O'] },
      { action: 'save', keys: ['Ctrl', 'S'], macKeys: ['⌘', 'S'] },
      { action: 'undo', keys: ['Ctrl', 'Z'], macKeys: ['⌘', 'Z'] },
      { action: 'redo', keys: ['Ctrl', 'Y'], macKeys: ['⌘', 'Y'] },
      { action: 'find', keys: ['Ctrl', 'F'], macKeys: ['⌘', 'F'] },
      { action: 'replace', keys: ['Ctrl', 'H'], macKeys: ['⌘', 'H'] },
      { action: 'bold', keys: ['Ctrl', 'B'], macKeys: ['⌘', 'B'] },
      { action: 'italic', keys: ['Ctrl', 'I'], macKeys: ['⌘', 'I'] },
      { action: 'strikethrough', keys: ['Ctrl', 'Shift', 'S'], macKeys: ['⌘', 'Shift', 'S'] },
      { action: 'link', keys: ['Ctrl', 'K'], macKeys: ['⌘', 'K'] },
      { action: 'image', keys: ['Ctrl', 'Shift', 'I'], macKeys: ['⌘', 'Shift', 'I'] },
      { action: 'blockquote', keys: ['Ctrl', 'Shift', 'Q'], macKeys: ['⌘', 'Shift', 'Q'] },
      { action: 'unorderedList', keys: ['Ctrl', 'Shift', 'U'], macKeys: ['⌘', 'Shift', 'U'] },
      { action: 'orderedList', keys: ['Ctrl', 'Shift', 'O'], macKeys: ['⌘', 'Shift', 'O'] },
      { action: 'togglePreview', keys: ['Ctrl', 'Shift', 'P'], macKeys: ['⌘', 'Shift', 'P'] },
      { action: 'zoomIn', keys: ['Ctrl', '+'], macKeys: ['⌘', '+'] },
      { action: 'zoomOut', keys: ['Ctrl', '-'], macKeys: ['⌘', '-'] },
      { action: 'resetZoom', keys: ['Ctrl', '0'], macKeys: ['⌘', '0'] },
    ];
  }

  return { init, register, getAll };
})();