# Carbon Framework — `CarbonCli.js` & `LiveServer.js` Documentation

---

## 1. Introduction

**Carbon** is a small, custom build system for hand-rolled web projects. It lets you:

- Write your UI in **JSX** files (`.jsx`), which get compiled at build time — no browser-side JSX runtime needed.
- Organize your project into **config files** (`Carbon.build`, `Carbon.package`, `Carbon.main`) that describe which files belong in the final build, in what order.
- Produce a single, self-contained **`index.html`** with all CSS and JS inlined — no bundler, no `node_modules` shipped to the browser.
- Optionally mix in **Vue 3** template syntax (`{{ }}`, `:attr`, `@event`) inside your JSX views, which is compiled *through* untouched so a Vue app can hydrate it in the browser at runtime.
- Optionally **encrypt** the final build output for distribution.

There are two entry-point scripts that do the actual work:

| File | Purpose |
|---|---|
| **`CarbonCli.js`** | The command-line tool. Run manually to scaffold views/components, sync project config, and produce a real `index.html` file on disk. |
| **`LiveServer.js`** | A local dev server. Rebuilds the project **in memory** on every request and every file change, with live-reload in the browser — no `index.html` ever written to disk. |

Both files share the same core compiler pipeline (JSX → HTML), just wired into two different "outer shells" — one is a one-shot CLI build, the other is a long-running HTTP server with a file watcher.

---

## 2. Working Process

### 2.1 The Project's Moving Parts

A Carbon project is described by three **Carbon config files**, each written in a small custom indentation-based format (parsed by `CarbonFormat`):

| Config file | Root key | Describes |
|---|---|---|
| `Carbon.build` | `Engine` | Framework engine files (core JS, themes, prebuilt CSS/JS, z-index rules) |
| `Carbon.package` | `Package` | Installed third-party packages (JS/CSS) |
| `Carbon.main` | `Main` | Your project's own code: views, scripts, styles, pre/post/top/bottom script hooks |

These files use a simple syntax:
```
:SomeKey
  :SubKey
    - fileName.js
    - another.css
```
`:Key` opens a nested object; `-` lines list files under the current key. `CarbonFormat.parse()` turns this into a JS object; `CarbonFormat.stringify()` turns it back into text (used by `--sync`).

### 2.2 High-Level Pipeline (both files follow this)

```
Carbon.build / Carbon.package / Carbon.main  (text)
              │  CarbonFormat.parse()
              ▼
        combined.json-shaped object  { Build, Package, Main }
              │  getFilesFromPath()  — pulls out file lists by dotted path
              ▼
   ┌─────────────────────────────┬───────────────────────────────┐
   │  Non-view files (.js/.css)  │   View files (.jsx / .js)      │
   │  → bundleFiles()            │   → compileViewFilesToHtml()   │
   │  → raw text concatenation   │   → Babel + VM execution       │
   └─────────────────────────────┴───────────────────────────────┘
              │                              │
              ▼                              ▼
      <script>/<style> blocks         final HTML string
              └──────────────┬───────────────┘
                              ▼
                    htmlTemplate (index.html shape)
```

### 2.3 `CarbonCli.js` — Step by Step

Triggered by `node CarbonCli.js --carbon-framework --build` (or other flags — see §5):

1. **`assembleCarbonProject()`** reads the three `Carbon.*` files, parses them with `CarbonFormat.parse`, and writes the combined result to **`combined.json`** on disk.
2. **`buildHTML()`** reads `combined.json` back, and for every named section (engine style, engine core, themes, package style/script, main pre/post/top/bottom script, etc.) calls **`bundleFiles()`** to concatenate the matching files' raw text.
3. Separately, the **view files** (`Main.Main.Views`) go through **`compileViewFilesToHtml()`** — this is the JSX compiler pipeline (§4).
4. All the bundled sections and the compiled view HTML are dropped into the **`htmlTemplate`** string (§3) and written to **`index.html`**.
5. Any file that failed to bundle is recorded in `errorLog` and written to `error.txt` for you to review.
6. If `--enc <key>` was passed, **`organizeAndEncryptOutputs()`** runs afterward, copying/encrypting the build into a `generated/` folder with obfuscated extensions (`.cso`, `.dso`, `.cpk`, `.cf`, `.cni`, `.cnui`) — see §5.6.

