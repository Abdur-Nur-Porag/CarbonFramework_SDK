# ActionSheet

ActionSheet is a prebuilt component for CarbonFramework that follows standard `Material Design 3` guidelines. It's perfect for presenting a set of choices to the user.

## Use Example
```jsx
<ActionSheet Name="mySheet" Position="Bottom" Notch="true" Elevation="5">
  <div class="padding">
    <h6>Select Action</h6>
    <button class="border" onclick="closeActionSheet('mySheet')">Cancel</button>
  </div>
</ActionSheet>
```

## Attribute Define:
1.  **Name** = Unique identifier for the ActionSheet.
2.  **Position** = Position of the sheet (Top / Bottom / Left / Right). Default is "Bottom".
3.  **Notch** = Boolean (true/false). Adds a visual notch at the top of the sheet.
4.  **Elevation** = Visual depth (0 to 10). Default is 2.

## Important
If you are making `Android App` you must using Router.
Proper Documention in [Example/Router](../../Router/md/Router.md)

Do not use this trigger to open and close or backdrop which is described in this file. Because this file example and providing trigger are non router. So, when you are making android app you must need router. So Read [Example/Router](../../Router/md/Router.md)
then use.
## Javascript Api
If you are using WebSdk you can use this opening and close.
### Use of api:
```js
openActionSheet("mySheet");
closeActionSheet("mySheet");

// Fires callback when the backdrop is clicked while this sheet is open.
// Backdrop click does NOT close the sheet automatically, call
// closeActionSheet(name) yourself inside the callback if you want that.
ActionSheet("mySheet").clickBackdrop(() => {
  closeActionSheet("mySheet");
});
```

| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Open Sheet** | `openActionSheet(name)` | `openActionSheet("mySheet")` | Opens the ActionSheet by Name. |
| **Close Sheet** | `closeActionSheet(name)` | `closeActionSheet("mySheet")` | Closes the ActionSheet by Name. |
| **Click Backdrop** | `ActionSheet(name).clickBackdrop(callback)` | `ActionSheet("mySheet").clickBackdrop(() => {})` | Runs `callback` when the shared overlay/backdrop is clicked while this sheet is open. Does not close the sheet by itself. |

#verified
