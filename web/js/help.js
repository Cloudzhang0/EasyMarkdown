/**
 * Help module - Getting started, cheatsheet, shortcuts, tools, about
 */
var Help = (() => {
  let overlay, body, tabsContainer, closeBtn;
  let currentTab = 'gettingStarted';

  function init() {
    overlay = document.getElementById('helpOverlay');
    body = document.getElementById('helpBody');
    tabsContainer = document.getElementById('helpTabs');
    closeBtn = document.getElementById('helpClose');

    closeBtn.addEventListener('click', hide);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hide();
    });
  }

  function show(tab) {
    currentTab = tab || 'gettingStarted';
    renderTabs();
    renderContent();
    overlay.style.display = 'flex';
  }

  function hide() {
    overlay.style.display = 'none';
  }

  function renderTabs() {
    const tabs = [
      { id: 'gettingStarted', label: I18n.t('help.gettingStarted') },
      { id: 'cheatsheet', label: I18n.t('help.cheatsheet') },
      { id: 'shortcuts', label: I18n.t('help.shortcuts') },
      { id: 'tools', label: I18n.t('help.tools') },
      { id: 'about', label: I18n.t('help.about') },
    ];
    tabsContainer.innerHTML = '';
    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'help-tab' + (tab.id === currentTab ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        currentTab = tab.id;
        renderTabs();
        renderContent();
      });
      tabsContainer.appendChild(btn);
    });
  }

  function renderContent() {
    switch (currentTab) {
      case 'gettingStarted': renderGettingStarted(); break;
      case 'cheatsheet': renderCheatsheet(); break;
      case 'shortcuts': renderShortcuts(); break;
      case 'tools': renderTools(); break;
      case 'about': renderAbout(); break;
    }
  }

  function renderGettingStarted() {
    body.innerHTML = `
      <h1>Markdown 入门用法 / Getting Started with Markdown</h1>

      <h2>什么是 Markdown？ / What is Markdown?</h2>
      <p>Markdown 是一种轻量级标记语言，由 John Gruber 于 2004 年创建。它允许人们使用易读易写的纯文本格式编写文档，然后将其转换为有效的 HTML。</p>
      <p>Markdown is a lightweight markup language created by John Gruber in 2004. It allows you to write documents in plain text that is easy to read and write, then convert it to valid HTML.</p>

      <h2>Markdown 的优势 / Advantages</h2>
      <ul>
        <li>简单易学，语法直观 / Simple to learn, intuitive syntax</li>
        <li>纯文本格式，兼容性极强 / Plain text format, highly compatible</li>
        <li>广泛用于文档编写、博客、技术文档 / Widely used for docs, blogs, technical writing</li>
        <li>可转换为 HTML、PDF 等多种格式 / Convertible to HTML, PDF, and more</li>
      </ul>

      <h2>快速上手 / Quick Start</h2>
      <h3>标题 / Headings</h3>
      <pre><code># H1 标题
## H2 标题
### H3 标题</code></pre>

      <h3>强调 / Emphasis</h3>
      <pre><code>**粗体文本** / **Bold text**
*斜体文本* / *Italic text*
~~删除线~~ / ~~Strikethrough~~</code></pre>

      <h3>列表 / Lists</h3>
      <pre><code>- 无序列表项 1 / Unordered item 1
- 无序列表项 2 / Unordered item 2

1. 有序列表项 1 / Ordered item 1
2. 有序列表项 2 / Ordered item 2</code></pre>

      <h3>链接和图片 / Links & Images</h3>
      <pre><code>[链接文本](https://example.com) / [Link text](URL)
![替代文本](图片URL) / ![Alt text](image URL)</code></pre>

      <h3>代码 / Code</h3>
      <pre><code>\`行内代码\` / \`inline code\`

\`\`\`javascript
// 代码块 / Code block
console.log("Hello, Markdown!");
\`\`\`</code></pre>

      <h2>编辑器使用 / Using the Editor</h2>
      <ul>
        <li>左侧为编辑区，右侧为预览区 / Left: editor, Right: preview</li>
        <li>使用工具栏按钮快速格式化 / Use toolbar buttons for quick formatting</li>
        <li>支持键盘快捷键 / Keyboard shortcuts supported</li>
        <li>内容自动保存到浏览器本地存储 / Auto-saved to local storage</li>
        <li>可通过菜单或快捷键 Ctrl+Shift+P 隐藏预览 / Toggle preview with Ctrl+Shift+P</li>
      </ul>
    `;
  }

  function renderCheatsheet() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? '⌘' : 'Ctrl';

    body.innerHTML = `
      <h1>Markdown 语法速查表 / Markdown Cheatsheet</h1>
      <input type="text" class="cheatsheet-search" placeholder="搜索语法... / Search syntax..." id="cheatsheetSearch">

      <div id="cheatsheetList">
        ${cheatsheetItem('headings', '标题 / Headings', '# H1', '<h1>H1</h1>', '## H2', '<h2>H2</h2>', '### H3', '<h3>H3</h3>')}
        ${cheatsheetItem('bold', '粗体 / Bold', '**text**', '<strong>text</strong>')}
        ${cheatsheetItem('italic', '斜体 /Italic', '*text*', '<em>text</em>')}
        ${cheatsheetItem('strikethrough', '删除线 / Strikethrough', '~~text~~', '<del>text</del>')}
        ${cheatsheetItem('superscript', '上标 / Superscript', 'text^{super}', 'text<sup>super</sup>')}
        ${cheatsheetItem('subscript', '下标 / Subscript', 'text_{sub}', 'text<sub>sub</sub>')}
        ${cheatsheetItem('ul', '无序列表 / Unordered List', '- Item 1\\n- Item 2', '<ul><li>Item 1</li><li>Item 2</li></ul>')}
        ${cheatsheetItem('ol', '有序列表 / Ordered List', '1. Item 1\\n2. Item 2', '<ol><li>Item 1</li><li>Item 2</li></ol>')}
        ${cheatsheetItem('task', '任务列表 / Task List', '- [x] Done\\n- [ ] Todo', '<input type=checkbox checked> Done<br><input type=checkbox> Todo')}
        ${cheatsheetItem('code', '行内代码 / Inline Code', '\`code\`', '<code>code</code>')}
        ${cheatsheetItem('codeblock', '代码块 / Code Block', '\`\`\`javascript\\nconsole.log("hi");\\n\`\`\`', '<pre><code>console.log("hi");</code></pre>')}
        ${cheatsheetItem('blockquote', '引用块 / Blockquote', '> quote text', '<blockquote>quote text</blockquote>')}
        ${cheatsheetItem('link', '链接 / Link', '[text](url)', '<a href="#">text</a>')}
        ${cheatsheetItem('image', '图片 / Image', '![alt](url)', '<img src="#" alt="alt">')}
        ${cheatsheetItem('table', '表格 / Table', '| H1 | H2 |\\n|---|---|\\n| A  | B  |', '<table><tr><th>H1</th><th>H2</th></tr><tr><td>A</td><td>B</td></tr></table>')}
        ${cheatsheetItem('hr', '水平线 / Horizontal Rule', '--- or ***', '<hr>')}
        ${cheatsheetItem('footnote', '脚注 / Footnote', 'text[^1]\\n\\n[^1]: note', 'text<sup>1</sup><br><small>1: note</small>')}
        ${cheatsheetItem('math', '数学公式 / Math', '$E=mc^2$ or $$\\sum_i x_i$$', 'E=mc²')}
        ${cheatsheetItem('mermaid', 'Mermaid 图表 / Diagrams', '\`\`\`mermaid\\ngraph TD\\n  A-->B\\n\`\`\`', '(rendered diagram)')}
      </div>
    `;

    // Search functionality
    const searchInput = document.getElementById('cheatsheetSearch');
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      document.querySelectorAll('.cheatsheet-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  function cheatsheetItem(id, title, source, render, source2, render2, source3, render3) {
    let examples = `
      <div class="cheatsheet-example">
        <div class="cheatsheet-source">${source}</div>
        <div class="cheatsheet-render">${render}</div>
      </div>`;
    if (source2) {
      examples += `
      <div class="cheatsheet-example">
        <div class="cheatsheet-source">${source2}</div>
        <div class="cheatsheet-render">${render2}</div>
      </div>`;
    }
    if (source3) {
      examples += `
      <div class="cheatsheet-example">
        <div class="cheatsheet-source">${source3}</div>
        <div class="cheatsheet-render">${render3}</div>
      </div>`;
    }
    return `<div class="cheatsheet-item" data-id="${id}"><h3>${title}</h3>${examples}</div>`;
  }

  function renderShortcuts() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const all = Shortcuts.getAll();

    let html = '<h1>' + I18n.t('help.shortcuts') + '</h1><div class="shortcuts-grid">';
    all.forEach(s => {
      const keys = isMac ? s.macKeys : s.keys;
      const label = I18n.t('menu.' + s.action) || s.action;
      html += `<div class="shortcut-item">
        <span>${label}</span>
        <span class="shortcut-keys">${keys.map(k => `<span class="key">${k}</span>`).join('+')}</span>
      </div>`;
    });
    html += '</div>';
    body.innerHTML = html;
  }

  function renderTools() {
    body.innerHTML = `
      <h1>常用工具 / Useful Tools</h1>

      <h2>在线 Markdown 编辑器 / Online Editors</h2>
      <ul>
        <li><a href="https://dillinger.io" target="_blank">Dillinger</a> - 在线 Markdown 编辑器，支持云存储集成</li>
        <li><a href="https://stackedit.io" target="_blank">StackEdit</a> - 功能强大的在线 Markdown 编辑器</li>
        <li><a href="https://markdownlivepreview.com" target="_blank">Markdown Live Preview</a> - 实时预览编辑器</li>
      </ul>

      <h2>桌面编辑器 / Desktop Editors</h2>
      <ul>
        <li><a href="https://typora.io" target="_blank">Typora</a> - 所见即所得的 Markdown 编辑器</li>
        <li><a href="https://marktext.app" target="_blank">Mark Text</a> - 开源 Markdown 编辑器</li>
        <li><a href="https://obsidian.md" target="_blank">Obsidian</a> - 知识管理和笔记应用</li>
        <li><a href="https://code.visualstudio.com" target="_blank">VS Code</a> - 通过插件支持 Markdown 编辑</li>
      </ul>

      <h2>转换工具 / Conversion Tools</h2>
      <ul>
        <li><a href="https://pandoc.org" target="_blank">Pandoc</a> - 万能文档转换工具</li>
        <li><a href="https://www.markdowntopdf.com" target="_blank">Markdown to PDF</a> - 在线转 PDF</li>
      </ul>

      <h2>图床服务 / Image Hosting</h2>
      <ul>
        <li><a href="https://imgur.com" target="_blank">Imgur</a> - 免费图片托管</li>
        <li><a href="https://sm.ms" target="_blank">SM.MS</a> - 免费图床服务</li>
      </ul>

      <h2>学习资源 / Learning Resources</h2>
      <ul>
        <li><a href="https://www.markdownguide.org" target="_blank">Markdown Guide</a> - 完整的 Markdown 参考指南</li>
        <li><a href="https://commonmark.org" target="_blank">CommonMark</a> - Markdown 标准规范</li>
        <li><a href="https://github.github.com/gfm/" target="_blank">GFM Spec</a> - GitHub Flavored Markdown 规范</li>
      </ul>
    `;
  }

  function renderAbout() {
    body.innerHTML = `
      <div class="about-content">
        <h2>EasyMarkdown</h2>
        <p class="about-version">Version 1.0.0</p>
        <p>A lightweight, browser-based Markdown editor with live preview.</p>
        <p>轻量级浏览器端 Markdown 编辑器，支持实时预览。</p>
        <div class="about-links">
          <span>Data stored locally only</span>
        </div>
        <p style="margin-top:16px;font-size:12px;color:var(--text-tertiary)">
          Built with CodeMirror, marked.js, highlight.js, DOMPurify, Mermaid, KaTeX
        </p>
      </div>
    `;
  }

  return { init, show, hide };
})();