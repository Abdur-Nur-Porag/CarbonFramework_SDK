# Router System — Documentation

A single `Router` object manages navigation for the whole app: full-screen
**PageViews**, and three overlay types — **Drawer**, **ActionSheet**,
**DialogSheet** — plus a separate **Alert** queue that plugs in differently
because it has no named instances.

Everything lives on one shared stack, `_StackHistory`, as string entries
shaped `"type_name"` (e.g. `"pageview_HomeView"`, `"drawer_HomeDrawer"`,
`"alert_active"`). Hardware **backpress** reads the top of that stack and
closes whatever's there.

---

## Core concepts

| Concept | What it does |
|---|---|
| `_StackHistory` | Ordered array of `"type_name"` strings — the navigation stack. |
| `_CurrentView` | The current **pageview** only. Overlays sit on top of it as "ghost" entries without moving it. |
| `Carbon.isTransitioning` | True while a page animation is actually running. |
| `isPageViewLoaded` (ref) | `false` for the *entire* duration of a page transition (delay + animation + lifecycle hooks). Router checks this — not just `isTransitioning` — to block fast/double taps and backpress spam. |

All `Open*`/`Close*` calls silently `console.warn` and return if a request
can't be honored (already open, already closed, or a transition is in
flight) — they never throw.

---

## 1. PageView
### PageView Declaration
```js
Carbon.PageView({
  Name: "home",
  Initial: true, // Loads first on app start
  OnStart: async () => console.log("Home starting..."),
  OnScript: async () => console.log("Home ready."),
  OnFinished: async ()=>{
  console.log("Hime Finished")
  },
  
  //Backpress
  Backpress:(ctx)=>{
  	Alert("User Backpress");
  	//user defined backpress
  	/*
  	To end this backpreess
  	ctx.BackpressEnd();
  	
  	*/
  }
});
```


### PageView Routing

```js
Router.OpenPageView({
  Target: "SettingsView",     // required — page name
  AnimationName: "SlideIn",   // optional, default "SlideIn"
  AnimationTime: "200ms",     // optional, default "200ms"
  Delay: "0ms"                // optional, default "0ms"
})

Router.ClosePageView({
  Target: "HomeView",         // required — page to reveal underneath
  AnimationName: "SlideOut",  // optional, default "SlideOut"
  AnimationTime: "200ms",
  Delay: "0ms"
})
```

**Example — nav button:**
```js
document.querySelector("#settingsBtn").onclick = () => {
  Router.OpenPageView({ Target: "SettingsView" });
};
```

Opening a page automatically closes any open Drawer/ActionSheet/DialogSheet
first (handled by Carbon), and Router prunes their now-stale stack entries.

---
### Important 
#### InitialPageView
This is a important things that developers must know. There is a logic 
`if(InitialPageView.value==_CurrentPageView)` app will kill.
So if you want to change initial pageview use 
```js
InitialPageView.value = "pageview_"+"name";
```
This is `ref` name of Vue you can change it any time dynamically.


## 2. Drawer

```js
Router.OpenDrawer({ Target: "HomeDrawer" })   // or { Name: "HomeDrawer" }
Router.CloseDrawer({ Target: "HomeDrawer" })
```

**Example:**
```js
document.querySelector("#menuIcon").onclick = () => {
  Router.OpenDrawer({ Target: "HomeDrawer" });
};
```

- Clicking the backdrop **automatically** closes the drawer and clears its
  stack entry — Router registers itself as the `clickBackdrop` handler when
  it opens the drawer, so you don't wire that yourself.
- Calling `Router.OpenDrawer` a second time for an already-open drawer, or
  opening one mid page-transition, is ignored (logged as a warning).

⚠️ If you also want your own logic on backdrop click, register it via
`Drawer(name).clickBackdrop(fn)` **after** calling `Router.OpenDrawer`, and
call `Router.CloseDrawer` yourself inside it — otherwise you'll overwrite
Router's own handler and lose the automatic stack cleanup.

---

## 3. ActionSheet

```js
Router.OpenActionSheet({ Target: "FilterSheet" })
Router.CloseActionSheet({ Target: "FilterSheet" })
```

**Example:**
```js
document.querySelector("#filterBtn").onclick = () => {
  Router.OpenActionSheet({ Target: "FilterSheet" });
};
```

