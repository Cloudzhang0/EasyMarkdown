/**
 * Status Bar module
 */
var StatusBar = (() => {
  var fileNameEl, saveStateEl, wordCountEl, charCountEl, lineColEl;
  var updateStatsTimer = null;

  function init() {
    fileNameEl = document.getElementById('statusFileName');
    saveStateEl = document.getElementById('statusSaveState');
    wordCountEl = document.getElementById('statusWordCount');
    charCountEl = document.getElementById('statusCharCount');
    lineColEl = document.getElementById('statusLineCol');
  }

  function setFileName(name) {
    if (fileNameEl) fileNameEl.textContent = name || I18n.t('status.untitled');
  }

  function setSaveState(state) {
    if (!saveStateEl) return;
    saveStateEl.className = 'status-item';
    if (state === 'saved') {
      saveStateEl.textContent = I18n.t('status.saved');
      saveStateEl.classList.add('save-saved');
    } else if (state === 'unsaved') {
      saveStateEl.textContent = I18n.t('status.unsaved');
      saveStateEl.classList.add('save-unsaved');
    } else if (state === 'saving') {
      saveStateEl.textContent = I18n.t('status.saving');
      saveStateEl.classList.add('save-saving');
    }
  }

  function updateStats(content) {
    clearTimeout(updateStatsTimer);
    updateStatsTimer = setTimeout(function() {
      if (wordCountEl) wordCountEl.textContent = I18n.t('status.words') + Utils.countWords(content);
      if (charCountEl) charCountEl.textContent = I18n.t('status.chars') + Utils.countChars(content);
    }, 200);
  }

  function updateCursorPosition(cm) {
    if (!lineColEl || !cm) return;
    var pos = cm.getCursor();
    lineColEl.textContent = 'Ln ' + (pos.line + 1) + ', Col ' + (pos.ch + 1);
  }

  return { init: init, setFileName: setFileName, setSaveState: setSaveState, updateStats: updateStats, updateCursorPosition: updateCursorPosition };
})();