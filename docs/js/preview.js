/**
 * Preview module - Markdown rendering with GFM, Mermaid, KaTeX
 */
var Preview = (() => {
  let previewEl = null;
  let updateTimer = null;
  const DEBOUNCE_DELAY = 300;
  let mermaidReady = false;
  let mermaidCounter = 0;

  function init() {
    previewEl = document.getElementById('previewContent');

    // Configure marked (highlight applied post-render since marked v12 deprecated highlight option)
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    // Initialize mermaid
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: document.body.classList.contains('theme-dark') ? 'dark' : 'default',
        securityLevel: 'loose',
      });
      mermaidReady = true;
    } catch (e) {
      mermaidReady = false;
    }
  }

  function update(content) {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => render(content), DEBOUNCE_DELAY);
  }

  function render(content) {
    if (!previewEl) return;

    // Process LaTeX math before marked parsing
    let processed = preprocessMath(content);

    // In Electron mode: resolve relative image paths to absolute file:// URLs
    if (window.electronAPI) {
      processed = resolveLocalImagePaths(processed);
    }

    // Render markdown to HTML
    let html = marked.parse(processed);

    // Sanitize HTML (preserve data-math for KaTeX, SVG attrs for Mermaid)
    // ALLOW_UNKNOWN_PROTOCOLS: allow file:// and relative image paths
    html = DOMPurify.sanitize(html, {
      ADD_TAGS: ['svg', 'path', 'line', 'polyline', 'polygon', 'circle', 'rect', 'text', 'g', 'defs', 'use', 'marker'],
      ADD_ATTR: ['viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'text-anchor', 'dominant-baseline', 'marker-end', 'marker-start', 'refX', 'refY', 'orient', 'markerWidth', 'markerHeight', 'data-math', 'class', 'src'],
      ALLOW_UNKNOWN_PROTOCOLS: true,
    });

    previewEl.innerHTML = html;

    // Add referrerpolicy to prevent hotlink blocking (e.g. CSDN images)
    previewEl.querySelectorAll('img').forEach(function(img) {
      img.setAttribute('referrerpolicy', 'no-referrer');
    });

    // Apply syntax highlighting to code blocks
    previewEl.querySelectorAll('pre code').forEach(block => {
      // Skip mermaid blocks (handled separately)
      if (block.classList.contains('language-mermaid')) return;
      try { hljs.highlightElement(block); }
      catch (e) { /* ignore */ }
    });

    // Process mermaid diagrams
    renderMermaid();

    // Process KaTeX math
    renderMath();

    // Process task lists
    processTaskLists();

    // Process local images (Electron only)
    processLocalImages();
  }

  function preprocessMath(text) {
    // Block math: $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
      return '<div class="katex-display-placeholder" data-math="' + encodeURIComponent(math.trim()) + '"></div>';
    });
    // Inline math: $...$  (but not $$)
    text = text.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (match, math) => {
      return '<span class="katex-inline-placeholder" data-math="' + encodeURIComponent(math.trim()) + '"></span>';
    });
    return text;
  }

  function renderMath() {
    if (typeof katex === 'undefined') return;

    // Block math
    previewEl.querySelectorAll('.katex-display-placeholder').forEach(el => {
      const math = decodeURIComponent(el.getAttribute('data-math'));
      try {
        el.innerHTML = katex.renderToString(math, { displayMode: true, throwOnError: false });
        el.classList.add('katex-display');
      } catch (e) {
        el.textContent = math;
      }
      el.classList.remove('katex-display-placeholder');
    });

    // Inline math
    previewEl.querySelectorAll('.katex-inline-placeholder').forEach(el => {
      const math = decodeURIComponent(el.getAttribute('data-math'));
      try {
        el.outerHTML = katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch (e) {
        el.textContent = math;
      }
    });
  }

  async function renderMermaid() {
    if (!mermaidReady) return;

    const mermaidEls = previewEl.querySelectorAll('code.language-mermaid');
    for (const el of mermaidEls) {
      const pre = el.parentElement;
      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = el.textContent;

      try {
        mermaidCounter++;
        const id = 'mermaid-' + mermaidCounter;
        const { svg } = await mermaid.render(id, el.textContent);
        container.innerHTML = svg;
        pre.replaceWith(container);
      } catch (e) {
        container.textContent = el.textContent;
        container.style.color = 'var(--danger)';
        pre.replaceWith(container);
      }
    }
  }

  function processTaskLists() {
    previewEl.querySelectorAll('li').forEach(li => {
      const text = li.innerHTML;
      if (text.startsWith('[ ] ') || text.startsWith('[x] ') || text.startsWith('[X] ')) {
        const checked = text.startsWith('[x] ') || text.startsWith('[X] ');
        li.classList.add('task-list-item');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.disabled = true;
        li.innerHTML = text.replace(/^\[[ xX]\]\s/, '');
        li.insertBefore(checkbox, li.firstChild);
      }
    });
  }

  // Resolve relative image paths in markdown to absolute file:// URLs (Electron only)
  // This runs BEFORE marked.parse() so DOMPurify can't strip the resolved URLs
  function resolveLocalImagePaths(content) {
    if (!window.electronAPI) return content;

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
    if (!currentDir) return content;

    // Match markdown image syntax: ![alt](path)
    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, src) {
      // Skip URLs and data URIs
      if (/^(https?:|data:|file:)/.test(src)) return match;
      // Skip if src is empty
      if (!src.trim()) return match;
      // Resolve relative path to absolute file:// URL
      var absPath = currentDir + '/' + src.replace(/^\.\//, '');
      // Normalize path separators
      absPath = absPath.replace(/\\/g, '/');
      // Encode spaces and special characters for URL
      absPath = encodeURI(absPath);
      // Ensure proper file:// URL format
      if (!absPath.startsWith('file://')) {
        absPath = 'file:///' + absPath;
      }
      return '![' + alt + '](' + absPath + ')';
    });
  }

  function processLocalImages() {
    if (!window.electronAPI || !window.electronAPI.resolveImage) return;
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
    if (!currentDir) return;

    previewEl.querySelectorAll('img').forEach(function(img) {
      var src = img.getAttribute('src');
      if (!src) return;
      if (/^(https?:|data:)/.test(src)) return;

      window.electronAPI.resolveImage(src, currentDir).then(function(dataUrl) {
        if (dataUrl && dataUrl !== src) {
          img.src = dataUrl;
        }
      });
    });
  }

  function updateTheme() {
    if (mermaidReady) {
      mermaid.initialize({
        startOnLoad: false,
        theme: document.body.classList.contains('theme-dark') ? 'dark' : 'default',
        securityLevel: 'loose',
      });
    }
    // Re-render highlight.js theme
    const isDark = document.body.classList.contains('theme-dark');
    const lightSheet = document.getElementById('hljs-light');
    const darkSheet = document.getElementById('hljs-dark');
    if (lightSheet) lightSheet.disabled = isDark;
    if (darkSheet) darkSheet.disabled = !isDark;
  }

  function getExportHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EasyMarkdown Export</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 860px; margin: 0 auto; padding: 32px; color: #24292f; line-height: 1.6; font-size: 14px; }
h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
a { color: #0969da; text-decoration: none; } a:hover { text-decoration: underline; }
code { padding: 0.2em 0.4em; background: #f6f8fa; border-radius: 3px; font-size: 85%; }
pre { padding: 16px; background: #f6f8fa; border-radius: 4px; overflow: auto; border: 1px solid #e8eaed; }
pre code { padding: 0; background: transparent; }
blockquote { border-left: 4px solid #d0d7de; padding: 0 1em; color: #57606a; margin: 0 0 16px; }
table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
th, td { padding: 6px 13px; border: 1px solid #d0d7de; }
th { background: #f6f8fa; }
img { max-width: 100%; }
hr { height: 0.25em; background: #d0d7de; border: 0; margin: 24px 0; }
.task-list-item { list-style: none; margin-left: -1.5em; }
.task-list-item input { margin-right: 0.5em; }
</style>
</head>
<body>
${previewEl.innerHTML}
</body>
</html>`;
  }

  return {
    init, update, render, updateTheme, getExportHTML
  };
})();