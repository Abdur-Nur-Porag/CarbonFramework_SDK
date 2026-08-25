// ── CarbonTimePicker ──────────────────────────────────────────────────────────
// Depends on: DialogSheet (dialogsheet.js must load first)

const CarbonTimePicker = {
  instances: {},

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
  clickBackdrop: function(arg1, arg2) { this._registerCallback('backdrop',arg1, arg2); }, // ✅ Renamed: was backdropClick

  // --- CONTROL API ---
  open: function(id) {
    StackRouter.OpenDialogSheet(`${id}_dialog`);
    DialogSheet(`${id}_dialog`).clickBackdrop(() => {
      StackRouter.CloseDialogSheet(`${id}_dialog`);
      CarbonTimePicker._triggerCallback('backdrop', id);
    });
  },

  getTime: function(id) {
    const input = document.getElementById(id);
    return input ? input.value : null;
  },

  setTime: function(id, timeStr) {
    const input = document.getElementById(id);
    if (input) {
      input.value = timeStr;
      if (input.parentElement) input.parentElement.classList.add('active');
    }
    const inst = this.instances[id];
    if (inst) inst.parseAndSync(timeStr);
  },

  removeTime: function(id) {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      if (input.parentElement) input.parentElement.classList.remove('active');
    }
    const inst = this.instances[id];
    if (inst) inst.reset();
  }
};

// Expose globally
window.CarbonTimePicker = CarbonTimePicker;

// ── TimePickerInstance ────────────────────────────────────────────────────────
class TimePickerInstance {
  constructor(id, dialogWrapper, format) {
    this.id      = id;
    this.dialog  = dialogWrapper; // This is the ds-wrapper div, not DialogSheet element
    this.input   = document.getElementById(id);
    this.format  = format; // "12" or "24"

    this.state = {
      mode: 'hours',
      hour: 12,
      minute: 0,
      period: 'PM',
      isDragging: false,
      clockRadiusOuter: 100,
      clockRadiusInner: 64,
      centerOffset: 128
    };

    this.DOM = {};
    this._resolveDOM();
    this.init();
  }

  // Wait until DialogSheet moves content into ds-wrapper, then bind
  _resolveDOM() {
    this.DOM = {
      clockFace:        this.dialog.querySelector('.clock-face'),
      touchTarget:      this.dialog.querySelector('.touch-target'),
      clockHand:        this.dialog.querySelector('.clock-hand-wrapper'),
      clockHandText:    this.dialog.querySelector('.clock-hand-text'),
      numbersContainer: this.dialog.querySelector('.clock-numbers-container'),
      hourBlock:        this.dialog.querySelector('.hour-block'),
      minuteBlock:      this.dialog.querySelector('.minute-block'),
      hourText:         this.dialog.querySelector('.hour-text'),
      minuteText:       this.dialog.querySelector('.minute-text'),
      amBtn:            this.dialog.querySelector('.am-btn'),
      pmBtn:            this.dialog.querySelector('.pm-btn'),
      ampmToggle:       this.dialog.querySelector('.ampm-toggle'),
      btnCancel:        this.dialog.querySelector('.btn-cancel'),
      btnOk:            this.dialog.querySelector('.btn-ok'),
    };
  }

  init() {
    if (this.format === '24') {
      if (this.DOM.ampmToggle) this.DOM.ampmToggle.style.display = 'none';
    }
    this.bindEvents();
    this.renderUI();
  }

  bindEvents() {
    this.DOM.hourBlock.addEventListener('click',   () => this.setMode('hours'));
    this.DOM.minuteBlock.addEventListener('click', () => this.setMode('minutes'));

    if (this.format === '12') {
      this.DOM.amBtn.addEventListener('click', () => this.setPeriod('AM'));
      this.DOM.pmBtn.addEventListener('click', () => this.setPeriod('PM'));
    }

    // Desktop drag
    this.DOM.touchTarget.addEventListener('mousedown', (e) => this.handleStart(e));
    document.addEventListener('mousemove', (e) => this.handleMove(e));
    document.addEventListener('mouseup',   (e) => this.handleEnd(e));

    // Mobile drag
    this.DOM.touchTarget.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
    document.addEventListener('touchend',  (e) => this.handleEnd(e));

    // Cancel button
    this.DOM.btnCancel.addEventListener('click', () => {
      StackRouter.CloseDialogSheet(`${this.id}_dialog`);
      CarbonTimePicker._triggerCallback('cancel', this.id);
    });

    // OK button
    this.DOM.btnOk.addEventListener('click', () => {
      this.saveTime();
      StackRouter.CloseDialogSheet(`${this.id}_dialog`);
      CarbonTimePicker._triggerCallback('ok', this.id, this.input?.value);
    });
  }

