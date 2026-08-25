#!/usr/bin/env node
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const vm = require('vm');

/* ==========================================================================
   CARBON FORMAT  —  Config file parser/serializer (unchanged)
   ========================================================================== */

const CarbonFormat = (function () {
  'use strict';
  return {
    parse(input) {
      if (typeof input !== 'string') throw new Error('Input must be a string');
      const lines = input.split(/\r?\n/);
      const root = {};
      const stack = [{ ref: root, path: [], indent: -1 }];
      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;
        const currentIndent = line.search(/\S/);
        while (stack.length > 1 && currentIndent <= stack[stack.length - 1].indent) stack.pop();
        const parent = stack[stack.length - 1];
        if (trimmed.startsWith(':')) {
          const key = trimmed.slice(1).trim();
          if (key === '*null') continue;
          parent.ref[key] = parent.ref[key] || {};
          stack.push({ ref: parent.ref[key], path: [...parent.path, key], indent: currentIndent });
        } else if (trimmed.startsWith('-')) {
          const fileName = trimmed.slice(1).trim();
          if (fileName === '*null') continue;
          if (!parent.ref.files) parent.ref.files = [];
          const pathStr = parent.path.join('/');
          parent.ref.files.push({
            name: fileName,
            path: pathStr,
            filePath: pathStr ? `${pathStr}/${fileName}` : fileName,
          });
        }
      }
      return root;
    },
    stringify(obj, indentSize = 2) {
      let output = '';
      const process = (node, depth) => {
        const indent = ' '.repeat(depth * indentSize);
        for (const key in node) {
          if (key === 'files') {
            node.files.forEach(file => { output += `${indent}- ${file.name}\n`; });
          } else {
            output += `${indent}:${key}\n`;
            const childKeys = Object.keys(node[key]);
            if (childKeys.length === 0) output += `${' '.repeat((depth + 1) * indentSize)}- *null\n`;
            else process(node[key], depth + 1);
          }
        }
      };
      process(obj, 0);
      return output.trim();
    },
  };
})();

/* ==========================================================================
   PROJECT ASSEMBLY  —  Reads Carbon.* files, builds combined.json (unchanged)
   ========================================================================== */

async function assembleCarbonProject() {
  try {
    console.log('Reading Carbon files...');
    const [buildRaw, packageRaw, mainRaw] = await Promise.all([
      fs.readFile('Carbon.build', 'utf8'),
      fs.readFile('Carbon.package', 'utf8'),
      fs.readFile('Carbon.main', 'utf8'),
    ]);
    const compiledData = {
      Build: CarbonFormat.parse(buildRaw),
      Package: CarbonFormat.parse(packageRaw),
      Main: CarbonFormat.parse(mainRaw),
    };
    const jsonOutput = JSON.stringify(compiledData, null, 2);
    await fs.writeFile('combined.json', jsonOutput, 'utf8');
    console.log('Success: "combined.json" created.');
  } catch (err) {
    console.error('Failed to assemble project:', err.message);
  }
}

/* ==========================================================================
   FILE BUNDLER  —  Reads file lists from combined.json, concatenates them
   ========================================================================== */

function getFilesFromPath(obj, dotPath) {
  const parts = dotPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && current[part]) current = current[part];
    else return [];
  }
  const allFiles = [];
  function collect(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.files)) allFiles.push(...node.files);
    for (const key in node) { if (key !== 'files') collect(node[key]); }
  }
  collect(current);
  return allFiles;
}

let errorLog = '';

async function bundleFiles(fileList, type) {
  let bundle = '';
  // For the JS bundle, exclude .jsx — those are compiled to HTML separately.
  // (JSX view files are processed by compileViewFilesToHtml, not bundled raw.)
  const validExt = type === 'css' ? ['.css'] : ['.js'];

  for (const file of fileList) {
    const isCorrectType = validExt.some(ext => file.filePath.endsWith(ext));
    if (!isCorrectType) continue;
    try {
      const content = await fs.readFile(file.filePath, 'utf8');
      bundle += type === 'css'
        ? `\n/* Source: ${file.filePath} */\n${content}\n`
        : `\n// Source: ${file.filePath}\n${content}\n`;
    } catch (err) {
      errorLog += `----\nFileName: ${file.name}\nPath: ${file.filePath}\n----\n`;
      console.error(`Missing: ${file.filePath}`);
    }
  }
  return bundle;
}

/* ==========================================================================
   CARBON CONFIG  —  Framework constants
   ========================================================================== */

const CarbonConfig = {
  root: './',
  debug: true,
  ext: '.jsx',
  componentRoot: 'Main/Views/Com',
};

/* ==========================================================================
   BABEL JSX ENGINE  —  Replaces Lithium/CarbonJS custom JSX parser

   Old flow:  .jsx → Lithium regex engine → HTML  (ImportUi/ExportUi)
   New flow:  .jsx → Babel (createPureHtml pragma) → JS → vm execute → HTML
              Real ES import/export during build; fully inlined in index.html
   ========================================================================== */

// Lazy-load Babel so missing install gives a clear error message
let _babelCore = null;
function getBabelCore() {
  if (!_babelCore) {
    try {
      _babelCore = require('@babel/core');
    } catch (e) {
      throw new Error(
        '❌ Babel not installed.\n' +
        '   Run: npm install --save-dev @babel/core @babel/plugin-transform-react-jsx'
      );
    }
  }
  return _babelCore;
}

