const DatePicker = {
  _states: {},
  _months: ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"],
  SWIPE_THRESHOLD: 50,

  // --- CALLBACK REGISTRY ---
  _callbacks: { ok: {}, cancel: {}, today: {}, backdrop: {} },
  _globalCallbacks: { ok: null, cancel: null, today: null, backdrop: null },

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

  // --- EVENT LISTENERS (PUBLIC API) ---
  okClick:       function(arg1, arg2) { this._registerCallback('ok',      arg1, arg2); },
  cancelClick:   function(arg1, arg2) { this._registerCallback('cancel',  arg1, arg2); }, // ✅ Fixed typo: was cancleClick
  todayClick:    function(arg1, arg2) { this._registerCallback('today',   arg1, arg2); },
  clickBackdrop: function(arg1, arg2) { this._registerCallback('backdrop',arg1, arg2); }, // ✅ Renamed: was backdropClick

  // --- CONTROL API ---
  open: function(name) {
    if (!this._states[name]) {
      this.init(name);
    } else {
      this.render(name);
    }

    StackRouter.OpenDialogSheet(name);

    DialogSheet(name).clickBackdrop(() => {
      StackRouter.CloseDialogSheet(name);
      DatePicker._triggerCallback('backdrop', name);
    });
  },

  cancel: function(name) {
    StackRouter.CloseDialogSheet(name);
    this._triggerCallback('cancel', name);
  },

  getSelectedDate: function(name) { // ✅ Fixed typo: was getSelectDate
    const el = document.getElementById(name);
    return el ? el.value : null;
  },

  // --- INIT ---
  init: function(name) {
    const now = new Date();
    this._states[name] = {
      viewMonth: now.getMonth(),
      viewYear: now.getFullYear(),
      tempSelected: null,
      confirmedDate: null,
      mode: 'calendar'
    };
    this.render(name);
  },

  // --- CONFIRM SELECTION ---
  confirmSelection: function(name) {
    const s = this._states[name];
    if (!s || !s.tempSelected) {
      StackRouter.CloseDialogSheet(name);
      return;
    }

    s.confirmedDate = s.tempSelected;

    const input = document.getElementById(name);
    if (input) {
      input.value = s.confirmedDate;
      if (input.parentElement) {
        input.parentElement.classList.add('active');
      }
    }

    StackRouter.CloseDialogSheet(name);
    this._triggerCallback('ok', name, s.confirmedDate);
  },

  // --- INTERNAL HELPERS ---
  _getDialog: function(name) {
    return document.querySelector(`[data-name="${name}"]`); // ✅ Fixed: targets ds-wrapper, not DialogSheet element
  },

  highlightDate: function(name, d, m, y) {
    this._states[name].tempSelected =
      `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    this.render(name);
  },

  changeView: function(name, mode) {
    this._states[name].mode = mode;
    this.render(name);
  },

  changeMonth: function(name, dir) {
    const s = this._states[name];
    s.viewMonth += dir;
    if (s.viewMonth > 11) { s.viewMonth = 0;  s.viewYear++; }
    if (s.viewMonth < 0)  { s.viewMonth = 11; s.viewYear--; }
    this.render(name);
  },

  goToday: function(name) {
    const now = new Date();
    const s = this._states[name];
    if (!s) return;

    s.viewMonth    = now.getMonth();
    s.viewYear     = now.getFullYear();
    s.mode         = 'calendar';
    s.tempSelected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    this.render(name);
    this._triggerCallback('today', name, s.tempSelected);
  },

  selectYear: function(name, y) {
    this._states[name].viewYear = y;
    this._states[name].mode = 'calendar';
    this.render(name);
  },

  selectMonth: function(name, m) {
    this._states[name].viewMonth = m;
    this._states[name].mode = 'calendar';
    this.render(name);
  },

  // --- SWIPE LOGIC ---
  navigateMonth: function(name, dir) {
    const dialog = this._getDialog(name);
    if (!dialog) return;

    const content = dialog.querySelector('.calendar-content');
    if (!content) { this.changeMonth(name, dir); return; }

    if (content.dataset.animating) {
      this.changeMonth(name, dir);
      return;
    }
    content.dataset.animating = "1";

    const exitClass  = dir > 0 ? 'slide-exit-left'  : 'slide-exit-right';
    const enterClass = dir > 0 ? 'slide-enter-right' : 'slide-enter-left';

    const onExitEnd = () => {
      content.removeEventListener('animationend', onExitEnd);
      content.classList.remove(exitClass);
      this.changeMonth(name, dir);

      content.classList.add(enterClass);
      const onEnterEnd = () => {
        content.removeEventListener('animationend', onEnterEnd);
        content.classList.remove(enterClass);
        delete content.dataset.animating;
      };
      content.addEventListener('animationend', onEnterEnd, { once: true });
    };
    content.addEventListener('animationend', onExitEnd, { once: true });
    content.classList.add(exitClass);
  },

  attachSwipe: function(name) {
    const dialog = this._getDialog(name);
    if (!dialog) return;

    const content = dialog.querySelector('.calendar-content');
    if (!content || content.dataset.swipeBound) return;
    content.dataset.swipeBound = "1";

    let startX = 0, startY = 0;

    content.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].screenX;
      startY = e.changedTouches[0].screenY;
    }, { passive: true });

    content.addEventListener('touchend', (e) => {
      const s = this._states[name];
      if (!s || s.mode !== 'calendar') return;

      const deltaX = e.changedTouches[0].screenX - startX;
      const deltaY = e.changedTouches[0].screenY - startY;

      if (Math.abs(deltaX) < this.SWIPE_THRESHOLD)        return;
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5)     return;

      this.navigateMonth(name, deltaX < 0 ? 1 : -1);
    }, { passive: true });
  },

  // --- MANUAL DATE ENTRY ---
  applyManualDate: function(name) {
    const s      = this._states[name];
    const dEl    = document.getElementById(`man_d_${name}`);
    const mEl    = document.getElementById(`man_m_${name}`);
    const yEl    = document.getElementById(`man_y_${name}`);
    const errEl  = document.getElementById(`man_err_${name}`);

    const d = parseInt(dEl?.value, 10);
    const m = parseInt(mEl?.value, 10);
    const y = parseInt(yEl?.value, 10);

    const isValid =
      Number.isInteger(d) && Number.isInteger(m) && Number.isInteger(y) &&
      m >= 1 && m <= 12 &&
      y >= 1000 && y <= 9999 &&
      d >= 1 && d <= new Date(y, m, 0).getDate();

    if (!isValid) {
      if (errEl) errEl.textContent = "Enter a valid date (DD / MM / YYYY)";
      return;
    }

    s.viewYear     = y;
    s.viewMonth    = m - 1;
    s.tempSelected = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    s.mode         = 'calendar';
    this.render(name);
  },

  // --- RENDER ---
  render: function(name) {
    const s      = this._states[name];
    const dialog = this._getDialog(name);
    if (!s || !dialog) return;

    const content        = dialog.querySelector('.calendar-content');
    const title          = dialog.querySelector('.calendar-title');
    const footer         = dialog.querySelector('.calendar-footer');
    const headerBtnLeft  = dialog.querySelector('.header-left');
    const headerBtnRight = dialog.querySelector('.header-right');

    if (!content || !title || !footer) return; // ✅ Guard: stop if DOM not ready

    this.attachSwipe(name);

    headerBtnLeft.style.display  = "inline-flex";
    headerBtnRight.style.display = "inline-flex";

    // ── YEAR VIEW ──
    if (s.mode === 'year') {
      title.innerHTML = `Select Year`;
      headerBtnLeft.style.display  = "none";
      headerBtnRight.style.display = "none";

      footer.innerHTML = `
        <button class="border" onclick="DatePicker.selectYear('${name}', new Date().getFullYear())">Current Year</button>
        <button class="transparent link" onclick="DatePicker.changeView('${name}', 'calendar')">Back</button>
      `;

      let html = `<div  style="height:400px;border-radius:0px;" OverScrollEffect="true" ScrollBar="true" Type="VScroll" OverScrollEffectColor="var(--primary)" class="selection-list">`;
      for (let y = 1930; y <= 2070; y++) {
        const isCurrent  = y === new Date().getFullYear() ? 'current-item-text' : '';
        const isSelected = y === s.viewYear ? 'selected-item' : '';
        html += `<div class="ripple selection-item ${isCurrent} ${isSelected}" onclick="DatePicker.selectYear('${name}', ${y})">${y}</div>`;
      }
      content.innerHTML = html + `</div>`;
      setTimeout(() => content.querySelector('.selected-item')?.scrollIntoView({ block: 'center' }), 50);

    // ── MONTH VIEW ──
    } else if (s.mode === 'month') {
      title.innerHTML = `Select Month`;
      headerBtnLeft.style.display  = "none";
      headerBtnRight.style.display = "none";

      footer.innerHTML = `
        <button class="transparent link" onclick="DatePicker.changeView('${name}', 'calendar')">Back</button>
      `;

      let html = `<div class="selection-list"style="height:400px;border-radius:0px;" OverScrollEffect="true" ScrollBar="true" Type="VScroll" OverScrollEffectColor="var(--primary)">`;
      this._months.forEach((month, idx) => {
        const isCurrent  = idx === new Date().getMonth() ? 'current-item-text' : '';
        const isSelected = idx === s.viewMonth ? 'selected-item' : '';
        html += `<div class="ripple selection-item ${isCurrent} ${isSelected}" onclick="DatePicker.selectMonth('${name}', ${idx})">${month}</div>`;
      });
      content.innerHTML = html + `</div>`;

    // ── MANUAL INPUT VIEW ──
    } else if (s.mode === 'input') {
      title.innerHTML = `Enter Date`;
      headerBtnLeft.style.display  = "none";
      headerBtnRight.style.display = "none";

      const parts = (s.tempSelected || '').split('-');
      const curY  = parts[0] || s.viewYear;
      const curM  = parts[1] || String(s.viewMonth + 1).padStart(2, '0');
      const curD  = parts[2] || '';

      content.innerHTML = `
        <div class="manual-entry">
          <div class="manual-hint">Format: DD / MM / YYYY</div>
          <div class="manual-input-row">
            <input class="manual-input" type="text" inputmode="numeric" maxlength="2" placeholder="DD" id="man_d_${name}" value="${curD}">
            <span class="manual-sep">/</span>
            <input class="manual-input" type="text" inputmode="numeric" maxlength="2" placeholder="MM" id="man_m_${name}" value="${curM}">
            <span class="manual-sep">/</span>
            <input class="manual-input manual-input-year" type="text" inputmode="numeric" maxlength="4" placeholder="YYYY" id="man_y_${name}" value="${curY}">
          </div>
          <div class="manual-error" id="man_err_${name}"></div>
        </div>
      `;

      footer.innerHTML = `
        <button class="transparent link" onclick="DatePicker.changeView('${name}', 'calendar')">Back</button>
        <button class="primary" onclick="DatePicker.applyManualDate('${name}')">Apply</button>
      `;

    // ── CALENDAR VIEW ──
    } else {
      title.innerHTML = `
        <span onclick="DatePicker.changeView('${name}', 'month')" style="cursor:pointer">
          ${this._months[s.viewMonth]}
        </span>
        <span onclick="DatePicker.changeView('${name}', 'year')" style="cursor:pointer">
          ${s.viewYear} <i>arrow_drop_down</i>
        </span>
      `;

      footer.innerHTML = `
        <div class="footer-left">
          <button class="circle transparent" title="Enter date manually" onclick="DatePicker.changeView('${name}', 'input')">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V15.5C20 16.3284 19.3284 17 18.5 17H5.5C4.67157 17 4 16.3284 4 15.5V5.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 8H7.01M10.5 8H10.5V8.01M14 8H14.01M17 8H17.01M7 11H7.01M10.5 11H10.5V11.01M14 11H14.01M17 11H17.01M8 14H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="footer-right">
          <button class="border link" onclick="DatePicker.goToday('${name}')">Today</button>
          <button class="transparent link" onclick="DatePicker.cancel('${name}')">Cancel</button>
          <button class="primary" onclick="DatePicker.confirmSelection('${name}')">OK</button>
        </div>
      `;

      const firstDay    = new Date(s.viewYear, s.viewMonth, 1).getDay();
      const daysInMonth = new Date(s.viewYear, s.viewMonth + 1, 0).getDate();
      const today       = new Date();

      let html = `
        <div class="calendar-grid">
          <div class="weekday">S</div><div class="weekday">M</div><div class="weekday">T</div>
          <div class="weekday">W</div><div class="weekday">T</div><div class="weekday">F</div>
          <div class="weekday">S</div>
      `;

      for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day empty"></div>`;
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey    = `${s.viewYear}-${String(s.viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday    = (d === today.getDate() && s.viewMonth === today.getMonth() && s.viewYear === today.getFullYear()) ? 'today' : '';
        const isSelected = s.tempSelected === dateKey ? 'selected-date' : '';
        html += `<div class="calendar-day ${isToday} ${isSelected}" onclick="DatePicker.highlightDate('${name}', ${d}, ${s.viewMonth}, ${s.viewYear})">${d}</div>`;
      }

      content.innerHTML = html + `</div>`;
    }
  }
};

// ── Expose globally ──
window.DatePicker = DatePicker;

// ── Auto-Initialization for <CarbonDatePicker> tags ──
function initCarbonDatePickers() {
  document.querySelectorAll('CarbonDatePicker:not([data-carbon-init])').forEach(el => {
    el.setAttribute('data-carbon-init', '1'); // mark so re-runs skip this element

    const name        = el.getAttribute('Name') || el.getAttribute('Id');
    const placeholder = el.getAttribute('Placeholder') || "Select Date";
    const type        = el.getAttribute('Type') || "Border";
    const iconDir     = el.getAttribute('Icon') || "Right";

    if (!name) return; // ✅ Guard: skip if no name given

    // ── Build Input Field ──
    const field = document.createElement('div');

    if (iconDir === "Left") {
      field.className = `field label prefix ${type.toLowerCase() === 'filled' ? 'fill' : 'border'}`;
      field.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10H17M7 14H12M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input type="text" id="${name}" readonly placeholder=" ">
        <label>${placeholder}</label>
      `;
    } else {
      field.className = `field label suffix ${type.toLowerCase() === 'filled' ? 'fill' : 'border'}`;
      field.innerHTML = `
        <input type="text" id="${name}" readonly placeholder=" ">
        <label>${placeholder}</label>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10H17M7 14H12M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }

    // ✅ Fixed: attach click handler to open the picker
    field.addEventListener('click', () => DatePicker.open(name));

    // ── Build DialogSheet ──
    const dialog = document.createElement('DialogSheet');
    dialog.setAttribute('Name', name);
    dialog.innerHTML = `
      <nav class="no-space">
        <button class="circle transparent header-left" onclick="DatePicker.navigateMonth('${name}', -1)">
          <i>chevron_left</i>
        </button>
        <h6 class="max center-align calendar-title" style="font-size:1.1rem"></h6>
        <button class="circle transparent header-right" onclick="DatePicker.navigateMonth('${name}', 1)">
          <i>chevron_right</i>
        </button>
      </nav>
      <div class="calendar-content"></div>
      <nav class="right-align no-space calendar-footer"></nav>
    `;

    // ── Append dialog to DOM, then call initSheet() synchronously so the
    //    ds-wrapper exists before DatePicker.init() calls render().
    //    We cannot rely on the MutationObserver inside DialogSheet.js because
    //    observer callbacks fire asynchronously (after the current task), but
    //    DatePicker.init() runs in the same synchronous call stack.            ──
    const container = document.createElement('div');
    container.appendChild(field);
    el.replaceWith(container);
    document.body.appendChild(dialog);     // put element in DOM
    DialogSheetEngine.initSheet(dialog);   // init synchronously — ds-wrapper now exists
    DatePicker.init(name);                 // render() can now find [data-name="${name}"]
  });
}

// Boot: run on DOMContentLoaded for static tags, and observe for tags injected
// later by JSX / PageView (which renders after DOMContentLoaded has already fired).
document.addEventListener("DOMContentLoaded", () => {
  initCarbonDatePickers();
});

(function _observeCarbonDatePicker() {
  const seen = new WeakSet();
  const obs = new MutationObserver((mutations) => {
    let found = false;
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      // Check the node itself
      if (node.tagName && node.tagName.toLowerCase() === 'carbondatepicker' && !seen.has(node)) {
        seen.add(node); found = true;
      }
      // Check descendants (JSX may inject a parent container holding the tag)
      node.querySelectorAll && node.querySelectorAll('CarbonDatePicker').forEach(el => {
        if (!seen.has(el)) { seen.add(el); found = true; }
      });
    }));
    if (found) initCarbonDatePickers();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();