# Drawer

Drawer is a Material Design 3 navigation component that slides in from the edge of the screen.

## Use Example
```jsx
<Drawer Name="mainMenu" Position="Left" Elevation="5">
  <div class="padding">
    <h4>Menu</h4>
    <nav>
      <a>Home</a>
      <a>Settings</a>
    </nav>
  </div>
</Drawer>
```

## Attribute Define:
1.  **Name** = Unique identifier for the Drawer.
2.  **Position** = Position of the drawer (Left / Right). Default is "Left".
3.  **Elevation** = Visual depth (0 to 10). Default is 5.
## Important
If you are making `Android App` you must using Router.
Proper Documention in [Example/Router](../../Router/md/Router.md)

Do not use this trigger to open and close or backdrop which is described in this file. Because this file example and providing trigger are non router. So, when you are making android app you must need router. So Read [Example/Router](../../Router/md/Router.md)
then use.
## Javascript Api
### Use of api:
```js
openDrawer("mainMenu");
closeDrawer("mainMenu");

// Fires callback when the backdrop is clicked while this drawer is open.
// Backdrop click does NOT close the drawer automatically, call
// closeDrawer(name) yourself inside the callback if you want that.
Drawer("mainMenu").clickBackdrop(() => {
  closeDrawer("mainMenu");
});
```

| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Open Drawer** | `openDrawer(name)` | `openDrawer("mainMenu")` | Opens the drawer by Name. |
| **Close Drawer** | `closeDrawer(name)` | `closeDrawer("mainMenu")` | Closes the drawer by Name. |
| **Click Backdrop** | `Drawer(name).clickBackdrop(callback)` | `Drawer("mainMenu").clickBackdrop(() => {})` | Runs `callback` when the shared overlay/backdrop is clicked while this drawer is open. Does not close the drawer by itself. |
#verified 