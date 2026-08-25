# CodeHighlighter

CodeHighlighter is a powerful component for displaying syntax-highlighted code blocks, powered by PrismJS.

## Use Example
Avoid use diractly inside in jsx.
```jsx
<CodeHighlighter
  Id="code_1"
  Language="javascript"
  WordWrap="true"
  Copy="true"
  LineCount="true"
  Width="100%"
>
function hello() {
  console.log("Hello World!");
}
</CodeHighlighter>
```
Or 
### Recommended
Use by js
```js
<div id="exampleJs"></div>✅must
<script>
CodeHighlighter('exampleJs')
.syntax('javascript')
.code(`
function runAPI() {
  console.log("Injected into parent div!");
        }
    `);
    
</script>
```
## Attribute Define:
1.  **Id** = Unique identifier.
2.  **Language** = Programming language (e.g., javascript, css, html, etc.).
3.  **WordWrap** = Boolean (true/false).
4.  **Copy** = Boolean (true/false). Shows a copy button.
5.  **LineCount** = Boolean (true/false). Shows line numbers.
6.  **Width** = Container width (e.g., "100%", "500px").
7.  **Height** = Container height (e.g., "auto", "300px").

## Javascript Api
### Use of api:
```js
CodeHighlighter("id")
.syntax("lang")
.code(`string`);
```

| Api Name | Method | Example | Extra |
| :--- | :--- | :--- | :--- |
| **Set Syntax** | `syntax(lang)` | `.syntax("python")` | Chainable method to set language. |
| **Set Code** | `code(string)` | `.code("print('hi')")` | Sets code and renders highlighter. |
#verified 