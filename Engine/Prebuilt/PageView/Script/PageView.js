/* =========================================================
   LAYOUT FRAMEWORK
========================================================= */

class LayoutFramework {
  static instances = [];
  
  constructor(root) {
    this.root = root;
    this.body = root.querySelector("AppBody");
    this.scrollTimer = null;
    
    this.init();
    LayoutFramework.instances.push(this);
  }
  
  init() {
    this.applyDefaults();
    this.initScrollbar();
    this.observe();
    this.emitReady();
  }
  
  applyDefaults() {
    if (!this.body) return;
    if (!this.body.hasAttribute("type")) {
      this.body.setAttribute("type", "vscroll");
    }
    if (!this.body.hasAttribute("scrollbar")) {
      this.body.setAttribute("scrollbar", "true");
    }
  }
  
  initScrollbar() {
    if (!this.body) return;
    if (this.body.getAttribute("scrollbar") === "false") return;
    
    this.body.addEventListener("scroll", () => {
      this.body.classList.add("scrolling");
      clearTimeout(this.scrollTimer);
      
      this.scrollTimer = setTimeout(() => {
        this.body.classList.remove("scrolling");
      }, 1200);
    }, { passive: true });
  }
  
  observe() {
    this.observer = new MutationObserver(() => {
      this.update();
    });
    
    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }
  
  update() {}
  
  scrollToTop(smooth = true) {
    this.body?.scrollTo({
      top: 0,
      behavior: smooth ? "smooth" : "auto"
    });
  }
  
  scrollToLeft(smooth = true) {
    this.body?.scrollTo({
      left: 0,
      behavior: smooth ? "smooth" : "auto"
    });
  }
  
  destroy() {
    this.observer?.disconnect();
  }
  
  emitReady() {
    this.root.dispatchEvent(
      new CustomEvent("layout-ready", { detail: this })
    );
  }
}

document.querySelectorAll("App").forEach(app => {
  app.__layout = new LayoutFramework(app);
});
window.LayoutFramework = LayoutFramework;





