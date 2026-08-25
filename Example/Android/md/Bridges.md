# Carbon Framework — Bridge API Documentation

`window.Android` is your JS-to-native bridge. Every call talks to Java and returns a `Promise`.

## Setup

Add both scripts to your project, in this order. They are plain scripts — the previewer no longer injects them for you.

```html
<script src="bridge_core.js"></script>
<script src="android_shim.js"></script>
```

`bridge_core.js` sets up the internal Promise registry. `android_shim.js` builds `window.Android` on top of it. Always load `bridge_core.js` first.

## How a call works

Every `Android.xxx()` call sends a prompt to Java and returns a `Promise` that resolves with the result.

```js
// Simple call, no return value needed
Android.showToast('Hello!');

// Call that returns data — use await
const model = await Android.getDeviceModel();
console.log(model); // "Samsung SM-G991B"
```

Because it's a Promise, you can also use `.then()` and `.catch()`:

```js
Android.getBatteryLevel()
  .then(level => console.log('Battery:', level))
  .catch(err => console.error('Bridge error:', err));
```

`runQuickJS()` returns a cancellable promise:

```js
const task = Android.runQuickJS('1+1');
task.cancel(); // stop it early if needed
```

---

## SystemBridge

Device info and system-level actions.

| Bridge Name | Type | Example |
|---|---|---|
| `killApp()` | `Promise<void>` | `Android.killApp();` |
| `openExternalBrowser(url)` | `Promise<void>` | `Android.openExternalBrowser('https://site.com');` |
| `getDeviceModel()` | `Promise<string>` | `const m = await Android.getDeviceModel();` |
| `getOSVersion()` | `Promise<string>` | `const v = await Android.getOSVersion();` |
| `keepScreenOn(on)` | `Promise<void>` | `Android.keepScreenOn(true);` |
| `vibrate(ms)` | `Promise<void>` | `Android.vibrate(200);` |
| `checkPermission(name)` | `Promise<"true"\|"false">` | `await Android.checkPermission('CAMERA');` |
| `requestPermission(name)` | `Promise<void>` | `Android.requestPermission('CAMERA');` |
| `enableScreenshotProtection()` | `Promise<void>` | `Android.enableScreenshotProtection();` |
| `disableScreenshotProtection()` | `Promise<void>` | `Android.disableScreenshotProtection();` |

`requestPermission` does not return the result. Call `checkPermission` after it to confirm.

---

## StorageBridge

Simple key/value storage on the device.

| Bridge Name | Type | Example |
|---|---|---|
| `saveData(key, value)` | `Promise<void>` | `Android.saveData('theme', 'dark');` |
| `loadData(key)` | `Promise<string>` | `const v = await Android.loadData('theme');` |

`loadData` returns an empty string if the key was never saved.

---

## UiBridge — Actions

Native UI controls and quick reads.

| Bridge Name | Type | Example |
|---|---|---|
| `showToast(msg)` | `Promise<void>` | `Android.showToast('Saved!');` |
| `copyToClipboard(text)` | `Promise<void>` | `Android.copyToClipboard('Hello');` |
| `shareText(text)` | `Promise<void>` | `Android.shareText('Check this out');` |
| `hideStatusbar()` | `Promise<void>` | `Android.hideStatusbar();` |
| `showStatusbar()` | `Promise<void>` | `Android.showStatusbar();` |
| `setStatusbarColor(hex)` | `Promise<void>` | `Android.setStatusbarColor('#1A1A2E');` |
| `isDarkMode()` | `Promise<"true"\|"false">` | `await Android.isDarkMode();` |
| `getColorPrimary()` | `Promise<string>` | `await Android.getColorPrimary();` |
| `getColorPrimaryDark()` | `Promise<string>` | `await Android.getColorPrimaryDark();` |

---

## UiBridge — Layout & Screen

Screen size, insets, and orientation.

| Bridge Name | Type | Example |
|---|---|---|
| `showBelowStatusBar(bool)` | `Promise<void>` | `Android.showBelowStatusBar(true);` |
| `getStatusBarHeight()` | `Promise<string>` (dp) | `await Android.getStatusBarHeight();` |
| `getNavigationBarHeight()` | `Promise<string>` (dp) | `await Android.getNavigationBarHeight();` |
| `getScreenWidth()` | `Promise<string>` (px) | `await Android.getScreenWidth();` |
| `getScreenHeight()` | `Promise<string>` (px) | `await Android.getScreenHeight();` |
| `getBatteryLevel()` | `Promise<string>` (0–100) | `await Android.getBatteryLevel();` |
| `isNetworkAvailable()` | `Promise<"true"\|"false">` | `await Android.isNetworkAvailable();` |
| `getOrientation()` | `Promise<"portrait"\|"landscape">` | `await Android.getOrientation();` |
| `setOrientation(mode)` | `Promise<void>` | `Android.setOrientation('locked');` |

