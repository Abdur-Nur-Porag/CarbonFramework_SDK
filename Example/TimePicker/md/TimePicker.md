# TimePicker

TimePicker is a Material Design 3 clock-based time picker for Carbon Framework.
It renders an interactive analog clock dialog backed by **DialogSheet** and supports
both 12-hour (AM/PM) and 24-hour formats with mouse and touch drag interaction.

---

## Use Example

```html
<!-- 12-hour format, icon on right (default) -->
<CarbonTimePicker
  Id="meeting_time"
  Placeholder="Meeting Time"
  Type="Border"
  Format="12"
  Icon="Right">
</CarbonTimePicker>

<!-- 24-hour format, icon on left, filled style -->
<CarbonTimePicker
  Id="departure_time"
  Placeholder="Departure Time"
  Type="Filled"
  Format="24"
  Icon="Left">
</CarbonTimePicker>
```

---

## Attributes

| Attribute     | Required | Values               | Description                                      |
| :------------ | :------- | :------------------- | :------------------------------------------------ |
| `Id`          | ✅ Yes   | Any unique string    | Unique identifier for the input / dialog pair.    |
| `Placeholder` | No       | Any string           | Label text shown inside the field.                |
| `Type`        | No       | `Border` / `Filled`  | Visual style of the input field.                  |
| `Format`      | No       | `12` / `24`          | Clock format. Defaults to `12`.                   |
| `Icon`        | No       | `Left` / `Right`     | Position of the clock icon. Defaults to `Right`.  |

---

## JavaScript API

All methods live on the `CarbonTimePicker` object.

```js
CarbonTimePicker.<method>
```

### Value Methods

| Method                    | Description                                                                      |
| :------------------------ | :------------------------------------------------------------------------------- |
| `getTime(id)`             | Returns the confirmed time string (e.g. `"09:30 AM"` or `"21:30"`), or `null`.  |
| `setTime(id, timeStr)`    | Programmatically sets the time and syncs the clock hands and display to match.   |
| `removeTime(id)`          | Clears the field value and resets the clock to the default state (`12:00 PM`).   |

### Control Methods

| Method      | Description                                   |
| :---------- | :-------------------------------------------- |
| `open(id)`  | Programmatically opens the time picker dialog. |

---

## Event Callbacks

Callbacks can be registered **per-picker** (by id) or **globally** (fires for every TimePicker).

```js
// Per-picker OK
CarbonTimePicker.okClick("meeting_time", function(time, id) {
  console.log("Time confirmed:", time, "from:", id);
});

// Global OK (fires for every CarbonTimePicker)
CarbonTimePicker.okClick(function(time, id) {
  console.log("Any picker confirmed:", time);
});

// Cancel callback
CarbonTimePicker.cancelClick("meeting_time", function(_, id) {
  console.log("Picker cancelled:", id);
});

// Backdrop callback
CarbonTimePicker.clickBackdrop("meeting_time", function(_, id) {
  console.log("Dialog dismissed by backdrop tap:", id);
});
```

| Event           | Method signature       | Fires when...                                               |
| :-------------- | :--------------------- | :---------------------------------------------------------- |
| `okClick`       | `(id, fn)` or `(fn)`  | User clicks **OK** and confirms the selected time.          |
| `cancelClick`   | `(id, fn)` or `(fn)`  | User clicks **Cancel**.                                     |
| `clickBackdrop` | `(id, fn)` or `(fn)`  | User taps outside the dialog (on the backdrop). The dialog closes but no time is confirmed. |

> **Note:** `clickBackdrop` was previously named `backdropClick`. If you're upgrading, rename any
> existing `CarbonTimePicker.backdropClick(...)` calls to `CarbonTimePicker.clickBackdrop(...)`.

---

## Time String Format

| Format Setting | `getTime()` / `setTime()` value |
| :------------- | :------------------------------ |
| `Format="12"`  | `"09:30 AM"` / `"11:00 PM"`    |
| `Format="24"`  | `"09:30"` / `"23:00"`          |

The same format string is accepted by `setTime()` and returned by `getTime()`.

---

## Stacking Order (Z-Index)

TimePicker renders through the shared `DialogSheet` overlay/wrapper, but is promoted to its own
stacking tier defined in `Engine/ZIndex/Style/ZIndex.css` (`--timepicker-zindex`, currently `9301`).
This keeps the clock dialog correctly visible above `Drawer`, `ActionSheet`, and plain `DialogSheet`
overlays when a `CarbonTimePicker` field is triggered from inside one of them. This is handled
automatically by `Engine/Prebuilt/TimePicker/Style/TimePicker.css`.

---

## Full Example

```html
<CarbonTimePicker
  Id="alarm"
  Placeholder="Set Alarm"
  Type="Border"
  Format="12"
  Icon="Right">
</CarbonTimePicker>

<script>
  // Confirmed time
  CarbonTimePicker.okClick("alarm", function(time, id) {
    console.log("Alarm set to:", time);
  });

  // Cancel or backdrop dismiss
  CarbonTimePicker.cancelClick("alarm", function(_, id) {
    console.log("Alarm selection cancelled.");
  });

  CarbonTimePicker.clickBackdrop("alarm", function(_, id) {
    console.log("Dialog dismissed without selection.");
  });

  // Set a time programmatically
  CarbonTimePicker.setTime("alarm", "07:00 AM");

  // Read the current confirmed value
  const current = CarbonTimePicker.getTime("alarm");

  // Open programmatically
  CarbonTimePicker.open("alarm");
</script>
```
