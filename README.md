# Carbon Framework SDK — Documentation

> A JavaScript UI framework for building Progressive Web Apps (PWAs) and mobile apps.

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Quick Start](#quick-start)
4. [Carbon SDK (Mobile App Builder)](#carbon-sdk-mobile-app-builder)
5. [Building an APK](#building-an-apk)
6. [Prebuilt Bridges](#prebuilt-bridges)
7. [Dependencies (v1.0.0)](#dependencies-v100)
8. [Recommended Knowledge](#recommended-knowledge)
9. [FAQ](#faq)

---

## Overview

Carbon Framework is a JavaScript UI framework. Use it to build:

- **Progressive Web Apps (PWAs)**
- **Mobile apps**

Carbon Framework comes with its own build tool. You can also use it together with other tools like **Capacitor** or **Tauri**.

---

## Requirements

You need **Node.js** installed on your computer.

- [Download Node.js](https://nodejs.org/)
- Or install it with your system's package manager, for example:
  ```bash
  pkg install nodejs
  ```
- Check that it installed correctly:
  ```bash
  node -v
  ```

---

## Quick Start

Follow these steps to run a Carbon Framework project on your computer.

**1. Clone the repository:**
```bash
git clone https://github.com/Abdur-Nur-Porag/CarbonFramework_SDK.git
```

**2. Install dependencies:**
```bash
npm install
```

**3. Start the development server:**
```bash
npm start
```

Your project is now running locally.

---

## Carbon SDK (Mobile App Builder)

Carbon SDK is the part of Carbon Framework that builds cross-platform mobile apps.

### Platform Support

| Platform | Status         |
|----------|----------------|
| Android  | ✅ Supported    |
| iOS      | 🔜 Coming soon |
| Linux    | 🔜 Coming soon |

### Preview Your App on a Phone

Carbon apps don't preview well in a normal web browser. Instead, use the **Carbon Previewer App**.

1. Install the Carbon Previewer app [Carbon Framework Previewer.apk](https://github.com/Abdur-Nur-Porag/CarbonFramework_SDK/releases/download/cp-v1.0.0/CarbonFrame_Preview.apk) on your Android device 
2. Open the app.
3. Enter your dev server URL. The default is:
   ```
   http://localhost:3000
   ```
   You can also enter a different port if needed.
4. The app connects automatically once your server is running.

---

## Building an APK

Read [CarbonCliSdk](CarbonCliSdk.md) For Building process.

---

## Prebuilt Bridges

A **bridge** lets your JavaScript code talk to native Android features.

Carbon Framework includes several prebuilt bridges. You can find them all in the `Example/Android/md` folder.

### Why the bridges are secure

- Bridges run inside an **isolated environment**. Only your app's own code (`Carbon.main.bundle` and `index.html`) can access them.
- Any external URL loaded inside your app's `index.html` — local or remote — **cannot** access the bridge.
- Bridge JavaScript runs on the **QuickJS Android engine**, not the browser's JavaScript engine. This keeps it separate from normal browser JS, which adds an extra layer of security compared to most other frameworks.

---

## Dependencies (v1.0.0)

```json
"dependencies": {
  "express": "^4.18.2"
},
"devDependencies": {
  "@babel/core": "^7.24.0",
  "@babel/plugin-transform-react-jsx": "^7.24.0"
}
```

---

## Recommended Knowledge

Before you start with Carbon Framework, it helps to know:

1. **Babel JSX syntax** — used to write your component views
2. **Vue.js (CDN version)** — used for reactivity and directives
3. **Beer CSS (Material Design)** — used for styling
4. **The `/Example` folder** — a good place to see real usage
5. **The Carbon build structure** — three config files: `Carbon.build`, `Carbon.package`, and `Carbon.main`

## How To Start
Here is tutorial series serially. Read that.
1. Core Component
	1. [Drawer](Example/Drawer/md/Drawer.md)
	2. [ActionSheet](Example/ActionSheet/md/ActionSheet.md)
	3. [DialogSheet](Example/DialogSheet/md/DialogSheet.md)
	4. [Alert](Example/Alert/md/Alert.md)
	5. [Router](Example/Router/md/Router.md)
	6. [PageView](Example/PageView/md/PageView.md)
	7. [Main](Example/Main/md/Main.md)
	8. [Core JavaScript](Example/Core_JavaScript/Core_JavaScript)
2. Android Api
	1. [Android Api](Example/Android/md/Bridges.md)
3. Extra Components
	1. [Accordion](Example/Accordion/md/Accordion.md)
	2. [CodeHighlighter](Example/CodeHighlighter/md/CodeHighlighter.md)
	3. [Divider](Example/Divider/md/Divider.md)
	4. [Fab](Example/Fab/md/Fab.md)
	5. [Layout](Example/Layout/md/Layout.md)
	6. [GridView](Example/GridView/md/GridView)
	7. [Gesture](Example/Gesture/md/Gesture.md)
	8. [NativeButton](Example/NativeButton/md/NativeButton.md)
	9. [NativeToast](Example/NativeToast/md/NativeToast.md)
	10. [Scroll](Example/Scroll/md/Scroll.md)
	11. [Svg](Example/Svg/md/Svg.md)
	12. [Themes](Example/Themes/md/Themes)
4. Canvas
	1. [PixelGrid](Example/PixelGrid/md/PixelGrid)
5. Utility
	1. [DatePicker](Example/DatePicker/md/DatePicker.md)
	2. [TimePicker](Example/TimePicker/md/TimePicker.md)
	3. [Select](Example/Select/md/Select.md)
6. Jsx Component 
	1. [Switch](Example/Component/md/Switch.md)
	2. [ListItem](Example/Component/md/ListItem)
---

## FAQ

### Why can't I use Vue directives (like `@click`) on Drawer, ActionSheet, or DialogSheet elements?

**Short answer:** These components render outside your Vue app's mount point, so Vue can't "see" them.

**Why this happens:**

`ActionSheet`, `Drawer`, and `DialogSheet` are rendered **globally**. This means they live outside the part of the page that Vue controls. If you add something like `@click="sayTitle"` to an element inside one of these components, Vue throws an error — because that element isn't part of its reactive scope.

**How to check this yourself:**

1. Open your browser's developer console.
2. Click on the ActionSheet (or Drawer/DialogSheet) to inspect it.
3. Select an element inside it.
4. Look at the DOM tree. You'll see the element sits **outside** your Vue mount point.

**How to fix it:**

Use one of these instead of a direct Vue directive:
- A global event bus
- A `window`-level function
- Carbon's own built-in API for communicating with global components