// ------------------------------------------------------------------
// createPureHtml  —  The JSX pragma (replaces React.createElement).
// Called by Babel-compiled code for every JSX element.
// Returns a plain HTML string instead of a vDOM node.
// ------------------------------------------------------------------

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function createPureHtml(type, props, ...rawChildren) {
  // ── BUG FIX 1: Fragment support
  // Babel compiles <><div/></> as createPureHtml(createPureHtmlFragment, null, child...)
  // i.e. the Fragment function itself becomes the "type". We must call it with
  // the children directly — NOT as a component with a props object — otherwise
  // createPureHtmlFragment({}) returns "[object Object]".
  if (type === createPureHtmlFragment) {
    return createPureHtmlFragment(...rawChildren);
  }

  // Flatten and filter children to strings
  const childStr = rawChildren
    .flat(Infinity)
    .filter(c => c !== null && c !== undefined && c !== false && c !== true)
    .map(c => String(c))
    .join('');

  // ── FIX: drop any 'children' key that Babel injected into props before
  // calling the component. Without this, components that don't destructure
  // 'children' receive the raw props object which renders as [object Object].
  if (typeof type === 'function') {
    const { children: _dropped, ...cleanProps } = props || {};
    const merged = childStr !== '' ? { ...cleanProps, children: childStr } : cleanProps;
    return type(merged);
  }

  // Anything that isn't a string tag (shouldn't happen after fixUndefinedComponents)
  if (typeof type !== 'string') return childStr;

  // ── BUG FIX 2: Event handler / function props from spread ({...myProp})
  // JSX event handler props (onClick, onInput, etc.) are JavaScript functions.
  // There is no live browser process at build time — this pragma only ever
  // produces a plain HTML string — so a function can't be attached as a real
  // listener here. Instead, for on*-prefixed props we inline the function's
  // own source as the HTML event attribute value (the same mechanism as
  // writing onClick="doSomething()" by hand), wrapped so the native event
  // is passed through as `event`. This works whether the handler came from
  // a direct prop (onClick={...}) or via {...spread}, and for both arrow
  // functions and regular functions. It only works for closure-free
  // handlers — a function that references variables from its enclosing
  // Node.js/build-time scope will still fail at runtime in the browser,
  // since that scope doesn't exist there.
  // The camelCase → lowercase mapping (onClick → onclick) is also applied here.
  const EVENT_RE = /^on[A-Z]/; // matches onClick, onChange, onSubmit, etc.

  // Build attribute string
  const attrParts = [];
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'children') continue;
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') {
      // Only on*-prefixed props can be meaningfully expressed in static HTML
      // (as inline event attributes). Other function-valued props (e.g.
      // custom render props) still can't be serialized, so they're skipped.
      if (EVENT_RE.test(k)) {
        const attrName = k.toLowerCase();
        attrParts.push(`${attrName}="${escapeAttr(`(${v.toString()}).call(this, event)`)}"`);
      }
      continue;
    }
    if (k === 'className')  { attrParts.push(`class="${escapeAttr(v)}"`);  continue; }
    if (k === 'htmlFor')    { attrParts.push(`for="${escapeAttr(v)}"`);     continue; }
    if (k === 'style' && typeof v === 'object') {
      const css = Object.entries(v)
        .map(([sk, sv]) => `${sk.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${sv}`)
        .join('; ');
      attrParts.push(`style="${css}"`);
      continue;
    }
    if (v === true) { attrParts.push(k); continue; }
    // Convert camelCase event names to lowercase HTML attribute names (onClick → onclick)
    const attrName = EVENT_RE.test(k) ? k.toLowerCase() : k;
    attrParts.push(`${attrName}="${escapeAttr(String(v))}"`);
  }
  const attrStr = attrParts.length ? ' ' + attrParts.join(' ') : '';

  if (VOID_TAGS.has(type.toLowerCase())) return `<${type}${attrStr}>`;
  return `<${type}${attrStr}>${childStr}</${type}>`;
}

// Fragment support: <> ... </>
function createPureHtmlFragment(...children) {
  return children
    .flat(Infinity)
    .filter(c => c !== null && c !== undefined && c !== false && c !== true)
    .join('');
}

// ------------------------------------------------------------------
// VUE SYNTAX SHIELD  —  Lets .jsx view files contain Vue 3 template
// syntax ("{{ expr }}" interpolation, ":attr" shorthand v-bind,
// "@event" shorthand v-on, including modifiers like "@click.stop")
// even though Babel's JSX parser doesn't understand any of that.
//
// Babel's JSX grammar breaks on two things:
//   1. "{{ expr }}" as JSX children — the outer {} is a JSX expression
//      container, so the inner {} is parsed as a *JS object literal*
//      ({ expr } shorthand property). That either throws a
//      ReferenceError (expr not defined in this scope) or silently
//      renders "[object Object]" — never the literal Vue text.
//   2. ":attr=" / "@event=" attribute names — a JSXIdentifier may
//      start with a letter and contain letters/digits/"_"/"-", but
//      never a leading ":" or "@" and never ".", so these are hard
//      Babel *syntax* errors, not just wrong output.
//
// Fix: before Babel ever sees the source, swap both forms for
// Babel-legal stand-ins that carry the original text losslessly.
// After createPureHtml() has rendered the final HTML string, swap
// them back so the browser-side Vue app sees the real "{{ }}" /
// ":" / "@" syntax, untouched, ready to hydrate at runtime.
// ------------------------------------------------------------------

// Matches Vue shorthand directive attributes: :foo="...", @bar="...",
// @click.stop="...", :aria-label="...", etc. (NOT the explicit
// "v-bind:foo" / "v-on:bar" form — those are already valid, ordinary
// JSX namespaced attributes and need no help.)
const VUE_SHORTHAND_ATTR_RE = /([\s])((?::|@)[A-Za-z_][\w.:-]*)(=)/g;

// Matches "{{ expr }}" interpolation, but skips the unrelated
// "attr={{ ... }}" object-literal prop idiom (e.g. style={{...}}),
// which is legitimate JSX and must render as an evaluated JS object,
// not literal text. We tell the two apart by checking the character
// right before the opening "{{": a real Vue mustache in JSX text is
// never immediately preceded by "=".
const VUE_MUSTACHE_RE = /(?<!=)\{\{([^{}]*)\}\}/g;

function protectVueSyntax(rawCode) {
  let code = rawCode;

  // 1. ":foo=" / "@bar.mod=" → "vueattr_<hex of original name>="
  //    Hex-encoding (not just prefixing) means ANY character in the
  //    original attribute name — ":", "@", ".", "-" — round-trips
  //    exactly, with no ambiguity to resolve on the way back.
  code = code.replace(VUE_SHORTHAND_ATTR_RE, (match, ws, attrName, eq) => {
    const hex = Buffer.from(attrName, 'utf8').toString('hex');
    return `${ws}vueattr_${hex}${eq}`;
  });

  // 2. "{{ expr }}" → {`{{ expr }}`}  — an ordinary JSX expression
  //    container holding a template-literal string. Babel compiles
  //    this fine, and createPureHtml renders it via String(c), which
  //    yields exactly "{{ expr }}" again in the output HTML.
  code = code.replace(VUE_MUSTACHE_RE, (match, inner) => '{`{{' + inner + '}}`}');

  return code;
}

function restoreVueSyntax(html) {
  return html.replace(/vueattr_([0-9a-f]+)=/g, (match, hex) => {
    try {
      return Buffer.from(hex, 'hex').toString('utf8') + '=';
    } catch (e) {
      return match; // malformed hex — leave as-is rather than crash the build
    }
  });
}

// ------------------------------------------------------------------
// compileJsx  —  Runs Babel over a JSX source string.
// Replaces all JSX syntax with createPureHtml() calls.
// import/export statements are left intact (we handle them separately).
// Vue directive/mustache syntax is shielded before Babel sees it.
// ------------------------------------------------------------------

