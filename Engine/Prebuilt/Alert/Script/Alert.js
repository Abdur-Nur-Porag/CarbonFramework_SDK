/* ===================== ALERT SYSTEM JS ===================== */

const alertQueue = [];
let isDialogOpen = false;

/* ROUTER BRIDGE: Alert has no Name attribute and no registry — it's an
   anonymous FIFO queue, at most one dialog open at a time — so it can't
   plug into Router the same way Drawer/ActionSheet/DialogSheet do (no
   OpenAlert()/CloseAlert() by target name). Instead this module dispatches
   'carbon:alertopen' / 'carbon:alertclose' on window whenever a dialog
   shows/hides, and exposes window.dismissAlert() so Router (or anything
   else, e.g. hardware backpress) can close whatever's currently open using
   the same semantics as its own Cancel/backdrop action. currentDialogHandle
   holds a reference to the active task + its closeDialog() closure. */
let currentDialogHandle = null;

window.dismissAlert = function(){
  if(!currentDialogHandle) return false;
  const { task, closeDialog } = currentDialogHandle;

  if(task.type === 'blank'){
    if(typeof task.backdropEvent === 'function') task.backdropEvent();
    closeDialog(null);
  } else if(task.type === 'confirm'){
    closeDialog(false);
  } else if(task.type === 'input'){
    closeDialog(null);
  } else {
    // plain Alert() only ever has an OK button
    closeDialog(true);
  }
  return true;
};

/**
 * Helper used to define a button for BlankAlert.
 *   AlertBtn("Save", "right").alertBtnEvent(() => { ... })
 * side: "left" | "center" | "right"  (default "right")
 */
function AlertBtn(name, side = "right") {
  const btn = {
    name: name,
    side: side,
    event: null,
    alertBtnEvent(fn) {
      btn.event = fn;
      return btn; // chainable
    }
  };
  return btn;
}

// 1. Standard Alert
function Alert(message, callback) {
  alertQueue.push({ type: 'alert', message: message, callback: callback });
  processQueue();
}

// 2. Input Alert (Returns text, or null if cancelled)
function AlertInput(message, callback, placeholder = "Type here...") {
  alertQueue.push({ type: 'input', message: message, callback: callback, placeholder: placeholder });
  processQueue();
}

// 3. Confirm Alert (Returns true if OK, false if Cancel)
function AlertConfirm(message, callback) {
  alertQueue.push({ type: 'confirm', message: message, callback: callback });
  processQueue();
}

// 4. Blank Alert — fully custom content, title, buttons, backdrop behavior
//
//    const myAlert = BlankAlert({
//      Code: `<p>Raw HTML content here</p>`,
//      Title: "",                          // optional, no title shown by default
//      Button: [
//        AlertBtn("Cancel", "left").alertBtnEvent(() => {}),
//        AlertBtn("Save", "right").alertBtnEvent(() => {})
//      ]
//    });
//    myAlert.clickBackdrop(() => { ... });  // optional, default: clicking backdrop does nothing
//
function BlankAlert(options = {}) {
  const task = {
    type: 'blank',
    code: options.Code || '',
    title: options.Title || '',
    buttons: options.Button || [],
    callback: null,
    backdropEvent: null // default: no backdrop click operation
  };

  // give every button a stable index so duplicate names don't collide
  task.buttons.forEach((b, i) => { b._idx = i; });

  alertQueue.push(task);
  processQueue();

  const controller = {
    clickBackdrop(fn) {
      task.backdropEvent = fn;
      return controller; // chainable
    }
  };
  return controller;
}

