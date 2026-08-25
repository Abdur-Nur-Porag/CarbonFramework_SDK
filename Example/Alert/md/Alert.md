# Alert
Alert components provide standard Material Design 3 dialogs for alerts, confirmations, user input, and fully custom blank dialogs.
## Important
Alert Does not need any router support. Because this automatically handle by router. Router doesnot provide extra api for it. So use diractly `Alert(),ConfirmAlert() and others`

## Use Example
```js
// Simple Alert
Alert("Operation Successful!", (ok) => {
  console.log("Alert closed");
});
// Confirmation Dialog
AlertConfirm("Do you want to delete this item?", (isConfirmed) => {
  if (isConfirmed) {
    console.log("Deleted");
  }//when click ok
  else{
  	console.log("Not Confirmed")
  }//when click cancel
});
// Input Dialog
AlertInput("Enter your name:", (value) => {
  if (value !== null) {
    console.log("User name:", value);
  }
}, "John Doe");
// Blank Alert (fully custom)
BlankAlert({
  Code: `<p>Any raw HTML goes here</p>`,
  Title: "", // optional, no title shown if empty (default)
  Button: [
    AlertBtn("Cancel", "left").alertBtnEvent(() => {
      console.log("Cancelled");
    }),
    AlertBtn("Save", "right").alertBtnEvent(() => {
      console.log("Saved");
    })
  ]
});
// Backdrop Click (works on Alert, AlertConfirm, AlertInput, BlankAlert)
Alert("Click outside me!", (ok) => {
  console.log("Alert closed");
}).clickBackdrop(() => {
  console.log("Backdrop clicked"); //default no backdrop click opration, add this to enable it
});
```

## Javascript Api
### Use of api:
```js
Alert(message, callback);
BlankAlert({ Code, Title, Button });
AlertBtn(name, side).alertBtnEvent(callback);
<AnyAlert>.clickBackdrop(callback);
```
| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Alert** | `Alert(message, callback)` | `Alert("Hello", cb)` | Standard alert dialog. |
| **Confirm** | `AlertConfirm(message, callback)` | `AlertConfirm("Sure?", cb)` | Returns true/false to callback. |
| **Input** | `AlertInput(message, callback, placeholder)` | `AlertInput("Name:", cb, "Type...")` | Returns input string or null. |
| **Blank** | `BlankAlert({ Code, Title, Button })` | `BlankAlert({ Code: "<p>Hi</p>", Button: [...] })` | Fully custom dialog. `Code` is raw html, `Title` is optional (no title by default), `Button` is an array of `AlertBtn(...)`. |
| **Button (Blank only)** | `AlertBtn(name, side).alertBtnEvent(callback)` | `AlertBtn("Save", "right").alertBtnEvent(cb)` | Builds a button for `BlankAlert`. `side` is `left`, `center`, or `right` (default `right`), user can change button direction. Chainable, more buttons can be added to the `Button` array. |
| **Backdrop** | `<AnyAlert>.clickBackdrop(callback)` | `Alert("Hi", cb).clickBackdrop(cb2)` | Works on all alert types (Alert, AlertConfirm, AlertInput, BlankAlert). Default: no backdrop click opration. Add `.clickBackdrop()` to enable close-on-backdrop-click with callback. |
#verified
