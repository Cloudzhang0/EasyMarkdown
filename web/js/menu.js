/**
 * Menu module - Menu bar system
 */
var Menu = (() => {
  let openMenu = null;

  function init() {
    const menuBar = document.getElementById('menuBar');

    // Menu item click to open/close
    menuBar.querySelectorAll('.menu-item').forEach(item => {
      const label = item.querySelector('.menu-label');
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.classList.contains('open')) {
          closeAll();
        } else {
          closeAll();
          item.classList.add('open');
          openMenu = item;
        }
      });

      // Hover to switch open menu
      label.addEventListener('mouseenter', () => {
        if (openMenu && openMenu !== item) {
          closeAll();
          item.classList.add('open');
          openMenu = item;
        }
      });
    });

    // Menu commands
    menuBar.querySelectorAll('.menu-command').forEach(cmd => {
      cmd.addEventListener('click', (e) => {
        const action = cmd.dataset.action;
        if (action) {
          closeAll();
          App.exec(action);
        }
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!menuBar.contains(e.target)) {
        closeAll();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });

    // Language selector
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.value = I18n.getLanguage();
      langSelect.addEventListener('change', () => {
        I18n.setLanguage(langSelect.value);
        App.onLanguageChange();
      });
    }

    // Append shortcut keys to menu items
    appendShortcutKeys();
  }

  function appendShortcutKeys() {
    var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    var shortcuts = Shortcuts.getAll();

    // Build action → shortcutText mapping
    var map = {};
    shortcuts.forEach(function(s) {
      var keys = isMac ? (s.macKeys || s.keys) : s.keys;
      if (keys && !map[s.action]) {
        map[s.action] = keys.join('+');
      }
    });

    // Append shortcut labels to menu command buttons
    document.querySelectorAll('.menu-command').forEach(function(btn) {
      var action = btn.getAttribute('data-action');
      if (!action || !map[action]) return;

      // Avoid appending twice
      if (btn.querySelector('.menu-shortcut')) return;

      var shortcutEl = document.createElement('span');
      shortcutEl.className = 'menu-shortcut';
      shortcutEl.textContent = map[action];
      btn.appendChild(shortcutEl);
    });
  }

  function closeAll() {
    document.querySelectorAll('.menu-item.open').forEach(item => {
      item.classList.remove('open');
    });
    openMenu = null;
  }

  function updateRecentFiles(files) {
    const menu = document.getElementById('recentFilesMenu');
    if (!menu) return;
    menu.innerHTML = '';

    if (!files || files.length === 0) {
      const empty = document.createElement('button');
      empty.className = 'menu-command';
      empty.textContent = I18n.t('recentFiles.empty');
      empty.disabled = true;
      menu.appendChild(empty);
      return;
    }

    files.forEach(file => {
      const btn = document.createElement('button');
      btn.className = 'menu-command';
      btn.textContent = file.name;
      btn.title = file.path || file.name;
      btn.addEventListener('click', () => {
        closeAll();
        FileManager.openRecentFile(file);
      });
      menu.appendChild(btn);
    });
  }

  return { init, closeAll, updateRecentFiles, appendShortcutKeys };
})();