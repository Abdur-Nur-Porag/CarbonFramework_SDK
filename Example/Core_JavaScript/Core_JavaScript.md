# Carbon Build API

Carbon Build API is the core DOM framework of Carbon. It handles all operations for DOM creation, manipulation, and event handling. It is designed to be lightweight, chainable, and easier to use than traditional DOM frameworks.

## Core Concepts
1. `create(tagName)`
2. `$(selector)`

### Using `create()`
Use `create()` to dynamically generate any HTML element (e.g., `button`, `div`, `span`).
```javascript
create("button")
  .text("My Button")
  .class("btn-primary");
```

### Using `$()`
This is a shorthand selector that works like `document.querySelector()`. It selects an existing element from the DOM using its ID, class, or tag name.
```javascript
$("#my-id")
$(".my-class")
$("button")
```

### Chaining API
Both `create()` and `$()` return the same chainable API object, meaning they share all the methods below.
```javascript
create("div").<methodName>(values).<methodName>(values);
// or
$("#id").<methodName>(values).<methodName>(values);
```

---

## API Reference

### 📌 ID API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Set ID** | `.id(name)` | `.id("homeButton")` | Sets the ID of the element. |
| **Add ID** | `.addId(name)` | `.addId("homeButton")` | Same as `.id()`. |
| **Remove ID** | `.removeId()` | `.removeId()` | Completely removes the `id` attribute. |
| **Check ID** | `.isExistId()` | `.isExistId()` | Returns `true` if the element has an ID, else `false`. |
| **Get ID** | `.getId()` | `.getId()` | Returns the string value of the `id` attribute (or null). |

### 🎨 Class API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Set/Add Class** | `.class(name)` | `.class(["link", "largeText"])` | Adds a single class or an array of classes. |
| **Add Class** | `.addClass(name)` | `.addClass("newClass")` | Same as `.class()`. Appends to existing classes. |
| **Remove Class** | `.removeClass(name)`| `.removeClass("newClass")` | Removes a specific class or array of classes. |
| **Remove All** | `.removeAllClass()`| `.removeAllClass()` | Clears all classes from the element. |
| **Check Class** | `.isExistClass(name)`| `.isExistClass("active")` | Returns `true` if the class exists, else `false`. |
| **Get All** | `.getAllClass()` | `.getAllClass()` | Returns an array containing all class names. |

### 🏷️ Attributes API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Set Multiple**| `.attrs({k: v})` | `.attrs({type: "text", min: "5"})`| Adds multiple attributes via an object. |
| **Add Attrs** | `.addAttr({k: v})` | `.addAttr({disabled: "true"})` | Same as `.attrs()`. |
| **Remove Attr** | `.removeAttr(name)` | `.removeAttr(["disabled", "id"])` | Removes a single attribute or an array of them. |
| **Update Attr** | `.updateAttrValue()`| `.updateAttrValue(["type", "password"])`| Updates specific attributes using array pairs. |
| **Get Value** | `.getAttrValue(name)`| `.getAttrValue("type")` | Returns the string value of a specific attribute. |
| **Get All** | `.getAllAttr()` | `.getAllAttr()` | Returns an object of all attribute key-value pairs. |

### 💅 Style API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Set Style** | `.style({p: v})` | `.style({color: "red"})` | Applies inline CSS properties via an object. |
| **Add Style** | `.addStyle({p: v})` | `.addStyle({fontSize: "20px"})` | Same as `.style()`. |
| **Remove Style**| `.removeStyle()` | `.removeStyle()` | Removes the entire `style` attribute. |
| **Get Style** | `.getStyle(prop)` | `.getStyle("color")` | Returns the computed style value for a property. |

### ⚡ Event API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Add Event** | `.event(name, fn)` | `.event("mouseover", () => {})` | Attaches an event listener. |
| **Remove Event**| `.off(name, fn)` | `.off("click", myFunc)` | Removes a specific event listener. |
| **On Click** | `.onClick(fn)` | `.onClick(() => log("hi"))` | Shortcut for `.event("click", fn)`. |
| **Toggle Event**| `.toggleEvent(opt)` | `.toggleEvent({WhenTrue: f1, WhenFalse: f2})`| Alternates between two functions on click (scoped state). |
| **DOM Ready** | `.domReady(fn)` | `.domReady(() => init())` | Executes function when the DOM is fully loaded. |

### 📝 Form API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Check** | `.check(bool)` | `.check(true)` | Checks a radio or checkbox input. |
| **Uncheck** | `.uncheck()` | `.uncheck()` | Unchecks a radio or checkbox input. |
| **Toggle Check**| `.toggleCheck()` | `.toggleCheck()` | Reverses the current checked state. |
| **Is Checked?** | `.isChecked()` | `.isChecked()` | Returns boolean indicating checked state. |
| **Get/Set Value**| `.val(value)` | `.val("Hello")` | Sets the input value, or returns it if no arg passed. |
| **Remove Value**| `.removeVal()` | `.removeVal()` | Clears the input value (sets to `""`). |
| **Disable** | `.disable()` | `.disable()` | Disables the form element. |
| **Enable** | `.enable()` | `.enable()` | Enables the form element. |
| **Focus/Blur** | `.focus()` / `.blur()`| `.focus()` | Triggers input focus or blur. |

### 📄 Content API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Set HTML** | `.html(html)` | `.html("<b>Hi</b>")` | Sets `innerHTML`. |
| **Set Text** | `.text(text)` | `.text("Hello")` | Sets `innerText` (safer for user input). |

### 🌳 Tree & DOM API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Add To** | `.add(target)` | `.add("#container")` | Appends current element into a target selector/element. |
| **Append To** | `.appendTo(target)`| `.appendTo(otherEl)` | Same as `.add()`. |
| **Add Children**| `.children(input)` | `.children([child1, "Text"])` | Appends elements/text. Objects are saved to `.refs`. |
| **Remove All** | `.removeChildren()`| `.removeChildren()` | Removes all child nodes, but keeps the element itself in the DOM. |
| **Clear** | `.clear()` | `.clear()` | Same as `.removeChildren()`. |
| **Remove Tag** | `.removeTag()` | `.removeTag()` | Removes the element itself from the DOM, along with all of its children. |

> **Note on `.children()` and Named References:** 
> If you pass an object into `.children({ myBtn: create("button") })`, the children are added to the DOM and safely stored in the `refs` property of the API instance. You can access them later using `myApiInstance.refs.myBtn`.

> **Note on `.removeChildren()` vs `.removeTag()`:**
> `.removeChildren()` empties the element but leaves it attached to the DOM. `.removeTag()` detaches the element from its parent entirely — since a node's children live inside it, they're removed automatically along with it.

### 👁️ Visibility API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Show** | `.show(display)` | `.show("flex")` | Sets display property (defaults to "block"). |
| **Hide** | `.hide()` | `.hide()` | Sets display to "none". |
| **Toggle** | `.toggle(type)` | `.toggle("flex")` | Toggles between `.show()` and `.hide()`. |

### 🛠️ Utility & Plugin API

| Action | Method | Example | Description |
| :--- | :--- | :--- | :--- |
| **Use Plugin** | `.use(fn)` | `.use((api) => {})` | Passes the current API instance to a custom function. |
| **Ripple** | `.ripple({opt})` | `.ripple({duration: 1000})` | Material ripple effect. *(Requires `.ripple-effect` CSS)*. |
| **Background** | `.setBackground()`| `.setBackground("img.png")` | Sets background image centered with `cover` sizing. |
| **Set Font** | `.setFont(name, url)`| `.setFont("Roboto", "link")`| Sets font-family and dynamically links webfont in `<head>`. |