  renderUI() {
    this.DOM.hourBlock.classList.toggle('active',   this.state.mode === 'hours');
    this.DOM.minuteBlock.classList.toggle('active', this.state.mode === 'minutes');

    if (this.format === '12') {
      this.DOM.amBtn.classList.toggle('active', this.state.period === 'AM');
      this.DOM.pmBtn.classList.toggle('active', this.state.period === 'PM');
    }

    this.renderClockNumbers();
    this.updateDisplays();
  }

  renderClockNumbers() {
    this.DOM.numbersContainer.innerHTML = '';
    let items = [];

    if (this.state.mode === 'hours') {
      if (this.format === '24') {
        // Outer ring: 00, 13–23
        items.push({ val: 0,  display: '00', radius: this.state.clockRadiusOuter, angle: 360 });
        for (let i = 13; i <= 23; i++) {
          items.push({ val: i, display: String(i), radius: this.state.clockRadiusOuter, angle: (i - 12) * 30 });
        }
        // Inner ring: 12, 1–11
        items.push({ val: 12, display: '12', radius: this.state.clockRadiusInner, angle: 360 });
        for (let i = 1; i <= 11; i++) {
          items.push({ val: i, display: String(i), radius: this.state.clockRadiusInner, angle: i * 30 });
        }
      } else {
        // 12-hour: single outer ring 1–12
        items.push({ val: 12, display: '12', radius: this.state.clockRadiusOuter, angle: 360 });
        for (let i = 1; i <= 11; i++) {
          items.push({ val: i, display: String(i), radius: this.state.clockRadiusOuter, angle: i * 30 });
        }
      }
    } else {
      // Minutes: 00–55 outer ring
      items.push({ val: 0, display: '00', radius: this.state.clockRadiusOuter, angle: 360 });
      for (let i = 1; i <= 11; i++) {
        items.push({ val: i * 5, display: this.pad(i * 5), radius: this.state.clockRadiusOuter, angle: i * 30 });
      }
    }

    items.forEach(item => {
      const numDiv = document.createElement('div');
      numDiv.className = 'clock-number';
      numDiv.innerText = item.display;

      const angleRad = (item.angle - 90) * (Math.PI / 180);
      const x = Math.cos(angleRad) * item.radius;
      const y = Math.sin(angleRad) * item.radius;

      numDiv.style.left = `calc(50% - 20px + ${x}px)`;
      numDiv.style.top  = `calc(50% - 20px + ${y}px)`;
      this.DOM.numbersContainer.appendChild(numDiv);
    });
  }

  updateDisplays() {
    let displayHour = this.state.hour;
    if (this.format === '12' && displayHour === 0) displayHour = 12;

    this.DOM.hourText.innerText   = this.pad(displayHour);
    this.DOM.minuteText.innerText = this.pad(this.state.minute);

    let angle, displayValue, handRadius = this.state.clockRadiusOuter;

    if (this.state.mode === 'hours') {
      if (this.format === '24') {
        if (this.state.hour >= 1 && this.state.hour <= 12) {
          handRadius = this.state.clockRadiusInner;
          angle      = (this.state.hour * 30) - 90;
        } else {
          handRadius = this.state.clockRadiusOuter;
          const h    = this.state.hour === 0 ? 12 : (this.state.hour - 12);
          angle      = (h * 30) - 90;
        }
      } else {
        handRadius = this.state.clockRadiusOuter;
        const h    = this.state.hour === 0 ? 12 : this.state.hour;
        angle      = (h * 30) - 90;
      }
      displayValue = displayHour;
    } else {
      handRadius   = this.state.clockRadiusOuter;
      angle        = (this.state.minute * 6) - 90;
      displayValue = this.state.minute;
    }

    this.DOM.clockHand.style.width     = `${handRadius}px`;
    this.DOM.clockHand.style.transform = `rotate(${angle}deg)`;

    const handText = (this.state.mode === 'hours' && this.format === '24' && displayValue === 0)
      ? '00'
      : this.pad(displayValue);

    this.DOM.clockHandText.innerText          = handText;
    this.DOM.clockHandText.style.transform    = `rotate(${-angle}deg)`;
  }

