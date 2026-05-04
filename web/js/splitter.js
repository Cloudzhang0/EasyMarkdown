/**
 * Splitter module - Resizable split pane
 */
var Splitter = (() => {
  let resizer = null;
  let editorPanel = null;
  let previewPanel = null;
  let isResizing = false;

  function init() {
    resizer = document.getElementById('panelResizer');
    editorPanel = document.getElementById('editorPanel');
    previewPanel = document.getElementById('previewPanel');

    resizer.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Restore saved ratio
    const savedRatio = localStorage.getItem('easymarkdown_split_ratio');
    if (savedRatio) {
      const ratio = parseFloat(savedRatio);
      if (ratio > 0.1 && ratio < 0.9) {
        setRatio(ratio);
      }
    }
  }

  function onMouseDown(e) {
    isResizing = true;
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isResizing) return;

    const mainContent = document.getElementById('mainContent');
    const rect = mainContent.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;

    if (ratio > 0.15 && ratio < 0.85) {
      setRatio(ratio);
    }
  }

  function onMouseUp() {
    if (!isResizing) return;
    isResizing = false;
    resizer.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save ratio
    const mainContent = document.getElementById('mainContent');
    const rect = mainContent.getBoundingClientRect();
    const editorWidth = editorPanel.getBoundingClientRect().width;
    const ratio = editorWidth / rect.width;
    localStorage.setItem('easymarkdown_split_ratio', ratio.toFixed(3));
  }

  function setRatio(ratio) {
    const resizerWidth = 5;
    editorPanel.style.width = `calc(${ratio * 100}% - ${resizerWidth / 2}px)`;
  }

  function getRatio() {
    const mainContent = document.getElementById('mainContent');
    const rect = mainContent.getBoundingClientRect();
    return editorPanel.getBoundingClientRect().width / rect.width;
  }

  return { init, setRatio, getRatio };
})();