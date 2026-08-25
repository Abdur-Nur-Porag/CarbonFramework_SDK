(function() {
  'use strict';

  // --- Block copy/cut/context menu ---
  ['copy', 'cut', 'contextmenu', 'selectstart'].forEach(evt => {
    document.addEventListener(evt, (e) => e.preventDefault());
  });

  // --- Block drag on images/links ---
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'A') e.preventDefault();
  });

  // --- Block common DevTools / view-source shortcuts ---
  document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    const blocked =
      key === 'F12' ||
      key === 'F8' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) || // DevTools panels (incl. Firefox console)
      (e.ctrlKey && key === 'U') ||   // view-source
      (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(key)); // Mac Chrome/Safari variants

    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // capture phase, so it fires before page-level handlers

  // --- Console warning + soft window-size heuristic ---
  console.log('%cStop!', 'font-size:40px;color:red;font-weight:bold;');
  console.log('%cThis is a browser feature intended for developers. Content on this site is protected.', 'font-size:14px;');

  let devtoolsWarned = false;
  setInterval(() => {
    const threshold = 160;
    const isOpen =
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold;
    if (isOpen && !devtoolsWarned) {
      devtoolsWarned = true;
      console.clear();
      console.log('%cContent on this site is protected.', 'font-size:16px;color:red;');
    }
    if (!isOpen) devtoolsWarned = false;
  }, 1000);

})();