This is a **one-shot** process — run the command, get a file on disk.

### 2.4 `LiveServer.js` — Step by Step

Triggered by `node LiveServer.js` (optionally `PORT=xxxx node LiveServer.js`):

1. Starts an HTTP server (`startLiveServer`) on port 3000 by default.
2. On every request to `/` or `/index.html`, it calls **`generateLiveHtml()`**, which re-reads the `Carbon.*` files fresh, re-bundles everything, and re-compiles the JSX views — **entirely in memory**, nothing is written to disk. This means the page you see is always current, even if you never ran a "build" command.
3. Any other request path is treated as a **static asset** request (images, raw `.js`/`.css` files) and served directly from disk relative to the current working directory.
4. A **file watcher** (`fs.watch`, recursive) watches the `Engine/`, `Package/`, `Main/` folders and the three `Carbon.*` config files. On any change (debounced 150ms), it broadcasts a `reload` event over **Server-Sent Events** to `/live-reload`.
5. The browser holds an `EventSource` connection open; when it receives a message, it calls `location.reload()`, which triggers step 2 again — giving you live-reload without any bundler or websocket library.

This is a **long-running dev server** — nothing ever touches disk except reading your source files.

### 2.5 Summary: What's Shared vs What's Different

| | `CarbonCli.js` | `LiveServer.js` |
|---|---|---|
| Output | Writes `index.html` (+ `combined.json`, `bundle.js`, `bundle.css` on demand) to disk | Never writes HTML to disk — served from memory per request |
| Trigger | Manual CLI command, one-shot | Persistent HTTP server + file watcher |
| Compiler pipeline | Identical | Identical |
| Extra features | Scaffolding (`--create-view`, `--create-com`), sync, encryption/packaging | Live-reload via SSE, static asset serving |
| Entry function detection | `App` only | `App`, falling back to `HomeUi` |

---

## 3. Build HTML File — Raw Structure (Where Each Piece Lands)

