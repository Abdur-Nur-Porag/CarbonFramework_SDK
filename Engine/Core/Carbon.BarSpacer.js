/*
 * Carbon.BarSpacer.js
 * ─────────────────────────────────────────────────────────────────
 * AppBar and BottomBar are absolutely-positioned overlays that sit on
 * top of AppBody (see Carbon.Style.css) — this is what lets a
 * Type="Transparent" bar visually reveal AppBody's scrolled content
 * behind it, instead of just being an empty color with nothing to
 * show through (the old flex-stacked layout never overlapped).
 *
 * AppBody always fills the FULL App container from top to bottom.
 * This script measures each bar's live rendered height and applies
 * it as --appbar-space / --bottombar-space on the sibling AppBody:
 *
 *   - Opaque bar  → padding reserved (same visual result as before)
 *   - Type="Transparent" bar → padding is 0, so content starts under
 *     the bar immediately and keeps scrolling directly behind it,
 *     visible through the transparent background.
 *
 * Runs automatically for every <App> on the page, including ones
 * rendered dynamically by JSX/PageView after DOMContentLoaded.
 */
(function () {

  function isTransparent(bar) {
    const t = (bar.getAttribute('Type') || bar.getAttribute('type') || '').toLowerCase();
    return t === 'transparent';
  }

  function findBars(appEl) {
    return {
      appBar:    appEl.querySelector(':scope > AppBar, :scope > appbar'),
      bottomBar: appEl.querySelector(':scope > BottomBar, :scope > bottombar'),
      appBody:   appEl.querySelector(':scope > AppBody, :scope > appbody'),
    };
  }

  function updateSpacing(appEl) {
    const { appBar, bottomBar, appBody } = findBars(appEl);
    if (!appBody) return;

    const topSpace = (appBar && !isTransparent(appBar) && appBar.offsetHeight)
      ? `${appBar.offsetHeight}px`
      : '0px';

    const bottomHidden = bottomBar && bottomBar.getAttribute('hidden') === 'true';
    const bottomSpace = (bottomBar && !bottomHidden && !isTransparent(bottomBar) && bottomBar.offsetHeight)
      ? `${bottomBar.offsetHeight}px`
      : '0px';

    appBody.style.setProperty('--appbar-space', topSpace);
    appBody.style.setProperty('--bottombar-space', bottomSpace);
  }

  function observeApp(appEl) {
    if (appEl.dataset.barSpacerInit) return; // avoid double-wiring the same <App>
    appEl.dataset.barSpacerInit = '1';

    const run = () => updateSpacing(appEl);
    run();

    let resizeObs = null;
    let attrObs = null;

    function wireBarObservers() {
      if (resizeObs) resizeObs.disconnect();
      if (attrObs) attrObs.disconnect();

      resizeObs = new ResizeObserver(run);
      attrObs = new MutationObserver(run);

      const { appBar, bottomBar } = findBars(appEl);
      [appBar, bottomBar].forEach(bar => {
        if (!bar) return;
        resizeObs.observe(bar);
        attrObs.observe(bar, { attributes: true, attributeFilter: ['Type', 'type', 'hidden'] });
      });
    }

    wireBarObservers();

    // Re-wire if AppBar/BottomBar are added, removed, or replaced later
    // (e.g. conditional rendering inside JSX).
    const childObs = new MutationObserver(() => {
      wireBarObservers();
      run();
    });
    childObs.observe(appEl, { childList: true });
  }

  function scanForApps(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName && root.tagName.toLowerCase() === 'app') observeApp(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('App, app').forEach(observeApp);
    }
  }

  // Initial boot — covers <App> elements already in the DOM at load time.
  document.addEventListener('DOMContentLoaded', () => {
    scanForApps(document.documentElement);
  });

  // Watch for <App> elements injected later by JSX / PageView, which
  // render after DOMContentLoaded has already fired.
  const globalObserver = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => scanForApps(node));
    });
  });
  globalObserver.observe(document.documentElement, { childList: true, subtree: true });

})();
