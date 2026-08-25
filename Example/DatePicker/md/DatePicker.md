# DatePicker

DatePicker is a prebuilt component for CarbonFramework following standard `Material Design 3`
principles. It renders a calendar dialog (day / month / year / manual-entry views) backed by
**DialogSheet**, with swipe navigation between months and full callback support.

---

## Use Example

```html
<CarbonDatePicker
  Id="event_1"
  Placeholder="Event Date"
  Type="Border"
  Icon="Right">
</CarbonDatePicker>

<CarbonDatePicker
  Id="birth_1"
  Placeholder="Birth Date"
  Type="Filled"
  Icon="Left">
</CarbonDatePicker>
```

---

## Attributes

| Attribute     | Required | Values               | Description                                     |
| :------------ | :------- | :-------------------- | :----------------------------------------------- |
| `Id`          | ✅ Yes   | Any unique string     | Unique identifier for the input / dialog pair.    |
| `Placeholder` | No       | Any string             | Label text shown inside the field.                |
| `Type`        | No       | `Border` / `Filled`   | Visual style of the input field.                  |
| `Icon`        | No       | `Left` / `Right`      | Position of the calendar icon. Defaults to `Right`.|

---

## JavaScript API

All methods live on the `DatePicker` object.

```js
DatePicker.<method>
```

### Value Methods

| Method                  | Description                                                     |
| :----------------------- | :--------------------------------------------------------------- |
| `getSelectedDate(id)`    | Returns the currently confirmed date string (`YYYY-MM-DD`), or `null` if none is set. |

### View / Navigation Methods

| Method                          | Description                                                      |
| :-------------------------------| :----------------------------------------------------------------|
| `goToday(id)`                    | Jumps the calendar to today's month/year and selects today.      |
| `changeView(id, mode)`           | Switches the dialog view. `mode` is `"calendar"`, `"month"`, `"year"`, or `"input"` (manual entry). |
| `changeMonth(id, direction)`     | Steps the visible month by `direction` (`1` = next, `-1` = previous), no animation. |
| `navigateMonth(id, direction)`   | Same as `changeMonth`, but plays the slide transition (used by swipe gestures). |
| `selectYear(id, year)`           | Sets the visible year and returns to calendar view.               |
| `selectMonth(id, month)`         | Sets the visible month (`0`-`11`) and returns to calendar view.   |
| `applyManualDate(id)`            | Reads the DD/MM/YYYY manual-entry fields, validates them, and applies the result to the calendar view. |

### Control Methods

| Method            | Description                                                              |
| :------------------| :------------------------------------------------------------------------|
| `open(id)`          | Opens the date dialog. Initializes state on first use, otherwise re-renders the existing state. |
| `cancel(id)`        | Closes the dialog and fires the `cancelClick` callback without confirming a date. |
| `confirmSelection(id)` | Confirms the currently highlighted date, writes it to the input, and fires `okClick`. |
| `init(id)`          | Re-initializes the picker's internal state to "now" and re-renders. |

---
## Important
If you are making `Android App` you must using Router.
Proper Documention in [Example/Router](Example/Router/md/Router.md)
Do not use this trigger to open and close or backdrop which is described in this file. Because this file example and providing trigger are non router. So, when you are making android app you must need router. So Read [Example/Router](Example/Router/md/Router.md)
then use.

Router Automatic handel Open and Close of `Select,DatePicker,TimePicker`
## Event Callbacks

Callbacks can be registered **per-picker** (by id) or **globally** (fires for every DatePicker).

```js
// Per-picker
DatePicker.okClick("event_1", function(date, id) {
  console.log("Confirmed date:", date, "for:", id);
});

// Global (fires for every DatePicker)
DatePicker.okClick(function(date, id) {
  console.log("Any picker confirmed:", date);
});
```

| Event            | Method signature      | Fires when...                                              |
| :---------------- | :--------------------- | :-----------------------------------------------------------|
| `okClick`          | `(id, fn)` or `(fn)`  | User taps **OK** and confirms a highlighted date.           |
| `cancelClick`      | `(id, fn)` or `(fn)`  | User taps **Cancel**.                                       |
| `todayClick`       | `(id, fn)` or `(fn)`  | User taps **Today**. Receives the resolved today's-date string. |
| `clickBackdrop`    | `(id, fn)` or `(fn)`  | User taps outside the dialog (on the backdrop). The dialog closes but no date is confirmed. |

> **Note:** `clickBackdrop` was previously named `backdropClick`. If you're upgrading, rename any
> existing `DatePicker.backdropClick(...)` calls to `DatePicker.clickBackdrop(...)`.

---

## Stacking Order (Z-Index)

DatePicker renders through the shared `DialogSheet` overlay/wrapper, but is promoted to its own
stacking tier defined in `Engine/ZIndex/Style/ZIndex.css` (`--datepicker-zindex`, currently `9300`).
This keeps the calendar dialog correctly visible above `Drawer`, `ActionSheet`, and plain
`DialogSheet` overlays when a `CarbonDatePicker` field is triggered from inside one of them. You
normally don't need to touch this — it's handled automatically by `Engine/Prebuilt/DatePicker/Style/DatePicker.css`.

---

## Full Example

```html
<CarbonDatePicker
  Id="trip_start"
  Placeholder="Trip Start Date"
  Type="Border"
  Icon="Right">
</CarbonDatePicker>

<script>
  // Listen for confirmed date
  DatePicker.okClick("trip_start", function(date, id) {
    console.log("Trip starts on:", date);
  });

  // Listen for backdrop dismissal
  DatePicker.clickBackdrop("trip_start", function(_, id) {
    console.log("Dialog dismissed without a selection:", id);
  });

  // Read the confirmed value later
  const selected = DatePicker.getSelectedDate("trip_start");

  // Open programmatically
  DatePicker.open("trip_start");
</script>
```
#verified
