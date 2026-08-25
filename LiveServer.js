#!/usr/bin/env node
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const vm = require('vm');

// ==========================================
// 1. CARBON FORMAT PARSER
// ==========================================
const CarbonFormat = {
    parse(input) {
        if (typeof input !== 'string') return {};
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
                parent.ref.files.push({ name: fileName, path: pathStr, filePath: pathStr ? `${pathStr}/${fileName}` : fileName });
            }
        }
        return root;
    }
};

// ==========================================
// 2. VIRTUAL BUILD HELPERS
// ==========================================
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
        for (const key in node) {
            if (key !== 'files') collect(node[key]);
        }
    }
    collect(current);
    return allFiles;
}

async function bundleFiles(fileList, type) {
    let bundle = '';
    const validExtensions = type === 'css' ? ['.css'] : ['.js', '.jsx'];
    for (const file of fileList) {
        const isCorrectType = validExtensions.some(ext => file.filePath.endsWith(ext));
        if (!isCorrectType) continue;
        try {
            const content = await fs.readFile(file.filePath, 'utf8');
            bundle += type === 'css'
                ? `\n/* Source: ${file.filePath} */\n${content}\n`
                : `\n// Source: ${file.filePath}\n${content}\n`;
        } catch (err) {
            console.error(`[Warning] Missing file during live build: ${file.filePath}`);
        }
    }
    return bundle;
}

/* ==========================================================================
   BABEL JSX ENGINE  —  Replaces old Lithium/CarbonJS regex parser

   Old flow:  .jsx → Lithium regex engine → HTML  (ImportUi/ExportUi)
   New flow:  .jsx → Babel (createPureHtml pragma) → JS → vm execute → HTML
              Real ES import/export during build; fully inlined in index.html
   ========================================================================== */

const CarbonConfig = {
    root: './',
    ext: '.jsx',
    componentRoot: 'Main/Views/Com',
};

// Lazy-load Babel so a missing install gives a clear error message
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
// createPureHtml  —  JSX pragma (replaces React.createElement).
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
// Vue directive/mustache syntax is shielded before Babel sees it.
// ------------------------------------------------------------------
function compileJsx(sourceCode) {
    const babel = getBabelCore();
    const shielded = protectVueSyntax(sourceCode);
    const result = babel.transformSync(shielded, {
        plugins: [
            ['@babel/plugin-transform-react-jsx', {
                runtime: 'classic',
                pragma: 'createPureHtml',
                pragmaFrag: 'createPureHtmlFragment',
                throwIfNamespace: false,
            }],
        ],
        parserOpts: { strictMode: false },
        filename: 'AppView.jsx',
    });
    if (!result || !result.code) throw new Error('Babel returned empty output');
    return result.code;
}

// ------------------------------------------------------------------
// Import/export helpers
// ------------------------------------------------------------------

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

function resolveJsxImportPath(sourceFile, importPath) {
    let p = importPath;
    if (p.startsWith('@')) {
        const rel = path.join(CarbonConfig.componentRoot, p.slice(1).replace(/^\//, ''));
        const resolved = path.resolve(process.cwd(), rel);
        return path.extname(resolved) ? resolved : resolved + CarbonConfig.ext;
    }
    let resolved = path.resolve(path.dirname(sourceFile), p);
    if (!path.extname(resolved)) resolved += CarbonConfig.ext;
    return resolved;
}

function fixUndefinedComponents(compiledCode, knownNames) {
    return compiledCode.replace(
        /createPureHtml\(([A-Z][a-zA-Z0-9]*)\b/g,
        (match, name) => (knownNames.has(name) ? match : `createPureHtml("${name}"`)
    );
}

function extractLocalDefinitions(rawCode) {
    const names = new Set();
    const fnRe  = /(?:export\s+)?function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g;
    const varRe = /(?:export\s+)?(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*=/g;
    let m;
    while ((m = fnRe.exec(rawCode))  !== null) names.add(m[1]);
    while ((m = varRe.exec(rawCode)) !== null) names.add(m[1]);
    return names;
}

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
            const parts   = n.trim().split(/\s+as\s+/);
            const local   = parts[0].trim();
            const exported = (parts[1] || parts[0]).trim();
            return `if (typeof ${local} !== 'undefined') moduleExports['${exported}'] = ${local};`;
        }).join('\n') + '\n';
    });

    return code;
}

