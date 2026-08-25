const CarbonSelect = {
  _dataStore: {},

  // --- CALLBACK REGISTRY ---
  _callbacks: { ok: {}, cancel: {}, backdrop: {} },
  _globalCallbacks: { ok: null, cancel: null, backdrop: null },

  _registerCallback: function(type, arg1, arg2) {
    if (typeof arg1 === 'function') {
      this._globalCallbacks[type] = arg1;
    } else if (typeof arg1 === 'string' && typeof arg2 === 'function') {
      this._callbacks[type][arg1] = arg2;
    }
  },

  _triggerCallback: function(type, name, data) {
    if (this._callbacks[type][name]) {
      this._callbacks[type][name](data, name);
    }
    if (this._globalCallbacks[type]) {
      this._globalCallbacks[type](data, name);
    }
  },

  // --- PUBLIC EVENT API ---
  okClick:       function(arg1, arg2) { this._registerCallback('ok',      arg1, arg2); },
  cancelClick:   function(arg1, arg2) { this._registerCallback('cancel',  arg1, arg2); },
  clickBackdrop: function(arg1, arg2) { this._registerCallback('backdrop',arg1, arg2); },

  // --- CONTROL API ---
  open: function(id) {
    StackRouter.OpenDialogSheet(`dlg_${id}`);
    DialogSheet(`dlg_${id}`).clickBackdrop(() => {
      StackRouter.CloseDialogSheet(`dlg_${id}`);
      CarbonSelect._triggerCallback('backdrop', id);
    });
  },

  getSelect: function(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  },

  setValue: function(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value;
    if (input.parentElement) input.parentElement.classList.add('active');

    // Sync checkboxes to match the new value
    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    if (wrapper) {
      const vals = value.split(', ');
      wrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const text = cb.closest('li')?.querySelector('.select-item-text')?.textContent;
        cb.checked = vals.includes(text);
      });
    }
  },

  unSet: function(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = '';
    if (input.parentElement) input.parentElement.classList.remove('active');

    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    if (wrapper) {
      wrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
  },

  appendData: function(id, newDataArray) {
    if (!this._dataStore[id]) this._dataStore[id] = [];
    const dataToAdd = Array.isArray(newDataArray) ? newDataArray : [newDataArray];
    this._dataStore[id] = [...this._dataStore[id], ...dataToAdd];
    this._renderList(id);
  },

  removeData: function(id, itemValue) {
    if (!this._dataStore[id]) return;
    this._dataStore[id] = this._dataStore[id].filter(item => item !== itemValue);
    if (this.getSelect(id) === itemValue) this.unSet(id);
    this._renderList(id);
  },

  removeAll: function(id) {
    this._dataStore[id] = [];
    this.unSet(id);
    this._renderList(id);
  },

  addData: function(id, dataArray) {
    this._dataStore[id] = [...dataArray];
    this._renderList(id);
  },

  getAll: function(id) {
    return this._dataStore[id] || [];
  },

  checkExistData: function(id, itemValue) {
    return (this._dataStore[id] || []).includes(itemValue);
  },

  getAllChecked: function(id) {
    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    if (!wrapper) return [];
    return Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.closest('li')?.querySelector('.select-item-text')?.textContent)
      .filter(Boolean);
  },

  getAllUnchecked: function(id) {
    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    if (!wrapper) return [];
    return Array.from(wrapper.querySelectorAll('input[type="checkbox"]:not(:checked)'))
      .map(cb => cb.closest('li')?.querySelector('.select-item-text')?.textContent)
      .filter(Boolean);
  },

  // --- CONFIRM OK ---
  _confirmOk: function(id) {
    const input = document.getElementById(id);
    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    if (!input || !wrapper) return;

    const selected = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.closest('li')?.querySelector('.select-item-text')?.textContent)
      .filter(Boolean);

    if (selected.length > 0) {
      input.value = selected.join(', ');
      if (input.parentElement) input.parentElement.classList.add('active');
    } else {
      input.value = '';
      if (input.parentElement) input.parentElement.classList.remove('active');
    }

    StackRouter.CloseDialogSheet(`dlg_${id}`);
    CarbonSelect._triggerCallback('ok', id, input.value);
  },

  // --- INTERNAL LIST RENDER ---
  _renderList: function(id) {
    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    if (!wrapper) return;

    const listContainer = wrapper.querySelector('.m3-dialog-list');
    const isMulti = wrapper.dataset.multi === 'true';
    const data = this._dataStore[id] || [];

    let html = '';
    data.forEach((opt, index) => {
      const itemId = `${id}_cb_${index}`;
      html += `
        <li class="ripple" onclick="CarbonSelect._handleItemClick('${id}', '${opt.replace(/'/g, "\\'")}', '${itemId}', ${isMulti})">
          <label class="checkbox">
            <input type="checkbox" id="${itemId}" name="grp_${id}"
              onclick="event.stopPropagation(); CarbonSelect._handleItemClick('${id}', '${opt.replace(/'/g, "\\'")}', '${itemId}', ${isMulti})">
            <span></span>
          </label>
          <span class="space"></span>
          <span class="select-item-text">${opt}</span>
        </li>`;
    });

    listContainer.innerHTML = html;
  },

  _handleItemClick: function(id, val, cbId, isMulti) {
    const wrapper = document.querySelector(`[data-name="dlg_${id}"]`);
    const currentCb = document.getElementById(cbId);
    if (!wrapper || !currentCb) return;

    if (!isMulti) {
      // Single select: uncheck all others, toggle current
      const wasChecked = currentCb.checked;
      wrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      currentCb.checked = !wasChecked;
    } else {
      // Multi select: toggle only current
      currentCb.checked = !currentCb.checked;
    }
  }
};