function compileJsx(sourceCode) {
  const babel = getBabelCore();
  const shielded = protectVueSyntax(sourceCode);
  const result = babel.transformSync(shielded, {
    plugins: [
      ['@babel/plugin-transform-react-jsx', {
        runtime: 'classic',           // must be classic when using a custom pragma
        pragma: 'createPureHtml',
        pragmaFrag: 'createPureHtmlFragment',
        throwIfNamespace: false,
      }],
    ],
    parserOpts: { strictMode: false },
    filename: 'view.jsx',
  });
  if (!result || !result.code) throw new Error('Babel returned empty output');
  return result.code;
}

// ------------------------------------------------------------------
// Import/export helpers  —  Real ES module syntax, resolved at build time.
// The final index.html output has no import/export — fully vanilla JS.
// ------------------------------------------------------------------

/**
 * Parses import statements from raw source.
 * Returns array of import descriptors.
 */
function parseImportStatements(rawCode) {
  const imports = [];

  // Named: import { A, B as C } from './path'
  const namedRe = /^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?/gm;
  let m;
  while ((m = namedRe.exec(rawCode)) !== null) {
    const names = m[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return { original: parts[0].trim(), local: (parts[1] || parts[0]).trim() };
    }).filter(n => n.original);
    imports.push({ type: 'named', names, path: m[2] });
  }

  // Default: import Foo from './path'
  const defaultRe = /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/gm;
  while ((m = defaultRe.exec(rawCode)) !== null) {
    imports.push({ type: 'default', local: m[1], path: m[2] });
  }

  return imports;
}

/**
 * Resolves an import path to an absolute file path.
 * Supports '@' alias for CarbonConfig.componentRoot.
 *
 * '@' always anchors to the project CWD (where the CLI runs), NOT to the
 * importing file's directory — so '@HomeCom/WelcomeCard' always means
 *   <cwd>/Main/Views/Com/HomeCom/WelcomeCard.jsx
 * regardless of which file is doing the importing.
 *
 * Regular relative paths ('./Foo', '../Bar') resolve from the importing file.
 */