  handleStart(e) {
    e.preventDefault();
    this.state.isDragging = true;
    this.DOM.clockFace.classList.add('dragging');
    this.processGesture(e);
  }

  handleMove(e) {
    if (!this.state.isDragging) return;
    e.preventDefault();
    this.processGesture(e);
  }

  handleEnd(e) {
    if (!this.state.isDragging) return;
    this.state.isDragging = false;
    this.DOM.clockFace.classList.remove('dragging');
    // Auto-advance to minutes after setting hour
    if (this.state.mode === 'hours') {
      setTimeout(() => this.setMode('minutes'), 300);
    }
  }

  processGesture(e) {
    const coords  = this.getCoords(e);
    const rect    = this.DOM.clockFace.getBoundingClientRect();
    const centerX = rect.left + this.state.centerOffset;
    const centerY = rect.top  + this.state.centerOffset;

    const dx       = coords.x - centerX;
    const dy       = coords.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (this.state.mode === 'hours') {
      let index = Math.round(angle / 30);
      if (index === 0) index = 12;

      let hour = index;

      if (this.format === '24') {
        if (distance < 82) {
          // Inner ring: 1–12
          if (hour === 12) hour = 12;
        } else {
          // Outer ring: 0, 13–23
          if (hour === 12) hour = 0;
          else hour += 12;
        }
      }

      if (this.state.hour !== hour) {
        this.state.hour = hour;
        this.updateDisplays();
      }
    } else {
      let minute = Math.round(angle / 6);
      if (minute === 60) minute = 0;

      if (this.state.minute !== minute) {
        this.state.minute = minute;
        this.updateDisplays();
      }
    }
  }

