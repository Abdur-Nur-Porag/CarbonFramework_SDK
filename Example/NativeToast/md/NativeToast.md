# NativeToast

NativeToast provides a sleek, centered notification message that auto-hides after a set duration.

## Use Example
```js
// Register a toast
NativeToast({
  Name: "saved",
  Html: "<b>Success:</b> Settings saved!",
  Position: "bottom",
  Duration: 2000,
  BackgroundColor: "#4CAF50"
});

// Show it
openNativeToast("saved");
```

## Javascript Api
### Use of api:
```js
NativeToast(config);
openNativeToast("name");
```

| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Register** | `NativeToast(config)` | `NativeToast({...})` | Configures a toast template. |
| **Open** | `openNativeToast(name)` | `openNativeToast("saved")` | Displays the registered toast. |

## Config Object Properties:
1.  **Name** = Unique ID for registration.
2.  **Html** = Content of the toast (supports HTML strings).
3.  **Position** = "top" or "bottom".
4.  **BackgroundColor** = CSS color for background.
5.  **FontColor** = CSS color for text.
6.  **Duration** = Time in ms before hiding.
7.  **Width** = "full" or specific width like "300px".
8.  **Height** = Specific height (optional).
#verified 