const Carbon = {
  pages: {},
  currentPage: null,
  isTransitioning: false,
  
  _resetPageDOM: function(element) {
    if (!element) return;
    element.querySelectorAll('input, textarea, select').forEach(field => {
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = field.defaultChecked || false;
      } else {
        field.value = field.defaultValue || '';
      }
    });
  },
  
  // Fallback parser for time formats
  _parseTime: function(timeStr) {
    if (!timeStr) return '0ms';
    return typeof timeStr === 'number' ? `${timeStr}ms` : timeStr;
  },
  
  // Calculate fallback timeout to prevent animation hangs
  _getMs: function(timeStr) {
    if (!timeStr) return 0;
    const isSec = timeStr.includes('s') && !timeStr.includes('ms');
    return parseFloat(timeStr) * (isSec ? 1000 : 1) + 50;
  },
  
  // NEW ATTRIBUTE: Backpress(ctx) — optional. When set, this page owns its
  // own backpress handling ("sub router stack") instead of the main Router
  // stack logic, for as long as it stays active (re-armed every time this
  // page becomes current). Call ctx.BackpressEnd() from inside it to hand
  // control back to the main Router. See Router.js's "pageview" backpress
  // case for how it's actually invoked.
  //   Carbon.PageView({
  //     Name: "Settings",
  //     Backpress: function(){ this.BackpressEnd(); },   // regular function: `this` works
  //     // or: Backpress: (ctx) => { ctx.BackpressEnd(); }  // arrow function: use the arg instead
  //   })
  PageView: function(config) {
    const isInitial = !!config.Initial;
    this.pages[config.Name] = { ...config, Initial: isInitial };
    
    if (isInitial) {
      const initPage = () => OpenPageView({ Target: config.Name });
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initPage);
      } else {
        setTimeout(initPage, 0);
      }
    }
  },
  
  // FIX: navigate now returns true/false so callers (Router) can tell
  // whether the navigation actually happened or was silently dropped
  // (locked / already-there), instead of assuming success every time.
  navigate: async function(config, mode = 'open') {
    // Backwards compatibility for string inputs
    if (typeof config === 'string') {
      config = { Target: config };
    }
    
    const { Target, Delay = 0, AnimationName, AnimationTime = '300ms' } = config;
    
    if (this.isTransitioning) {
      console.warn(`Carbon: Transition locked. Ignored action for "${Target}".`);
      return false; // FIX: signal that nothing happened
    }
    if (this.currentPage === Target) return true; // FIX: already in the requested state — not a failure, just a no-op
    
    const newPage = this.pages[Target];
    const targetEl = document.querySelector(`PageView[Name="${Target}"], pageview[Name="${Target}"]`);
    const currentEl = this.currentPage ? document.querySelector(`PageView[Name="${this.currentPage}"], pageview[Name="${this.currentPage}"]`) : null;
    
    if (!newPage || !targetEl) {
      console.warn(`Carbon: Page "${Target}" not found.`);
      return false; // FIX: signal failure
    }
    
    this.isTransitioning = true;
    /* GUARD TRIGGER: flip Router's isPageViewLoaded ref to false the moment
       a real transition starts. typeof-checked so Carbon.js can safely load
       before Router.js has defined window.isPageViewLoaded. This is what
       makes Router reject fast/double backpress and nav taps while this
       transition (delay + animation + lifecycle hooks) is in flight. */
    if (window.isPageViewLoaded) window.isPageViewLoaded.value = false;
    
    try {
      // 1. DELAY EXECUTION
      if (Delay > 0) {
        await new Promise(res => setTimeout(res, Delay));
      }
      
      // 2. PREPARE NEW PAGE
      this._resetPageDOM(targetEl);
      if (newPage.OnStart) await newPage.OnStart();
      
      const animDuration = this._parseTime(AnimationTime);
      const hasAnim = !!AnimationName;
      
      // 3. ANIMATION LOGIC
      if (mode === 'open') {
        // Opening: New page overlays current page and animates
        if (currentEl) currentEl.style.zIndex = '1';
        targetEl.style.zIndex = '10';
        targetEl.setAttribute('active', 'true');
        
        if (hasAnim) {
          targetEl.style.animation = `${AnimationName} ${animDuration} ease forwards`;
          await new Promise(resolve => {
            targetEl.addEventListener('animationend', resolve, { once: true });
            setTimeout(resolve, this._getMs(animDuration));
          });
        }
      } else if (mode === 'close') {
        // Closing: Current page animates out, revealing target page behind it
        targetEl.style.zIndex = '1';
        targetEl.setAttribute('active', 'true');
        
        if (currentEl) {
          currentEl.style.zIndex = '10';
          if (hasAnim) {
            currentEl.style.animation = `${AnimationName} ${animDuration} ease forwards`;
            await new Promise(resolve => {
              currentEl.addEventListener('animationend', resolve, { once: true });
              setTimeout(resolve, this._getMs(animDuration));
            });
          }
        }
      }
      
      // 4. GHOST VIEW CLEANUP (Force wipe states to prevent stuck views)
      document.querySelectorAll('PageView, pageview').forEach(el => {
        el.style.animation = ''; // Clear animations
        el.style.zIndex = ''; // Clear inline z-indexes
        if (el !== targetEl) {
          el.removeAttribute('active'); // Hide non-targets
        }
      });
      
      // 5. LIFECYCLE SCRIPTS
      if (this.currentPage && this.pages[this.currentPage]?.OnFinished) {
        await this.pages[this.currentPage].OnFinished();
      }
      
      this.currentPage = Target;

      // NEW: (re)activate this page's own Backpress override, if it defines
      // one, every time the page becomes current. `Backpress` was already
      // captured on `newPage` by PageView()'s `{ ...config }` spread — no
      // separate registration needed. Router.js checks this flag on every
      // backpress and, while true, hands the whole event to newPage.Backpress
      // instead of running its own stack logic. The dev turns it back off
      // from inside that handler by calling ctx.BackpressEnd(), at which
      // point later backpresses on this page fall back to the main Router
      // until the page is (re)entered again.
      newPage._backpressActive = typeof newPage.Backpress === 'function';

      if (newPage.OnScript) {
        setTimeout(async () => { await newPage.OnScript(); }, 0);
      }
      
      return true; // FIX: signal success
      
    } catch (error) {
      console.error("Carbon Router Error:", error);
      return false; // FIX: signal failure
    } finally {
      this.isTransitioning = false;
      /* GUARD TRIGGER: release the flag once the transition — success or
         error — is fully finished. This runs in `finally` so a thrown error
         mid-transition can never leave Router permanently locked out. */
      if (window.isPageViewLoaded) window.isPageViewLoaded.value = true;
    }
  }
};

// Global API
// Android-style pattern: the drawer/actionsheet close is triggered
// synchronously (closeDrawer/closeActionSheet just flip a CSS class,
// no await), then Carbon.navigate is fired on the very next line.
// Both animations then run concurrently via CSS transitions — the
// drawer/sheet slides away while the new page transition plays,
// matching Android's DrawerLayout.closeDrawer() + fragment transaction
// behavior (trigger both in the same tap handler, don't stage them).
//
// FIX: both functions now return the Carbon.navigate promise (resolves
// true/false) instead of firing-and-forgetting, so callers like Router
// can know whether the navigation actually happened before updating
// their own bookkeeping.
const OpenPageView = (config) => {
  if (drawerNameRegistery.length > 0) {
    closeDrawer(drawerNameRegistery[drawerNameRegistery.length - 1]);
  }
  if (actionsheetNameRegistary.length > 0) {
    closeActionSheet(actionsheetNameRegistary[actionsheetNameRegistary.length - 1]);
  }
  if (dialogsheetNameRegistary.length > 0) { // NEW
    closeDialogSheet(dialogsheetNameRegistary[dialogsheetNameRegistary.length - 1]); // NEW
  }
  return Carbon.navigate(config, 'open'); // FIX: return the promise
}

const ClosePageView = (config) => {
  if (drawerNameRegistery.length > 0) {
    closeDrawer(drawerNameRegistery[drawerNameRegistery.length - 1]);
  }
  if (actionsheetNameRegistary.length > 0) {
    closeActionSheet(actionsheetNameRegistary[actionsheetNameRegistary.length - 1]);
  }
  if (dialogsheetNameRegistary.length > 0) { // NEW
    closeDialogSheet(dialogsheetNameRegistary[dialogsheetNameRegistary.length - 1]); // NEW
  }
  return Carbon.navigate(config, 'close'); // FIX: return the promise
}
