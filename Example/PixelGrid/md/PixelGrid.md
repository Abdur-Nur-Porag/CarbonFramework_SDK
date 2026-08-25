# PixelGrid

PixelGrid is a high-performance, canvas-based layout component that combines the speed of Canvas rendering with the flexibility of HTML overlays. It is managed by the `PixelEngine`.

## Use Example (JSX)

```jsx
<PixelEngine>
    <PixelGrid x="10" y="10" colspan="80" rowspan="20" style="background-color: #6200ee; border-radius: 8px;">
        <h2 style="color: white; padding: 10px;">Header Content</h2>
    </PixelGrid>

    <PixelGrid x="10" y="35" colspan="80" rowspan="50" vscroll="true" style="background-color: #f5f5f5; border: 1px solid #ccc;">
        <div style="padding: 15px;">
            <p>This area supports vertical scrolling.</p>
            <!-- More content -->
        </div>
    </PixelGrid>
</PixelEngine>
```

## Tag Attributes

| Attribute | Description | Default |
|-----------|-------------|---------|
| `x` | Horizontal position (0-100) | 0 |
| `y` | Vertical position (0-100) | 0 |
| `colspan` | Width in grid units (0-100) | 100 |
| `rowspan` | Height in grid units (0-100) | 100 |
| `vscroll` | Enable vertical scrolling (`true`/`false`) | `false` |
| `hscroll` | Enable horizontal scrolling (`true`/`false`) | `false` |
| `id` | Unique identifier for selection | `null` |
| `style` | Inline CSS styles for the grid element | `null` |

## GridPixel API (JavaScript)

You can manipulate `PixelGrid` elements programmatically using the `Carbon Build API` selector.

### Methods

| Method | Description |
|--------|-------------|
| `at(x, y)` | Sets the position of the grid. |
| `colspan(size)` | Sets the width of the grid. |
| `rowspan(size)` | Sets the height of the grid. |
| `style(cssObj)` | Applies styles (e.g., `backgroundColor`, `borderRadius`, `rotateZ`, `shadowColor`). |
| `hoverStyle(cssObj)` | Defines styles applied when the mouse hovers over the element. |
| `text(str)` | Sets plain text to be rendered directly on the canvas. |
| `html(content)` | Sets HTML content to be rendered as an overlay. |
| `vScroll(enabled)` | Enables or disables vertical scrolling. |
| `hScroll(enabled)` | Enables or disables horizontal scrolling. |
| `event(name, callback)` | Attaches an event listener (e.g., `click`, `mouseenter`, `mouseleave`). |

### Example

```js
$("#myGrid")
  .at(20, 20)
  .style({ backgroundColor: "red", borderRadius: "10px" })
  .event("click", (pixel) => {
      console.log("Pixel clicked!", pixel);
  });
```