// --- AUTO INIT ---
function renderCarbonSelect(tag, isMulti) {
  document.querySelectorAll(`${tag}:not([data-carbon-init])`).forEach(el => {
    el.setAttribute('data-carbon-init', '1'); // mark so re-runs skip this element

    const id          = el.getAttribute('Name') || el.getAttribute('Id');
    const placeholder = el.getAttribute('Placeholder') || 'Select';
    const type        = el.getAttribute('Type') || 'Border';
    const initialData = (el.getAttribute('Data') || '').split(',').map(s => s.trim()).filter(Boolean);

    if (!id) return;

    // --- Build Input Field ---
    const field = document.createElement('div');
    field.className = `field label suffix ${type.toLowerCase() === 'filled' ? 'fill' : 'border'}`;
    field.style.cursor = 'pointer';
    field.innerHTML = `
      <input type="text" id="${id}" readonly placeholder=" ">
      <label>${placeholder}</label>
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;

    // Click on field opens the DialogSheet
    field.addEventListener('click', () => CarbonSelect.open(id));

    // --- Build DialogSheet ---
    const dialog = document.createElement('DialogSheet');
    dialog.setAttribute('Name', `dlg_${id}`);
    if (isMulti) dialog.dataset.multi = 'true';

    dialog.innerHTML = `
      <h5 style="margin: 0 0 12px 0;">${placeholder}</h5>
      <div OverScrollEffect="true" ScrollBar="true" Type="VScroll" OverScrollEffectColor="var(--primary)" style="height:250px; overflow-y:auto; border-radius:0;">
        <ul class="m3-dialog-list"></ul>
      </div>
      <nav class="right-align no-space" style="margin-top:12px; gap:8px;">
        <button class="transparent link" onclick="StackRouter.CloseDialogSheet('dlg_${id}'); CarbonSelect._triggerCallback('cancel', '${id}')">Cancel</button>
        <button class="primary" onclick="CarbonSelect._confirmOk('${id}')">OK</button>
      </nav>
    `;

    // --- Mount ---
    // Call DialogSheetEngine.initSheet() synchronously right after appendChild
    // so the ds-wrapper (with data-name) exists before addData() calls
    // _renderList(), which queries [data-name="dlg_${id}"].
    // The MutationObserver inside DialogSheet.js fires asynchronously and
    // would be too late for the immediate _renderList() call below.
    const container = document.createElement('div');
    container.appendChild(field);
    el.replaceWith(container);
    document.body.appendChild(dialog);    // element in DOM
    DialogSheetEngine.initSheet(dialog);  // ds-wrapper created synchronously
    CarbonSelect.addData(id, initialData); // _renderList() now finds the wrapper
  });
}

// Boot: run on DOMContentLoaded for static tags, and observe for tags injected
// later by JSX / PageView (which renders after DOMContentLoaded has already fired).
document.addEventListener('DOMContentLoaded', () => {
  renderCarbonSelect('CarbonSelect', false);
  renderCarbonSelect('CarbonMultipleSelect', true);
});

(function _observeCarbonSelect() {
  const seen = new WeakSet();
  const obs = new MutationObserver((mutations) => {
    let foundSingle = false, foundMulti = false;
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (tag === 'carbonselect'         && !seen.has(node)) { seen.add(node); foundSingle = true; }
      if (tag === 'carbonmultipleselect' && !seen.has(node)) { seen.add(node); foundMulti  = true; }
      node.querySelectorAll && node.querySelectorAll('CarbonSelect').forEach(el => {
        if (!seen.has(el)) { seen.add(el); foundSingle = true; }
      });
      node.querySelectorAll && node.querySelectorAll('CarbonMultipleSelect').forEach(el => {
        if (!seen.has(el)) { seen.add(el); foundMulti = true; }
      });
    }));
    if (foundSingle) renderCarbonSelect('CarbonSelect', false);
    if (foundMulti)  renderCarbonSelect('CarbonMultipleSelect', true);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
