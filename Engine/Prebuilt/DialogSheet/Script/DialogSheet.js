const DialogSheetRegistry = {};
const DialogSheetCallbacks = {};
const dialogsheetNameRegistary = [];

const DialogSheetEngine = {
  // Helper to calculate Material Shadow based on Elevation 0-10
  getShadow(level) {
    const val = Math.min(Math.max(parseInt(level) || 0, 0), 10);
    if (val === 0) return 'none';
    const blur = val * 4;
    const spread = val * 0.5;
    const alpha = (val * 0.03) + 0.05;
    return `0px ${val}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`;
  },

  initSheet(el) {
    // Guard: if this element was already processed (synchronous call from a
    // picker init), the MutationObserver will fire again for the same node
    // after it has already been removed. Skip to avoid double-init.
    if (!el.isConnected || el.dataset.dsInit) return;
    el.dataset.dsInit = '1';

    const name = el.getAttribute('Name') || el.getAttribute('name');
    if (!name) return;

    const size = (el.getAttribute('Size') || el.getAttribute('size') || 'Medium').toLowerCase();
    const elevation = el.getAttribute('Elevation') || el.getAttribute('elevation') || '4';

    // 1. Create Overlay (Global Singleton)
    if (!document.getElementById('ds-global-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'ds-global-overlay';
      overlay.className = 'ds-overlay';

      // Fire callback only for the topmost active sheet on backdrop click
      overlay.addEventListener('click', (e) => {
        if (e.target !== overlay) return;

        const activeName = dialogsheetNameRegistary[dialogsheetNameRegistary.length - 1];
        if (activeName) {
          const cb = DialogSheetCallbacks[activeName] && DialogSheetCallbacks[activeName].backdrop;
          if (typeof cb === 'function') cb(e);
        }
      });

      document.body.appendChild(overlay);
    }

    // 2. Create UI Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `ds-wrapper ds-${size}`;
    wrapper.dataset.name = name;
    wrapper.style.boxShadow = this.getShadow(elevation);

    // 2b. Carry over any custom data-* attributes set on the source element
    // (e.g. CarbonMultipleSelect sets data-multi="true" on its DialogSheet
    // tag). These would otherwise be lost since only child nodes are
    // migrated below, not the element's own attributes.
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && attr.name !== 'data-ds-init') {
        wrapper.setAttribute(attr.name, attr.value);
      }
    });

    // 3. Migrate Content
    while (el.firstChild) {
      wrapper.appendChild(el.firstChild);
    }

    // 4. Register inside overlay
    document.getElementById('ds-global-overlay').appendChild(wrapper);
    DialogSheetRegistry[name] = wrapper;
    el.remove();
  }
};

// --- Core Open / Close Functions ---
window.openDialogSheet = (name) => {
  const sheet = DialogSheetRegistry[name];
  if (sheet) {
    if (!dialogsheetNameRegistary.includes(name)) {
      dialogsheetNameRegistary.push(name);
    }
    document.getElementById('ds-global-overlay').classList.add('active');
    sheet.classList.add('active');
  }
};

window.closeDialogSheet = (name) => {
  const sheet = DialogSheetRegistry[name];
  if (sheet) {
    // Remove specific name to maintain correct order if closed out-of-sync
    const index = dialogsheetNameRegistary.indexOf(name);
    if (index > -1) {
      dialogsheetNameRegistary.splice(index, 1);
    }

    sheet.classList.remove('active');

    // Hide overlay if no dialogs remain active
    if (dialogsheetNameRegistary.length === 0) {
      const overlay = document.getElementById('ds-global-overlay');
      if (overlay) overlay.classList.remove('active');
    }
  }
};

// --- Fluent API: Supports both Dialogsheet("name") and DialogSheet("name") ---
const createDialogSheetInstance = (name) => {
  if (!DialogSheetCallbacks[name]) {
    DialogSheetCallbacks[name] = {};
  }

  return {
    clickBackdrop(callback) {
      DialogSheetCallbacks[name].backdrop = callback;
      return this; // Allows chaining
    },
    open() {
      window.openDialogSheet(name);
      return this; // Allows chaining
    },
    close() {
      window.closeDialogSheet(name);
      return this; // Allows chaining
    }
  };
};

window.Dialogsheet = createDialogSheetInstance;
window.DialogSheet = createDialogSheetInstance;

// Observer for Dynamic Injection
const observer_ds = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName && node.tagName.toLowerCase() === 'dialogsheet') {
        DialogSheetEngine.initSheet(node);
      }
    });
  });
});
observer_ds.observe(document.documentElement, { childList: true, subtree: true });

// Initial Boot
document.querySelectorAll('DialogSheet, dialogsheet').forEach(el => DialogSheetEngine.initSheet(el));