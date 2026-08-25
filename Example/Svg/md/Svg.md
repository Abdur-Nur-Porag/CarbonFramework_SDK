# SvgContainer

SvgContainer is a custom web component that ensures SVGs scale perfectly within their parent containers without "ghost space" or scaling issues.

## Use Example
```jsx
<!-- External SVG -->
<svg-container
  externalsrc="Resources/icons/home.svg"
  width="24px"
  height="24px">
</svg-container>

<!-- Inline SVG -->
<svg-container width="48px" height="48px">
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="red" />
  </svg>
</svg-container>
```

## Attribute Define:
1.  **externalsrc** = URL to an external .svg file.
2.  **width** = Width of the container (e.g. "24px", "100%").
3.  **height** = Height of the container (e.g. "24px", "auto").

## Features:
- Automatically removes hardcoded `width` and `height` from internal `<svg>` tags.
- Sets internal SVG to `100%` width/height to match container.
- Supports both external loading and inline SVG content.
#verified 