`getNavigationBarHeight()` can return `"0"` on gesture-nav devices. That is normal, not an error.
`setOrientation` accepts: `portrait`, `landscape`, `reverse_portrait`, `reverse_landscape`, `sensor_portrait`, `sensor_landscape`, `sensor`, `full_sensor`, `locked`, `auto`.

---

## Backpress

Exactly two APIs. Together they let you fully take over the hardware back button.

| Bridge Name | Type | Example |
|---|---|---|
| `disableBackpress(bool)` | `Promise<void>` | `Android.disableBackpress(true);` |
| `onBackpress(callback)` | `sync` (local only) | `Android.onBackpress(() => console.log('back'));` |

Call `disableBackpress(true)` first. Then `onBackpress(fn)` fires on every back press, forever, until you change it. Call `disableBackpress(false)` to restore normal back behavior.

```js
Android.disableBackpress(true);
Android.onBackpress(() => {
  console.log('Back pressed — app will not exit.');
});
```

---

## QuickJsBridge

Run JS in an isolated engine, or read a bundled asset.

| Bridge Name | Type | Example |
|---|---|---|
| `runQuickJS(code)` | `Promise<string>` (cancellable) | `await Android.runQuickJS('1+1');` |
| `readFile(assetPath)` | `Promise<string>` | `await Android.readFile('data/config.json');` |

---

## FileUtilsBridge

Read, write, and inspect files. `type` is always `"a"` (assets), `"i"` (internal storage), or `"e"` (external storage).

| Bridge Name | Type | Example |
|---|---|---|
| `fReadFile(type, name)` | `Promise<string>` | `await Android.fReadFile('i', 'notes.txt');` |
| `fWriteFile(type, name, value)` | `Promise<void>` | `Android.fWriteFile('i', 'notes.txt', 'Hi');` |
| `fAppendFile(type, name, value)` | `Promise<void>` | `Android.fAppendFile('i', 'notes.txt', '\nMore');` |
| `removeFile(type, name)` | `Promise<void>` | `Android.removeFile('i', 'notes.txt');` |
| `removeFolder(type, name)` | `Promise<void>` | `Android.removeFolder('i', 'oldFolder');` |
| `isExist(name)` | `Promise<"true"\|"false">` | `await Android.isExist('i/notes.txt');` |
| `fileSize(name)` | `Promise<string>` (bytes) | `await Android.fileSize('i/notes.txt');` |
| `folderSize(name)` | `Promise<string>` (bytes) | `await Android.folderSize('i/docs');` |
| `fRename(oldPath, newPath)` | `Promise<void>` | `Android.fRename('i/old.txt', 'i/new.txt');` |
| `fileList(type, name)` | `Promise<JSON array>` | `await Android.fileList('i', 'docs');` |
| `folderList(type, name)` | `Promise<JSON array>` | `await Android.folderList('i', 'docs');` |
| `fList(type, name)` | `Promise<JSON array>` | `await Android.fList('i', 'docs');` |
| `fCreateDetails(name)` | `Promise<JSON>` | `await Android.fCreateDetails('i/notes.txt');` |
| `fModifiedDetails(name)` | `Promise<JSON>` | `await Android.fModifiedDetails('i/notes.txt');` |
| `fPermission(name)` | `Promise<JSON>` | `await Android.fPermission('i/notes.txt');` |

`isExist`, `fileSize`, `folderSize`, `fCreateDetails`, `fModifiedDetails`, and `fPermission` take a single `"type/path"` string, e.g. `"i/docs"`. All other file calls take `type` and `name` as two separate arguments.

---

## Error Handling

A rejected promise means the native side hit an error. Always wrap important calls.

```js
try {
  const size = await Android.fileSize('i/missing.txt');
} catch (err) {
  console.error('File error:', err.message);
}
```

---

## Mind Map

```mermaid
mindmap
  root((window.Android))
    SystemBridge
      killApp
      openExternalBrowser
      getDeviceModel
      getOSVersion
      keepScreenOn
      vibrate
      checkPermission
      requestPermission
      enableScreenshotProtection
      disableScreenshotProtection
    StorageBridge
      saveData
      loadData
    UiBridge Actions
      showToast
      copyToClipboard
      shareText
      hideStatusbar
      showStatusbar
      setStatusbarColor
      isDarkMode
      getColorPrimary
      getColorPrimaryDark
    UiBridge Layout
      showBelowStatusBar
      getStatusBarHeight
      getNavigationBarHeight
      getScreenWidth
      getScreenHeight
      getBatteryLevel
      isNetworkAvailable
      getOrientation
      setOrientation
    Backpress
      disableBackpress
      onBackpress
    QuickJsBridge
      runQuickJS
      readFile
    FileUtilsBridge
      fReadFile
      fWriteFile
      fAppendFile
      removeFile
      removeFolder
      isExist
      fileSize
      folderSize
      fRename
      fileList
      folderList
      fList
      fCreateDetails
      fModifiedDetails
      fPermission
```
