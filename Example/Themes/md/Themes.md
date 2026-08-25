# Themes

The Carbon Framework provides a flexible theming system that allows you to define multiple color schemes and switch between them dynamically.

## Defining Themes

Themes are defined using `Themes.config()`. Each theme is a CSS string that typically defines Material Design 3 design tokens as CSS variables.

### Example Configuration

```js
Themes.config({
  light: `
    :root, body.light {
      --primary: #6750a4;
      --on-primary: #ffffff;
      --background: #fffbfe;
      /* ... more variables */
    }
  `,
  dark: `
    :root, body.dark {
      --primary: #d0bcff;
      --on-primary: #381e72;
      --background: #1c1b1f;
      /* ... more variables */
    }
  `
});
```

The framework comes with several pre-defined themes in `Main/Themes/Carbon.Material.Themes.js`, including:
- `greenForest`
- `syberSky`
- `cream`
- `deepBerry`

## Applying Themes

To apply a theme, use `Themes.apply(themeName)`. This will inject the theme's CSS and update the `<body>` class name.

### Example Usage

```js
// Apply the syberSky theme
Themes.apply("syberSky");

// Apply the greenForest theme
Themes.apply("greenForest");
```

## API Reference

| Method | Description | Example |
|--------|-------------|---------|
| `config(obj)` | Registers themes. The object keys are theme names and values are CSS strings. | `Themes.config({ myTheme: '...' })` |
| `apply(name)` | Activates a registered theme by name. | `Themes.apply('myTheme')` |
