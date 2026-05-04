/**
 * Utility functions
 */
var Utils = (() => {
  function debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function countWords(text) {
    if (!text || !text.trim()) return 0;
    // Handle CJK characters as individual words
    const cjk = text.match(/[一-鿿㐀-䶿豈-﫿　-〿＀-￯]/g);
    const cjkCount = cjk ? cjk.length : 0;
    // Remove CJK and count remaining words
    const withoutCJK = text.replace(/[一-鿿㐀-䶿豈-﫿　-〿＀-￯]/g, ' ');
    const latinWords = withoutCJK.trim().split(/\s+/).filter(w => w.length > 0);
    return cjkCount + latinWords.length;
  }

  function countChars(text) {
    return text ? text.length : 0;
  }

  function countParagraphs(text) {
    if (!text || !text.trim()) return 0;
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }

  function getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  function getFileNameWithoutExt(filename) {
    const parts = filename.split('.');
    if (parts.length > 1) parts.pop();
    return parts.join('.');
  }

  function isMarkdownFile(filename) {
    const ext = getFileExtension(filename);
    return ext === 'md' || ext === 'markdown';
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    debounce, countWords, countChars, countParagraphs,
    getFileExtension, getFileNameWithoutExt, isMarkdownFile,
    downloadFile, readFileAsText, escapeHtml
  };
})();