// Standard JS globals for every VM context
const JS_GLOBALS = {
    Array, Object, String, Number, Boolean, Math, Date, JSON, RegExp,
    Promise, Map, Set, WeakMap, WeakSet, Symbol, Proxy,
    Error, TypeError, RangeError, SyntaxError, ReferenceError,
    parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent,
    encodeURI, decodeURI,
    setTimeout, clearTimeout, setInterval, clearInterval,
};

// Module cache — cleared before each live build
const _jsxModuleCache = new Map();
const _jsxModuleStack = new Set();

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

        // 2. Babel-compile JSX → JS (pass .js files through unchanged)
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
 * Compiles all .jsx/.js view files to a single HTML string.
 * Replaces the old runLithiumEngine() / getGeneratedRaw() approach.
 * Looks for an exported function named "App" or "HomeUi" as the entry point.
 */
async function compileViewFilesToHtml(viewFileList) {
    // Fresh cache for every live rebuild
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

    const entry = allExports['App'] || allExports['HomeUi'];

    if (!entry) {
        console.warn(
            '⚠️  No "App" or "HomeUi" export found in view files.\n' +
            '    Make sure your entry view file exports a function named App:\n' +
            '      export function App() { return <div>...</div>; }'
        );
        return '<!-- No App component found -->';
    }

    try {
        const html = typeof entry === 'function' ? entry({}) : String(entry);
        return restoreVueSyntax(html.trim());
    } catch (renderErr) {
        console.warn(`⚠️  Render error: ${renderErr.message}`);
        return `<!-- Render error: ${renderErr.message} -->`;
    }
}

// ==========================================
// 3. IN-MEMORY HTML GENERATOR
// ==========================================
async function generateLiveHtml() {
    try {
        const [buildRaw, packageRaw, mainRaw] = await Promise.all([
            fs.readFile('Carbon.build',   'utf8').catch(() => ''),
            fs.readFile('Carbon.package', 'utf8').catch(() => ''),
            fs.readFile('Carbon.main',    'utf8').catch(() => ''),
        ]);

        const data = {
            Build:   CarbonFormat.parse(buildRaw),
            Package: CarbonFormat.parse(packageRaw),
            Main:    CarbonFormat.parse(mainRaw),
        };

        // Bundle all non-view resources virtually (no files written to disk)
        const [
            engineZIndex,
            engineStyle,
            engineCore,
            engineThemes,
            engineDebug,
            prebuiltStyle,
            prebuiltScript,
            packageStyle,
            packageScript,
            mainPre,
            mainThemes,
            mainStyle,
            mainScript,
            mainPostScript,
            TopScript,
            BottomScript,
        ] = await Promise.all([
            bundleFiles(getFilesFromPath(data, 'Build.Engine.ZIndex'),    'css'),
            bundleFiles(getFilesFromPath(data, 'Build.Engine.Style'),     'css'),
            bundleFiles(getFilesFromPath(data, 'Build.Engine.Core'),      'js'),
            bundleFiles(getFilesFromPath(data, 'Build.Engine.Themes'),    'js'),
            bundleFiles(getFilesFromPath(data, 'Build.Engine.Debug'),    'js'),
            bundleFiles(getFilesFromPath(data, 'Build.Engine.Prebuilt'),  'css'),
            bundleFiles(getFilesFromPath(data, 'Build.Engine.Prebuilt'),  'js'),
            bundleFiles(getFilesFromPath(data, 'Package.Package.Style'),  'css'),
            bundleFiles(getFilesFromPath(data, 'Package.Package.Script'), 'js'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.PreScript'),    'js'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.Themes'),       'js'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.Style'),        'css'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.Script'),       'js'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.PostScript'),   'js'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.TopScript'),    'js'),
            bundleFiles(getFilesFromPath(data, 'Main.Main.BottomScript'), 'js'),
        ]);

        // Compile .jsx/.js view files with Babel (SSR — server-side rendering)
        const viewFileList  = getFilesFromPath(data, 'Main.Main.Views');
        const compiledViews = await compileViewFilesToHtml(viewFileList);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Carbon Live Preview</title>
    <style>${engineZIndex}</style>
    <style>${engineStyle}</style>
    <script>${engineThemes}</script>
    <style>${prebuiltStyle}</style>
    <style>${packageStyle}</style>
    <script>${mainThemes}</script>
    <style>${mainStyle}</style>
