# Accordion

Accordion components provide expandable and collapsible content sections, following Material Design 3 guidelines.

## Use Example
```jsx
<Accordion Toggle="true" GapY="16">
  <AccordionItem id="item1">
    <AccordionItemTitle>What is Carbon Framework?</AccordionItemTitle>
    <AccordionItemDetail>
      Carbon Framework is a UI library designed for Android App Development.
    </AccordionItemDetail>
  </AccordionItem>

  <AccordionItem id="item2">
    <AccordionItemTitle>Is it Material Design 3?</AccordionItemTitle>
    <AccordionItemDetail>
      Yes, it provides a vast collection of Material Design 3 widgets.
    </AccordionItemDetail>
  </AccordionItem>
</Accordion>
```

## Attributes
### Accordion
| Attribute | Type | Description |
| :--- | :--- | :--- |
| **Toggle** | `Boolean` | If `true`, only one item can be open at a time. |
| **GapY** | `String/Number` | Sets the vertical gap between items (e.g., "16" or "1rem"). |

### AccordionItem
| Attribute | Type | Description |
| :--- | :--- | :--- |
| **Active** | `Boolean` | If `true`, the item is expanded. |

## Javascript Api
### Use of api:
```js
Accordion.Active("item1");
```

| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Active** | `Accordion.Active(id)` | `Accordion.Active("id1")` | Expands the item with the given ID. |
| **Close** | `Accordion.Close(id)` | `Accordion.Close("id1")` | Collapses the item with the given ID (or all if no ID). |
| **ActiveAll** | `Accordion.ActiveAll()` | `Accordion.ActiveAll()` | Expands all Accordion items. |
| **CloseAll** | `Accordion.CloseAll()` | `Accordion.CloseAll()` | Collapses all Accordion items. |

#verified
