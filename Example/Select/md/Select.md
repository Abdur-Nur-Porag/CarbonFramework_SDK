# Select & MultipleSelect

Select and MultipleSelect are Material Design 3 style dropdown components for Carbon Framework.
Both are backed by **DialogSheet** and auto-initialize from custom HTML tags. Single-select
enforces one choice at a time; MultipleSelect allows any number of items to be checked.

---

## Use Example

```html
<!-- Single Select -->
<CarbonSelect
  Name="fruit_picker"
  Placeholder="Select Fruit"
  Type="Border"
  Data="Apple, Banana, Orange">
</CarbonSelect>

<!-- Multiple Select -->
<CarbonMultipleSelect
  Name="skills_picker"
  Placeholder="Select Skills"
  Type="Filled"
  Data="HTML, CSS, JavaScript, PHP">
</CarbonMultipleSelect>
```

---

## Attributes

| Attribute     | Required | Values                | Description                                      |
| :------------ | :------- | :-------------------- | :------------------------------------------------ |
| `Name`        | ✅ Yes   | Any unique string     | Unique identifier for the component.              |
| `Placeholder` | No       | Any string            | Label text shown inside the field.                |
| `Type`        | No       | `Border` / `Filled`   | Visual style of the input field.                  |
| `Data`        | No       | Comma-separated list  | Initial options to populate the list on load.     |

---

## JavaScript API

All methods live on the `CarbonSelect` object and work for both `CarbonSelect` and
`CarbonMultipleSelect`.

```js
CarbonSelect.<method>
```

### Value Methods

| Method                      | Description                                                                      |
| :--------------------------- | :------------------------------------------------------------------------------- |
| `getSelect(id)`              | Returns the current selected value string (comma-separated for MultipleSelect).  |
| `setValue(id, value)`        | Programmatically sets the selection and syncs checkboxes to match.               |
| `unSet(id)`                  | Clears the selection, resets the field, and unchecks all checkboxes.             |

### Data Methods

| Method                         | Description                                                         |
| :------------------------------ | :------------------------------------------------------------------- |
| `addData(id, array)`            | Replaces all current options with a new array.                       |
| `appendData(id, array)`         | Appends new options to the existing list without removing any.       |
| `removeData(id, value)`         | Removes one option by its exact value string.                        |
| `removeAll(id)`                 | Removes all options and clears the current selection.                |
| `getAll(id)`                    | Returns the full array of current options.                           |
| `checkExistData(id, value)`     | Returns `true` if the given value exists in the current options list.|

### Checked-State Methods (for MultipleSelect)

| Method                 | Description                                                     |
| :---------------------- | :--------------------------------------------------------------- |
| `getAllChecked(id)`     | Returns an array of all currently checked (selected) items.     |
| `getAllUnchecked(id)`   | Returns an array of all currently unchecked items.              |

### Control Methods

| Method      | Description                                    |
| :---------- | :--------------------------------------------- |
| `open(id)`  | Programmatically opens the select dialog.      |

---
## Important
If you are making `Android App` you must using Router.
Proper Documention in [Example/Router](Example/Router/md/Router.md)
Do not use this trigger to open and close or backdrop which is described in this file. Because this file example and providing trigger are non router. So, when you are making android app you must need router. So Read [Example/Router](Example/Router/md/Router.md)
then use.

Router Automatic handel Open and Close of `Select,DatePicker,TimePicker`

## Event Callbacks

Callbacks can be registered **per-picker** (by name) or **globally** (fires for all pickers).

```js
// Per-picker OK
CarbonSelect.okClick("fruit_picker", function(value, id) {
  console.log("Selected:", value, "from:", id);
});

// Global OK (fires for every CarbonSelect and CarbonMultipleSelect)
CarbonSelect.okClick(function(value, id) {
  console.log("Any picker confirmed:", value);
});

// Cancel callback
CarbonSelect.cancelClick("fruit_picker", function(_, id) {
  console.log("Selection cancelled:", id);
});

// Backdrop callback
CarbonSelect.clickBackdrop("fruit_picker", function(_, id) {
  console.log("Dialog dismissed by backdrop tap:", id);
});
```

| Event           | Method signature       | Fires when...                                                        |
| :-------------- | :--------------------- | :-------------------------------------------------------------------- |
| `okClick`       | `(id, fn)` or `(fn)`  | User clicks **OK** and confirms the selection.                        |
| `cancelClick`   | `(id, fn)` or `(fn)`  | User clicks **Cancel**.                                               |
| `clickBackdrop` | `(id, fn)` or `(fn)`  | User taps the backdrop (outside the dialog). No selection is saved.   |

> **Backdrop vs Cancel:** `cancelClick` only fires from the Cancel button. `clickBackdrop` only
> fires from a backdrop tap. Both close the dialog without saving a value.

---

## Stacking Order (Z-Index)

Select/MultipleSelect render through the shared `DialogSheet` overlay/wrapper, but are promoted to
their own stacking tier defined in `Engine/ZIndex/Style/ZIndex.css` (`--select-zindex`, currently
`9302`). This keeps the dropdown dialog correctly visible above `Drawer`, `ActionSheet`, and plain
`DialogSheet` overlays when a select field is triggered from inside one of them. This is handled
automatically by `Engine/Prebuilt/Select/Style/Select.css`.

---

## Full Example

```html
<CarbonSelect
  Name="country"
  Placeholder="Country"
  Type="Border"
  Data="Bangladesh, India, USA, UK">
</CarbonSelect>

<script>
  // Load data dynamically (replaces the Data attribute values)
  CarbonSelect.addData("country", ["Bangladesh", "India", "USA", "UK", "Canada"]);

  // Confirmed selection
  CarbonSelect.okClick("country", function(value, id) {
    console.log("Country selected:", value);
  });

  // Cancel button
  CarbonSelect.cancelClick("country", function(_, id) {
    console.log("Picker cancelled.");
  });

  // Backdrop dismiss
  CarbonSelect.clickBackdrop("country", function(_, id) {
    console.log("Dismissed without selecting.");
  });

  // Read current value
  const selected = CarbonSelect.getSelect("country");

  // Open programmatically
  CarbonSelect.open("country");
</script>
```

---

## MultipleSelect Example

```html
<CarbonMultipleSelect
  Name="tags"
  Placeholder="Select Tags"
  Type="Border"
  Data="Design, Frontend, Backend, DevOps">
</CarbonMultipleSelect>

<script>
  CarbonSelect.okClick("tags", function(value, id) {
    // value is a comma-separated string of all checked items
    console.log("Tags confirmed:", value);

    // Or get them as an array
    const checked = CarbonSelect.getAllChecked("tags");
    console.log("Checked array:", checked);
  });
</script>
```