</head>
<body>

    <script>${TopScript}</script>
    <script>${engineCore}</script>

    <script>${prebuiltScript}</script>
    <script>${packageScript}</script>
    <script>${mainPre}</script>

    <div>
        ${compiledViews}
    </div>

    <!--post script-->
    <script>${mainPostScript}</script>
    <script>${mainScript}</script>
    <script>${BottomScript}</script>
    <script>${engineDebug}</script>
    <script>eruda.init()</script>
    <script>
        const evtSource = new EventSource("/live-reload");
        evtSource.onmessage = () => {
            console.log("⚡ Change detected. Reloading...");
            location.reload();
        };
        evtSource.onerror = () => console.warn("Live Server disconnected. Retrying...");
    </script>

</body>
</html>`;
    } catch (err) {
        return `<h1>Build Error</h1><pre>${err.stack}</pre>`;
    }
}

// ==========================================
// 4. LIVE PREVIEW SERVER & WATCHER
// ==========================================
async function startLiveServer(port = 3000) {
    let clients = [];
    const broadcastReload = () => {
        clients.forEach(res => res.write('data: reload\n\n'));
    };

    const server = http.createServer(async (req, res) => {
        // A. Server-Sent Events connection
        if (req.url === '/live-reload') {
            res.writeHead(200, {
                'Content-Type':  'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection':    'keep-alive',
            });
            clients.push(res);
            req.on('close', () => {
                clients = clients.filter(client => client !== res);
            });
            return;
        }

        // B. Dynamic HTML virtual build
        if (req.url === '/' || req.url === '/index.html') {
            console.log('🛠️  Generating Virtual Build for browser...');
            const html = await generateLiveHtml();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
            return;
        }

        // C. Physical assets (images, raw files, etc.)
        const filePath = path.join(process.cwd(), req.url);
        try {
            const data = await fs.readFile(filePath);
            const ext  = path.extname(filePath);
            const mimes = {
                '.js':  'text/javascript',
                '.css': 'text/css',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
            };
            res.writeHead(200, { 'Content-Type': mimes[ext] || 'text/plain' });
            res.end(data);
        } catch (e) {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    // D. Directory watcher with debounce
    const watchPaths = ['Engine', 'Package', 'Main', 'Carbon.build', 'Carbon.package', 'Carbon.main'];
    let reloadTimeout = null;

    watchPaths.forEach(p => {
        if (fsSync.existsSync(p)) {
            fsSync.watch(p, { recursive: true }, (event, filename) => {
                if (filename) {
                    clearTimeout(reloadTimeout);
                    reloadTimeout = setTimeout(() => {
                        console.log(`\n✨ Change detected: ${filename}. Signaling browser...`);
                        broadcastReload();
                    }, 150);
                }
            });
        }
    });

    server.listen(port, () => {
        console.log('=========================================');
        console.log('🚀 CARBON LIVE SERVER RUNNING');
        console.log(`🔗 Open in browser: http://localhost:${port}`);
        console.log('📂 Watching file system for changes...');
        console.log('=========================================');
    });
}

// Start the server
startLiveServer(process.env.PORT || 3000);