function resolveJsxImportPath(sourceFile, importPath) {
  let p = importPath;
  if (p.startsWith('@')) {
    // '@Greeting'          → <cwd>/Main/Views/Com/Greeting.jsx
    // '@HomeCom/Greeting'  → <cwd>/Main/Views/Com/HomeCom/Greeting.jsx
    const rel = path.join(CarbonConfig.componentRoot, p.slice(1).replace(/^\//, ''));
    const resolved = path.resolve(process.cwd(), rel);
    return path.extname(resolved) ? resolved : resolved + CarbonConfig.ext;
  }
  // Standard relative import — resolve from the importing file's directory
  let resolved = path.resolve(path.dirname(sourceFile), p);
  if (!path.extname(resolved)) resolved += CarbonConfig.ext;
  return resolved;
}

/**
 * After Babel transforms JSX, any PascalCase tag that was NOT imported and
 * is NOT locally defined ends up as an undefined identifier:
 *   createPureHtml(PageView, ...)   ← 'PageView' is undefined → ReferenceError
 *
 * This function converts unknown PascalCase identifiers to string literals so
 * they render as custom HTML elements (PageView, App, AppBody, VCenter, etc.):
 *   createPureHtml("PageView", ...)  ← renders <PageView> as-is in the HTML
 *
 * Carbon's browser-side JS then handles those custom elements at runtime.
 */
function fixUndefinedComponents(compiledCode, knownNames) {
  return compiledCode.replace(
    /createPureHtml\(([A-Z][a-zA-Z0-9]*)\b/g,
    (match, name) => (knownNames.has(name) ? match : `createPureHtml("${name}"`)
  );
}

/**
 * Extracts all locally-defined PascalCase names from raw source.
 * Used to decide which component references in JSX are "known".
 */
function extractLocalDefinitions(rawCode) {
  const names = new Set();
  const fnRe  = /(?:export\s+)?function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g;
  const varRe = /(?:export\s+)?(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*=/g;
  let m;
  while ((m = fnRe.exec(rawCode))  !== null) names.add(m[1]);
  while ((m = varRe.exec(rawCode)) !== null) names.add(m[1]);
  return names;
}

/**
 * Extracts the set of names explicitly exported from raw source.
 * Handles:  export function Foo / export const Foo / export { Foo, Bar as Baz }
 */
function extractExportedNames(rawCode) {
  const names = new Set();
  const fnRe    = /^export\s+(?:function|class)\s+(\w+)/gm;
  const varRe   = /^export\s+(?:const|let|var)\s+(\w+)\s*=/gm;
  const braceRe = /^export\s+\{([^}]+)\}/gm;
  let m;
  while ((m = fnRe.exec(rawCode))    !== null) names.add(m[1]);
  while ((m = varRe.exec(rawCode))   !== null) names.add(m[1]);
  while ((m = braceRe.exec(rawCode)) !== null) {
    m[1].split(',').forEach(n => {
      const parts = n.trim().split(/\s+as\s+/);
      names.add((parts[1] || parts[0]).trim());
    });
  }
  return names;
}

/**
 * Transforms Babel-compiled code for VM execution:
 *  - Strips all import lines (already resolved and injected into VM context)
 *  - Removes 'export' keyword from declarations (keeps the declaration)
 *  - Converts 'export { A, B }' → moduleExports assignments
 *  - Converts 'export default X' → moduleExports.default = X
 */
function prepareForExecution(compiledCode) {
  let code = compiledCode;

  // Strip all import lines
  code = code.replace(/^import\s+[^;]+;?\s*\n?/gm, '');

  // export default expr
  code = code.replace(/^export\s+default\s+/gm, 'moduleExports.default = ');

  // export function/class Foo → function/class Foo
  code = code.replace(/^export\s+(function|class)\s+/gm, '$1 ');

  // export const/let/var Foo → const/let/var Foo
  code = code.replace(/^export\s+(const|let|var)\s+/gm, '$1 ');

  // export { Foo, Bar as Baz } → moduleExports assignments
  code = code.replace(/^export\s+\{([^}]+)\}\s*;?\s*\n?/gm, (_, list) => {
    return list.split(',').map(n => {
      const parts  = n.trim().split(/\s+as\s+/);
      const local  = parts[0].trim();
      const exported = (parts[1] || parts[0]).trim();
      return `if (typeof ${local} !== 'undefined') moduleExports['${exported}'] = ${local};`;
    }).join('\n') + '\n';
  });

  return code;
}

// Standard JS globals to inject into every VM context
const JS_GLOBALS = {
  Array, Object, String, Number, Boolean, Math, Date, JSON, RegExp,
  Promise, Map, Set, WeakMap, WeakSet, Symbol, Proxy,
  Error, TypeError, RangeError, SyntaxError, ReferenceError,
  parseInt, parseFloat, isNaN, isFinite,
  encodeURIComponent, decodeURIComponent,
  encodeURI, decodeURI,
  setTimeout, clearTimeout, setInterval, clearInterval,
};

// Module cache — cleared before each build
const _jsxModuleCache  = new Map();
const _jsxModuleStack  = new Set();

/**
 * Loads a .jsx (or .js) file as a module with real import/export resolution.
 *
 * Replaces the old loadLithiumModule() / ImportUi / ExportUi system.
 *
 * Flow:
 *  1. Read file
 *  2. Parse 'import' statements → recursively load those modules
 *  3. Babel-compile JSX → JS
 *  4. fixUndefinedComponents: unknown PascalCase tags → string literals
 *  5. prepareForExecution: strip import/export syntax
 *  6. Execute in vm.Context with createPureHtml + imported bindings
 *  7. Collect exported names, cache, return
 */
async function loadJsxModule(filePath) {
  const absPath = path.resolve(filePath);

  if (_jsxModuleCache.has(absPath)) return _jsxModuleCache.get(absPath);

  const empty = {};

  if (_jsxModuleStack.has(absPath)) {
    console.warn(`⚠️  Circular import detected: "${absPath}". Skipping.`);
    return empty;
  }
  if (!fsSync.existsSync(absPath)) {
    console.warn(`⚠️  Module not found: "${absPath}"`);
    return empty;
  }

  _jsxModuleStack.add(absPath);

  try {
    const rawCode = await fs.readFile(absPath, 'utf8');

    // 1. Resolve imports — load imported modules first
    const importBindings = {};
    const imports = parseImportStatements(rawCode);

    for (const imp of imports) {
      const resolvedPath = resolveJsxImportPath(absPath, imp.path);
      const mod = await loadJsxModule(resolvedPath);

      if (imp.type === 'named') {
        for (const { original, local } of imp.names) {
          if (mod[original] !== undefined) {
            importBindings[local] = mod[original];
          } else {
            console.warn(
              `⚠️  "${original}" not exported from ${path.relative('.', resolvedPath)}` +
              ` (imported by ${path.relative('.', absPath)})`
            );
          }
        }
      } else if (imp.type === 'default') {
        if (mod.default !== undefined) {
          importBindings[imp.local] = mod.default;
        } else {
          console.warn(`⚠️  No default export from ${path.relative('.', resolvedPath)}`);
        }
      }
    }

    // 2. Babel-compile JSX → JS (or pass .js files through if no JSX)
    let compiledCode;
    const isJsx = absPath.endsWith('.jsx');
    try {
      compiledCode = isJsx ? compileJsx(rawCode) : rawCode;
    } catch (babelErr) {
      console.warn(`⚠️  Babel error in "${path.relative('.', absPath)}": ${babelErr.message}`);
      return empty;
    }

    // 3. Fix unknown PascalCase component references → string tags
    const localDefs  = extractLocalDefinitions(rawCode);
    const knownNames = new Set([...Object.keys(importBindings), ...localDefs]);
    compiledCode = fixUndefinedComponents(compiledCode, knownNames);

    // 4. Strip import/export syntax for VM execution
    const execCode = prepareForExecution(compiledCode);

    // 5. Execute in isolated VM context
    const moduleExports = {};
    const vmCtx = vm.createContext({
      createPureHtml,
      createPureHtmlFragment,
      moduleExports,
      console,
      ...JS_GLOBALS,
      ...importBindings,
    });

    try {
      vm.runInContext(execCode, vmCtx);
    } catch (vmErr) {
      console.warn(`⚠️  VM error in "${path.relative('.', absPath)}": ${vmErr.message}`);
      return empty;
    }

    // 6. Collect named exports from VM context
    const exportedNames = extractExportedNames(rawCode);
    for (const name of exportedNames) {
      if (moduleExports[name] === undefined && vmCtx[name] !== undefined) {
        moduleExports[name] = vmCtx[name];
      }
    }

    _jsxModuleCache.set(absPath, moduleExports);
    return moduleExports;

  } finally {
    _jsxModuleStack.delete(absPath);
  }
}

/**
 * Compiles all view files listed in Carbon.main → Views to a single HTML string.
 *
 * Replaces the old runLithiumEngine().
 *
 * The "App" exported function from the entry view is called
 * with no props; its return value is the final HTML body.
 *
 * Because each file uses real import/export, the module loader handles the
 * component graph automatically — Com/ files don't need to be in the Views
 * list anymore, but they can be listed safely (module cache deduplicates them).
 */
async function compileViewFilesToHtml(viewFileList) {
  // Fresh module cache for every build
  _jsxModuleCache.clear();
  _jsxModuleStack.clear();

  const allExports = {};

  for (const file of viewFileList) {
    if (!file.filePath) continue;
    const isView = file.filePath.endsWith('.jsx') || file.filePath.endsWith('.js');
    if (!isView) continue;

    try {
      const mod = await loadJsxModule(file.filePath);
      Object.assign(allExports, mod);
    } catch (e) {
      console.warn(`⚠️  Failed to compile view "${file.filePath}": ${e.message}`);
    }
  }

  // Entry component — same convention as the old engine
  const entry = allExports['App'];

  if (!entry) {
    console.warn(
      'App is entry Point' +
      '⚠️  No "App" export found in view files.\n' +
      '    Make sure your entry view file exports a function named App:\n' +
      '      export function App() { return <div>...</div>; }'
    );
    return '<!-- No Main component found -->';
  }

  try {
    const html = typeof entry === 'function' ? entry({}) : String(entry);
    return restoreVueSyntax(html.trim());
  } catch (renderErr) {
    console.warn(`⚠️  Render error: ${renderErr.message}`);
    return `<!-- Render error: ${renderErr.message} -->`;
  }
}

/* ==========================================================================
   BUILD EXECUTOR
   ========================================================================== */

async function buildHTML() {
  try {
    let data;
    try {
      data = JSON.parse(await fs.readFile('combined.json', 'utf8'));
    } catch (e) {
      console.warn("Notice: 'combined.json' not found. Using safe fallbacks.");
      data = {};
    }

    console.log('Building Carbon Project...');

    const sections = {
    		engineZIndex: await bundleFiles(getFilesFromPath(data, 'Build.Engine.ZIndex'),    'css'),
      engineStyle:   await bundleFiles(getFilesFromPath(data, 'Build.Engine.Style'),    'css'),
      engineCore:    await bundleFiles(getFilesFromPath(data, 'Build.Engine.Core'),     'js'),
      engineThemes:  await bundleFiles(getFilesFromPath(data, 'Build.Engine.Themes'),   'js'),
      prebuiltStyle: await bundleFiles(getFilesFromPath(data, 'Build.Engine.Prebuilt'), 'css'),
      prebuiltScript:await bundleFiles(getFilesFromPath(data, 'Build.Engine.Prebuilt'), 'js'),
      packageStyle:  await bundleFiles(getFilesFromPath(data, 'Package.Package.Style'), 'css'),
      packageScript: await bundleFiles(getFilesFromPath(data, 'Package.Package.Script'),'js'),
      mainPre:       await bundleFiles(getFilesFromPath(data, 'Main.Main.PreScript'),   'js'),
      mainThemes:    await bundleFiles(getFilesFromPath(data, 'Main.Main.Themes'),      'js'),
      mainStyle:     await bundleFiles(getFilesFromPath(data, 'Main.Main.Style'),       'css'),
      mainScript:    await bundleFiles(getFilesFromPath(data, 'Main.Main.Script'),      'js'),
      mainPost:      await bundleFiles(getFilesFromPath(data, 'Main.Main.PostScript'),  'js'),
      mainTopScript: await bundleFiles(getFilesFromPath(data, 'Main.Main.TopScript'),   'js'),
      mainBottomScript: await bundleFiles(getFilesFromPath(data, 'Main.Main.BottomScript'), 'js'),
    };

    // ── JSX views → pure HTML via Babel + createPureHtml ───────────────────
    const viewFiles     = getFilesFromPath(data, 'Main.Main.Views');
    const compiledViews = await compileViewFilesToHtml(viewFiles);
    // ───────────────────────────────────────────────────────────────────────

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <title>Carbon Framework</title>
    <!--All Style-->
    <style>${sections.engineZIndex}</style>
    <style>${sections.engineStyle}</style>
    <script>${sections.engineThemes}</script>
    <style>${sections.prebuiltStyle}</style>
    <style>${sections.packageStyle}</style>
    <script>${sections.mainThemes}</script>
    <style>${sections.mainStyle}</style>
</head>
<body>
    <script>${sections.mainTopScript}</script>
    <!--All Script-->
    <script>${sections.engineCore}</script>
    <script>${sections.prebuiltScript}</script>
    <script>${sections.packageScript}</script>
    <script>${sections.mainPre}</script>
    <div>
        ${compiledViews}
    </div>
    <!--Post Script-->
    <script>${sections.mainPost}</script>
    <script>${sections.mainScript}</script>
    <script>${sections.mainBottomScript}</script>
</body>
</html>`;

    await fs.writeFile('index.html', htmlTemplate, 'utf8');
    console.log('Build complete: index.html generated.');

    if (errorLog) {
      await fs.writeFile('error.txt', errorLog, 'utf8');
      console.log('Errors detected. Details saved to error.txt');
    } else {
      try { await fs.unlink('error.txt'); } catch (e) {}
      console.log('No errors found. All files loaded successfully.');
    }
  } catch (err) {
    console.error('Critical Build Failure:', err.message);
  }
}

async function buildProject() {
  await assembleCarbonProject();
  await buildHTML();
}

async function getProjectBundle(data, type) {
  const isJs = type === 'js';
  const label = isJs ? 'Javascript' : 'CSS';
  console.log(`📦 Creating combined ${label} bundle...`);

  const sequence = isJs ? [
    getFilesFromPath(data, 'Main.Main.TopScript'),
    getFilesFromPath(data, 'Build.Engine.Core'),
    getFilesFromPath(data, 'Build.Engine.Prebuilt'),
    getFilesFromPath(data, 'Build.Engine.Themes'),
    getFilesFromPath(data, 'Package.Package.Script'),
    getFilesFromPath(data, 'Main.Main.Themes'),
    getFilesFromPath(data, 'Main.Main.PreScript'),
    getFilesFromPath(data, 'Main.Main.Script'),
    getFilesFromPath(data, 'Main.Main.PostScript'),
    getFilesFromPath(data, 'Main.Main.BottomScript'),
  ] : [
    getFilesFromPath(data, 'Build.Engine.Style'),
    getFilesFromPath(data, 'Build.Engine.Prebuilt'),
    getFilesFromPath(data, 'Package.Package.Style'),
    getFilesFromPath(data, 'Main.Main.Style'),
  ];

  let finalBundle = `/* Carbon Generated ${label} Bundle - ${new Date().toLocaleString()} */\n`;
  for (const list of sequence) {
    if (list.length > 0) finalBundle += await bundleFiles(list, type);
  }
  return finalBundle;
}

/* ==========================================================================
   SYNC — Scans physical folders, updates Carbon.* files (unchanged)
   ========================================================================== */

async function buildObjectFromDir(dirPath) {
  const result = {};
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) result[entry.name] = await buildObjectFromDir(path.join(dirPath, entry.name));
    else files.push({ name: entry.name });
  }
  if (files.length > 0) result.files = files;
  return result;
}

function mergeDirectoryIntoObject(existingObj, physicalData) {
  const result = { ...existingObj };
  const physicalFiles = physicalData.files || [];
  const existingFiles = result.files || [];
  const keptFiles = existingFiles.filter(ef => physicalFiles.some(pf => pf.name === ef.name));
  const newFiles  = physicalFiles.filter(pf => !existingFiles.some(ef => ef.name === pf.name));
  result.files = [...keptFiles, ...newFiles];
  if (result.files.length === 0) delete result.files;

  const allKeys = new Set([
    ...Object.keys(result).filter(k => k !== 'files'),
    ...Object.keys(physicalData).filter(k => k !== 'files'),
  ]);
  for (const key of allKeys) {
    if (!physicalData[key]) delete result[key];
    else result[key] = mergeDirectoryIntoObject(result[key] || {}, physicalData[key]);
  }
  return result;
}

async function syncProjectFiles() {
  console.log('🔄 Syncing changes (Preserving manual file order)...');
  const roots = [
    { dir: 'Package', file: 'Carbon.package', rootKey: 'Package' },
    { dir: 'Engine',  file: 'Carbon.build',   rootKey: 'Engine'  },
    { dir: 'Main',    file: 'Carbon.main',     rootKey: 'Main'    },
  ];
  for (const { dir, file, rootKey } of roots) {
    try {
      if (fsSync.existsSync(dir)) {
        const physicalState = await buildObjectFromDir(dir);
        let currentConfig = {};
        if (fsSync.existsSync(file)) {
          const raw = await fs.readFile(file, 'utf8');
          currentConfig = CarbonFormat.parse(raw);
        }
        const mergedContent = mergeDirectoryIntoObject(currentConfig[rootKey] || {}, physicalState);
        const finalOutput   = { [rootKey]: mergedContent };
        await fs.writeFile(file, CarbonFormat.stringify(finalOutput), 'utf8');
        console.log(`✅ ${file} updated successfully.`);
      }
    } catch (err) {
      console.error(`❌ Failed to sync ${file}: ${err.message}`);
    }
  }
  console.log('🚀 Sync process complete.');
}

/* ==========================================================================
   COMPONENT GENERATOR  —  --create-com <name>
   ========================================================================== */

async function createComponent(rawName) {
  if (!rawName) {
    console.error('❌ Syntax: --create-com <name>  |  --create-com SubFolder/Name');
    return;
  }
  const segments = rawName.split('/').map(s => s.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
  if (!segments.length) { console.error('❌ Invalid component name.'); return; }
  segments[segments.length - 1] =
    segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1);
  const name    = segments[segments.length - 1];
  const comDir  = path.join(CarbonConfig.componentRoot, ...segments.slice(0, -1));
  const filePath = path.join(comDir, `${name}${CarbonConfig.ext}`);

  if (fsSync.existsSync(filePath)) {
    console.error(`❌ Component "${name}" already exists at ${filePath}.`);
    return;
  }
  await fs.mkdir(comDir, { recursive: true });

  const content =
`// import { OtherComponent } from './OtherComponent.jsx';
// import { someVar } from '@SubFolder/SomeName';

export function ${name}() {
\treturn (
\t\t<div className="${name.toLowerCase()}-com">
\t\t\t<p>${name} component</p>
\t\t</div>
\t);
}
`;
  await fs.writeFile(filePath, content, 'utf8');
  console.log(`✅ Created Component: ${filePath}`);
  console.log(`   Use it elsewhere with:\n   import { ${name} } from '@${segments.join('/')}';`);
}

/* ==========================================================================
   VIEW GENERATOR  —  --create-view <name>
   ========================================================================== */

async function createView(rawName) {
  if (!rawName) {
    console.error('❌ Syntax: --create-view <name>  Ex: --create-view Profile');
    return;
  }
  let name = rawName.replace(/[^a-zA-Z0-9]/g, '');
  name = name.charAt(0).toUpperCase() + name.slice(1);
  if (!/View$/.test(name)) name += 'View';

  const viewsDir  = path.join('Main', 'Views');
  const scriptDir = path.join('Main', 'Script');
  const jsxPath   = path.join(viewsDir, `${name}.jsx`);
  const jsPath    = path.join(scriptDir, `${name}.js`);

  if (fsSync.existsSync(jsxPath) || fsSync.existsSync(jsPath)) {
    console.error(`❌ View "${name}" already exists.`);
    return;
  }
  await fs.mkdir(viewsDir,  { recursive: true });
  await fs.mkdir(scriptDir, { recursive: true });

  const jsxContent =
`// import { SomeComponent } from '../Com/SomeComponent.jsx';

export function ${name}() {
\treturn (
\t\t<PageView Name="${name}">
\t\t\t<App>
\t\t\t\t<AppBody>
\t\t\t\t\t<VCenter>
\t\t\t\t\t\t<h1>${name}</h1>
\t\t\t\t\t\t<p>This is the ${name} page.</p>
\t\t\t\t\t</VCenter>
\t\t\t\t</AppBody>
\t\t\t</App>
\t\t</PageView>
\t);
}
`;
  await fs.writeFile(jsxPath, jsxContent, 'utf8');
  console.log(`✅ Created: ${jsxPath}`);

  const jsContent =
`\nfunction ${name}Script() {\n    \n}\n`;
  await fs.writeFile(jsPath, jsContent, 'utf8');
  console.log(`✅ Created: ${jsPath}`);

  // Inject import + <Name/> into AppView.jsx
  const AppViewJsxPath = path.join(viewsDir, 'AppView.jsx');
  if (fsSync.existsSync(AppViewJsxPath)) {
    let AppViewJsx = await fs.readFile(AppViewJsxPath, 'utf8');

    const importLine = `import { ${name} } from './${name}.jsx';`;
    if (!AppViewJsx.includes(importLine) && !AppViewJsx.includes(`'${name}'`) && !AppViewJsx.includes(`"${name}"`)) {
      const lastImportIdx = AppViewJsx.lastIndexOf('import ');
      if (lastImportIdx !== -1) {
        const lineEnd = AppViewJsx.indexOf('\n', lastImportIdx);
        AppViewJsx = AppViewJsx.slice(0, lineEnd + 1) + importLine + '\n' + AppViewJsx.slice(lineEnd + 1);
      } else {
        AppViewJsx = importLine + '\n' + AppViewJsx;
      }
      console.log(`✅ Updated: ${AppViewJsxPath} (added import for ${name})`);
    }

    if (!AppViewJsx.includes(`<${name}/>`) && !AppViewJsx.includes(`<${name} />`)) {
      const closingDivIndex = AppViewJsx.lastIndexOf('</div>');
      if (closingDivIndex !== -1) {
        AppViewJsx =
          AppViewJsx.slice(0, closingDivIndex) +
          `\t\t\t<${name}/>\n\t\t\t` +
          AppViewJsx.slice(closingDivIndex);
      } else {
        AppViewJsx += `\n<${name}/>\n`;
      }
      console.log(`✅ Updated: ${AppViewJsxPath} (added <${name}/>)`);
    } else {
      console.log(`ℹ️  ${AppViewJsxPath} already references <${name}/>, skipping.`);
    }

    await fs.writeFile(AppViewJsxPath, AppViewJsx, 'utf8');
  } else {
    console.warn(`⚠️ ${AppViewJsxPath} not found. Skipped injection.`);
  }

  // Update AppView.js — register the PageView
  const AppViewJsPath = path.join(scriptDir, 'AppView.js');
  if (fsSync.existsSync(AppViewJsPath)) {
    let AppViewJs = await fs.readFile(AppViewJsPath, 'utf8');
    if (AppViewJs.includes(`Name:"${name}"`) || AppViewJs.includes(`Name: "${name}"`)) {
      console.log(`ℹ️  ${AppViewJsPath} already registers "${name}", skipping.`);
    } else {
      AppViewJs +=
`\nCarbon.PageView({\n  Name: "${name}",\n  Initial: false,\n  OnScript() {\n    ${name}Script();\n  }\n})\n`;
      await fs.writeFile(AppViewJsPath, AppViewJs, 'utf8');
      console.log(`✅ Updated: ${AppViewJsPath} (registered "${name}")`);
    }
  } else {
    console.warn(`⚠️ ${AppViewJsPath} not found. Skipped registration.`);
  }

  console.log(`\n🎉 View "${name}" created successfully.`);
}

/* ==========================================================================
   VIEW REMOVER  —  --remove-view <name>
   ========================================================================== */

async function removeView(rawName) {
  if (!rawName) { console.error('❌ Syntax: --remove-view <name>'); return; }
  let name = rawName.replace(/[^a-zA-Z0-9]/g, '');
  name = name.charAt(0).toUpperCase() + name.slice(1);
  if (!/View$/.test(name)) name += 'View';

  const viewsDir  = path.join('Main', 'Views');
  const scriptDir = path.join('Main', 'Script');
  const jsxPath   = path.join(viewsDir, `${name}.jsx`);
  const jsPath    = path.join(scriptDir, `${name}.js`);
  let touched = false;

  if (fsSync.existsSync(jsxPath)) { await fs.unlink(jsxPath); console.log(`🗑️  Deleted: ${jsxPath}`); touched = true; }
  else console.warn(`⚠️ ${jsxPath} does not exist. Skipped.`);

  if (fsSync.existsSync(jsPath))  { await fs.unlink(jsPath);  console.log(`🗑️  Deleted: ${jsPath}`);  touched = true; }
  else console.warn(`⚠️ ${jsPath} does not exist. Skipped.`);

  const AppViewJsxPath = path.join(viewsDir, 'AppView.jsx');
  if (fsSync.existsSync(AppViewJsxPath)) {
    let src = await fs.readFile(AppViewJsxPath, 'utf8');
    const importLine = `import { ${name} } from './${name}.jsx';\n`;
    if (src.includes(importLine)) {
      src = src.replace(importLine, '');
      console.log(`✅ Removed import for ${name} from ${AppViewJsxPath}`);
      touched = true;
    }
    const { content, removed } = stripViewTag(src, name);
    if (removed) {
      await fs.writeFile(AppViewJsxPath, content, 'utf8');
      console.log(`✅ Updated: ${AppViewJsxPath} (removed <${name}/>)`);
      touched = true;
    } else {
      await fs.writeFile(AppViewJsxPath, src, 'utf8');
      console.log(`ℹ️  ${AppViewJsxPath} does not reference <${name}/>, skipping.`);
    }
  } else {
    console.warn(`⚠️ ${AppViewJsxPath} not found. Skipped cleanup.`);
  }

  const AppViewJsPath = path.join(scriptDir, 'AppView.js');
  if (fsSync.existsSync(AppViewJsPath)) {
    let AppViewJs = await fs.readFile(AppViewJsPath, 'utf8');
    const { content, removed } = stripPageViewRegistration(AppViewJs, name);
    if (removed) {
      await fs.writeFile(AppViewJsPath, content, 'utf8');
      console.log(`✅ Updated: ${AppViewJsPath} (unregistered "${name}")`);
      touched = true;
    } else {
      console.log(`ℹ️  ${AppViewJsPath} does not register "${name}", skipping.`);
    }
  } else {
    console.warn(`⚠️ ${AppViewJsPath} not found. Skipped cleanup.`);
  }

  if (touched) console.log(`\n🎉 View "${name}" removed successfully.`);
  else         console.warn(`\n⚠️  Nothing was found for view "${name}".`);
}

function stripViewTag(source, name) {
  const eol  = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r\n|\r|\n/);
  const tagPattern = new RegExp(`<${name}\\s*\\/>`);
  let removed = false;
  const kept = [];
  for (const line of lines) {
    if (!tagPattern.test(line)) { kept.push(line); continue; }
    removed = true;
    const withoutTag = line.replace(tagPattern, '');
    if (withoutTag.trim() !== '') kept.push(withoutTag);
  }
  return { content: kept.join(eol), removed };
}

function stripPageViewRegistration(source, name) {
  const callRegex = /Carbon\.PageView\s*\(/g;
  let match;
  while ((match = callRegex.exec(source)) !== null) {
    const blockStart    = match.index;
    const parenOpenIdx  = match.index + match[0].length - 1;
    let depth = 0, parenCloseIdx = -1;
    for (let i = parenOpenIdx; i < source.length; i++) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') { depth--; if (depth === 0) { parenCloseIdx = i; break; } }
    }
    if (parenCloseIdx === -1) break;
    const block = source.slice(blockStart, parenCloseIdx + 1);
    const nameMatches =
      block.includes(`Name: "${name}"`) || block.includes(`Name:"${name}"`) ||
      block.includes(`Name: '${name}'`) || block.includes(`Name:'${name}'`);
    if (nameMatches) {
      const updated = source.slice(0, blockStart) + `// Removed PageView: ${name}` + source.slice(parenCloseIdx + 1);
      return { content: updated, removed: true };
    }
    callRegex.lastIndex = parenCloseIdx + 1;
  }
  return { content: source, removed: false };
}

/* ==========================================================================
   ENCRYPTION & OUTPUT ORGANIZER  —  --enc <key>
   ========================================================================== */

async function organizeAndEncryptOutputs(args, encKey) {
  const crypto = require('crypto');
  const fsP    = require('fs').promises;

  const dirs = ['generated', 'generated/lib/cni', 'generated/lib/cnui', 'generated/Resources'];
  for (const d of dirs) await fsP.mkdir(d, { recursive: true });

  function encryptData256(data, keyString) {
    const key = crypto.createHash('sha256').update(keyString).digest();
    const iv  = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
  }

  const movedFiles = [];

  if (fsSync.existsSync('combined.json')) {
    try {
      const combinedData = JSON.parse(await fsP.readFile('combined.json', 'utf8'));
      const allFiles = [];
      function extractFiles(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node.files)) allFiles.push(...node.files);
        for (const key in node) { if (key !== 'files') extractFiles(node[key]); }
      }
      extractFiles(combinedData);

      for (const file of allFiles) {
        if (!file.filePath || !fsSync.existsSync(file.filePath)) continue;
        const ext      = path.extname(file.filePath).toLowerCase();
        const baseName = path.basename(file.filePath, ext);
        let destPath   = null;
        if (ext === '.js' || ext === '.jsx') destPath = path.join('generated/lib/cni',  `lib${baseName}.cso`);
        else if (ext === '.css')             destPath = path.join('generated/lib/cnui', `lib${baseName}.dso`);
        if (destPath) {
          const data    = await fsP.readFile(file.filePath, 'utf8');
          const payload = encKey ? encryptData256(data, encKey) : data;
          await fsP.writeFile(destPath, payload, 'utf8');
          movedFiles.push(destPath);
          console.log(`📦 Processed ${encKey ? '(Encrypted)' : '(Copied)'}: ${file.filePath} → ${destPath}`);
        }
      }
    } catch (err) {
      console.error(`⚠️ Failed to parse combined.json: ${err.message}`);
    }
  }

  const coreMap = {
    'index.html':    'generated/index.main.cpk',
    'combined.json': 'generated/base.bundle.cf',
    'bundle.js':     'generated/lib/libindex.cni',
    'bundle.css':    'generated/lib/libindex.cnui',
  };
  for (const [src, dest] of Object.entries(coreMap)) {
    if (fsSync.existsSync(src)) {
      let data = await fsP.readFile(src, 'utf8');
      if (encKey) { data = encryptData256(data, encKey); console.log(`🔒 Encrypted: ${dest}`); }
      else console.log(`📦 Packaged: ${src} → ${dest}`);
      await fsP.writeFile(dest, data, 'utf8');
      movedFiles.push(dest);
    }
  }

  if (fsSync.existsSync('Resources')) {
    try { await fsP.cp('Resources', 'generated/Resources', { recursive: true }); console.log(`📁 Copied Resources/`); }
    catch (e) { console.warn(`⚠️ Resources copy skipped.`); }
  }
}