  getCoords(e) {
    if (e.touches?.length > 0)        return { x: e.touches[0].clientX,        y: e.touches[0].clientY };
    if (e.changedTouches?.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  setMode(mode) {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    this.renderUI();
  }

  setPeriod(period) {
    if (this.state.period === period) return;
    this.state.period = period;
    this.renderUI();
  }

  saveTime() {
    if (!this.input) return;
    let value = '';
    if (this.format === '12') {
      const h = this.state.hour === 0 ? 12 : this.state.hour;
      value   = `${this.pad(h)}:${this.pad(this.state.minute)} ${this.state.period}`;
    } else {
      value = `${this.pad(this.state.hour)}:${this.pad(this.state.minute)}`;
    }
    this.input.value = value;
    if (this.input.parentElement) this.input.parentElement.classList.add('active');
  }

  parseAndSync(timeStr) {
    if (!timeStr) return this.reset();
    try {
      if (this.format === '12') {
        const parts = timeStr.trim().split(/\s+/);
        const time  = parts[0].split(':');
        const hr    = parseInt(time[0], 10);
        this.state.minute = parseInt(time[1], 10) || 0;
        this.state.period = parts[1] ? parts[1].toUpperCase() : (hr >= 12 ? 'PM' : 'AM');
        this.state.hour   = hr % 12 || 12;
      } else {
        const time        = timeStr.split(':');
        this.state.hour   = parseInt(time[0], 10);
        this.state.minute = parseInt(time[1], 10) || 0;
      }
      this.renderUI();
    } catch (e) {}
  }

  reset() {
    this.state.hour   = 12;
    this.state.minute = 0;
    this.state.period = 'PM';
    this.state.mode   = 'hours';
    this.renderUI();
  }

  pad(num) { return num < 10 ? '0' + num : String(num); }
}

// ── Auto Initialization ───────────────────────────────────────────────────────
function initCarbonTimePickers() {
  document.querySelectorAll('CarbonTimePicker:not([data-carbon-init]), carbontimepicker:not([data-carbon-init])').forEach(el => {
    el.setAttribute('data-carbon-init', '1'); // mark so re-runs skip this element

    const id          = el.getAttribute('Id') || el.getAttribute('id') || `tp_${Math.random().toString(36).substr(2, 8)}`;
    const type        = (el.getAttribute('Type') || el.getAttribute('type') || 'Border').toLowerCase();
    const placeholder = el.getAttribute('Placeholder') || el.getAttribute('placeholder') || 'Select Time';
    const format      = el.getAttribute('Format') || el.getAttribute('format') || '12';
    const iconDir     = el.getAttribute('Icon') || 'Right';

    if (!id) return;

    const clockSVG = `
      <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 7.25a.75.75 0 00-1.5 0v5.5c0 .27.144.518.378.651l3.5 2a.75.75 0 00.744-1.302L12.5 12.315V7.25z"
          fill="currentColor"/>
        <path fill-rule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zM2.5 12a9.5 9.5 0 1119 0 9.5 9.5 0 01-19 0z"
          fill="currentColor"/>
      </svg>`;

    // --- Build Input Field ---
    const field = document.createElement('div');
    field.className = `field label ${iconDir === 'Left' ? 'prefix' : 'suffix'} ${type === 'filled' ? 'fill' : 'border'}`;
    field.style.cursor = 'pointer';

    if (iconDir === 'Left') {
      field.innerHTML = `${clockSVG}<input type="text" id="${id}" readonly placeholder=" "><label>${placeholder}</label>`;
    } else {
      field.innerHTML = `<input type="text" id="${id}" readonly placeholder=" "><label>${placeholder}</label>${clockSVG}`;
    }

    // Click anywhere on field opens the picker
    field.addEventListener('click', () => CarbonTimePicker.open(id));

    // --- Build DialogSheet ---
    const dialog = document.createElement('DialogSheet');
    dialog.setAttribute('Name', `${id}_dialog`);

    dialog.innerHTML = `
      <div class="time-picker-header">Select Time</div>

      <div class="time-display">
        <div class="time-block hour-block active">
          <span class="hour-text">12</span>
        </div>
        <div class="time-colon">:</div>
        <div class="time-block minute-block">
          <span class="minute-text">00</span>
        </div>
        <div class="ampm-toggle">
          <div class="ampm-btn am-btn">AM</div>
          <div class="ampm-btn pm-btn active">PM</div>
        </div>
      </div>

      <div class="clock-container">
        <div class="clock-face">
          <div class="clock-center"></div>
          <div class="clock-hand-wrapper">
            <div class="clock-hand-line"></div>
            <div class="clock-hand-circle">
              <span class="clock-hand-text">12</span>
            </div>
          </div>
          <div class="clock-numbers-container"></div>
          <div class="touch-target"></div>
        </div>
      </div>

      <nav class="right-align no-space" style="margin-top:10px; gap:8px;">
        <button class="transparent link btn-cancel">Cancel</button>
        <button class="primary btn-ok">OK</button>
      </nav>
    `;

    // --- Mount: call initSheet() synchronously so ds-wrapper exists immediately.
    //     The original code used setTimeout(0) to wait for the async
    //     MutationObserver inside DialogSheet.js, but that still races when
    //     multiple pickers init in the same tick. Calling initSheet() directly
    //     is synchronous and guarantees the ds-wrapper is ready before
    //     TimePickerInstance queries its children.
    const container = document.createElement('div');
    container.appendChild(field);
    el.replaceWith(container);
    document.body.appendChild(dialog);        // element in DOM
    DialogSheetEngine.initSheet(dialog);      // ds-wrapper created synchronously

    const wrapper = document.querySelector(`[data-name="${id}_dialog"]`);
    if (wrapper) {
      CarbonTimePicker.instances[id] = new TimePickerInstance(id, wrapper, format);
    }
  });
}

// Boot: run on DOMContentLoaded for static tags, and observe for tags injected
// later by JSX / PageView (which renders after DOMContentLoaded has already fired).
document.addEventListener('DOMContentLoaded', () => {
  initCarbonTimePickers();
});

(function _observeCarbonTimePicker() {
  const seen = new WeakSet();
  const obs = new MutationObserver((mutations) => {
    let found = false;
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if ((tag === 'carbontimepicker') && !seen.has(node)) { seen.add(node); found = true; }
      node.querySelectorAll && node.querySelectorAll('CarbonTimePicker, carbontimepicker').forEach(el => {
        if (!seen.has(el)) { seen.add(el); found = true; }
      });
    }));
    if (found) initCarbonTimePickers();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