Both files assemble the exact same `index.html` shape. Here's the structure with a note on **which `Carbon.main` / `Carbon.build` / `Carbon.package` section feeds which slot**:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Carbon Framework</title>

    <style>  ← Build.Engine.Style        (framework CSS)
    <script> ← Build.Engine.Themes       (framework theme JS, runs before paint)
    <style>  ← Build.Engine.Prebuilt     (prebuilt/vendor CSS shipped with the engine)
    <style>  ← Package.Package.Style     (installed package CSS)
    <script> ← Main.Main.Themes          (your project's theme JS)
    <style>  ← Main.Main.Style           (your project's own CSS)
</head>
<body>
    <script> ← Main.Main.TopScript       (runs first, before anything else in <body>)

    <script> ← Build.Engine.Core         (the framework's own runtime JS)
    <script> ← Build.Engine.Prebuilt     (prebuilt/vendor JS)
    <script> ← Package.Package.Script    (installed package JS)
    <script> ← Main.Main.PreScript       (your setup code — runs before the view HTML exists)

    <div>
        ← compiled Main.Main.Views       (your JSX views, compiled to plain HTML — see §4)
    </div>

    <script> ← Main.Main.PostScript      (runs right after the view HTML is in the DOM)
    <script> ← Main.Main.Script          (your main project JS)
    <script> ← Main.Main.BottomScript    (runs last, at the very end of <body>)
</body>
</html>
```

**`LiveServer.js`'s in-memory version** adds a few extra pieces on top of the same shape, since it's a *dev* build, not a production one:

- An extra `<style>` block from `Build.Engine.ZIndex` (z-index rules, live-server only) right at the very top of `<head>`.
- `<script>eruda.init()</script>` — an in-browser devtools console, for debugging on mobile/embedded webviews.
- An inline `<script>` at the very end that opens the `EventSource('/live-reload')` connection and reloads the page on change.

**Why this ordering matters:** engine code loads before package code, which loads before your own project code — so your scripts can safely assume the framework and any packages are already available. `PreScript` runs *before* your view HTML is inserted (good for setup that shouldn't touch the DOM yet); `PostScript` runs *immediately after* (good for DOM-dependent init, like mounting a Vue app onto a view's root element).

### 3.1 Where Files Are Declared

Each section above is populated by `getFilesFromPath(data, 'Dotted.Path')`, which walks the parsed config object and collects every `files: []` array under that path (recursively, including subfolders). So to add a file to, say, `Main.Main.PostScript`, you add it under the `Main` config file like:

```
:Main
  :PostScript
    - init.js
```

and it will show up bundled into the `Main.Main.PostScript` `<script>` block automatically next build.

---

## 4. About the Compiler

This is the part that turns your `.jsx` view files into the HTML that lands in the `<div>` in §3. Both files implement it identically.

### 4.1 Why Babel, and Why a Custom Pragma

Carbon doesn't ship a JSX parser — it uses `@babel/core` with `@babel/plugin-transform-react-jsx` in **classic runtime** mode, pointed at a custom pragma function instead of `React.createElement`:

```js
['@babel/plugin-transform-react-jsx', {
  runtime: 'classic',
  pragma: 'createPureHtml',
  pragmaFrag: 'createPureHtmlFragment',
}]
```

So `<div className="x">Hi</div>` compiles to `createPureHtml("div", { className: "x" }, "Hi")` — but unlike React, **`createPureHtml` doesn't build a virtual DOM tree.** It directly returns a **plain HTML string**. There's no browser, no DOM, no React runtime involved anywhere in this pipeline — it's pure server-side string generation, executed once at build/request time.

### 4.2 `createPureHtml` — The Core Renderer

For every JSX element, `createPureHtml(type, props, ...children)`:

- **If `type` is a function** (a component you imported/defined) → calls that function with the merged props (and `children` as a pre-joined string), and returns *its* string result.
- **If `type` is a string** (an HTML tag, or an unrecognized PascalCase tag treated as a custom element — see §4.4) → builds the opening tag with attributes, appends the (already-string) children, and closes the tag. Void tags (`br`, `img`, `input`, etc.) self-close with no children.
- **Attribute handling specifics:**
  - `className` → `class`
  - `htmlFor` → `for`
  - `style={{...}}` (a real JS object) → serialized to a CSS string
  - `on*` props (functions) → since there's no live browser process at build time, the function's own source is inlined as the HTML event attribute (e.g. `onclick="(function(){...}).call(this, event)"`). This only works for **closure-free** handlers — a handler referencing a variable from the surrounding build-time scope will fail once it's just a string in the browser.
  - Boolean `true` → attribute with no value (e.g. `disabled`)
  - `false`/`null`/`undefined` → attribute omitted entirely

Fragments (`<>...</>`) are handled by `createPureHtmlFragment`, which just concatenates its children — Babel calls this only for the special Fragment reference, not as a normal component.

### 4.3 The Vue Syntax Shield (`protectVueSyntax` / `restoreVueSyntax`)

Standard JSX/Babel has no concept of Vue's template syntax, and two specific Vue idioms are actually **illegal JSX syntax**, not just "misunderstood":

| Vue syntax | Problem in Babel's JSX parser |
|---|---|
| `{{ expr }}` (mustache interpolation) | Parses as a JSX expression container wrapping a **JS object literal** (`{ expr }` shorthand property) — throws `ReferenceError` if `expr` isn't a real build-time variable, or silently renders `[object Object]` if it is. |
| `:attr="..."` / `@event="..."` (shorthand `v-bind` / `v-on`) | A JSX attribute name can never start with `:` or `@`, and never contains `.` (so `@click.stop` breaks too) — this is a hard **syntax error**, aborting the whole file's compile. |

To support both without writing a second parser, Carbon **shields** the source text before Babel ever sees it, and **restores** it after rendering:

1. **`protectVueSyntax(rawCode)`** runs first, inside `compileJsx()`:
   - Every `:foo="..."` / `@bar.mod="..."` attribute name is **hex-encoded** into a Babel-legal placeholder identifier: `vueattr_<hex>=`. Hex-encoding (rather than a simple prefix swap) means *any* character in the original name — `:`, `@`, `.`, `-` — survives the round trip exactly, with zero ambiguity.
   - Every `{{ expr }}` (that isn't the unrelated `attr={{ ... }}` object-literal idiom, like `style={{ color: 'red' }}`) is rewritten to `` {`{{ expr }}`} `` — an ordinary JSX expression container holding a template-literal **string**. Babel compiles this fine, and it renders back out as the literal text `{{ expr }}`.
   - *(Real, explicit `v-bind:foo` / `v-on:bar` — with the full prefix, not the `:`/`@` shorthand — are valid JSX namespaced attributes already and are left untouched.)*
2. Babel compiles the shielded source normally.
3. The VM executes the compiled code and produces a plain HTML string, same as any other view.
4. **`restoreVueSyntax(html)`** runs last, right before the HTML is returned from `compileViewFilesToHtml()`: it finds every `vueattr_<hex>=` and decodes it back to the real `:foo=` / `@bar.mod=` text.

**Net effect:** the final HTML you get contains real, untouched `:class`, `@click.stop`, `{{ userName }}`, etc. — exactly as if Babel had never been involved — ready for a Vue 3 instance (loaded via CDN, mounted in your own `Main.Main.PostScript`) to hydrate at runtime.

> **Heuristic limitation:** the mustache detection is text-based, not a real parser — it treats any `{{ ... }}` not immediately preceded by `=` as a Vue interpolation. This is reliable for normal usage but could misfire on unusual constructs like a raw `{{ }}` inside a spread object outside JSX children.

### 4.4 Modules: Real `import`/`export`, Resolved at Build Time

Unlike a browser or bundler, there's no module system available inside the Node.js `vm` sandbox each file executes in. So Carbon **fakes** ES modules with text processing:

1. **`parseImportStatements(rawCode)`** regex-scans for `import { A, B as C } from '...'` and `import Foo from '...'` lines (before Babel touches anything).
2. **`resolveJsxImportPath()`** turns each import path into an absolute file path:
   - `@Name` / `@Sub/Name` → resolves under `CarbonConfig.componentRoot` (`Main/Views/Com`), always relative to the **project root**, never the importing file.
   - `./Name`, `../Name` → resolves relative to the **importing file's own directory**, as normal.
3. Each imported file is loaded recursively via **`loadJsxModule()`** *before* the importing file is compiled, so its exports are ready to inject.
4. **`fixUndefinedComponents()`** — any PascalCase JSX tag that was neither imported nor locally defined (e.g. `<PageView>`, `<App>`, `<AppBody>`, `<VCenter>` — the framework's own custom elements) gets converted from a bare identifier reference (which would throw `ReferenceError`) into a **string literal**, so it renders as a literal custom HTML tag instead of crashing. Your browser-side engine JS (`Build.Engine.Core`) is what actually gives these tags behavior at runtime.
5. **`prepareForExecution()`** strips all `import` lines and rewrites `export function/const/class Foo` → plain declarations, plus `export { A, B as C }` and `export default X` → assignments onto a `moduleExports` object, since the code is about to run in a plain `vm.Context`, not a real ES module loader.
6. **`loadJsxModule()`** ties all of the above together per file: read → resolve imports → Babel-compile (with the Vue shield) → fix unknown components → strip import/export → run in an isolated `vm.createContext()` seeded with `createPureHtml`, standard JS globals, and the already-loaded import bindings → collect the named exports → **cache the result** (so a component imported by multiple views is only compiled/executed once per build).
7. **`compileViewFilesToHtml()`** loads every file listed under `Main.Main.Views`, merges all their exports together, finds the export named **`App`** (in `LiveServer.js`, falling back to `HomeUi` if `App` isn't found), calls it with no props, and that function's returned string — after `restoreVueSyntax()` — **is** the final HTML dropped into the `<div>` in §3.

### 4.5 Error Handling Philosophy

The compiler is deliberately **non-fatal at the file level**: a Babel syntax error, a missing module, or a runtime error in one view file logs a warning and that file contributes an empty `{}` export set — it does **not** abort the whole build. Only if the entry `App` export is missing entirely does the build fall back to an HTML comment placeholder. This means one broken view won't take down your whole `index.html`; check the console output (and, for `CarbonCli.js`, `error.txt`) for what got skipped.

---

## 5. `CarbonCli.js` — Command Reference

| Command | What it does |
|---|---|
| `--carbon-framework --build` | Full build → `index.html` |
| `--build-json` | Generates `combined.json` only |
| `--build-css` | Generates `bundle.css` only |
| `--build-js` | Generates `bundle.js` only |
| `--sync` | Scans `Package/`, `Engine/`, `Main/` folders on disk and updates the three `Carbon.*` config files to match, preserving your manual file ordering |
| `--create-view <Name>` | Scaffolds `Main/Views/<Name>.jsx` + `Main/Script/<Name>.js`, wires it into `MainView.jsx`/`MainView.js`, then auto-syncs |
| `--remove-view <Name>` | Reverses `--create-view`, then auto-syncs |
| `--create-com <Name>` (or `SubFolder/Name`) | Scaffolds a component `.jsx` file under `Main/Views/Com/` |
| `--enc <key>` | Encrypts the build output (AES-256-CBC) into a `generated/` folder with obfuscated filenames/extensions |
| `--install/--remove --package --js/--css <name>` | Manages installed packages, then rebuilds |
| `--show-package` / `--show-build` / `--show-main` | Prints the raw contents of the corresponding `Carbon.*` file |

> **Known gap:** `--install`/`--remove --package` calls a `managePackage()` function that isn't currently defined anywhere in `CarbonCli.js` — running this command as-is will throw at runtime. Worth implementing or removing from the help text if you don't need it yet.

### 5.1 Config File Sections Reference (`Carbon.build` / `Carbon.package` / `Carbon.main`)

| Config | Section | Feeds |
|---|---|---|
| `Carbon.build` | `Engine.Style` | `<style>` in `<head>` |
| | `Engine.Themes` | `<script>` in `<head>` |
| | `Engine.Core` | `<script>` early in `<body>` |
| | `Engine.Prebuilt` | Both a `<style>` in `<head>` **and** a `<script>` in `<body>` |
| | `Engine.ZIndex` | (live-server only) extra `<style>` in `<head>` |
| `Carbon.package` | `Package.Style` | `<style>` in `<head>` |
| | `Package.Script` | `<script>` in `<body>` |
| `Carbon.main` | `Main.Views` | Compiled to the view `<div>` in `<body>` |
| | `Main.Style` | `<style>` in `<head>` |
| | `Main.Themes` | `<script>` in `<head>` |
| | `Main.TopScript` | First `<script>` in `<body>` |
| | `Main.PreScript` | `<script>` right before the view `<div>` |
| | `Main.PostScript` | `<script>` right after the view `<div>` |
| | `Main.Script` | Main project `<script>` |
| | `Main.BottomScript` | Last `<script>` in `<body>` |

---

## 6. `LiveServer.js` — Route Reference

| Route | Behavior |
|---|---|
| `GET /` or `/index.html` | Rebuilds the whole project in memory and returns fresh HTML — never cached |
| `GET /live-reload` | Server-Sent Events stream; browser listens here and reloads on any watched file change |
| Anything else | Served as a static file straight from disk, relative to the process's working directory (only `.js`, `.css`, `.png`, `.jpg` get a specific `Content-Type`; everything else falls back to `text/plain`) |

Start it with `node LiveServer.js` (default port `3000`), or `PORT=8080 node LiveServer.js` to change the port.

---

## 7. Quick Mental Model

- **Two config-driven build scripts, one shared compiler.** Everything about *what files go where* lives in the three `Carbon.*` text files; everything about *how JSX becomes HTML* lives in the `createPureHtml`/Babel/VM pipeline shared verbatim by both scripts.
- **Views are just functions that return strings.** There is no virtual DOM, no diffing, no client-side JSX runtime — `App()` is called once, server-side (or build-side), and its string return value is dropped straight into the page.
- **Vue is layered on top, not baked in.** Carbon's compiler doesn't understand Vue — it just gets out of Vue's way, passing `{{ }}`/`:attr`/`@event` through untouched so a Vue instance you mount yourself (in `PostScript`, typically) can take over that part of the DOM at runtime.
