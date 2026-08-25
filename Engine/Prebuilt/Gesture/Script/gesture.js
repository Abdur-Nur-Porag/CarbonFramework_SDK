const UIStyleFixer = {
  _sheet: null,
  _registeredIds: new Set(),

  _init: function () {
    if (this._sheet) return;
    const styleEl = document.createElement("style");
    styleEl.id = "lithium-dynamic-styles";
    document.head.appendChild(styleEl);
    this._sheet = styleEl.sheet;
    this._insertRule("* { -webkit-tap-highlight-color: transparent; }");
    this._insertRule("dialog:focus, dialog:focus-visible { outline: none !important; }");
    this._insertRule(".gesture-active { user-select: none; -webkit-user-select: none; }");
  },

  _insertRule: function (ruleText) {
    try {
      this._sheet.insertRule(ruleText, this._sheet.cssRules.length);
    } catch (e) {
      console.warn("Lithium Engine: CSS Rule rejected by browser ->", ruleText);
    }
  },

  removeOutlineForId: function (id) {
    if (!id) return;
    this._init();
    const cleanId = id.replace(/^#/, "");
    if (this._registeredIds.has(cleanId)) return;
    this._insertRule(`#${cleanId}:focus, #${cleanId}:focus-visible { outline: none !important; }`);
    this._registeredIds.add(cleanId);
  },
};

const GestureManager = {
  _registry: {},
  _named: {},

  _createGesture: function (direction, config) {
    const state = {
      active: false,
      startX: 0,
      startY: 0,
      startedInZone: false,
      dragging: false,   // true while finger is actively moving inside zone
    };

    const edgeLimit  = parseInt(config.EdgeSize) || 40;
    const threshold  = 60;   // px needed to commit open/close on release

    if (config.Content) UIStyleFixer.removeOutlineForId(config.Content);

    const ownerPageName = config.PageView || null;
    const registryKey   = ownerPageName || "__global__";

    if (!this._registry[registryKey]) this._registry[registryKey] = [];
    this._registry[registryKey].push(state);

    if (config.Name) this._named[config.Name] = { state, config };

    // ── Helpers ──────────────────────────────────────────────────────────────

    const isCurrentPage = () => {
      if (!ownerPageName) return true;
      if (typeof Carbon !== "undefined" && Carbon.currentPage !== undefined)
        return Carbon.currentPage === ownerPageName;
      const el = document.querySelector(
        `PageView[Name="${ownerPageName}"], pageview[Name="${ownerPageName}"]`
      );
      return el ? el.hasAttribute("active") : true;
    };

    /**
     * dragProgress(diffX, diffY) → 0..1
     * 0 = fully closed position, 1 = fully open position.
     * Clamped so the content never overshoots beyond its resting points.
     */
    const dragProgress = (diffX, diffY) => {
      let raw;
      if (!state.active) {
        // Opening drag: progress goes from 0 → 1 as finger moves toward open
        if      (direction === "left")   raw = diffX / threshold;
        else if (direction === "right")  raw = -diffX / threshold;
        else if (direction === "top")    raw = diffY / threshold;
        else                             raw = -diffY / threshold;
      } else {
        // Closing drag: progress goes from 1 → 0 as finger moves toward closed
        if      (direction === "left")   raw = 1 + diffX / threshold;
        else if (direction === "right")  raw = 1 - diffX / threshold;
        else if (direction === "top")    raw = 1 + diffY / threshold;
        else                             raw = 1 - diffY / threshold;
      }
      return Math.min(1, Math.max(0, raw));
    };

    const resetState = () => {
      state.active        = false;
      state.dragging      = false;
      state.startedInZone = false;
      document.body.classList.remove("gesture-active");
    };

    state._reset = resetState;

    state._activate = () => {
      if (state.active) return;
      state.active = true;
      if (typeof config.OnOpen === "function") config.OnOpen();
    };

    state._inactivate = () => {
      if (!state.active) return;
      state.active        = false;
      state.dragging      = false;
      state.startedInZone = false;
      document.body.classList.remove("gesture-active");
      if (typeof config.OnClose === "function") config.OnClose();
    };

    // ─── touchstart ──────────────────────────────────────────────────────────
    window.addEventListener("touchstart", (e) => {
      if (!isCurrentPage()) { state.startedInZone = false; return; }

      // Backdrop dismiss (tap outside content while open)
      if (state.active && config.Content) {
        const el = document.getElementById(config.Content.replace(/^#/, ""));
        if (el && !el.contains(e.target)) {
          state.active        = false;
          state.startedInZone = false;
          document.body.classList.remove("gesture-active");
          if (typeof config.OnBackdrop === "function") config.OnBackdrop();
          if (typeof config.OnClose    === "function") config.OnClose();
          return;
        }
      }

      state.startX = e.touches[0].clientX;
      state.startY = e.touches[0].clientY;
      state.dragging = false;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      if (!state.active) {
        // Closed: only accept touches from the edge zone
        if      (direction === "top"    && state.startY <= edgeLimit)           state.startedInZone = true;
        else if (direction === "bottom" && state.startY >= screenH - edgeLimit) state.startedInZone = true;
        else if (direction === "left"   && state.startX <= edgeLimit)           state.startedInZone = true;
        else if (direction === "right"  && state.startX >= screenW - edgeLimit) state.startedInZone = true;
        else                                                                     state.startedInZone = false;
      } else {
        // Open: accept touches anywhere (enables swipe-to-close from anywhere)
        state.startedInZone = true;
      }

      if (state.startedInZone) document.body.classList.add("gesture-active");
    }, { passive: false });

    // ─── touchmove ───────────────────────────────────────────────────────────
    window.addEventListener("touchmove", (e) => {
      if (!isCurrentPage() || !state.startedInZone) return;

      e.preventDefault();

      const diffX = e.touches[0].clientX - state.startX;
      const diffY = e.touches[0].clientY - state.startY;

      // Only start dragging once the finger moves at least 4px (avoids jitter)
      if (!state.dragging) {
        const moved = Math.abs(diffX) + Math.abs(diffY);
        if (moved < 4) return;
        state.dragging = true;
      }

      // Fire OnDrag with progress 0..1 so the developer can move the drawer
      if (typeof config.OnDrag === "function") {
        config.OnDrag(dragProgress(diffX, diffY), diffX, diffY);
      }
    }, { passive: false });

    // ─── touchend ────────────────────────────────────────────────────────────
    window.addEventListener("touchend", (e) => {
      document.body.classList.remove("gesture-active");

      if (!state.startedInZone) return;

      const diffX = e.changedTouches[0].clientX - state.startX;
      const diffY = e.changedTouches[0].clientY - state.startY;

      let shouldOpen  = false;
      let shouldClose = false;

      if      (direction === "top")    { shouldOpen = diffY >  threshold; shouldClose = diffY < -threshold; }
      else if (direction === "bottom") { shouldOpen = diffY < -threshold; shouldClose = diffY >  threshold; }
      else if (direction === "left")   { shouldOpen = diffX >  threshold; shouldClose = diffX < -threshold; }
      else if (direction === "right")  { shouldOpen = diffX < -threshold; shouldClose = diffX >  threshold; }

      if (!state.active && shouldOpen) {
        state.active = true;
        if (typeof config.OnOpen === "function") config.OnOpen();
      } else if (state.active && shouldClose) {
        state.active = false;
        if (typeof config.OnClose === "function") config.OnClose();
      } else if (state.dragging) {
        // Finger released before threshold — snap back to current state
        if (typeof config.OnDragCancel === "function")
          config.OnDragCancel(state.active);
      }

      state.dragging      = false;
      state.startedInZone = false;
    });

    // ─── touchcancel ─────────────────────────────────────────────────────────
    window.addEventListener("touchcancel", () => {
      if (state.dragging && typeof config.OnDragCancel === "function")
        config.OnDragCancel(state.active);
      state.dragging      = false;
      state.startedInZone = false;
      document.body.classList.remove("gesture-active");
    });
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  gestureTop:    function (config) { this._createGesture("top",    config); },
  gestureBottom: function (config) { this._createGesture("bottom", config); },
  gestureLeft:   function (config) { this._createGesture("left",   config); },
  gestureRight:  function (config) { this._createGesture("right",  config); },

  activeGesture: function (name) {
    const entry = this._named[name];
    if (!entry) { console.warn(`GestureManager.activeGesture: no gesture named "${name}"`); return; }
    entry.state._activate();
  },

  inactiveGesture: function (name) {
    const entry = this._named[name];
    if (!entry) { console.warn(`GestureManager.inactiveGesture: no gesture named "${name}"`); return; }
    entry.state._inactivate();
  },
};

/* ── Carbon.navigate() PATCH ─────────────────────────────────────────────── */
(function patchCarbonNavigate() {
  const apply = () => {
    if (typeof Carbon === "undefined" || typeof Carbon.navigate !== "function") {
      if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", apply, { once: true });
      return;
    }
    const _orig = Carbon.navigate.bind(Carbon);
    Carbon.navigate = async function (config, mode = "open") {
      const leavingPage = Carbon.currentPage;
      if (leavingPage && GestureManager._registry[leavingPage])
        GestureManager._registry[leavingPage].forEach(s => s._reset?.());
      return _orig(config, mode);
    };
  };
  apply();
})();
