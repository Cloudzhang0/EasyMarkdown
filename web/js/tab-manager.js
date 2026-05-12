/**
 * Tab Manager module - Multi-tab support for multiple open markdown files
 */
var TabManager = (() => {
  var tabs = [];
  var activeTabId = null;
  var nextId = 1;
  var tabBarEl = null;

  function init() {
    tabBarEl = document.getElementById('tabBar');
    if (!tabBarEl) return;

    // Restore last session
    var savedTabs = null;
    try { savedTabs = JSON.parse(localStorage.getItem('easymarkdown_tabs')); } catch(e) {}
    var savedActiveId = localStorage.getItem('easymarkdown_active_tab');

    if (savedTabs && savedTabs.length > 0) {
      savedTabs.forEach(function(st) {
        var tab = {
          id: nextId++,
          fileName: st.fileName || '',
          content: st.content || '',
          isDirty: false,
          scrollTop: 0,
          cursorPos: { line: 0, ch: 0 }
        };
        tabs.push(tab);
      });
      // Restore active tab
      var activeIdx = 0;
      if (savedActiveId) {
        var parsedId = parseInt(savedActiveId, 10);
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].id === parsedId) { activeIdx = i; break; }
        }
      }
      activeTabId = tabs[activeIdx].id;
      Editor.setValue(tabs[activeIdx].content);
      StatusBar.setFileName(tabs[activeIdx].fileName);
      StatusBar.setSaveState('saved');
    } else {
      // Create default untitled tab
      createTab('', '');
    }

    render();
  }

  function createTab(fileName, content, filePath) {
    var tab = {
      id: nextId++,
      fileName: fileName || '',
      content: content || '',
      filePath: filePath || '',
      isDirty: false,
      scrollTop: 0,
      cursorPos: { line: 0, ch: 0 }
    };
    tabs.push(tab);
    switchTab(tab.id);
    saveSession();
    return tab;
  }

  function switchTab(id) {
    if (activeTabId === id) return;

    // Save current tab state
    var current = getTab(activeTabId);
    if (current) {
      current.content = Editor.getValue();
      var cm = Editor.getCM();
      if (cm) {
        current.scrollTop = cm.getScrollInfo().top;
        current.cursorPos = cm.getCursor();
      }
    }

    // Switch to new tab
    var target = getTab(id);
    if (!target) return;

    activeTabId = id;
    Editor.setValue(target.content);

    // Restore scroll and cursor
    var cm = Editor.getCM();
    if (cm) {
      cm.scrollTo(null, target.scrollTop);
      cm.setCursor(target.cursorPos);
    }

    StatusBar.setFileName(target.fileName);
    StatusBar.setSaveState(target.isDirty ? 'unsaved' : 'saved');
    render();
    saveSession();

    // Update preview
    try { Preview.update(target.content); } catch(e) {}
  }

  function closeTab(id) {
    var idx = getTabIndex(id);
    if (idx === -1) return;

    var tab = tabs[idx];

    // If dirty, confirm
    if (tab.isDirty) {
      var msg = I18n.t ? I18n.t('dialog.unsavedChanges') : 'This file has unsaved changes. Close anyway?';
      if (!confirm(msg)) return;
    }

    tabs.splice(idx, 1);

    // If closing active tab, switch to adjacent
    if (activeTabId === id) {
      if (tabs.length === 0) {
        createTab('', '');
      } else {
        var newIdx = Math.min(idx, tabs.length - 1);
        activeTabId = null; // Force switch
        switchTab(tabs[newIdx].id);
      }
    }

    render();
    saveSession();
  }

  function closeAll() {
    var hasDirty = tabs.some(function(t) { return t.isDirty; });
    if (hasDirty) {
      var msg = I18n.t ? I18n.t('dialog.unsavedChanges') : 'Some files have unsaved changes. Close all anyway?';
      if (!confirm(msg)) return;
    }
    tabs = [];
    activeTabId = null;
    createTab('', '');
  }

  function getTab(id) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === id) return tabs[i];
    }
    return null;
  }

  function getTabIndex(id) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === id) return i;
    }
    return -1;
  }

  function getCurrentTab() {
    return getTab(activeTabId);
  }

  function updateCurrentContent() {
    var tab = getCurrentTab();
    if (tab) {
      tab.content = Editor.getValue();
    }
  }

  function markDirty(id, dirty) {
    var tab = getTab(id);
    if (!tab) return;
    tab.isDirty = dirty;
    if (tab.id === activeTabId) {
      StatusBar.setSaveState(dirty ? 'unsaved' : 'saved');
    }
    render();
  }

  function renameTab(id, newName, newFilePath) {
    var tab = getTab(id);
    if (!tab) return;
    tab.fileName = newName;
    if (newFilePath) tab.filePath = newFilePath;
    if (tab.id === activeTabId) {
      StatusBar.setFileName(newName);
    }
    render();
    saveSession();
  }

  function setActiveDirty(dirty) {
    markDirty(activeTabId, dirty);
  }

  function getActiveTabId() {
    return activeTabId;
  }

  function getAllTabs() {
    return tabs;
  }

  function render() {
    if (!tabBarEl) return;
    tabBarEl.innerHTML = '';

    tabs.forEach(function(tab) {
      var el = document.createElement('div');
      el.className = 'tab' + (tab.id === activeTabId ? ' tab-active' : '');
      el.dataset.tabId = tab.id;
      el.title = tab.fileName || I18n.t('tab.untitled');

      // Dirty indicator
      if (tab.isDirty) {
        var dot = document.createElement('span');
        dot.className = 'tab-dirty';
        el.appendChild(dot);
      }

      // Tab label
      var label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.fileName || I18n.t('tab.untitled');
      el.appendChild(label);

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = I18n.t ? I18n.t('menu.close') : 'Close';
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeTab(tab.id);
      });
      el.appendChild(closeBtn);

      // Click to switch
      el.addEventListener('click', function() {
        switchTab(tab.id);
      });

      tabBarEl.appendChild(el);
    });

    // New tab button
    var newBtn = document.createElement('button');
    newBtn.className = 'tab-new';
    newBtn.innerHTML = '+';
    newBtn.title = I18n.t ? I18n.t('menu.new') : 'New';
    newBtn.addEventListener('click', function() {
      createTab('', '');
    });
    tabBarEl.appendChild(newBtn);
  }

  function saveSession() {
    try {
      var data = tabs.map(function(t) {
        return { fileName: t.fileName, content: t.id === activeTabId ? Editor.getValue() : t.content };
      });
      localStorage.setItem('easymarkdown_tabs', JSON.stringify(data));
      localStorage.setItem('easymarkdown_active_tab', String(activeTabId));
    } catch(e) {}
  }

  function saveActiveToStorage() {
    saveSession();
  }

  return {
    init: init,
    createTab: createTab,
    switchTab: switchTab,
    closeTab: closeTab,
    closeAll: closeAll,
    getCurrentTab: getCurrentTab,
    getActiveTabId: getActiveTabId,
    getAllTabs: getAllTabs,
    updateCurrentContent: updateCurrentContent,
    markDirty: markDirty,
    setActiveDirty: setActiveDirty,
    renameTab: renameTab,
    render: render,
    saveSession: saveSession,
    saveActiveToStorage: saveActiveToStorage
  };
})();
