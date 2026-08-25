/**
 * bridge_core.js
 * ─────────────────────────────────────────────────────────────
 * Internal Promise registry.
 * Include this as a normal  in your project, before
 * android_shim.js (e.g. ).
 * It is no longer injected automatically by the native previewer.
 * DO NOT call anything in here directly from your app code.
 * Use the window.Android.* API defined in android_shim.js instead.
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  if (window._CarbonInternal) return; // already injected, skip

  const registry = Object.create(null); // { reqId: { resolve, reject } }
  let   _counter = 0;

  /**
   * Internal namespace — used by PreviewRender.completeRequest() and android_shim.js
   */
  window._CarbonInternal = {

    /**
     * Creates a new pending Promise and returns its { promise, reqId }.
     * Called by android_shim.js for every bridge request.
     */
    createRequest() {
      const reqId = 'r' + (++_counter) + '_' + Date.now();
      const promise = new Promise((resolve, reject) => {
        registry[reqId] = { resolve, reject };
      });
      return { promise, reqId };
    },

    /**
     * Called by Java (PreviewRender.completeRequest) to resolve or reject.
     * @param {string}  id      - the reqId
     * @param {string}  data    - result payload (string)
     * @param {boolean} isError - true → reject, false → resolve
     */
    onReply(id, data, isError) {
      const entry = registry[id];
      if (!entry) {
        console.warn('[Bridge] No pending request for id:', id);
        return;
      }
      delete registry[id];
      if (isError) {
        entry.reject(new Error(data));
      } else {
        entry.resolve(data);
      }
    },

    /** Returns count of still-pending requests (useful for debugging). */
    pendingCount() {
      return Object.keys(registry).length;
    },

    // ── Backpress channel ────────────────────────────────────────
    // A persistent, repeatable callback slot — NOT a one-shot Promise.
    // Set by android_shim.js's Android.onBackpress(cb).
    // Invoked directly by PreviewRender.onBackPressed() (native side) on
    // every single hardware back press, for as long as disableBackpress(true)
    // is active. This intentionally bypasses the request/registry Promise
    // system above, since Promises can only ever resolve once and this
    // needs to fire repeatedly.
    _backpressHandler: null,

    /**
     * Called by native code (PreviewRender) on every back press while
     * backpress is disabled. Runs whatever handler was registered via
     * Android.onBackpress(cb), if any.
     */
    triggerBackpress() {
      if (typeof window._CarbonInternal._backpressHandler === 'function') {
        try {
          window._CarbonInternal._backpressHandler();
        } catch (e) {
          console.error('[Bridge] onBackpress handler threw:', e);
        }
      }
    }
  };

  console.log('[Bridge] Core initialized. Ready.');
})();
