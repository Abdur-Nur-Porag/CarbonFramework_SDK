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

1. Install the Carbon Previewer app (`CarbonPreviewer.apk`) on your Android device.
2. Open the app.
3. Enter your dev server URL. The default is:
   ```
   http://localhost:3000
   ```
   You can also enter a different port if needed.
4. The app connects automatically once your server is running.

---

## Building an APK

To publish a real, production-ready app, you need two more steps after your app is finished.

### Step 1: Install App Config

Run this first. It generates your bundled `index.html` file.

```bash
npm run build
```

Then run:

```bash
node CarbonCliSdk --install-android <com.company.name> <your-secret-key>
```

This creates a new `Android` folder in your project. It looks like this:

```
Android/
├── java/
│   ├── MainActivity.java
│   ├── MainRender.java
│   ├── BaseBridge.java
│   ├── BridgeHandler.java
│   └── CoreBridges/
│       ├── CoreBridges.java
│       └── FileUtilsBridges.java
├── Carbon/
│   └── Carbon.main.bundle
├── AndroidPermission.json
└── AndroidConfig.json

build/
```

**What these files do:**

| File | Purpose |
|------|---------|
| `Carbon.main.bundle` | Your app's code, encrypted |
| `AndroidPermission.json` | Edit this to set Android manifest permissions |
| `AndroidConfig.json` | Edit this to set SDK version, minimum SDK, theme, status bar color, and more |

### Step 2: Build the APK

```bash
node CarbonCliSdk --build-android
```

This creates a `.zip` file in the `build` folder.

To turn that zip into an actual APK:

1. Install **Android Studio**.
2. Open the zip file as a project in Android Studio. It's already set up, so you don't need to configure anything.
3. You *can* edit the project manually if you want — just note that this is unsupported and done at your own risk.

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