function processQueue() {
  if (isDialogOpen || alertQueue.length === 0) return;

  isDialogOpen = true;
  const task = alertQueue.shift();
  const { type } = task;

  const overlay = document.createElement('div');
  overlay.className = 'md-dialog-overlay';

  const isInput = type === 'input';
  const isConfirm = type === 'confirm';
  const isBlank = type === 'blank';

  const dialog = document.createElement('div');
  dialog.className = 'md-dialog';

  let titleHtml = '';
  let contentHtml = '';
  let buttonsHtml = '';
  let actionsClass = 'md-dialog-actions';

  if (isBlank) {
    // Title only rendered if provided — default is no title
    if (task.title && task.title.trim() !== '') {
      titleHtml = `<div><h4 class="md-dialog-title">${task.title}</h4></div>`;
    }

    // Raw HTML, passed through as-is
    contentHtml = `<div OverScrollEffect="true" OverScrollEffectColor="var(--primary)" ScrollBar="true" Type="VScroll" class="md-dialog-content">${task.code}</div>`;

    const left = task.buttons.filter(b => b.side === 'left');
    const center = task.buttons.filter(b => b.side === 'center');
    const right = task.buttons.filter(b => b.side === 'right' || !b.side);

    const buildGroup = (arr, cls) => {
      const btns = arr.map(b =>
        `<button class="transparent no-round ripple md-blank-btn" data-index="${b._idx}">${b.name}</button>`
      ).join('');
      return `<div class="md-btn-group ${cls}">${btns}</div>`;
    };

    buttonsHtml = buildGroup(left, 'md-btn-left') +
                  buildGroup(center, 'md-btn-center') +
                  buildGroup(right, 'md-btn-right');

    actionsClass = 'md-dialog-actions md-dialog-actions-blank';

  } else {
    let titleText = 'Alert';
    if (isInput) titleText = 'Input Required';
    if (isConfirm) titleText = 'Confirm';
    titleHtml = `<div><h4 class="md-dialog-title">${titleText}</h4></div>`;

    const inputHtml = isInput
      ? `<input type="text" id="md-input-field" class="md-dialog-input" placeholder="${task.placeholder}" autocomplete="off">`
      : '';

    contentHtml = `<div OverScrollEffect="true" OverScrollEffectColor="var(--primary)" ScrollBar="true" Type="VScroll" class="md-dialog-content">${task.message.replace(/\n/g, '<br>')}${inputHtml}</div>`;

    if (isInput || isConfirm) {
      buttonsHtml += `<button class="transparent no-round ripple" id="md-cancel-btn">Cancel</button>`;
    }
    buttonsHtml += `<button class="transparent no-round ripple" id="md-close-btn">OK</button>`;
  }

  dialog.innerHTML = `
    ${titleHtml}
    ${contentHtml}
    <div class="${actionsClass}">${buttonsHtml}</div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const inputField = overlay.querySelector('#md-input-field');
  if (isInput) {
    setTimeout(() => inputField.focus(), 100);
  }

  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });

  const closeDialog = (returnValue) => {
    overlay.classList.remove('show');

    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }

      isDialogOpen = false;
      currentDialogHandle = null;
      // ROUTER BRIDGE: tell Router this alert has closed so it can pop its
      // "alert_active" stack entry (see Router.js's carbon:alertclose listener).
      window.dispatchEvent(new CustomEvent('carbon:alertclose', { detail: { type: task.type } }));

      if (typeof task.callback === 'function') {
        task.callback(returnValue);
      }

      processQueue();
    }, 250);
  };

  // ROUTER BRIDGE: expose this dialog to window.dismissAlert() and tell
  // Router it's open, now that closeDialog exists to hand off to it.
  currentDialogHandle = { task, closeDialog };
  window.dispatchEvent(new CustomEvent('carbon:alertopen', { detail: { type: task.type } }));

  if (isBlank) {
    // Wire up each custom button
    overlay.querySelectorAll('.md-blank-btn').forEach(btnEl => {
      const idx = parseInt(btnEl.getAttribute('data-index'), 10);
      const btnDef = task.buttons[idx];
      btnEl.onclick = function () {
        if (btnDef && typeof btnDef.event === 'function') {
          btnDef.event();
        }
        closeDialog(btnDef ? btnDef.name : null);
      };
    });

    // Backdrop click — default is no-op, only fires if .clickBackdrop() was set
    overlay.onclick = function (e) {
      if (e.target === overlay && typeof task.backdropEvent === 'function') {
        task.backdropEvent();
        closeDialog(null);
      }
    };

  } else {
    overlay.querySelector('#md-close-btn').onclick = function () {
      if (isInput) {
        closeDialog(inputField.value);
      } else {
        closeDialog(true);
      }
    };

    const cancelBtn = overlay.querySelector('#md-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = function () {
        if (isInput) {
          closeDialog(null);
        } else {
          closeDialog(false);
        }
      };
    }

    if (isInput) {
      inputField.onkeydown = function (e) {
        if (e.key === "Enter") {
          overlay.querySelector('#md-close-btn').click();
        }
      };
    }
  }
}