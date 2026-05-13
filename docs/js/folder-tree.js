/**
 * Folder Tree module - Sidebar folder/file tree panel
 * Auto-hides by default, slides out when mouse touches left edge of screen.
 * Toggle via menu or Ctrl+Shift+E pins/unpins the sidebar.
 */
var FolderTree = (function() {
  var sidebar = null;
  var treeContainer = null;
  var treeData = null;
  var pinned = false;       // pinned = always visible
  var hovered = false;      // mouse is over sidebar
  var edgeHovered = false;  // mouse is near left edge
  var hideTimer = null;
  var EDGE_WIDTH = 15;      // px from left edge to trigger
  var HIDE_DELAY = 250;     // ms before hiding after mouse leaves

  function init() {
    sidebar = document.getElementById('folderSidebar');
    treeContainer = document.getElementById('folderTree');

    // Restore pinned state
    if (localStorage.getItem('easymarkdown_folder_sidebar_pinned') === 'true') {
      pin();
    }

    // Bind collapse all button
    var collapseBtn = document.getElementById('folderCollapseAllBtn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', collapseAll);
    }

    // Bind open folder button (desktop only)
    var openBtn = document.getElementById('folderOpenBtn');
    if (openBtn) {
      openBtn.addEventListener('click', function() {
        if (window.electronAPI && window.electronAPI.openFolderDialog) {
          window.electronAPI.openFolderDialog();
        }
      });
    }

    // Web mode: hide action buttons
    if (!window.electronAPI) {
      if (openBtn) openBtn.style.display = 'none';
      if (collapseBtn) collapseBtn.style.display = 'none';
    }

    // Edge detection — show sidebar when mouse touches left edge
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Sidebar hover — keep it open while mouse is over it
    if (sidebar) {
      sidebar.addEventListener('mouseenter', onSidebarEnter);
      sidebar.addEventListener('mouseleave', onSidebarLeave);
    }
  }

  // Mouse moved anywhere on the page — check if near left edge
  function onDocumentMouseMove(e) {
    if (pinned) return;

    if (e.clientX <= EDGE_WIDTH) {
      if (!edgeHovered) {
        edgeHovered = true;
        clearTimeout(hideTimer);
        showSidebar();
      }
    } else {
      if (edgeHovered) {
        edgeHovered = false;
        scheduleHide();
      }
    }
  }

  function onSidebarEnter() {
    if (pinned) return;
    hovered = true;
    clearTimeout(hideTimer);
    showSidebar();
  }

  function onSidebarLeave() {
    if (pinned) return;
    hovered = false;
    scheduleHide();
  }

  function showSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('hidden');
    sidebar.classList.add('expanded');
  }

  function scheduleHide() {
    if (pinned) return;
    clearTimeout(hideTimer);
    // Remove expanded immediately (let CSS transition handle the slide-back)
    if (sidebar) sidebar.classList.remove('expanded');
    hideTimer = setTimeout(function() {
      if (!hovered && !edgeHovered && !pinned) {
        if (sidebar) sidebar.classList.add('hidden');
      }
    }, HIDE_DELAY);
  }

  function pin() {
    pinned = true;
    clearTimeout(hideTimer);
    if (sidebar) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('pinned');
      sidebar.classList.remove('expanded');
    }
    // Show the resizer
    var resizer = document.getElementById('sidebarResizer');
    if (resizer) resizer.classList.add('visible');
    localStorage.setItem('easymarkdown_folder_sidebar_pinned', 'true');
  }

  function unpin() {
    pinned = false;
    if (sidebar) {
      sidebar.classList.remove('pinned');
      sidebar.classList.remove('expanded');
      sidebar.classList.add('hidden');
    }
    // Hide the resizer
    var resizer = document.getElementById('sidebarResizer');
    if (resizer) resizer.classList.remove('visible');
    localStorage.setItem('easymarkdown_folder_sidebar_pinned', 'false');
  }

  function renderTree(items, container, depth) {
    depth = depth || 0;
    if (!items) return;

    items.forEach(function(item) {
      var el = document.createElement('div');
      el.className = 'tree-item ' + (item.type || 'file');
      el.style.paddingLeft = (12 + depth * 16) + 'px';

      if (item.type === 'directory') {
        el.innerHTML =
          '<span class="tree-arrow expanded">▶</span>' +
          '<span class="tree-icon">📁</span>' +
          Utils.escapeHtml(item.name);

        var children = document.createElement('div');
        children.className = 'tree-children';
        renderTree(item.children || [], children, depth + 1);

        el.addEventListener('click', function(e) {
          e.stopPropagation();
          children.classList.toggle('collapsed');
          var arrow = el.querySelector('.tree-arrow');
          if (arrow) arrow.classList.toggle('expanded');
        });

        // Right-click context menu (desktop only)
        el.addEventListener('contextmenu', function(e) {
          if (window.electronAPI && typeof DesktopBridge.showTreeContextMenu === 'function') {
            DesktopBridge.showTreeContextMenu(e, item.path, 'directory');
          }
        });

        container.appendChild(el);
        container.appendChild(children);
      } else {
        var ext = (item.name || '').split('.').pop().toLowerCase();
        var icon;
        if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
          icon = '📝';
        } else if (ext === 'js' || ext === 'ts' || ext === 'py' || ext === 'html' || ext === 'css') {
          icon = '📜';
        } else if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'xml') {
          icon = '⚙️';
        } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'svg' || ext === 'webp') {
          icon = '🖼️';
        } else {
          icon = '📄';
        }

        el.innerHTML =
          '<span class="tree-icon">' + icon + '</span>' +
          Utils.escapeHtml(item.name);

        el.addEventListener('click', function() {
          if (window.electronAPI) {
            window.electronAPI.openFileByPath(item.path);
          }
          // Highlight active item
          container.querySelectorAll('.tree-item.active').forEach(function(e) {
            e.classList.remove('active');
          });
          el.classList.add('active');
        });

        // Right-click context menu (desktop only)
        el.addEventListener('contextmenu', function(e) {
          if (window.electronAPI && typeof DesktopBridge.showTreeContextMenu === 'function') {
            DesktopBridge.showTreeContextMenu(e, item.path, 'file');
          }
        });

        container.appendChild(el);
      }
    });
  }

  var lastOutlineContent = '';

  // Render document outline from markdown headings (web mode)
  function renderOutline(content) {
    if (!treeContainer) return;
    if (window.electronAPI && treeData) return; // Desktop: folder tree takes priority
    if (content === lastOutlineContent) return;
    lastOutlineContent = content;

    // Parse headings with line numbers for editor scrolling
    var lines = content.split('\n');
    var headings = [];
    lines.forEach(function(line, index) {
      var m = line.match(/^(#{1,6})\s+(.+)/);
      if (m) {
        headings.push({
          level: m[1].length,
          text: m[2].replace(/[#*`~\[\]]/g, '').trim(),
          line: index  // 0-based line number in editor
        });
      }
    });

    // Hide placeholder
    var placeholder = document.getElementById('folderPlaceholder');
    if (headings.length > 0) {
      if (placeholder) placeholder.style.display = 'none';
    } else {
      if (placeholder) placeholder.style.display = '';
    }

    // Render heading tree
    treeContainer.innerHTML = '';
    if (headings.length === 0) return;

    headings.forEach(function(h) {
      var el = document.createElement('div');
      el.className = 'tree-item file outline-item';
      el.style.paddingLeft = (12 + (h.level - 1) * 14) + 'px';
      el.innerHTML = '<span class="tree-icon" style="font-size:12px">' +
        (h.level === 1 ? '●' : h.level === 2 ? '○' : '·') +
        '</span>' + Utils.escapeHtml(h.text);
      el.title = h.text;

      el.addEventListener('click', function() {
        // 1. Scroll preview to matching heading (fuzzy match — normalize whitespace)
        var preview = document.getElementById('previewContent');
        if (preview) {
          var allH = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
          var targetText = h.text.replace(/\s+/g, ' ').trim();
          for (var i = 0; i < allH.length; i++) {
            var hText = allH[i].textContent.replace(/\s+/g, ' ').trim();
            if (hText === targetText || hText.indexOf(targetText) === 0 || targetText.indexOf(hText) === 0) {
              allH[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
              break;
            }
          }
        }

        // 2. Scroll editor to the heading line
        try {
          var cm = Editor.getCM();
          if (cm && typeof h.line === 'number') {
            cm.scrollIntoView({ line: h.line, ch: 0 }, 60);
            // Move cursor to heading line
            cm.setCursor({ line: h.line, ch: 0 });
            cm.focus();
          }
        } catch(e) {}

        // Highlight
        treeContainer.querySelectorAll('.tree-item.active').forEach(function(e) { e.classList.remove('active'); });
        el.classList.add('active');
      });

      treeContainer.appendChild(el);
    });
  }

  function loadTree(folderPath, tree) {
    treeData = tree;
    if (!treeContainer) return;
    treeContainer.innerHTML = '';

    // Hide placeholder if present
    var placeholder = document.getElementById('folderPlaceholder');
    if (placeholder) placeholder.style.display = 'none';

    // Update title
    var title = document.querySelector('.folder-sidebar-title');
    if (title) {
      var folderName = folderPath.split(/[/\\]/).pop() || folderPath;
      title.textContent = folderName;
    }

    renderTree(tree, treeContainer, 0);

    // Auto-pin when tree is loaded (desktop: folder opened)
    if (window.electronAPI && !pinned) {
      pin();
    }
  }

  function collapseAll() {
    if (!treeContainer) return;
    treeContainer.querySelectorAll('.tree-children').forEach(function(child) {
      child.classList.add('collapsed');
    });
    treeContainer.querySelectorAll('.tree-arrow').forEach(function(arrow) {
      arrow.classList.remove('expanded');
    });
  }

  function toggle() {
    if (pinned) {
      unpin();
    } else {
      pin();
    }
  }

  function show() {
    if (sidebar) sidebar.classList.remove('hidden');
  }

  function hide() {
    if (sidebar) sidebar.classList.add('hidden');
  }

  function isPinned() {
    return pinned;
  }

  function getTreeData() {
    return treeData;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init: init,
    loadTree: loadTree,
    renderOutline: renderOutline,
    collapseAll: collapseAll,
    toggle: toggle,
    show: show,
    hide: hide,
    pin: pin,
    unpin: unpin,
    isPinned: isPinned,
    getTreeData: getTreeData
  };
})();
