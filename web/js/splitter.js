/**
 * Splitter module - Resizable split panes (sidebar | editor | preview)
 */
var Splitter = (function() {
  var panelResizer = null;
  var sidebarResizer = null;
  var editorPanel = null;
  var previewPanel = null;
  var sidebar = null;
  var mainContent = null;
  var isResizing = false;
  var resizingTarget = null; // 'panel' or 'sidebar'

  function init() {
    panelResizer = document.getElementById('panelResizer');
    sidebarResizer = document.getElementById('sidebarResizer');
    editorPanel = document.getElementById('editorPanel');
    previewPanel = document.getElementById('previewPanel');
    sidebar = document.getElementById('folderSidebar');
    mainContent = document.getElementById('mainContent');

    // Panel resizer (editor | preview)
    if (panelResizer) {
      panelResizer.addEventListener('mousedown', function(e) {
        isResizing = true;
        resizingTarget = 'panel';
        panelResizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
    }

    // Sidebar resizer (sidebar | main-content)
    if (sidebarResizer) {
      sidebarResizer.addEventListener('mousedown', function(e) {
        isResizing = true;
        resizingTarget = 'sidebar';
        sidebarResizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Restore saved sidebar width (only applied when pinned)
    var savedSidebarWidth = localStorage.getItem('easymarkdown_sidebar_width');
    if (savedSidebarWidth && sidebar) {
      var w = parseInt(savedSidebarWidth, 10);
      if (w >= 180 && w <= 400) {
        sidebar.style.width = w + 'px';
      }
      // Apply min-width for pinned state
      sidebar.style.minWidth = w + 'px';
    }

    // Restore saved panel ratio
    var savedRatio = localStorage.getItem('easymarkdown_split_ratio');
    if (savedRatio) {
      var ratio = parseFloat(savedRatio);
      if (ratio > 0.1 && ratio < 0.9) {
        setRatio(ratio);
      }
    }
  }

  function onMouseMove(e) {
    if (!isResizing) return;

    if (resizingTarget === 'panel') {
      var rect = mainContent.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var ratio = x / rect.width;

      if (ratio > 0.15 && ratio < 0.85) {
        setRatio(ratio);
      }
    } else if (resizingTarget === 'sidebar') {
      var bodyContent = document.getElementById('bodyContent');
      if (!bodyContent || !sidebar) return;
      var bodyRect = bodyContent.getBoundingClientRect();
      var sx = e.clientX - bodyRect.left;

      // Clamp sidebar width
      if (sx >= 180 && sx <= 400) {
        sidebar.style.width = sx + 'px';
        sidebar.style.minWidth = sx + 'px';
      }
    }
  }

  function onMouseUp() {
    if (!isResizing) return;
    isResizing = false;

    if (resizingTarget === 'panel') {
      if (panelResizer) panelResizer.classList.remove('active');
      var rect = mainContent.getBoundingClientRect();
      var editorWidth = editorPanel.getBoundingClientRect().width;
      var ratio = editorWidth / rect.width;
      localStorage.setItem('easymarkdown_split_ratio', ratio.toFixed(3));
    } else if (resizingTarget === 'sidebar') {
      if (sidebarResizer) sidebarResizer.classList.remove('active');
      if (sidebar) {
        var w = parseInt(sidebar.style.width, 10);
        if (w >= 180 && w <= 400) {
          localStorage.setItem('easymarkdown_sidebar_width', w);
          sidebar.style.minWidth = w + 'px';
        }
      }
    }

    resizingTarget = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function setRatio(ratio) {
    var resizerWidth = 5;
    if (editorPanel) {
      editorPanel.style.width = 'calc(' + (ratio * 100) + '% - ' + (resizerWidth / 2) + 'px)';
    }
  }

  function getRatio() {
    var rect = mainContent.getBoundingClientRect();
    return editorPanel.getBoundingClientRect().width / rect.width;
  }

  return { init: init, setRatio: setRatio, getRatio: getRatio };
})();