/* ==========================================================================
   CLI ROUTER
   ========================================================================== */

async function runCli() {
  const args = process.argv.slice(2);
  const encIndex = args.indexOf('--enc');
  let encKey = null;
  if (encIndex !== -1 && args.length > encIndex + 1) encKey = args[encIndex + 1];

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
⚡ LITHIUM CARBON CLI v4.0  (Babel JSX Engine)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build Commands:
  --carbon-framework --build        Full build → index.html
  --build-json                      Generates combined.json only
  --build-css                       Generates bundle.css
  --build-js                        Generates bundle.js

Sync Commands:
  --sync                            Scans folders, updates Carbon.package / Carbon.build / Carbon.main

View Commands:
  --create-view <name>              Creates PageView (.jsx + .js), wires into AppView, auto-syncs
  --remove-view <name>              Removes PageView, unwires from AppView, auto-syncs

Component Commands  (real ES import/export):
  --create-com <name>               Creates a component under ${CarbonConfig.componentRoot}
                                      Ex: --create-com Greeting  |  --create-com HomeCom/Greeting
  Import:  import { Name } from './Name.jsx';       (relative path)
           import { Name } from '@SubFolder/Name';  ('@' = ${CarbonConfig.componentRoot})
  Export:  export function Name() { return (<jsx/>); }

Encryption:
  --enc <key>                       Encrypt build output
  Ex: node CarbonCli.js --carbon-framework --build --enc MyKey

Package Commands:
  --install --package --js <name>   Installs a JS package
  --install --package --css <name>  Installs a CSS package
  --remove  --package --js <name>   Removes a JS package
  --remove  --package --css <name>  Removes a CSS package

Viewer Commands:
  --show-package                    Print Carbon.package
  --show-build                      Print Carbon.build
  --show-main                       Print Carbon.main

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MIGRATION NOTES (Lithium → Babel JSX Engine)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Old module syntax:
  ImportUi  {Greeting}   From @path;    →  import { Greeting }  from './Greeting.jsx';
  ImportVar {myVar}      From @path;    →  import { myVar }     from './Greeting.jsx';
  ImportFun {GroupBtn}   From @path;    →  import { GroupBtn }  from './Greeting.jsx';
  ExportUi  {Greeting}                  →  export function Greeting() { ... }
  ExportVar {myVar}                     →  export const myVar = ...;
  ExportFun {GroupBtn}                  →  export function GroupBtn() { ... }

Old view/component body:
  var Main = ( <div>...</div> )          →  export function Main() { return ( <div>...</div> ); }

Carbon framework elements (PageView, App, AppBody, VCenter, etc.) still work
as custom HTML tags — no change needed in the JSX markup.

Requires: npm install --save-dev @babel/core @babel/plugin-transform-react-jsx
    `);
    return;
  }

  try {
    if (args.includes('--create-view')) {
      await createView(args[args.indexOf('--create-view') + 1]);
      console.log('\n🔄 Auto-syncing...');
      await syncProjectFiles();
    }
    else if (args.includes('--create-com')) {
      await createComponent(args[args.indexOf('--create-com') + 1]);
    }
    else if (args.includes('--remove-view')) {
      const viewNames = [];
      args.forEach((arg, idx) => {
        if (arg === '--remove-view' && args[idx + 1] && !args[idx + 1].startsWith('--'))
          viewNames.push(args[idx + 1]);
      });
      for (const n of viewNames) await removeView(n);
      console.log('\n🔄 Auto-syncing...');
      await syncProjectFiles();
    }
    else if (args.includes('--sync')) {
      await syncProjectFiles();
    }
    else if (args.includes('--build-css')) {
      await assembleCarbonProject();
      const data = JSON.parse(await fs.readFile('combined.json', 'utf8'));
      await fs.writeFile('bundle.css', await getProjectBundle(data, 'css'), 'utf8');
      console.log('✅ bundle.css created.');
    }
    else if (args.includes('--build-js')) {
      await assembleCarbonProject();
      const data = JSON.parse(await fs.readFile('combined.json', 'utf8'));
      await fs.writeFile('bundle.js', await getProjectBundle(data, 'js'), 'utf8');
      console.log('✅ bundle.js created.');
    }
    else if (args.includes('--build-json')) {
      await assembleCarbonProject();
    }
    else if (args.includes('--show-package')) {
      const c = await fs.readFile('Carbon.package', 'utf8').catch(() => 'File not found.');
      console.log(`\n📄 [Carbon.package]\n${c}`);
    }
    else if (args.includes('--show-build')) {
      const c = await fs.readFile('Carbon.build', 'utf8').catch(() => 'File not found.');
      console.log(`\n📄 [Carbon.build]\n${c}`);
    }
    else if (args.includes('--show-main')) {
      const c = await fs.readFile('Carbon.main', 'utf8').catch(() => 'File not found.');
      console.log(`\n📄 [Carbon.main]\n${c}`);
    }
    else if (args.includes('--carbon-framework') && args.includes('--build')) {
      await buildProject();
    }
    else if (args.includes('--package')) {
      const action  = args.includes('--install') ? '--install' : (args.includes('--remove') ? '--remove' : null);
      const type    = args.includes('--js') ? '--js' : (args.includes('--css') ? '--css' : null);
      const pkgName = args[args.indexOf(type) + 1];
      if (action && type && pkgName) {
        await managePackage(action, type, pkgName);
        console.log('\n🔄 Auto-updating build...');
        await buildProject();
      } else {
        console.error('❌ Syntax: --install|--remove --package --js|--css <name>');
      }
    }
    else {
      console.error('❌ Unknown command. Run --help for options.');
    }

    if (encKey) {
      console.log('\n⚙️  Finalizing build structure...');
      await organizeAndEncryptOutputs(args, encKey);
    }
  } catch (err) {
    console.error('\n🔥 FATAL CRASH:', err);
    process.exit(1);
  }
}

runCli();
