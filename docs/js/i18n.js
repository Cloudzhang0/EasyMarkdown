/**
 * Internationalization (i18n) module
 * Supports 12 languages with dynamic switching
 */
var I18n = (() => {
  const STORAGE_KEY = 'easymarkdown_lang';
  const SUPPORTED_LANGS = [
    'zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR',
    'fr-FR', 'de-DE', 'es-ES', 'pt-BR', 'ru-RU', 'ar-SA', 'hi-IN'
  ];
  const DEFAULT_LANG = 'en-US';

  let currentLang = DEFAULT_LANG;
  let translations = {};

  // Built-in translations (embedded to avoid async loading issues for MVP)
  const builtinTranslations = {
    'zh-CN': {
      'menu.file': '文件', 'menu.edit': '编辑', 'menu.view': '视图', 'menu.help': '帮助',
      'menu.new': '新建', 'menu.open': '打开文件', 'menu.save': '保存', 'menu.saveAs': '另存为',
      'menu.recentFiles': '最近打开文件', 'menu.exportHTML': '导出为 HTML', 'menu.exportPDF': '导出为 PDF',
      'menu.print': '打印', 'menu.close': '关闭', 'menu.closeAll': '关闭所有', 'menu.exit': '退出',
      'menu.undo': '撤销', 'menu.redo': '重做', 'menu.cut': '剪切',
      'menu.copy': '复制', 'menu.paste': '粘贴', 'menu.selectAll': '全选',
      'menu.find': '查找', 'menu.replace': '查找替换', 'menu.togglePreview': '隐藏预览',
      'menu.toggleLineNumbers': '显示/隐藏行号', 'menu.fullscreenPreview': '全屏预览',
      'menu.zoomIn': '放大', 'menu.zoomOut': '缩小',
      'menu.resetZoom': '重置缩放', 'menu.toggleTheme': '切换主题',
      'menu.gettingStarted': 'Markdown 入门用法', 'menu.cheatsheet': 'Markdown 语法速查表',
      'menu.tools': '常用工具', 'menu.shortcuts': '快捷键列表', 'menu.about': '关于',
      'toolbar.heading': '标题', 'toolbar.bold': '粗体', 'toolbar.italic': '斜体',
      'toolbar.strikethrough': '删除线', 'toolbar.unorderedList': '无序列表',
      'toolbar.orderedList': '有序列表', 'toolbar.taskList': '任务列表',
      'toolbar.code': '行内代码', 'toolbar.codeBlock': '代码块', 'toolbar.blockquote': '引用块',
      'toolbar.link': '链接', 'toolbar.image': '图片', 'toolbar.table': '表格',
      'toolbar.horizontalRule': '水平线', 'toolbar.superscript': '上标', 'toolbar.subscript': '下标',
      'toolbar.formatPainter': '格式刷',
      'status.untitled': '未命名', 'status.saved': '已保存', 'status.unsaved': '未保存',
      'status.saving': '保存中…', 'status.words': '字数: ', 'status.chars': '字符: ',
      'privacy.local': '数据仅存储在本地',
      'dialog.insertLink': '插入链接', 'dialog.linkText': '链接文本', 'dialog.linkURL': '链接 URL',
      'dialog.insertImage': '插入图片', 'dialog.imageAlt': '替代文本', 'dialog.imageURL': '图片 URL', 'dialog.selectLocalImage': '选择本地图片',
      'dialog.insertTable': '插入表格', 'dialog.rows': '行数', 'dialog.cols': '列数',
      'dialog.confirm': '确定', 'dialog.cancel': '取消',
      'help.gettingStarted': 'Markdown 入门用法', 'help.cheatsheet': '语法速查表',
      'help.shortcuts': '快捷键列表', 'help.tools': '常用工具', 'help.about': '关于',
      'editor.placeholder': '在此输入 Markdown 内容...',
      'recentFiles.empty': '暂无最近打开的文件',
      'file.unsavedChanges': '当前文档有未保存的更改，是否继续？',
      'dialog.unsavedChanges': '文件有未保存的更改，确定关闭吗？',
      'tab.untitled': '未命名',
      'desktopPrompt.text': '提示：这是网页版，文件保存在浏览器中。需要保存到本地电脑？', 'desktopPrompt.link': '下载桌面版',
    },
    'en-US': {
      'menu.file': 'File', 'menu.edit': 'Edit', 'menu.view': 'View', 'menu.help': 'Help',
      'menu.new': 'New', 'menu.open': 'Open File', 'menu.save': 'Save', 'menu.saveAs': 'Save As',
      'menu.recentFiles': 'Recent Files', 'menu.exportHTML': 'Export HTML', 'menu.exportPDF': 'Export PDF',
      'menu.print': 'Print', 'menu.close': 'Close', 'menu.closeAll': 'Close All', 'menu.exit': 'Exit',
      'menu.undo': 'Undo', 'menu.redo': 'Redo', 'menu.cut': 'Cut',
      'menu.copy': 'Copy', 'menu.paste': 'Paste', 'menu.selectAll': 'Select All',
      'menu.find': 'Find', 'menu.replace': 'Find & Replace', 'menu.togglePreview': 'Toggle Preview',
      'menu.toggleLineNumbers': 'Toggle Line Numbers', 'menu.fullscreenPreview': 'Full Screen Preview',
      'menu.zoomIn': 'Zoom In', 'menu.zoomOut': 'Zoom Out',
      'menu.resetZoom': 'Reset Zoom', 'menu.toggleTheme': 'Toggle Theme',
      'menu.gettingStarted': 'Getting Started', 'menu.cheatsheet': 'Markdown Cheatsheet',
      'menu.tools': 'Useful Tools', 'menu.shortcuts': 'Keyboard Shortcuts', 'menu.about': 'About',
      'toolbar.heading': 'Heading', 'toolbar.bold': 'Bold', 'toolbar.italic': 'Italic',
      'toolbar.strikethrough': 'Strikethrough', 'toolbar.unorderedList': 'Unordered List',
      'toolbar.orderedList': 'Ordered List', 'toolbar.taskList': 'Task List',
      'toolbar.code': 'Inline Code', 'toolbar.codeBlock': 'Code Block', 'toolbar.blockquote': 'Blockquote',
      'toolbar.link': 'Link', 'toolbar.image': 'Image', 'toolbar.table': 'Table',
      'toolbar.horizontalRule': 'Horizontal Rule', 'toolbar.superscript': 'Superscript', 'toolbar.subscript': 'Subscript',
      'toolbar.formatPainter': 'Format Painter',
      'status.untitled': 'Untitled', 'status.saved': 'Saved', 'status.unsaved': 'Unsaved',
      'status.saving': 'Saving...', 'status.words': 'Words: ', 'status.chars': 'Chars: ',
      'privacy.local': 'Data stored locally only',
      'dialog.insertLink': 'Insert Link', 'dialog.linkText': 'Link Text', 'dialog.linkURL': 'URL',
      'dialog.insertImage': 'Insert Image', 'dialog.imageAlt': 'Alt Text', 'dialog.imageURL': 'Image URL', 'dialog.selectLocalImage': 'Select Local Image',
      'dialog.insertTable': 'Insert Table', 'dialog.rows': 'Rows', 'dialog.cols': 'Columns',
      'dialog.confirm': 'OK', 'dialog.cancel': 'Cancel',
      'help.gettingStarted': 'Getting Started', 'help.cheatsheet': 'Cheatsheet',
      'help.shortcuts': 'Shortcuts', 'help.tools': 'Tools', 'help.about': 'About',
      'editor.placeholder': 'Start writing Markdown here...',
      'recentFiles.empty': 'No recent files',
      'file.unsavedChanges': 'You have unsaved changes. Continue?',
      'dialog.unsavedChanges': 'This file has unsaved changes. Close anyway?',
      'tab.untitled': 'Untitled',
      'desktopPrompt.text': 'Tip: This is the web version. Files are saved in your browser. Want to save to your computer?', 'desktopPrompt.link': 'Download Desktop App',
    }
  };

  // Fallback translations for languages without full built-in support
  const fallbackChain = {
    'zh-TW': 'zh-CN', 'ja-JP': 'en-US', 'ko-KR': 'en-US',
    'fr-FR': 'en-US', 'de-DE': 'en-US', 'es-ES': 'en-US',
    'pt-BR': 'en-US', 'ru-RU': 'en-US', 'ar-SA': 'en-US', 'hi-IN': 'en-US'
  };

  function detectLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

    const nav = navigator.language || navigator.userLanguage;
    if (SUPPORTED_LANGS.includes(nav)) return nav;

    const lang = nav.split('-')[0];
    const match = SUPPORTED_LANGS.find(l => l.startsWith(lang));
    return match || DEFAULT_LANG;
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    // Merge: builtin lang + fallback
    const fallback = fallbackChain[lang];
    translations = {};
    if (fallback && builtinTranslations[fallback]) {
      Object.assign(translations, builtinTranslations[fallback]);
    }
    if (builtinTranslations[lang]) {
      Object.assign(translations, builtinTranslations[lang]);
    }

    applyToDOM();

    // Set document direction for RTL languages
    document.documentElement.dir = (lang === 'ar-SA') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // Update language selector
    const sel = document.getElementById('langSelect');
    if (sel) sel.value = lang;
  }

  function t(key) {
    return translations[key] || key;
  }

  function applyToDOM() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (text !== key) el.textContent = text;
    });

    // Translate title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = t(key);
      if (text !== key) el.title = text;
    });
  }

  function getLanguage() {
    return currentLang;
  }

  function getSupportedLanguages() {
    return [...SUPPORTED_LANGS];
  }

  return {
    detectLanguage, setLanguage, t, applyToDOM, getLanguage, getSupportedLanguages
  };
})();