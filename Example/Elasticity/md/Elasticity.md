# Elasticity

ElasticityEffect provides a modern, bouncy stretching effect to UI elements when dragged, similar to mobile "pull-to-refresh" visual feedback.

## Use Example
```js
// Apply effect to an element with ID "elastic-box"
ElasticityEffect("elastic-box")
  .maxSize(500)
  .friction(1200);
```

## Javascript Api
### Use of api:
```js
ElasticityEffect("id").<api>
```

| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Max Size** | `maxSize(px)` | `.maxSize(600)` | Sets the maximum stretch height in pixels. |
| **Friction** | `friction(val)` | `.friction(1500)` | Sets the resistance to stretching. |

## Structure Note
For best results, place content inside a child element with the class `.elastic-content` to prevent visual distortion of the text/images during the stretch.
#verified 