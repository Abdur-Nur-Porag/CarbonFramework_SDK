# GridView

GridView is a responsive layout component based on CSS Grid, allowing easy column, row, and span management.

## Basic Example
```html
<GridView Row="2" Col="3" GapX="10" GapY="10">
  <div>Item 1</div>
  <div>Item 2</div>
  <ColumnSpan ColRange="2">
    <div>Spans 2 columns</div>
  </ColumnSpan>
</GridView>
```

## RowSpan Example
```html
<GridView Row="3" Col="3" GapX="10" GapY="10">
  <RowSpan RowRange="2">
    <div>Spans 2 rows</div>
  </RowSpan>
  <div>Item B</div>
  <div>Item C</div>
  <div>Item D</div>
  <div>Item E</div>
</GridView>
```

## GridSpan Example (col + row together)
```html
<GridView Row="3" Col="3" GapX="10" GapY="10">
  <GridSpan ColRange="2" RowRange="2" ColStart="1" RowStart="1">
    <div>Spans 2×2 block</div>
  </GridSpan>
  <div>Item B</div>
  <div>Item C</div>
  <div>Item D</div>
  <div>Item E</div>
</GridView>
```

## Custom Track Sizes
```html
<GridView Col="3" ColSize="1fr,2fr,1fr" Row="2" RowSize="auto,100px">
  <div>Narrow</div>
  <div>Wide</div>
  <div>Narrow</div>
</GridView>
```

## Attribute Reference

### GridView
| Attribute      | Description                                                  |
|----------------|--------------------------------------------------------------|
| `Row`          | Number of rows (default: 1)                                  |
| `Col`          | Number of columns (default: 1)                               |
| `ColSize`      | Comma-separated column track sizes e.g. `1fr,2fr,1fr`        |
| `RowSize`      | Comma-separated row track sizes e.g. `auto,100px,1fr`        |
| `GapX`         | Horizontal gap between items (px or %)                       |
| `GapY`         | Vertical gap between items (px or %)                         |
| `GapTop`       | Top padding of the grid container                            |
| `GapBottom`    | Bottom padding of the grid container                         |
| `GapLeft`      | Left padding of the grid container                           |
| `GapRight`     | Right padding of the grid container                          |
| `AlignItems`   | CSS `align-items` value (`start`, `center`, `end`, `stretch`)|
| `JustifyItems` | CSS `justify-items` value                                    |
| `AlignContent` | CSS `align-content` value                                    |

### ColumnSpan
| Attribute  | Description                                    |
|------------|------------------------------------------------|
| `ColRange` | Number of columns to span (default: 1)         |
| `ColStart` | Starting column line (optional)                |

### RowSpan
| Attribute  | Description                                    |
|------------|------------------------------------------------|
| `RowRange` | Number of rows to span (default: 1)            |
| `RowStart` | Starting row line (optional)                   |

### GridSpan
| Attribute  | Description                                    |
|------------|------------------------------------------------|
| `ColRange` | Number of columns to span (default: 1)         |
| `RowRange` | Number of rows to span (default: 1)            |
| `ColStart` | Starting column line (optional)                |
| `RowStart` | Starting row line (optional)                   |
