# Layout

Layout components provide a set of custom tags for easy Flexbox-based alignment and scrolling containers.
Here scrolling `avoid` this use. Use `auto scroll` below provide description.
## Use Example
```jsx
<vcenter>
  <h4>Centered Vertically</h4>
  <p>Items stack top-to-bottom and center horizontally.</p>
</vcenter>

<hleft>
  <button>Left 1</button>
  <button>Left 2</button>
</hleft>

<vscroll style="height: 200px;">
  <!-- Long content here -->
</vscroll>
```

## Available Tags:
### Vertical Alignment (Stacks top-to-bottom)
- `<vtop>`: Align to top.
- `<vcenter>`: Align to middle.
- `<vbottom>`: Align to bottom.

### Horizontal Alignment (Places side-by-side)
- `<hleft>`: Align to left.
- `<hcenter>`: Align to center.
- `<hright>`: Align to right.
- `<hbottom>`: Horizontal row at the bottom of parent.

### Scroll Containers(avoid)
For Scroll implement use [Scroll](Example/Scroll/md/Scroll.md)

- `<vscroll>`: Vertical scrolling only.
- `<hscroll>`: Horizontal scrolling only.
#verified 