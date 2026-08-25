const ActionSheetRegistry = {};
const ActionSheetCallbacks = {};
const actionsheetNameRegistary = [];

const ActionSheetEngine = {
  // Helper to calculate Material Shadow based on Elevation 0-10
  getShadow(level) {
    const val = Math.min(Math.max(parseInt(level) || 0, 0), 10);
    if (val === 0) return 'none';
    const blur = val * 4;
    const spread = val * 0.5;
    const alpha = (val * 0.03) + 0.05;
    return `0px -${val}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`;
  },
  
  initSheet(el) {
    const name = el.getAttribute('Name');
    const pos = (el.getAttribute('Position') || 'Bottom').toLowerCase();
    const hasNotch = el.getAttribute('Notch') === 'true';
    const elevation = el.getAttribute('Elevation') || '2';
    
    // 1. Create Overlay (Global Singleton)
    if (!document.getElementById('as-global-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'as-global-overlay';
      overlay.className = 'as-overlay';
      // Backdrop click does not auto-close the sheet, it only fires
      // whatever callback was registered via
      // ActionSheet("name").clickBackdrop(callback)
      overlay.addEventListener('click', (e) => {
        document.querySelectorAll('.as-wrapper.active').forEach((wrapper) => {
          const activeName = wrapper.dataset.name;
          const cb = ActionSheetCallbacks[activeName] && ActionSheetCallbacks[activeName].backdrop;
          if (typeof cb === 'function') cb(e);
        });
      });
      document.body.appendChild(overlay);
    }
    
    // 2. Create UI Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `as-wrapper as-${pos}`;
    wrapper.dataset.name = name;
    wrapper.style.boxShadow = this.getShadow(elevation);
    
    if (hasNotch) {
      const notch = document.createElement('div');
      notch.className = 'as-notch';
      wrapper.appendChild(notch);
    }
    
    // 3. Migrate Content
    while (el.firstChild) {
      wrapper.appendChild(el.firstChild);
    }
    
    // 4. Register
    document.body.appendChild(wrapper);
    ActionSheetRegistry[name] = wrapper;
    el.remove();
  }
};

// --- API Methods ---
window.openActionSheet = (name) => {
  const sheet = ActionSheetRegistry[name];
  if (sheet) {
    actionsheetNameRegistary.push(name);
    document.getElementById('as-global-overlay').classList.add('active');
    sheet.classList.add('active');
  }
};

window.closeActionSheet = (name) => {
  const sheet = ActionSheetRegistry[name];
  if (sheet) {
    actionsheetNameRegistary.pop();
    sheet.classList.remove('active');
    // Check if any other sheets are still open before hiding overlay
    // (synchronous — runs concurrently with any page transition
    // triggered right after this call)
    const anyActive = document.querySelector('.as-wrapper.active');
    if (!anyActive) {
      document.getElementById('as-global-overlay').classList.remove('active');
    }
  }
};

// Fluent API: ActionSheet("name").clickBackdrop(callback)
window.ActionSheet = (name) => ({
  clickBackdrop(callback) {
    if (!ActionSheetCallbacks[name]) ActionSheetCallbacks[name] = {};
    ActionSheetCallbacks[name].backdrop = callback;
    return this;
  }
});

// Observer for Dynamic Injection
const observer_2 = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'ACTIONSHEET') ActionSheetEngine.initSheet(node);
    });
  });
});

observer_2.observe(document.documentElement, { childList: true, subtree: true });

// Initial Boot
document.querySelectorAll('ActionSheet').forEach(el => ActionSheetEngine.initSheet(el));