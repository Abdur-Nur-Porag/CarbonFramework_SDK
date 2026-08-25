  /*
    NativeButton behavior layer.
    <NativeButton> is not a native form control, so this script
    gives it button semantics: role, keyboard support (Enter/Space),
    a pressed visual state, and disabled handling — while still
    letting it accept class / id / style / onclick / any normal
    HTML attribute exactly like a div would.
  */
  function initNativeButton(el){
    if (el.dataset.nbInit) return; // avoid double-binding
    el.dataset.nbInit = "true";

    const isDisabled = () => el.hasAttribute('disabled');

    // Accessibility semantics
    el.setAttribute('role', 'button');
    if (!isDisabled()) el.setAttribute('tabindex', '0');

    // Pressed state — mouse
    el.addEventListener('mousedown', () => {
      if (!isDisabled()) el.classList.add('nb-pressed');
    });
    el.addEventListener('mouseup', () => el.classList.remove('nb-pressed'));
    el.addEventListener('mouseleave', () => el.classList.remove('nb-pressed'));

    // Pressed state — touch
    el.addEventListener('touchstart', () => {
      if (!isDisabled()) el.classList.add('nb-pressed');
    }, { passive: true });
    el.addEventListener('touchend', () => el.classList.remove('nb-pressed'));

    // Keyboard support (Enter / Space act like a real button)
    el.addEventListener('keydown', (e) => {
      if (isDisabled()) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.classList.add('nb-pressed');
      }
    });
    el.addEventListener('keyup', (e) => {
      if (isDisabled()) return;
      if (e.key === 'Enter' || e.key === ' ') {
        el.classList.remove('nb-pressed');
        el.click(); // fires the same 'click' event a real button would
      }
    });

    // Keep tabindex / aria in sync if 'disabled' is toggled later
    const observer = new MutationObserver(() => {
      if (isDisabled()) {
        el.removeAttribute('tabindex');
        el.setAttribute('aria-disabled', 'true');
      } else {
        el.setAttribute('tabindex', '0');
        el.removeAttribute('aria-disabled');
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ['disabled'] });
  }

  // Initialize every <NativeButton> currently in the DOM
  document.querySelectorAll('nativebutton').forEach(initNativeButton);

  // Also initialize any <NativeButton> added later, dynamically
  new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'NATIVEBUTTON') initNativeButton(node);
        node.querySelectorAll && node.querySelectorAll('nativebutton').forEach(initNativeButton);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