Same rules as Drawer: backdrop click auto-closes + clears the stack,
duplicate-open and mid-transition-open are both ignored.

---

## 4. DialogSheet

```js
Router.OpenDialogSheet({ Target: "ConfirmDialog" })
Router.CloseDialogSheet({ Target: "ConfirmDialog" })
```

**Example:**
```js
document.querySelector("#deleteBtn").onclick = () => {
  Router.OpenDialogSheet({ Target: "ConfirmDialog" });
};
```

Same rules as Drawer/ActionSheet. Only the **topmost** DialogSheet responds
to a backdrop click (matches DialogSheet.js's own stacking behavior).

**Legacy alias** — old code using `StackRouter` still works, now with real
stack tracking under the hood:
```js
StackRouter.OpenDialogSheet("ConfirmDialog")   // → Router.OpenDialogSheet
StackRouter.CloseDialogSheet("ConfirmDialog")  // → Router.CloseDialogSheet
```

---

## 5. Alert

Alert is a **different system on purpose** — no `Name`, no registry, just a
FIFO queue with at most one dialog open at a time. There's no
`Router.OpenAlert()`; you call these functions directly, same as always.
Router only tracks *that* one is open (for backpress) via events Alert.js
dispatches internally — no extra wiring needed on your end.

```js
// 1. Plain alert
Alert("Saved successfully.", () => {
  console.log("dismissed");
});

// 2. Text input
AlertInput("Enter your name", (value) => {
  console.log("value:", value); // null if cancelled
}, "Your name...");

// 3. Confirm
AlertConfirm("Delete this item?", (confirmed) => {
  console.log(confirmed); // true / false
});

// 4. Fully custom content
const myAlert = BlankAlert({
  Title: "Storage almost full",
  Code: `<p>You're using 92% of your storage.</p>`,
  Button: [
    AlertBtn("Cancel", "left").alertBtnEvent(() => {}),
    AlertBtn("Upgrade", "right").alertBtnEvent(() => {
      Router.OpenPageView({ Target: "UpgradeView" });
    })
  ]
});
myAlert.clickBackdrop(() => console.log("dismissed via backdrop"));
```

**Backpress on an open Alert** calls `window.dismissAlert()` internally —
same effect as tapping Cancel/backdrop (`false` for confirm, `null` for
input/blank, `true` for a plain alert's OK).

---

## 6. Backpress behavior

Reads the **top entry** of `_StackHistory` and acts by type:

| Top of stack | Action |
|---|---|
| `pageview_<Name>` (is `InitialPageView`) | Calls `Android.killApp()`. |
| `pageview_<Name>` (not initial) | `Router.ClosePageView` back to the previous pageview in the stack. |
| `drawer_<Name>` | `Router.CloseDrawer({ Target: Name })` |
| `actionsheet_<Name>` | `Router.CloseActionSheet({ Target: Name })` |
| `dialogsheet_<Name>` | `Router.CloseDialogSheet({ Target: Name })` |
| `alert_active` | `window.dismissAlert()` |

So: an overlay open on top of a page eats the first backpress; only the
*next* backpress navigates the page underneath.

---

## 7. Guards (fast-tap / transition protection)

- `isPageViewLoaded.value === false` for the full duration of any page
  transition. While false: `OpenPageView`, `ClosePageView`,
  `OpenDrawer/ActionSheet/DialogSheet`, and backpress are all ignored.
- Opening an already-open Drawer/ActionSheet/DialogSheet is ignored
  (checked via `_StackHistory.includes(...)`), preventing duplicate stack
  entries from a fast double-tap.

---

## Full example

```js
// Open a settings page
Router.OpenPageView({ Target: "SettingsView" });

// From SettingsView, open a drawer
Router.OpenDrawer({ Target: "SettingsDrawer" });
// → user taps backdrop → drawer closes + stack entry cleared automatically

// Ask for confirmation before a destructive action
AlertConfirm("Log out of your account?", (confirmed) => {
  if (confirmed) {
    Router.ClosePageView({ Target: "HomeView" });
  }
});

// Backpress at any point in this flow closes whatever's topmost first —
// alert, then drawer, then the SettingsView page — one entry per press.
```
