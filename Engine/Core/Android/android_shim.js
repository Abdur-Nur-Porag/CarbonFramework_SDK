/**
 * android_shim.js
 * ─────────────────────────────────────────────────────────────
 * Exposes window.Android.*  as clean async functions.
 * Every call returns a Promise that resolves/rejects via bridge_core.js.
 *

 * bridge_core.js 
 * It is no longer injected automatically by the native previewer —
 * the native onJsPrompt bridge works the same either way, so loading
 * it as a plain script is all that's needed.
 *
 * To add an action: duplicate any line below and change the name.
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  if (window.Android) return; // already loaded

  /**
   * Core bridge transport.
   * Sends a prompt to Java and returns a Promise that resolves on reply.
   *
   * @param {string} action  - bridge action name
   * @param {string} payload - string payload (JSON-encode objects before passing)
   * @returns {{ promise: Promise<string>, cancel: Function }}
   */
  function _bridge(action, payload) {
    const { promise, reqId } = window._CarbonInternal.createRequest();

    // Format: bridge_req:<REQ_ID>:<ACTION>  |  defaultValue = payload
    window.prompt('bridge_req:' + reqId + ':' + action, payload ?? '');

    // Return an object so callers can also cancel long-running tasks
    return Object.assign(promise, {
      cancel() {
        window.prompt('bridge_req:' + reqId + ':STOP_TASK', reqId);
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  //  PUBLIC API — window.Android
  // ════════════════════════════════════════════════════════════
  window.Android = {

    // ── SystemBridge ─────────────────────────────────────────
    /** Close the app entirely */
    killApp:              ()  => _bridge('killApp', ''),
    /** Open a URL in the device browser */
    openExternalBrowser:  (url)  => _bridge('openExternalBrowser', url),
    /** Returns "Manufacturer Model" */
    getDeviceModel:       ()  => _bridge('getDeviceModel', ''),
    /** Returns Android OS version string e.g. "13" */
    getOSVersion:         ()  => _bridge('getOSVersion', ''),
    /** Pass "true" or "false" to keep screen awake */
    keepScreenOn:         (on)   => _bridge('keepScreenOn', String(on)),
    /** Vibrate for N milliseconds */
    vibrate:              (ms)   => _bridge('vibrate', String(ms)),
    /** Check a permission — returns "true" or "false" */
    checkPermission:      (name) => _bridge('checkPermission', name),
    /** Request a permission (no JS result — use checkPermission after) */
    requestPermission:    (name) => _bridge('requestPermission', name),
    /**
     * Block screenshots + blank the app preview in the recent-apps switcher.
     * FIX: previously missing from this shim entirely ("not a function").
     */
    enableScreenshotProtection:  () => _bridge('enableScreenshotProtection', ''),
    /** Restore normal screenshot behavior. */
    disableScreenshotProtection: () => _bridge('disableScreenshotProtection', ''),

    // ── StorageBridge ────────────────────────────────────────
    /** Persist a key/value pair to SharedPreferences */
    saveData:   (key, value) => _bridge('saveData',  JSON.stringify({ k: key, v: value })),
    /** Load a previously saved value, returns "" if not found */
    loadData:   (key)        => _bridge('loadData',  key),

    // ── UiBridge ─────────────────────────────────────────────
    /** Show a native Android Toast */
    showToast:          (msg)   => _bridge('showToast',          msg),
    /** Copy text to the system clipboard */
    copyToClipboard:    (text)  => _bridge('copyToClipboard',    text),
    /** Open the native share sheet */
    shareText:          (text)  => _bridge('shareText',          text),
    /** Hide the status bar (fullscreen) */
    hideStatusbar:      ()      => _bridge('hideStatusbar',      ''),
    /** Show the status bar */
    showStatusbar:      ()      => _bridge('showStatusbar',      ''),
    /** Set status bar color — pass hex string e.g. "#1A1A2E" */
    setStatusbarColor:  (hex)   => _bridge('setStatusbarColor',  hex),
    /** Returns "true" if device is in dark mode */
    isDarkMode:         ()      => _bridge('isDarkMode',         ''),
    /** Returns primary theme color as "#RRGGBB" */
    getColorPrimary:    ()      => _bridge('getColorPrimary',    ''),
    /** Returns primary dark theme color as "#RRGGBB" */
    getColorPrimaryDark:()      => _bridge('getColorPrimaryDark',''),

    // ── UiBridge (layout) ────────────────────────────────────
    /**
     * Control whether the WebView draws behind/over the status bar.
     * showBelowStatusBar(true)  → edge-to-edge: content extends under the status bar.
     * showBelowStatusBar(false) → normal: layout starts below the status bar.
     * NOTE: when true, add top padding equal to getStatusBarHeight() dp in your CSS.
     */
    showBelowStatusBar: (bool)  => _bridge('showBelowStatusBar', String(bool)),
    /** Returns status bar height in dp (useful for CSS padding when edge-to-edge) */
    getStatusBarHeight: ()      => _bridge('getStatusBarHeight', ''),
    /**
     * Returns navigation bar height in dp. Returns "0" on gesture-nav devices
     * with no reserved bar — that is a valid, expected answer, not an error.
     * FIX: previously missing from this shim entirely.
     */
    getNavigationBarHeight: ()  => _bridge('getNavigationBarHeight', ''),
    /** Returns screen width in physical pixels */
    getScreenWidth:     ()      => _bridge('getScreenWidth',     ''),
    /** Returns screen height in physical pixels */
    getScreenHeight:    ()      => _bridge('getScreenHeight',    ''),
    /** Returns battery level as 0-100, or -1 if unavailable */
    getBatteryLevel:    ()      => _bridge('getBatteryLevel',    ''),
    /** Returns "true" if the device has an active network connection */
    isNetworkAvailable: ()      => _bridge('isNetworkAvailable', ''),
    /**
     * Returns "portrait" or "landscape" — the device's current orientation.
     * FIX: previously missing from this shim entirely.
     */
    getOrientation:     ()      => _bridge('getOrientation', ''),
    /**
     * Lock or unlock screen orientation.
     * mode: "portrait" | "landscape" | "reverse_portrait" | "reverse_landscape" |
     *       "sensor_portrait" | "sensor_landscape" | "sensor" | "full_sensor" |
     *       "locked" | "auto"
     * FIX: previously missing from this shim entirely.
     */
    setOrientation:     (mode)  => _bridge('setOrientation', mode),

    // ── Backpress — exactly 2 APIs ────────────────────────────
    /**
     * disableBackpress(true)  → block the hardware back button entirely.
     *                            No app-exit, no WebView back-navigation —
     *                            back presses do nothing on their own.
     * disableBackpress(false) → restore normal back-button behavior
     *                            (WebView back-nav, then app exit once
     *                            there's no more history). Also clears
     *                            any handler registered via onBackpress().
     */
    disableBackpress: (bool = true) => {
      if (!bool) window._CarbonInternal._backpressHandler = null;
      return _bridge('disableBackpress', String(bool));
    },

    /**
     * Register a handler that runs on EVERY hardware back press, forever —
     * not just once. Requires disableBackpress(true) first, otherwise back
     * presses navigate/exit as normal and this handler is never reached.
     *
     * The app will NEVER close from a back press while this is active.
     * The only way out is an explicit command, e.g. Android.killApp().
     *
     * Usage:
     *   Android.disableBackpress(true);
     *   Android.onBackpress(() => {
     *     console.log('hello');   // fires every time, back never exits
     *   });
     *
     * Pass no argument (or null) to unregister the handler without
     * restoring default back behavior — back presses will then do
     * nothing at all until you call onBackpress(fn) again or
     * disableBackpress(false).
     */
    onBackpress: (callback) => {
      window._CarbonInternal._backpressHandler =
        (typeof callback === 'function') ? callback : null;
    },

    // ── QuickJsBridge ────────────────────────────────────────
    /**
     * Run a JS string inside the isolated QuickJS engine.
     * Returns a Promise<string> with the result (or rejects on error).
     * The returned promise also has a .cancel() method.
     */
    runQuickJS: (code)      => _bridge('runQuickJS', code),
    /**
     * Read a file from the app's assets folder.
     * Returns file content as a string.
     */
    readFile:   (assetPath) => _bridge('readFile',   assetPath),

    // ── FileUtilsBridge ──────────────────────────────────────
    /** Read a file. type: "a"=assets, "i"=internal, "e"=external */
    fReadFile:       (type, name)        => _bridge('fReadFile',       JSON.stringify({ type, name })),
    /** Write (overwrite) a file */
    fWriteFile:      (type, name, value) => _bridge('fWriteFile',      JSON.stringify({ type, name, value })),
    /** Append to a file (creates it if missing) */
    fAppendFile:     (type, name, value) => _bridge('fAppendFile',     JSON.stringify({ type, name, value })),
    /** Delete a file */
    removeFile:      (type, name)        => _bridge('removeFile',      JSON.stringify({ type, name })),
    /** Delete a folder and all its contents */
    removeFolder:    (type, name)        => _bridge('removeFolder',    JSON.stringify({ type, name })),
    /** Check if a file or folder exists. name format: "type/path" e.g. "i/docs" */
    isExist:         (name)              => _bridge('isExist',         JSON.stringify({ name })),
    /** Get file size in bytes. name format: "type/path" */
    fileSize:        (name)              => _bridge('fileSize',        JSON.stringify({ name })),
    /** Get total folder size in bytes. name format: "type/path" */
    folderSize:      (name)              => _bridge('folderSize',      JSON.stringify({ name })),
    /** Rename/move a file or folder. old/new format: "type/path" */
    fRename:         (oldPath, newPath)  => _bridge('fRename',         JSON.stringify({ old: oldPath, new: newPath })),
    /** List files in a folder. Returns JSON array of file-info objects */
    fileList:        (type, name)        => _bridge('fileList',        JSON.stringify({ type, name })),
    /** List sub-folders in a folder. Returns JSON array of folder-info objects */
    folderList:      (type, name)        => _bridge('folderList',      JSON.stringify({ type, name })),
    /** List both files and folders. Returns JSON array */
    fList:           (type, name)        => _bridge('fList',           JSON.stringify({ type, name })),
    /** Get creation-related info for a file/folder. name format: "type/path" */
    fCreateDetails:  (name)              => _bridge('fCreateDetails',  JSON.stringify({ name })),
    /** Get modification-related info for a file/folder. name format: "type/path" */
    fModifiedDetails:(name)              => _bridge('fModifiedDetails',JSON.stringify({ name })),
    /** Get permission info for a file/folder. name format: "type/path" */
    fPermission:     (name)              => _bridge('fPermission',     JSON.stringify({ name })),

    // ── ADD YOUR CUSTOM BRIDGE ACTIONS BELOW ─────────────────
    // myAction: (payload) => _bridge('myAction', payload),

  };

  console.log('[Bridge] Android shim ready. Actions:', Object.keys(window.Android).length);
})();
