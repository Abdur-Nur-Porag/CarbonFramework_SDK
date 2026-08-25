function buildAPI(el) {
  if (!(el instanceof HTMLElement)) {
    throw new Error("buildAPI requires a valid HTMLElement");
  }

  // FIX 1: Safe storage for named children so they don't overwrite API methods
  const refs = {};

  return {
    el,
    refs, // Exposes the refs object so developers can access child elements

    // ---- id ----
    id(id) { if (id) el.id = id; return this; },
    addId(v) { if (v) el.id = v; return this; },
    removeId() { el.removeAttribute("id"); return this; },
    isExistId() { return !!el.id; },
    getId() { return el.id || null; },

    // ---- class ----
    class(cls) { return this.addClass(cls); },
    addClass(cls) {
      if (!cls) return this;
      if (Array.isArray(cls)) el.classList.add(...cls);
      else el.classList.add(cls);
      return this;
    },
    removeClass(cls) {
      if (!cls) return this;
      if (Array.isArray(cls)) el.classList.remove(...cls);
      else el.classList.remove(cls);
      return this;
    },
    removeAllClass() { el.className = ""; return this; },
    isExistClass(c) { return !!c && el.classList.contains(c); },
    getAllClass() { return Array.from(el.classList); },

    // ---- attrs ----
    attrs(a) { return this.addAttr(a); },
    addAttr(a) {
      if (a && typeof a === "object") {
        for (const k in a)
        if (a[k] != null) el.setAttribute(k, a[k]);
      }
      return this;
    },
    removeAttr(list) {
      if (!list) return this;
      if (!Array.isArray(list)) list = [list];
      list.forEach(x => el.removeAttribute(x));
      return this;
    },
    updateAttrValue(...updates) {
      updates.forEach(([k, v]) => { if (k) el.setAttribute(k, v); });
      return this;
    },
    getAttrValue(name) { return el.getAttribute(name); },
    getAllAttr() {
      const obj = {};
      for (const a of el.attributes) obj[a.name] = a.value;
      return obj;
    },

    // ---- style ----
    style(s) { return this.addStyle(s); },
    addStyle(s) { if (s && typeof s === "object") Object.assign(el.style, s); return this; },
    removeStyle() { el.removeAttribute("style"); return this; },
    getStyle(p) { return window.getComputedStyle(el)[p]; },

    // ---- events ----
    event(name, fn, options) {
      if (typeof fn === "function" && name) el.addEventListener(name, fn, options);
      return this;
    },
    off(name, fn, options) {
      if (typeof fn === "function" && name) el.removeEventListener(name, fn, options);
      return this;
    },
    onClick(fn) { return this.event("click", fn); },

    // ---- dom ready ----
    domReady(fn) {
      if (typeof fn !== "function") return this;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
      } else {
        fn();
      }
      return this;
    },

    // ---- form check/value ----
    check(v = true) { if (el.type === "checkbox" || el.type === "radio") el.checked = v; return this; },
    uncheck() { if (el.type === "checkbox" || el.type === "radio") el.checked = false; return this; },
    toggleCheck() { if (el.type === "checkbox" || el.type === "radio") el.checked = !el.checked; return this; },
    isChecked() { return !!el.checked; },
    val(v) { if (v !== undefined) { el.value = v; return this; } return el.value; },
    removeVal() { el.value = ""; return this; },

    // ---- form state ----
    disable() { el.disabled = true; return this; },
    enable() { el.disabled = false; return this; },
    isDisabled() { return !!el.disabled; },
    focus() { el.focus(); return this; },
    blur() { el.blur(); return this; },

    // ---- toggle helper ----
    toggleEvent({ event = "click", initial = false, WhenTrue, WhenFalse } = {}) {
      // FIX 2: State is now scoped per-event rather than shared globally
      let currentState = initial;
      el.addEventListener(event, () => {
        currentState = !currentState;
        if (currentState && typeof WhenTrue === "function") WhenTrue();
        else if (!currentState && typeof WhenFalse === "function") WhenFalse();
      });
      return this;
    },

    // ---- content ----
    html(html) { if (html != null) el.innerHTML = html; return this; },
    text(t) { if (t != null) el.innerText = t; return this; },

    // ---- tree ----
    add(target) {
      let parent = null;
      if (typeof target === "string") parent = document.querySelector(target);
      else if (target && target.el) parent = target.el;
      else if (target instanceof HTMLElement) parent = target;
      if (parent) parent.appendChild(el);
      return this;
    },
    appendTo(parent) { return this.add(parent); },

    children(childInput) {
      if (!childInput) return this;
      const addNode = (c) => {
        if (c instanceof HTMLElement) el.appendChild(c);
        else if (c && c.el) el.appendChild(c.el);
        else if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(c));
      };
      if (Array.isArray(childInput)) {
        childInput.flat().forEach(addNode);
      } else if (typeof childInput === "object" && !(childInput instanceof Node)) {
        for (const key in childInput) {
          const c = childInput[key];
          addNode(c);
          refs[key] = c; // FIX 1: Safely storing the reference here
        }
      } else {
        addNode(childInput);
      }
      return this;
    },

    removeChildren() {
      while (el.firstChild) el.removeChild(el.firstChild);
      return this;
    },
    clear() { return this.removeChildren(); },

    // ---- remove self ----
    removeTag() {
      // Removing the element itself also removes its entire subtree,
      // so children are taken care of automatically — no separate cleanup needed.
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      } else if (typeof el.remove === "function") {
        el.remove();
      }
      return this;
    },
    // ---- plugin system ----
    use(fn) {
      if (typeof fn === "function") fn(this);
      return this;
    },

    // ---- ripple effect ----
    ripple({ status = true, background = "rgba(0,0,0,0.3)", duration = 1500 } = {}) {
      if (!status) return this;
      el.classList.add("ripple-container");
      el.style.setProperty("--ripple-duration", `${duration}ms`);
      el.addEventListener("click", function(e) {
        const rect = this.getBoundingClientRect();
        const r = document.createElement("span");
        r.className = "ripple-effect";
        r.style.background = background;
        const size = Math.max(rect.width, rect.height);
        r.style.width = r.style.height = size + "px";
        r.style.left = `${e.clientX - rect.left - size / 2}px`;
        r.style.top = `${e.clientY - rect.top - size / 2}px`;
        this.appendChild(r);
        setTimeout(() => r.remove(), duration);
      });
      return this;
    },

    // ---- visibility ----
    show(displayType = "block") {
      el.style.display = displayType;
      return this;
    },
    hide() {
      el.style.display = "none";
      return this;
    },
    toggle(displayType = "block") {
      if (el.style.display === "none") {
        this.show(displayType);
      } else {
        this.hide();
      }
      return this;
    },

    // ---- background ----
    setBackground(url) {
      if (url) {
        // FIX 4: Removed hardcoded width=100% and height=100%
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundRepeat = "no-repeat";
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      }
      return this;
    },

    // ---- font ----
    setFont(fontName, url = null) {
      if (url) {
        const fontId = `font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(fontId)) {
          const link = document.createElement('link');
          link.id = fontId;
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
        }
      }
      el.style.fontFamily = fontName;
      return this;
    },
  };
}

// ---------------- Factory ----------------
function create(tag) { return buildAPI(document.createElement(tag)); }

function $(selector) {
  const el = document.querySelector(selector);
  return el ? buildAPI(el) : null;
}