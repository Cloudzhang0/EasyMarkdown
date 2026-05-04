/**
 * Toolbar module - Formatting buttons
 */
var Toolbar = (() => {
  var headingDropdown = null;

  function init() {
    var toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    // Heading button with dropdown
    var headingBtn = toolbar.querySelector('[data-action="heading"]');
    if (headingBtn) {
      headingDropdown = document.createElement('div');
      headingDropdown.className = 'heading-dropdown';
      for (var i = 1; i <= 6; i++) {
        (function(level) {
          var btn = document.createElement('button');
          btn.className = 'h' + level;
          btn.textContent = 'H' + level;
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            applyHeading(level);
            headingDropdown.classList.remove('show');
          });
          headingDropdown.appendChild(btn);
        })(i);
      }
      headingBtn.style.position = 'relative';
      headingBtn.appendChild(headingDropdown);

      headingBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        headingDropdown.classList.toggle('show');
      });
    }

    // Other toolbar buttons
    var btns = toolbar.querySelectorAll('.toolbar-btn');
    for (var j = 0; j < btns.length; j++) {
      (function(btn) {
        if (btn.dataset.action === 'heading') return;
        btn.addEventListener('click', function() {
          var action = btn.dataset.action;
          if (action && typeof App !== 'undefined') {
            App.exec(action);
          }
        });
      })(btns[j]);
    }

    // Close heading dropdown on outside click
    document.addEventListener('click', function() {
      if (headingDropdown) headingDropdown.classList.remove('show');
    });
  }

  function applyHeading(level) {
    var prefix = '';
    for (var i = 0; i < level; i++) prefix += '#';
    prefix += ' ';
    Editor.insertLinePrefix(prefix);
  }

  return { init: init };
})();