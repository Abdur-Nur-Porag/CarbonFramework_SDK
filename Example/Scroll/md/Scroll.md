# Scroll (Custom Scrollbar)

The Scroll system automatically applies Material Design styled scrollbars to elements.

## Use Example
```jsx
<div ScrollBar="true" Type="VScroll" style="height: 300px; overflow: auto;">
  <!-- Long content -->
</div>

```

Exception: For AppBody
```jsx
<AppBody ScrollBar="true" Type="VScroll">

</AppBody>
```
>[!Note]
For **AppBody** no need declaration its  height.

## Use VScroll
```jsx
<div ScrollBar="true" Type="VScroll" style="height: 300px; overflow: auto;">
  <!-- Long content -->
</div>

```
## Use HScroll
```jsx
<div  ScrollBar="true/false" Type="HScroll">

</div>
```
>[!Note]
For **HScroll** no need declaration its width.


## Attribute Define:
1.  **ScrollBar** = Set to "true" to enable the custom scrollbar on this element.
2.  **Type** = Scroll orientation:
    - `"VScroll"`: Vertical scrollbar.
    - `"HScroll"`: Horizontal scrollbar.
    - `"VScroll HScroll"`: Both.

## OverScroll Effect
Carbon ScrollLayout supports `OverScrollEdge and OverScrollStretch ` Effect. 
### Use Example
 Use of OverScrollEdge
 ```jsx
 <div ScrollBar="true" Type="VScroll" OverScrollEffect="true" OverScrollEffectColor="#000000">
 
 </div>
 
 {/*For HScroll Layout*/}
 <div ScrollBar="true" Type="HScroll" OverScrollEffect="true" OverScrollEffectColor="#000000">
 
 </div>
 
 ```
>[!Note]
For using inside `AppBody` `height ` is not necessary.


 Use of OverScrollStretch
```jsx
<div OverScrollStretchEffect="true">

</div>

```


## Styling
Custom scrollbars use the `.md-scrollbar-track` class for styling. They auto-hide when not in use.
#verified 