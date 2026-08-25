# Gesture

GestureManager handles edge-swipe gestures (Top, Bottom, Left, Right) with real-time drag tracking and programmatic open/close control.

## Basic Example
```js
GestureManager.gestureLeft({
  Name: "mainMenu",
  PageView: "HomeView",
  Content: "main-drawer",
  EdgeSize: 50,
  OnOpen: () => openDrawer("mainMenu"),
  OnClose: () => closeDrawer("mainMenu"),
  OnBackdrop: () => closeDrawer("mainMenu"),
});
```

## Drag-to-Open / Drag-to-Close

The user can grab the edge and drag the content open or closed in real time.
Use `OnDrag` to move your drawer as the finger moves, and `OnDragCancel` to snap it back if the user releases too early.

```js
const drawer = document.getElementById("main-drawer");

GestureManager.gestureLeft({
  Name: "mainMenu",
  Content: "main-drawer",
  EdgeSize: 50,

  // progress: 0 = fully closed, 1 = fully open
  OnDrag: (progress, diffX, diffY) => {
    // Move the drawer live with the finger
    const offset = -300 + (300 * progress); // drawer is 300px wide
    drawer.style.transition = "none";
    drawer.style.transform  = `translateX(${offset}px)`;
  },

  OnDragCancel: (wasOpen) => {
    // Finger released before threshold — snap back to previous state
    drawer.style.transition = "transform 0.3s ease";
    drawer.style.transform  = wasOpen ? "translateX(0)" : "translateX(-300px)";
  },

  OnOpen: () => {
    drawer.style.transition = "transform 0.3s ease";
    drawer.style.transform  = "translateX(0)";
  },

  OnClose: () => {
    drawer.style.transition = "transform 0.3s ease";
    drawer.style.transform  = "translateX(-300px)";
  },
});
```

## Programmatic Open / Close
```js
// Open (e.g. menu button)
GestureManager.activeGesture("mainMenu");

// Close (e.g. close button — works whether opened by swipe or button)
GestureManager.inactiveGesture("mainMenu");
```

## Javascript API

| Method                    | Description                                                   |
| :------------------------ | :------------------------------------------------------------ |
| `gestureTop(config)`     | Downward swipe from top edge.                                 |
| `gestureBottom(config)`  | Upward swipe from bottom edge.                                |
| `gestureLeft(config)`    | Rightward swipe from left edge.                               |
| `gestureRight(config)`   | Leftward swipe from right edge.                               |
| `activeGesture(name)`    | Programmatically opens a named gesture. Fires `OnOpen`.       |
| `inactiveGesture(name)`  | Programmatically closes a named gesture. Fires `OnClose`.     |

## Config Properties

| Property       | Type       | Description                                                                 |
| :------------- | :--------- | :-------------------------------------------------------------------------- |
| `Name`         | `string`   | Unique name. Required for `activeGesture` / `inactiveGesture`.              |
| `PageView`     | `string`   | Scopes gesture to a PageView. Optional — global if omitted.                 |
| `Content`      | `string`   | Element id for backdrop dismiss detection.                                  |
| `EdgeSize`     | `number`   | Touch zone size in px from the edge. Default: `40`.                         |
| `OnOpen`       | `function` | Fires when gesture commits to open (finger released past threshold).        |
| `OnClose`      | `function` | Fires when gesture commits to close (finger released past threshold).       |
| `OnDrag`       | `function` | Fires every touchmove. Args: `(progress: 0–1, diffX, diffY)`.              |
| `OnDragCancel` | `function` | Fires when finger releases before threshold. Arg: `(wasOpen: boolean)`.     |
| `OnBackdrop`   | `function` | Fires when user taps outside the `Content` element while open.              |

>[!NOTE]
>`OnDrag` progress is `0` (fully closed) → `1` (fully open) regardless of direction. Use it to drive `transform`, `opacity`, or any CSS property directly.

>[!NOTE]
>`Name` is optional for swipe-only usage. Required for `activeGesture()` / `inactiveGesture()`.

>[!DANGER]
>`PageView` is optional — without it the gesture runs globally.

#verified
