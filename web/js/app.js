/**
 * Main Application module
 * Initializes all modules and handles global actions
 */
var App = (() => {
  var isDark = false;

  // 页面缩放状态
  var pageZoom = 100;

  // 格式刷状态
  var formatPainterState = { active: false, prefix: '', suffix: '', type: '' };
  // 缓存最后一次选区（因为点击工具栏按钮会清除编辑器选区）
  var lastSelection = { text: '', from: null, to: null };

  // 初始化选区缓存监听（在 Editor.init() 之后调用）
  function initFormatPainter() {
    var cm = Editor.getCM();
    if (!cm) return;
    cm.on('cursorActivity', function() {
      lastSelection = {
        text: cm.getSelection(),
        from: cm.getCursor('from'),
        to: cm.getCursor('to')
      };
    });
  }

  // 从缓存的选区检测 Markdown 格式标记
  function detectFormat() {
    var cm = Editor.getCM();
    if (!cm || !lastSelection.from) {
      return { prefix: '', suffix: '' };
    }

    var from = lastSelection.from;
    var to = lastSelection.to;

    // 有选中文本时检测行内包裹标记
    if (lastSelection.text) {
      var beforeRange = { line: from.line, ch: Math.max(0, from.ch - 5) };
      var afterRange = { line: to.line, ch: Math.min(cm.getLine(to.line).length, to.ch + 5) };
      var textBefore = cm.getRange(beforeRange, from);
      var textAfter = cm.getRange(to, afterRange);

      // 按优先级检测标记（长标记优先，避免 * 被误判为 ** 的一部分）
      var markers = [
        { prefix: '`', suffix: '`' },
        { prefix: '***', suffix: '***' },
        { prefix: '**', suffix: '**' },
        { prefix: '~~', suffix: '~~' },
        { prefix: '^{', suffix: '}' },
        { prefix: '_{', suffix: '}' },
        { prefix: '*', suffix: '*' }
      ];

      for (var i = 0; i < markers.length; i++) {
        var m = markers[i];
        if (textBefore.endsWith(m.prefix) && textAfter.startsWith(m.suffix)) {
          return { prefix: m.prefix, suffix: m.suffix };
        }
      }
    }

    // 检测标题格式（行首 # 标记）
    var lineText = cm.getLine(from.line);
    var headingMatch = lineText.match(/^(#{1,6})\s/);
    if (headingMatch) {
      return { prefix: headingMatch[1] + ' ', suffix: '' };
    }

    return { prefix: '', suffix: '' };
  }

  // 格式刷动作（点击按钮触发）
  function formatPainterAction() {
    if (formatPainterState.active) {
      var cm = Editor.getCM();
      if (!cm) { deactivateFormatPainter(); return; }

      if (formatPainterState.type === 'prefix') {
        // 标题格式：应用到行首
        var line = (lastSelection.from && lastSelection.from.line != null) ? lastSelection.from.line : cm.getCursor().line;
        applyHeadingToLine(line, formatPainterState.prefix);
      } else {
        // 包裹格式：应用到选中文本（或缓存的选区）
        var sel = Editor.getSelection() || lastSelection.text;
        if (sel && formatPainterState.prefix) {
          var curSel = cm.getSelection();
          if (curSel) {
            Editor.replaceSelection(formatPainterState.prefix + curSel + formatPainterState.suffix);
          } else if (lastSelection.from && lastSelection.to) {
            cm.replaceRange(
              formatPainterState.prefix + lastSelection.text + formatPainterState.suffix,
              lastSelection.from,
              lastSelection.to
            );
          }
        }
      }
      deactivateFormatPainter();
    } else {
      // 未激活 → 从缓存选区拾取格式
      var fmt = detectFormat();
      if (fmt.prefix) {
        var type = fmt.suffix === '' ? 'prefix' : 'wrap';
        formatPainterState = { active: true, prefix: fmt.prefix, suffix: fmt.suffix, type: type };
        var btn = document.querySelector('[data-action="formatPainter"]');
        if (btn) btn.classList.add('format-painter-active');
      }
    }
  }

  function applyHeadingToLine(lineNum, prefix) {
    var cm = Editor.getCM();
    if (!cm) return;
    var lineContent = cm.getLine(lineNum);
    if (lineContent == null) return;
    var existingMatch = lineContent.match(/^(#{1,6})\s*/);
    if (existingMatch && existingMatch[0] && existingMatch[0].length > 0) {
      // 替换已有的标题标记
      var rest = lineContent.substring(existingMatch[0].length);
      cm.replaceRange(prefix + rest, { line: lineNum, ch: 0 }, { line: lineNum, ch: lineContent.length });
    } else {
      // 在行首插入标题标记
      cm.replaceRange(prefix, { line: lineNum, ch: 0 });
    }
  }

  function deactivateFormatPainter() {
    formatPainterState = { active: false, prefix: '', suffix: '', type: '' };
    var btn = document.querySelector('[data-action="formatPainter"]');
    if (btn) btn.classList.remove('format-painter-active');
  }

  function init() {
    // Initialize i18n first
    try { I18n.setLanguage(I18n.detectLanguage()); } catch(e) { console.error('I18n init error:', e); }

    // Initialize modules with individual error handling
    try { Editor.init(); } catch(e) { console.error('Editor init error:', e); }
    try { initFormatPainter(); } catch(e) { console.error('FormatPainter init error:', e); }
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

    // Hide desktop prompt in status bar when running in Electron
    if (window.electronAPI) {
      var promptStatus = document.getElementById('desktopPromptStatus');
      if (promptStatus) promptStatus.style.display = 'none';
    }

    // Apply translations
    try { I18n.applyToDOM(); } catch(e) { console.error('I18n applyToDOM error:', e); }

    // Append shortcut keys to menu (must run after I18n.applyToDOM which replaces textContent)
    try { Menu.appendShortcutKeys(); } catch(e) { console.error('Menu appendShortcutKeys error:', e); }

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

    // Restore fullscreen preview state
    if (localStorage.getItem('easymarkdown_fullscreen_preview') === 'true') {
      document.body.classList.add('fullscreen-preview');
    }

    // Restore page zoom
    var savedZoom = localStorage.getItem('easymarkdown_page_zoom');
    if (savedZoom) {
      pageZoom = parseInt(savedZoom, 10);
    }
    applyPageZoom(); // Always call to ensure clean state (clears old CSS zoom)

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
      // Update document outline in sidebar (web mode)
      if (typeof FolderTree !== 'undefined' && FolderTree.renderOutline) {
        FolderTree.renderOutline(content);
      }
    } catch(e) {}
  }

  function onLanguageChange() {
    try { I18n.applyToDOM(); } catch(e) {}
    try { Menu.appendShortcutKeys(); } catch(e) {}
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
        case 'printPreview': FileManager.printPreview(); break;
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
        case 'find': showFindDialog(false); break;
        case 'replace': showFindDialog(true); break;
        case 'togglePreview': togglePreview(); break;

        // View operations
        case 'toggleLineNumbers': Editor.toggleLineNumbers(); break;
        case 'toggleFolderTree':
          if (typeof FolderTree !== 'undefined' && FolderTree.toggle) FolderTree.toggle();
          break;
        case 'fullscreenPreview': fullscreenPreview(); break;
        case 'pageZoomIn': pageZoomIn(); break;
        case 'pageZoomOut': pageZoomOut(); break;
        case 'pageZoomReset': pageZoomReset(); break;
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
        case 'formatPainter': formatPainterAction(); break;
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

  // 全屏预览模式
  function fullscreenPreview() {
    var active = document.body.classList.toggle('fullscreen-preview');
    localStorage.setItem('easymarkdown_fullscreen_preview', active);
  }

  // 页面缩放
  function pageZoomIn() {
    if (pageZoom < 200) { pageZoom += 10; applyPageZoom(); }
  }

  function pageZoomOut() {
    if (pageZoom > 50) { pageZoom -= 10; applyPageZoom(); }
  }

  function pageZoomReset() {
    pageZoom = 100;
    applyPageZoom();
  }

  function applyPageZoom() {
    var scale = pageZoom / 100;
    localStorage.setItem('easymarkdown_page_zoom', pageZoom);

    // 预览面板用 CSS zoom 缩放（纯渲染，安全）
    try {
      var previewPanel = document.querySelector('.preview-panel');
      if (previewPanel) previewPanel.style.zoom = scale;
    } catch(e) {}

    // 编辑器字体缩放
    try {
      var baseSize = 14;
      var newSize = Math.max(8, Math.min(36, Math.round(baseSize * scale)));
      var cmEl = document.querySelector('.CodeMirror');
      if (cmEl) {
        cmEl.style.fontSize = newSize + 'px';
        // 字体改变后必须刷新 CodeMirror 重算字符宽度
        var cm = Editor.getCM();
        if (cm) {
          requestAnimationFrame(function() {
            cm.refresh();
          });
        }
      }
    } catch(e) {}

    showZoomIndicator(pageZoom);
  }

  // 显示缩放比例指示器（2秒后自动消失）
  var zoomIndicatorTimer = null;

  function showZoomIndicator(percent) {
    var el = document.getElementById('zoomIndicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zoomIndicator';
      el.style.cssText = 'position:fixed;bottom:60px;right:20px;background:rgba(0,0,0,0.7);color:#fff;padding:6px 14px;border-radius:6px;font-size:14px;z-index:9999;pointer-events:none;transition:opacity 0.3s;';
      document.body.appendChild(el);
    }
    el.textContent = percent + '%';
    el.style.opacity = '1';
    if (zoomIndicatorTimer) clearTimeout(zoomIndicatorTimer);
    zoomIndicatorTimer = setTimeout(function() {
      el.style.opacity = '0';
    }, 1200);
  }

  // 查找替换对话框（Office 风格）
  function showFindDialog(replaceMode) {
    var overlay = document.getElementById('dialogOverlay');
    var titleEl = document.getElementById('dialogTitle');
    var bodyEl = document.getElementById('dialogBody');
    var footerEl = document.getElementById('dialogFooter');
    var closeBtn = document.getElementById('dialogClose');

    // 构建对话框内容
    var html = '<div class="find-dialog">';
    html += '<div class="find-row"><label>' + '查找内容(N)' + '</label>';
    html += '<input type="text" id="findInput" class="find-input" placeholder="' + '输入查找内容...' + '" autofocus></div>';
    if (replaceMode) {
      html += '<div class="find-row"><label>' + '替换为(P)' + '</label>';
      html += '<input type="text" id="replaceInput" class="find-input" placeholder="' + '输入替换内容...' + '"></div>';
    }
    html += '<div class="find-options">';
    html += '<label class="find-checkbox"><input type="checkbox" id="findCaseSensitive"> ' + '区分大小写' + '</label>';
    html += '<label class="find-checkbox"><input type="checkbox" id="findRegex"> ' + '正则表达式' + '</label>';
    html += '</div>';
    html += '<div class="find-status" id="findStatus"></div>';
    html += '</div>';

    titleEl.textContent = replaceMode ? '查找替换' : '查找';
    bodyEl.innerHTML = html;

    // 构建按钮
    footerEl.innerHTML = '';

    var btnFindPrev = document.createElement('button');
    btnFindPrev.className = 'btn';
    btnFindPrev.textContent = '上一个';
    btnFindPrev.addEventListener('click', function() { doFind(false); });
    footerEl.appendChild(btnFindPrev);

    var btnFindNext = document.createElement('button');
    btnFindNext.className = 'btn btn-primary';
    btnFindNext.textContent = '下一个';
    btnFindNext.addEventListener('click', function() { doFind(true); });
    footerEl.appendChild(btnFindNext);

    if (replaceMode) {
      var btnReplace = document.createElement('button');
      btnReplace.className = 'btn';
      btnReplace.textContent = '替换';
      btnReplace.addEventListener('click', function() { doReplace(); });
      footerEl.appendChild(btnReplace);

      var btnReplaceAll = document.createElement('button');
      btnReplaceAll.className = 'btn';
      btnReplaceAll.textContent = '全部替换';
      btnReplaceAll.addEventListener('click', function() { doReplaceAll(); });
      footerEl.appendChild(btnReplaceAll);
    }

    var btnDone = document.createElement('button');
    btnDone.className = 'btn';
    btnDone.textContent = '完成';
    btnDone.addEventListener('click', function() {
      overlay.style.display = 'none';
      try { Editor.focus(); } catch(e) {}
    });
    footerEl.appendChild(btnDone);

    closeBtn.onclick = function() {
      overlay.style.display = 'none';
      try { Editor.focus(); } catch(e) {}
    };
    overlay.style.display = 'flex';

    // 自动聚焦查找输入框
    setTimeout(function() {
      var fi = document.getElementById('findInput');
      if (fi) { fi.focus(); fi.select(); }
    }, 50);

    // 辅助函数：转义正则特殊字符
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 辅助函数：构建搜索对象
    function buildSearchObj(query) {
      var caseSense = document.getElementById('findCaseSensitive').checked;
      var useRegex = document.getElementById('findRegex').checked;
      try {
        if (useRegex) {
          return new RegExp(query, caseSense ? 'g' : 'gi');
        }
        return new RegExp(escapeRegex(query), caseSense ? 'g' : 'gi');
      } catch(e) {
        return null;
      }
    }

    // 辅助函数：更新状态提示
    function setStatus(msg) {
      var el = document.getElementById('findStatus');
      if (el) el.textContent = msg;
    }

    // 执行查找（forward=true 向下，false 向上）
    function doFind(forward) {
      var cm = Editor.getCM();
      if (!cm) return;
      var input = document.getElementById('findInput');
      if (!input || !input.value) { setStatus('请输入查找内容'); return; }
      var searchObj = buildSearchObj(input.value);
      if (!searchObj) { setStatus('正则表达式无效'); return; }

      var cursor, found = false;
      if (forward) {
        cursor = cm.getSearchCursor(searchObj, cm.getCursor('to'));
        found = cursor.findNext();
        if (!found) {
          cursor = cm.getSearchCursor(searchObj);
          found = cursor.findNext();
          if (found) setStatus('已循环到顶部');
        }
      } else {
        cursor = cm.getSearchCursor(searchObj, cm.getCursor('from'));
        found = cursor.findPrevious();
        if (!found) {
          var last = cm.lastLine();
          cursor = cm.getSearchCursor(searchObj, {line: last, ch: cm.getLine(last).length});
          found = cursor.findPrevious();
          if (found) setStatus('已循环到底部');
        }
      }

      if (found) {
        cm.setSelection(cursor.from(), cursor.to());
        cm.scrollIntoView({from: cursor.from(), to: cursor.to()}, 20);
        setStatus('找到匹配');
      } else {
        setStatus('未找到匹配');
      }
    }

    // 替换当前匹配项
    function doReplace() {
      var cm = Editor.getCM();
      if (!cm) return;
      var input = document.getElementById('findInput');
      var replaceInput = document.getElementById('replaceInput');
      if (!input || !input.value) return;
      var searchObj = buildSearchObj(input.value);
      if (!searchObj) return;

      var sel = cm.getSelection();
      if (sel && searchObj.test(sel)) {
        cm.replaceSelection(replaceInput ? replaceInput.value : '');
        doFind(true);
      } else {
        doFind(true);
      }
    }

    // 全部替换
    function doReplaceAll() {
      var cm = Editor.getCM();
      if (!cm) return;
      var input = document.getElementById('findInput');
      var replaceInput = document.getElementById('replaceInput');
      if (!input || !input.value) return;
      var searchObj = buildSearchObj(input.value);
      if (!searchObj) return;

      var content = cm.getValue();
      var replacement = replaceInput ? replaceInput.value : '';
      // 使用 replace 时需去掉全局 flag 的 lastIndex 问题
      var flags = searchObj.flags.includes('g') ? searchObj.flags : searchObj.flags + 'g';
      var globalRegex = new RegExp(searchObj.source, flags);
      var newContent = content.replace(globalRegex, replacement);
      if (newContent !== content) {
        var count = (content.match(globalRegex) || []).length;
        cm.setValue(newContent);
        setStatus('已替换 ' + count + ' 处');
      } else {
        setStatus('未找到匹配');
      }
    }

    // 键盘快捷键
    var findInput = document.getElementById('findInput');
    if (findInput) {
      findInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doFind(!e.shiftKey);
        }
        if (e.key === 'Escape') {
          overlay.style.display = 'none';
          try { Editor.focus(); } catch(e) {}
        }
      });
    }

    var replaceInput = document.getElementById('replaceInput');
    if (replaceInput) {
      replaceInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) { doFind(false); }
          else { doReplace(); }
        }
        if (e.key === 'Escape') {
          overlay.style.display = 'none';
          try { Editor.focus(); } catch(e) {}
        }
      });
    }
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
    // Always show "select local image" button (web uses file input + base64, desktop uses native dialog)
    var localBtn = '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">' +
      '<button id="imageLocalBtn" class="btn" style="width:100%">&#128193; ' + (I18n.t('dialog.selectLocalImage') || '选择本地图片') + '</button>' +
      '</div>';
    showDialog(
      I18n.t('dialog.insertImage'),
      '<label>' + I18n.t('dialog.imageAlt') + '</label>' +
      '<input type="text" id="imageAltInput" placeholder="Image description">' +
      '<label>' + I18n.t('dialog.imageURL') + '</label>' +
      '<input type="url" id="imageURLInput" placeholder="https://">' +
      localBtn,
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
    // Bind local file selection button (desktop only)
    var localBtnEl = document.getElementById('imageLocalBtn');
    if (localBtnEl) {
      localBtnEl.addEventListener('click', function() {
        selectLocalImage();
      });
    }
  }

  function selectLocalImage() {
    // Desktop mode: use native file dialog + copy to images/ directory
    if (window.electronAPI && window.electronAPI.selectImageFile) {
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
      window.electronAPI.selectImageFile().then(function(result) {
        if (!result || !result.path) return;
        var imagePath = result.path;
        var fileName = result.name;
        if (currentDir) {
          return window.electronAPI.copyImageToImages(imagePath, currentDir).then(function(copyResult) {
            if (copyResult && copyResult.success) return copyResult.relativePath;
            return imagePath;
          });
        }
        return imagePath;
      }).then(function(insertPath) {
        if (insertPath) {
          var alt = document.getElementById('imageAltInput');
          var altText = alt ? alt.value : 'image';
          document.getElementById('dialogOverlay').style.display = 'none';
          Editor.replaceSelection('![' + altText + '](' + insertPath + ')');
        }
      }).catch(function(err) {
        console.error('Select local image error:', err);
      });
      return;
    }
    // Web mode: use hidden file input + convert to base64 data URL
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function() {
      var file = fileInput.files[0];
      if (!file) { document.body.removeChild(fileInput); return; }
      var reader = new FileReader();
      reader.onload = function(e) {
        var alt = document.getElementById('imageAltInput');
        var altText = alt ? alt.value : file.name.replace(/\.[^.]+$/, '');
        document.getElementById('dialogOverlay').style.display = 'none';
        Editor.replaceSelection('![' + altText + '](' + e.target.result + ')');
        document.body.removeChild(fileInput);
      };
      reader.onerror = function() { document.body.removeChild(fileInput); };
      reader.readAsDataURL(file);
    });
    fileInput.click();
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

  return { init: init, exec: exec, onContentChange: onContentChange, onLanguageChange: onLanguageChange, toggleTheme: toggleTheme, fullscreenPreview: fullscreenPreview };
})();
