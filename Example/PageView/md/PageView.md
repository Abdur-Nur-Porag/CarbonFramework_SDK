# PageView & Router

The PageView system provides a robust routing and page management framework for Carbon apps.

⚠️ **Did you complete your basic?**
If not, go to basic.

### Use Example

```html
<PageView Name="home">
	<App>
		<AppBar/>
		<AppBody>Home</AppBody>
		<BottomBar/>
	</App>
</PageView>

<PageView Name="settings">
	<App>
		<AppBar/>
		<AppBody>Settings</AppBody>
		<BottomBar/>
	</App>
</PageView>
```

JavaScript

```js
<script>
// 1. Register Pages
Carbon.PageView({
  Name: "home",
  Initial: true, // Loads first on app start
  OnStart: async () => console.log("Home starting..."),
  OnScript: async () => console.log("Home ready.")
});

Carbon.PageView({
  Name: "settings"
  // Default Initial is false
});

// 2. Navigation Examples
// Open a new page with a slide-in animation
OpenPageView({
  Target: "settings",
  Delay: 0,
  AnimationName: "SlideIn",
  AnimationTime: "300ms"
});

// Go back (close current page) to reveal the home view underneath
ClosePageView({
  Target: "home", 
  AnimationName: "SlideOut",
  AnimationTime: "300ms"
});
</script>
```

---

### Attribute Definitions

#### AppBody

- **type** = Scroll direction (`"vscroll"`, `"hscroll"`, `"both"`, `"none"`).
    
- **scrollbar** = Boolean (`"true"` / `"false"`).
    

HTML

```html
<!-- With VScroll and Custom Scrollbar -->
<AppBody scrollbar="true" type="vscroll">
  Content here...
</AppBody>

<!-- Without Scrollbar -->
<AppBody scrollbar="false">
  Content here...
</AppBody>
```

#### PageView

- **Name** = Unique identifier for the page.
    
- **active** = _(Internal)_ Set to `"true"` automatically by the router when the page is visible.
    

---

### Javascript API

#### Usage:

- `Carbon.PageView(config);` - Registers the page lifecycle.
    
- `OpenPageView(config);` - Animates a new page _in_ over the current page.
    
- `ClosePageView(config);` - Animates the current page _out_ to reveal the target page.
    

|**API Name**|**Method**|**Example**|**Description**|
|---|---|---|---|
|**Register Page**|`Carbon.PageView(config)`|`Carbon.PageView({ Name: "home" })`|Registers a page and its lifecycle hooks into the Carbon router.|
|**Open Page**|`OpenPageView(config)`|`OpenPageView({ Target: "settings", AnimationName: "SlideUp" })`|Opens the target page and applies the animation to the **new** target view.|
|**Close Page**|`ClosePageView(config)`|`ClosePageView({ Target: "home", AnimationName: "SlideDown" })`|Switches back to the target page by applying the exit animation to the **current** view.|

---

### Configuration Objects

#### 1. Page Registration Config (`Carbon.PageView`)

- **Name**: String. Matches the `Name` attribute in your HTML `<PageView>`.
    
- **Initial**: Boolean. If `true`, this page loads automatically on app startup.
    
- **OnStart**: Async Function. Hook called _before_ the page UI is shown.
    
- **OnScript**: Async Function. Hook called _after_ the page is visible.
    
- **OnFinished**: Async Function. Hook called when transitioning _away_ from this page.
    

#### 2. Navigation Config (`OpenPageView` / `ClosePageView`)

- **Target**: String (Required). The `Name` of the `<PageView>` you want to navigate to.
    
- **Delay**: Number (Optional). Delay in milliseconds before the transition starts (e.g., `100`).
    
- **AnimationName**: String (Optional). CSS `@keyframes` name to apply (e.g., `"SlideIn"`, `"FadeIn"`, `"SlideOut"`).
    
- **AnimationTime**: String (Optional). Duration of the animation (e.g., `"300ms"`, `"0.5s"`). Defaults to `"300ms"` if an animation name is provided. ` #verified