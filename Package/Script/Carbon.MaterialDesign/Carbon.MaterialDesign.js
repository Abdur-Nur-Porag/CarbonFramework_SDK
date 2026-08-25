(function() {
  const _emptyNodeList = [];

  function isTouchable() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function isDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  async function wait(milliseconds) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function guid() {
    return "fxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }

  function query(selector, element) {
    try {
      return typeof selector === "string" ? (element || document).querySelector(selector) : selector;
    } catch (e) {
      return null;
    }
  }

  function queryAll(selector, element) {
    try {
      return typeof selector === "string" ? (element || document).querySelectorAll(selector) : selector || _emptyNodeList;
    } catch (e) {
      return _emptyNodeList;
    }
  }

  function hasClass(element, name) {
    return (element && element.classList) ? element.classList.contains(name) : false;
  }

  function hasTag(element, name) {
    return (element && element.tagName) ? element.tagName.toLowerCase() === name : false;
  }

  function hasType(element, name) {
    return (element && element.type) ? element.type.toLowerCase() === name : false;
  }

  function addClass(element, name) {
    if (element instanceof NodeList) {
      for (let i = 0; i < element.length; i++) {
        element[i].classList.add(name);
      }
    } else if (element && element.classList) {
      element.classList.add(name);
    }
  }

  function removeClass(element, name) {
    if (element instanceof NodeList) {
      for (let i = 0; i < element.length; i++) {
        element[i].classList.remove(name);
      }
    } else if (element && element.classList) {
      element.classList.remove(name);
    }
  }

  function on(element, name, callback, useCapture = true) {
    if (element && element.addEventListener) {
      element.addEventListener(name, callback, useCapture);
    }
  }

  function off(element, name, callback, useCapture = true) {
    if (element && element.removeEventListener) {
      element.removeEventListener(name, callback, useCapture);
    }
  }

  function insertBefore(newElement, element) {
    if (element && element.parentNode) {
      element.parentNode.insertBefore(newElement, element);
    }
  }

  function prev(element) {
    return element ? element.previousElementSibling : null;
  }

  function next(element) {
    return element ? element.nextElementSibling : null;
  }

  function parent(element) {
    return element ? element.parentElement : null;
  }

  function create(htmlAttributesAsJson) {
    const element = document.createElement("div");
    const keys = Object.keys(htmlAttributesAsJson);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = htmlAttributesAsJson[key];
      element.setAttribute(key, value);
    }
    return element;
  }

  function blurActiveElement() {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }

  function queryAllDataUi(id) {
    return queryAll('[data-ui="#' + id + '"]');
  }

  function queryDataUi(id) {
    return query('[data-ui="#' + id + '"]');
  }

  function updateAllClickable(element) {
    if (element.id && hasClass(element, "page")) {
      element = queryDataUi(element.id) || element;
    }
    const container = parent(element);
    if (!container) return;
    if (!hasClass(container, "tabs") && !hasClass(container, "tabbed") && !hasTag(container, "nav")) {
      return;
    }
    const as = queryAll("a", container);
    for (let i = 0; i < as.length; i++) {
      removeClass(as[i], "active");
    }
    addClass(element, "active");
  }

  function updatePlaceholder(element) {
    if (!element.placeholder) {
      element.placeholder = " ";
    }
  }

  function onClickLabel(e) {
    const label = e.currentTarget;
    const field = parent(label);
    const input = query("input:not([type=file], [type=checkbox], [type=radio]), select, textarea", field);
    if (input) {
      input.focus();
    }
  }

  function onFocusInput(e) {
    const input = e.currentTarget;
    updateInput(input);
  }

  function onBlurInput(e) {
    const input = e.currentTarget;
    updateInput(input);
  }

  function onChangeFile(e) {
    const input = e.currentTarget;
    updateFile(input);
  }

  function onChangeColor(e) {
    const input = e.currentTarget;
    updateColor(input);
  }

  function onKeydownFile(e) {
    const input = e.currentTarget;
    updateFile(input, e);
  }

  function onKeydownColor(e) {
    const input = e.currentTarget;
    updateColor(input, e);
  }

  function onInputTextarea(e) {
    const textarea = e.currentTarget;
    updateTextarea(textarea);
  }

  function onPasswordIconClick(e) {
    const icon = e.currentTarget;
    const input = query("input", parent(icon));
    if (input && icon.textContent && icon.textContent.includes("visibility")) {
      input.type = input.type === "password" ? "text" : "password";
    }
  }

  function updateAllLabels() {
    const labels = queryAll(".field > label");
    for (let i = 0; i < labels.length; i++) {
      on(labels[i], "click", onClickLabel);
    }
  }

  function updateAllInputs() {
    const inputs = queryAll(".field > input:not([type=file], [type=color], [type=range])");
    for (let i = 0; i < inputs.length; i++) {
      on(inputs[i], "focus", onFocusInput);
      on(inputs[i], "blur", onBlurInput);
      updateInput(inputs[i]);
    }
  }

  function updateAllSelects() {
    const selects = queryAll(".field > select");
    for (let i = 0; i < selects.length; i++) {
      on(selects[i], "focus", onFocusInput);
      on(selects[i], "blur", onBlurInput);
    }
  }

  function updateAllFiles() {
    const files = queryAll(".field > input[type=file]");
    for (let i = 0; i < files.length; i++) {
      on(files[i], "change", onChangeFile);
      updateFile(files[i]);
    }
  }

  function updateAllColors() {
    const colors = queryAll(".field > input[type=color]");
    for (let i = 0; i < colors.length; i++) {
      on(colors[i], "change", onChangeColor);
      updateColor(colors[i]);
    }
  }

  function updateAllTextareas() {
    const textareas = queryAll(".field.textarea > textarea");
    for (let i = 0; i < textareas.length; i++) {
      on(textareas[i], "focus", onFocusInput);
      on(textareas[i], "blur", onBlurInput);
      on(textareas[i], "input", onInputTextarea);
      updateTextarea(textareas[i]);
    }
  }

  function updateAllPasswordIcons() {
    const icons = queryAll("input[type=password] ~ :is(i, a)");
    for (let i = 0; i < icons.length; i++) {
      on(icons[i], "click", onPasswordIconClick);
    }
  }

  function updateInput(input) {
    if (hasType(input, "number") && !input.value) {
      input.value = "";
    }
    updatePlaceholder(input);
  }

  function updateFile(input, e) {
    if (e && e.key === "Enter") {
      const previousInput = prev(input);
      if (hasType(previousInput, "file")) {
        previousInput.click();
      }
      return;
    }
    const nextInput = next(input);
    if (!hasType(nextInput, "text")) {
      return;
    }
    if (input.files) {
      nextInput.value = Array.from(input.files).map((x) => x.name).join(", ");
    } else {
      nextInput.value = "";
    }
    nextInput.readOnly = true;
    on(nextInput, "keydown", onKeydownFile, false);
    updateInput(nextInput);
  }

  function updateColor(input, e) {
    if (e && e.key === "Enter") {
      const previousInput = prev(input);
      if (hasType(previousInput, "color")) {
        previousInput.click();
      }
      return;
    }
    const nextInput = next(input);
    if (!hasType(nextInput, "text")) {
      return;
    }
    nextInput.readOnly = true;
    nextInput.value = input.value;
    on(nextInput, "keydown", onKeydownColor, false);
    updateInput(nextInput);
  }

  function updateTextarea(textarea) {
    updatePlaceholder(textarea);
    const field = parent(textarea);
    if (!field) return;
    field.removeAttribute("style");
    if (hasClass(field, "min")) {
      const size = Math.min(192, Math.max(textarea.scrollHeight, field.offsetHeight));
      field.style.setProperty("---size", size + "px");
    }
  }

  function updateAllFields() {
    updateAllLabels();
    updateAllInputs();
    updateAllSelects();
    updateAllFiles();
    updateAllColors();
    updateAllTextareas();
    updateAllPasswordIcons();
  }

  function onInputDocument(e) {
    const input = e.target;
    if (!hasTag(input, "input") && !hasTag(input, "select")) {
      return;
    }
    if (input.type === "range") {
      input.focus();
      updateRange(input);
    } else {
      updateAllRanges();
    }
  }

  function onFocusRange(e) {
    if (!isTouchable()) return;
    const input = e.target;
    const label = parent(input);
    if (hasClass(label, "vertical")) {
      document.body.classList.add("no-scroll");
    }
  }

  function onBlurRange(e) {
    if (!isTouchable()) return;
    const input = e.target;
    const label = parent(input);
    if (hasClass(label, "vertical")) {
      document.body.classList.remove("no-scroll");
    }
  }

  function updateAllRanges() {
    const body = document.body;
    const ranges = queryAll(".slider > input[type=range]");
    if (!ranges.length) {
      off(body, "input", onInputDocument, false);
    } else {
      on(body, "input", onInputDocument, false);
    }
    for (let i = 0; i < ranges.length; i++) {
      updateRange(ranges[i]);
    }
  }

  function rootSizeInPixels() {
    const size = getComputedStyle(document.documentElement).getPropertyValue("--size") || "16px";
    if (size.includes("%")) {
      return parseInt(size) * 16 / 100;
    }
    if (size.includes("em")) {
      return parseInt(size) * 16;
    }
    return parseInt(size);
  }

  function updateRange(input) {
    on(input, "focus", onFocusRange);
    on(input, "blur", onBlurRange);
    const label = parent(input);
    const bar = query("span", label);
    const inputs = queryAll("input", label);
    if (!inputs.length || !bar) {
      return;
    }
    const rootSize = rootSizeInPixels();
    const thumb = hasClass(label, "max") ? 0 : 0.25 * rootSize * 100 / inputs[0].offsetWidth;
    const percents = [];
    const values = [];
    for (let i = 0; i < inputs.length; i++) {
      const min = parseFloat(inputs[i].min) || 0;
      const max = parseFloat(inputs[i].max) || 100;
      const value = parseFloat(inputs[i].value) || 0;
      const percent2 = (value - min) * 100 / (max - min);
      const fix = thumb / 2 - thumb * percent2 / 100;
      percents.push(percent2 + fix);
      values.push(value);
    }
    let percent = percents[0];
    let start2 = 0;
    let end = 100 - start2 - percent;
    let value1 = values[0];
    let value2 = values[1] || 0;
    if (inputs.length > 1) {
      percent = Math.abs(percents[1] - percents[0]);
      start2 = percents[1] > percents[0] ? percents[0] : percents[1];
      end = 100 - start2 - percent;
      if (value2 > value1) {
        value1 = values[1] || 0;
        value2 = values[0];
      }
    }
    label.style.setProperty("---start", start2 + "%");
    label.style.setProperty("---end", end + "%");
    label.style.setProperty("---value1", "'" + value1 + "'");
    label.style.setProperty("---value2", "'" + value2 + "'");
  }

  function updateAllSliders() {
    updateAllRanges();
  }

  const _lastTheme = {
    light: "",
    dark: ""
  };

  function getMode() {
    if (document && document.body && document.body.classList.contains("dark")) {
      return "dark";
    }
    return "light";
  }

  function lastTheme() {
    if (_lastTheme.light && _lastTheme.dark) {
      return _lastTheme;
    }
    const body = document.body;
    const light = document.createElement("body");
    light.className = "light";
    body.appendChild(light);
    const dark = document.createElement("body");
    dark.className = "dark";
    body.appendChild(dark);
    const fromLight = getComputedStyle(light);
    const fromDark = getComputedStyle(dark);
    const variables = ["--primary", "--on-primary", "--primary-container", "--on-primary-container", "--secondary", "--on-secondary", "--secondary-container", "--on-secondary-container", "--tertiary", "--on-tertiary", "--tertiary-container", "--on-tertiary-container", "--error", "--on-error", "--error-container", "--on-error-container", "--background", "--on-background", "--surface", "--on-surface", "--surface-variant", "--on-surface-variant", "--outline", "--outline-variant", "--shadow", "--scrim", "--inverse-surface", "--inverse-on-surface", "--inverse-primary", "--surface-dim", "--surface-bright", "--surface-container-lowest", "--surface-container-low", "--surface-container", "--surface-container-high", "--surface-container-highest"];
    for (let i = 0; i < variables.length; i++) {
      _lastTheme.light += variables[i] + ":" + fromLight.getPropertyValue(variables[i]) + ";";
      _lastTheme.dark += variables[i] + ":" + fromDark.getPropertyValue(variables[i]) + ";";
    }
    body.removeChild(light);
    body.removeChild(dark);
    return _lastTheme;
  }

  function updateTheme(source) {
    const context = window;
    const body = document.body;
    if (!source || !context.materialDynamicColors) {
      return lastTheme();
    }
    const mode = getMode();
    if (source.light && source.dark) {
      _lastTheme.light = source.light;
      _lastTheme.dark = source.dark;
      body.setAttribute("style", source[mode]);
      return source;
    }
    return context.materialDynamicColors(source).then((theme) => {
      const toCss = (data) => {
        let style = "";
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = data[key];
          const kebabCase = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
          style += "--" + kebabCase + ":" + value + ";";
        }
        return style;
      };
      _lastTheme.light = toCss(theme.light);
      _lastTheme.dark = toCss(theme.dark);
      body.setAttribute("style", _lastTheme[mode]);
      return _lastTheme;
    });
  }

  function updateMode(value) {
    const context = window;
    const body = document.body;
    if (!body) return value;
    if (!value) return getMode();
    if (value === "auto") {
      value = isDark() ? "dark" : "light";
    }
    body.classList.remove("light", "dark");
    body.classList.add(value);
    const lastThemeStyle = value === "light" ? _lastTheme.light : _lastTheme.dark;
    if (context.materialDynamicColors) {
      body.setAttribute("style", lastThemeStyle);
    }
    return getMode();
  }

  const _dialogs = [];

  function onKeydownDialog(e) {
    if (e.key === "Escape") {
      const dialog = e.currentTarget;
      updateDialog(dialog, dialog);
    }
  }

  function focusOnDialogOrElement(dialog) {
    const element = query("[autofocus]", dialog) || dialog;
    if (element && element.focus) {
      element.focus();
    }
  }

  function closeDialog(dialog, overlay) {
    removeClass(queryAllDataUi(dialog.id), "active");
    removeClass(dialog, "active");
    removeClass(overlay, "active");
    if (dialog.close) {
      dialog.close();
    }
    _dialogs.pop();
    const previousDialog = _dialogs[_dialogs.length - 1];
    if (previousDialog) {
      previousDialog.focus();
    } else if (isTouchable()) {
      document.body.classList.remove("no-scroll");
    }
  }

  async function openDialog(dialog, overlay, isModal, from) {
    if (!hasTag(from, "button") && !hasClass(from, "button") && !hasClass(from, "chip")) {
      addClass(from, "active");
    }
    addClass(overlay, "active");
    addClass(dialog, "active");
    if (isModal && dialog.showModal) {
      dialog.showModal();
    } else if (dialog.show) {
      dialog.show();
    }
    await wait(90);
    if (!isModal) {
      on(dialog, "keydown", onKeydownDialog, false);
    }
    _dialogs.push(dialog);
    if (isTouchable()) {
      document.body.classList.add("no-scroll");
    }
    focusOnDialogOrElement(dialog);
  }

  function onClickOverlay(e) {
    const overlay = e.currentTarget;
    const dialog = next(overlay);
    if (hasTag(dialog, "dialog")) {
      closeDialog(dialog, overlay);
    }
  }

  async function updateDialog(from, dialog) {
    blurActiveElement();
    let overlay = prev(dialog);
    const isActive = hasClass(dialog, "active") || dialog.open;
    const isModal = hasClass(dialog, "modal");
    if (!isModal) {
      off(dialog, "keydown", onKeydownDialog, false);
    }
    if (!hasClass(overlay, "overlay")) {
      overlay = create({ class: "overlay" });
      insertBefore(overlay, dialog);
      await wait(90);
    }
    if (!isModal) {
      on(overlay, "click", onClickOverlay, false);
    }
    if (isActive) {
      closeDialog(dialog, overlay);
    } else {
      openDialog(dialog, overlay, isModal, from);
    }
  }

  let _timeoutMenu;

  function onClickDocument(e) {
    off(document.body, "click", onClickDocument);
    const body = e.target;
    const menus = queryAll("menu.active");
    for (let i = 0; i < menus.length; i++) {
      updateMenu(body, menus[i], e);
    }
  }

  function focusOnMenuOrInput(menu) {
    setTimeout(() => {
      const input = query(".field > input", menu);
      if (input) {
        input.focus();
      } else {
        menu.focus();
      }
    }, 90);
  }

  function updateMenu(from, menu, e) {
    if (_timeoutMenu) {
      clearTimeout(_timeoutMenu);
    }
    _timeoutMenu = setTimeout(() => {
      on(document.body, "click", onClickDocument);
      if (!hasTag(document.activeElement, "input")) {
        blurActiveElement();
      }
      const isActive = hasClass(menu, "active");
      const isEvent = e && e.target === from;
      const isChild = !!from.closest("menu");
      if (!isActive && isChild || isActive && isEvent) {
        removeClass(menu, "active");
        return;
      }
      const activeMenus = queryAll("menu.active");
      for (let i = 0; i < activeMenus.length; i++) {
        removeClass(activeMenus[i], "active");
      }
      addClass(menu, "active");
      focusOnMenuOrInput(menu);
    }, 90);
  }

  let _timeoutSnackbar;

  function onClickSnackbar(e) {
    const snackbar = e.currentTarget;
    removeClass(snackbar, "active");
    if (_timeoutSnackbar) {
      clearTimeout(_timeoutSnackbar);
    }
  }

  function updateSnackbar(snackbar, milliseconds) {
    blurActiveElement();
    const activeSnackbars = queryAll(".snackbar.active");
    for (let i = 0; i < activeSnackbars.length; i++) {
      removeClass(activeSnackbars[i], "active");
    }
    addClass(snackbar, "active");
    on(snackbar, "click", onClickSnackbar);
    if (_timeoutSnackbar) {
      clearTimeout(_timeoutSnackbar);
    }
    if (milliseconds === -1) {
      return;
    }
    _timeoutSnackbar = setTimeout(() => {
      removeClass(snackbar, "active");
    }, milliseconds || 6000);
  }

  function updatePage(page) {
    const container = parent(page);
    if (container) {
      const pages = queryAll(":scope > .page", container);
      for (let i = 0; i < pages.length; i++) {
        removeClass(pages[i], "active");
      }
    }
    addClass(page, "active");
  }

  function onPointerDownRipple(e) {
    updateRipple(e);
  }

  function updateRipple(e) {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;
    const x = e.clientX - rect.left - radius;
    const y = e.clientY - rect.top - radius;
    const rippleContainer = document.createElement("div");
    rippleContainer.className = "ripple-js";
    const ripple = document.createElement("div");
    ripple.style.width = diameter + "px";
    ripple.style.height = diameter + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    ripple.addEventListener("animationend", () => {
      rippleContainer.remove();
    });
    rippleContainer.appendChild(ripple);
    element.appendChild(rippleContainer);
  }

  function updateAllRipples() {
    const ripples = queryAll(".slow-ripple, .ripple, .fast-ripple");
    for (let i = 0; i < ripples.length; i++) {
      on(ripples[i], "pointerdown", onPointerDownRipple);
    }
  }

  const _context = window;
  let _timeoutMutation;
  let _mutation;

  function onMutation() {
    if (_timeoutMutation) {
      clearTimeout(_timeoutMutation);
    }
    _timeoutMutation = setTimeout(() => {
      _ui();
    }, 180);
  }

  async function run(from, to, options, e) {
    if (!to) {
      to = query(from.getAttribute("data-ui"));
      if (!to) {
        return;
      }
    }
    updateAllClickable(from);
    if (hasTag(to, "dialog")) {
      await updateDialog(from, to);
      return;
    }
    if (hasTag(to, "menu")) {
      updateMenu(from, to, e);
      return;
    }
    if (hasClass(to, "snackbar")) {
      updateSnackbar(to, options);
      return;
    }
    if (hasClass(to, "page")) {
      updatePage(to);
      return;
    }
    if (hasClass(to, "active")) {
      removeClass(from, "active");
      removeClass(to, "active");
      return;
    }
    addClass(to, "active");
  }

  function onClickElement(e) {
    run(e.currentTarget, null, null, e);
  }

  function onKeydownElement(e) {
    if (e.key === "Enter") {
      run(e.currentTarget, null, null, e);
    }
  }

  function setup() {
    if (_context.ui || _mutation) {
      return;
    }
    _mutation = new MutationObserver(onMutation);
    _mutation.observe(document.body, { childList: true, subtree: true });
    onMutation();
  }

  function updateAllDataUis() {
    const elements = queryAll("[data-ui]");
    for (let i = 0; i < elements.length; i++) {
      on(elements[i], "click", onClickElement);
      if (hasTag(elements[i], "a") && !elements[i].getAttribute("href")) {
        on(elements[i], "keydown", onKeydownElement);
      }
    }
  }

  function _ui(selector, options) {
    if (selector) {
      if (selector === "setup") {
        setup();
        return;
      }
      if (selector === "guid") {
        return guid();
      }
      if (selector === "mode") {
        return updateMode(options);
      }
      if (selector === "theme") {
        return updateTheme(options);
      }
      const to = query(selector);
      if (!to) {
        return;
      }
      run(to, to, options);
    }
    updateAllDataUis();
    updateAllFields();
    updateAllSliders();
    updateAllRipples();
  }

  function start() {
    if (_context.ui) {
      return;
    }
    const body = document.body;
    if (body && !body.classList.contains("dark") && !body.classList.contains("light")) {
      updateMode("auto");
    }
    setup();
    _context.ui = _ui;
  }

  // Execute start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();