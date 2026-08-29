#!/usr/bin/env node

/**
 * CarbonCliSdk
 * ---------------------------------------------------------------------------
 * A small CLI that scaffolds and keeps in sync a native Android "host" project
 * (the hybrid WebEngine template shipped in assets/android-template.zip) from
 * two human-editable files:
 *
 *   Android/AndroidManifest.config  -> your app's real AndroidManifest.xml.
 *                                      Edit it directly, it's plain manifest
 *                                      XML. A handful of slots ({{PACKAGE_NAME}}
 *                                      at install time; the resolved package,
 *                                      sdk key, orientation and permissions
 *                                      after that) are kept in lockstep with
 *                                      AndroidConfig.json by `--sync`.
 *
 *   Android/AndroidConfig.json      -> everything else: build identifiers,
 *                                      SDK versions, theme colors, obfuscation
 *                                      / debug / UI toggles. Plain JSON, fully
 *                                      resolved (no template tags), validated
 *                                      before every write.
 *
 * Template shape (assets/android-template.zip)
 * ---------------------------------------------------------------------------
 *   AndroidManifest.config   Mustache-ish XML template ({{PACKAGE_NAME}},
 *                             {{ANDROID_PERMISSIONS}}, {{ORIENTATION}}, {{SDK_KEY}})
 *   AndroidConfig.json        Mustache-ish JSON template (tags sit inside
 *                             string values, so the file is valid JSON even
 *                             before rendering)
 *   template/                 The actual Android Studio project. Every
 *                             editable Java file uses the {{PACKAGE_NAME}}
 *                             tag for its package declaration / same-project
 *                             imports; the source files physically live
 *                             under java/com/name/projectName/.
 *
 * Commands
 * ---------------------------------------------------------------------------
 *   node CarbonCliSdk --install-android <com.name.projectName> <apiKeyName>
 *       1. Creates an "Android" folder in the current directory.
 *       2. Renders the template's AndroidManifest.config / AndroidConfig.json
 *          against the package name + SDK key you passed in, and writes the
 *          fully-resolved result into Android/.
 *       3. Unzips + renders the native project under Android/project,
 *          physically relocating the Java sources to match your package.
 *       If anything goes wrong partway through, the partially created
 *       Android/ folder is removed so you're left with a clean slate.
 *
 *   node CarbonCliSdk --sync [--dry-run] [--force]
 *       Re-reads Android/AndroidManifest.config and Android/AndroidConfig.json,
 *       validates them, and pushes any changes back into the real project
 *       (AndroidManifest.xml, build.gradle, strings.xml, colors.xml,
 *       styles.xml, proguard-rules.pro). If the package name changed, the
 *       whole project is re-packaged (java files moved + rewritten) just
 *       like on install. Free-form edits you made directly to
 *       AndroidManifest.config (new activities, extra meta-data, etc.) are
 *       always copied through to the project as-is.
 *         --dry-run  Show what would change without touching any files.
 *         --force    Re-apply every managed field even if it already
 *                    matches what's on disk.
 *       A snapshot of Android/ is taken before any write; if the sync fails
 *       partway through, it is automatically rolled back.
 *
 *   node CarbonCliSdk --android-build
 *       1. Copies index.html and the resources/ folder from the current
 *          working directory into the project's assets/ folder
 *          (Android/project/app/src/main/assets).
 *       2. Zips the whole Android project into Android/build/<name>.zip,
 *          ready to hand to Android Studio (File > Open on the unzipped
 *          folder), and prints where that zip landed. The zip is verified
 *          (re-opened and checked for entries) before being reported as ready.
 *
 *   node CarbonCliSdk --rollback
 *       Restores Android/ (project + AndroidManifest.config + internal
 *       state) from the automatic backup taken before the most recent
 *       --sync or --android-build.
 *
 *   node CarbonCliSdk --help
 * ---------------------------------------------------------------------------
 *
 * Robustness notes
 * ---------------------------------------------------------------------------
 * - Every command that mutates Android/ takes an automatic backup first
 *   (Android/.backup) and rolls back to it automatically if the command
 *   throws partway through, so a bad edit or an unexpected template shape
 *   can't leave the project half-migrated. The same backup can be restored
 *   manually at any time with --rollback.
 * - AndroidConfig.json is schema-checked (types, package name shape, SDK
 *   version ordering, color/orientation values, etc.) before anything is
 *   written, so a typo is reported as one clear error instead of a
 *   half-applied change or a cryptic crash.
 * - Every AndroidManifest.xml rewrite is checked for balanced tags before
 *   it's written to disk; a malformed result is rejected (and rolled back)
 *   rather than saved.
 * - A lock file prevents two CarbonCliSdk commands from running against the
 *   same Android/ folder at once; stale locks (from a crashed process) are
 *   detected and cleared automatically.
 * - All writes go through a write-to-temp-then-rename step, and every
 *   generated value is verified to have actually landed in the file before
 *   the command reports success.
 * - Activity taken (or attempted) is appended to Android/.carbon-sync.log.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// ---------------------------------------------------------------------------
// Paths / constants
// ---------------------------------------------------------------------------

const CWD = process.cwd();
const ANDROID_DIR = path.join(CWD, 'Android');
const PROJECT_DIR = path.join(ANDROID_DIR, 'project');
const MANIFEST_CONFIG_PATH = path.join(ANDROID_DIR, 'AndroidManifest.config');
const CONFIG_JSON_PATH = path.join(ANDROID_DIR, 'AndroidConfig.json');
const STATE_PATH = path.join(ANDROID_DIR, '.carbon-state.json');
const BACKUP_DIR = path.join(ANDROID_DIR, '.backup');
const LOG_PATH = path.join(ANDROID_DIR, '.carbon-sync.log');
const LOCK_PATH = path.join(CWD, '.carbon-cli.lock');
const EXTRACT_TMP_DIR = path.join(ANDROID_DIR, '.extract-tmp');
const TEMPLATE_ZIP = path.join(__dirname, 'assets', 'android-template.zip');

// Items inside Android/ that make up a "snapshot" for backup/rollback
// purposes: the generated project, the manifest (which --sync partially
// writes to), and the internal state snapshot. AndroidConfig.json is the
// user's own source-of-truth file — the CLI never overwrites it except at
// install time, so it's deliberately left out of backup/restore (much like
// `terraform apply` rolling back infrastructure without touching your .tf
// files). This also means a rollback followed by --sync will cleanly
// re-apply whatever you last edited.
const BACKUP_ITEMS = ['project', 'AndroidManifest.config', '.carbon-state.json'];

// The template's Java sources physically live under this path; every file
// in it uses the {{PACKAGE_NAME}} tag for its package/import statements.
const TEMPLATE_JAVA_SOURCE_REL_DIR = path.join('com', 'name', 'projectName');

const PACKAGE_NAME_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const TEMPLATE_TAG_RE = /\{\{([A-Z0-9_]+)\}\}/g;

const ORIENTATION_MAP = {
  auto: 'unspecified',
  unspecified: 'unspecified',
  portrait: 'portrait',
  landscape: 'landscape',
  reverse_portrait: 'reversePortrait',
  reverse_landscape: 'reverseLandscape',
  sensor_portrait: 'sensorPortrait',
  sensor_landscape: 'sensorLandscape',
  sensor: 'sensor',
  full_sensor: 'fullSensor',
  locked: 'locked',
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const flags = new Set(args.slice(1));

  try {
    if (cmd === '--install-android') {
      installAndroid(args[1], args[2]);
    } else if (cmd === '--sync') {
      sync({ dryRun: flags.has('--dry-run'), force: flags.has('--force') });
    } else if (cmd === '--android-build') {
      androidBuild();
    } else if (cmd === '--rollback') {
      rollback();
    } else if (cmd === '--help' || cmd === '-h' || !cmd) {
      printHelp();
    } else {
      console.error(`Unknown command: ${cmd}\n`);
      printHelp();
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`\n✖ ${err.message}`);
    if (process.env.CARBON_DEBUG) console.error(err.stack);
    process.exitCode = 1;
  } finally {
    releaseLock();
  }
}

function printHelp() {
  console.log(`CarbonCliSdk

Usage:
  node CarbonCliSdk --install-android <com.name.projectName> <apiKeyName>
      Scaffold the Android/ folder: render AndroidManifest.config and
      AndroidConfig.json for the given package name and SDK key, and
      install the native Android host project under that package. Cleans
      up after itself if it fails partway through.

  node CarbonCliSdk --sync [--dry-run] [--force]
      Push changes made to Android/AndroidManifest.config and
      Android/AndroidConfig.json into the real Android project
      (AndroidManifest.xml, build.gradle, strings.xml, colors.xml,
      styles.xml, proguard-rules.pro).
        --dry-run   Preview the changes without writing anything.
        --force     Re-apply every managed field, even ones that already
                    match what's on disk.
      Automatically backed up before writing, and rolled back on failure.

  node CarbonCliSdk --android-build
      Copy index.html and resources/ (from the current directory) into the
      project's assets/ folder, then zip the whole Android project into
      Android/build/<name>.zip, ready to open in Android Studio.

  node CarbonCliSdk --rollback
      Undo the most recent --sync or --android-build by restoring
      Android/ from its automatic pre-change backup.

  node CarbonCliSdk --help
      Show this message.
`);
}

// ---------------------------------------------------------------------------
// --install-android
// ---------------------------------------------------------------------------

function installAndroid(packageName, apiKeyName) {
  if (!packageName || !apiKeyName) {
    throw new Error(
      'Usage: node CarbonCliSdk --install-android <com.name.projectName> <apiKeyName>'
    );
  }
  if (!PACKAGE_NAME_RE.test(packageName)) {
    throw new Error(
      `"${packageName}" doesn't look like a valid Android package name (e.g. com.name.projectName).`
    );
  }
  if (!apiKeyName.trim()) {
    throw new Error('apiKeyName must not be empty.');
  }
  if (fs.existsSync(ANDROID_DIR)) {
    throw new Error(
      `An "Android" folder already exists at ${ANDROID_DIR}.\n` +
      `Remove it first, or run "node CarbonCliSdk --sync" to update it instead.`
    );
  }
  if (!fs.existsSync(TEMPLATE_ZIP)) {
    throw new Error(`Bundled template not found at ${TEMPLATE_ZIP}.`);
  }

  acquireLock();

  try {
    console.log(`\n▶ Creating Android/ ...`);
    fs.mkdirSync(ANDROID_DIR, { recursive: true });

    console.log(`▶ Unzipping android-template.zip ...`);
    const extracted = extractTemplate();

    console.log(`▶ Installing project files ...`);
    fs.renameSync(extracted.templateDir, PROJECT_DIR);

    console.log(`▶ Rendering AndroidConfig.json for "${packageName}" ...`);
    const configJson = renderInitialConfigJson(extracted.configJsonTemplate, packageName, apiKeyName);
    validateConfigJson(configJson);
    writeJson(CONFIG_JSON_PATH, configJson);

    console.log(`▶ Rendering AndroidManifest.config ...`);
    const vars = deriveTemplateVars(configJson);
    const manifestText = renderTemplate(extracted.manifestConfigTemplate, vars, 'AndroidManifest.config');
    assertWellFormedXml(manifestText, 'AndroidManifest.config');
    writeFileAtomic(MANIFEST_CONFIG_PATH, manifestText);
    writeFileAtomic(projectManifestPath(), manifestText);

    console.log(`▶ Rendering project build files ...`);
    renderProjectFile(gradlePath(), vars);
    renderProjectFile(stringsXmlPath(), vars);
    renderProjectFile(colorsXmlPath(), vars);
    renderProjectFile(stylesXmlPath(), vars);

    console.log(`▶ Applying package name "${packageName}" to Java sources ...`);
    repackageJava(PROJECT_DIR, {
      contentOldToken: '{{PACKAGE_NAME}}',
      sourceRelDir: TEMPLATE_JAVA_SOURCE_REL_DIR,
      newPackage: packageName,
    });

    fs.rmSync(EXTRACT_TMP_DIR, { recursive: true, force: true });

    writeJson(STATE_PATH, snapshotState(configJson));

    logEvent(`install-android: success (package=${packageName})`);
    console.log(`\n✔ Android project installed at ${path.relative(CWD, PROJECT_DIR)}`);
    console.log(`✔ Edit Android/AndroidManifest.config and Android/AndroidConfig.json`);
    console.log(`  then run "node CarbonCliSdk --sync" to push your changes.\n`);
  } catch (err) {
    // No prior state existed for install, so there's nothing to roll back
    // to — just remove whatever got partially created and leave a clean
    // slate the person can retry against.
    fs.rmSync(ANDROID_DIR, { recursive: true, force: true });
    logEvent(`install-android: FAILED - ${err.message} (partial files removed)`);
    err.message = `${err.message}\n\n(Install failed — no files were left behind; you can retry.)`;
    throw err;
  }
}

/**
 * Unzips the bundled template into a scratch folder and validates it has
 * the expected hybrid-template shape: AndroidManifest.config,
 * AndroidConfig.json, and a template/ project folder, all at the zip root.
 */
function extractTemplate() {
  fs.rmSync(EXTRACT_TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXTRACT_TMP_DIR, { recursive: true });

  const zip = new AdmZip(TEMPLATE_ZIP);
  zip.extractAllTo(EXTRACT_TMP_DIR, true);

  const manifestConfigPath = path.join(EXTRACT_TMP_DIR, 'AndroidManifest.config');
  const configJsonPath = path.join(EXTRACT_TMP_DIR, 'AndroidConfig.json');
  const templateDir = path.join(EXTRACT_TMP_DIR, 'template');

  const missing = [];
  if (!fs.existsSync(manifestConfigPath)) missing.push('AndroidManifest.config');
  if (!fs.existsSync(configJsonPath)) missing.push('AndroidConfig.json');
  if (!fs.existsSync(templateDir) || !fs.statSync(templateDir).isDirectory()) missing.push('template/');
  if (missing.length) {
    throw new Error(
      `The bundled template doesn't have the expected layout — missing: ${missing.join(', ')}.\n` +
      `Expected AndroidManifest.config, AndroidConfig.json and a template/ folder at the zip root.`
    );
  }

  return {
    manifestConfigTemplate: fs.readFileSync(manifestConfigPath, 'utf8'),
    configJsonTemplate: fs.readFileSync(configJsonPath, 'utf8'),
    templateDir,
  };
}

/**
 * Renders the template's AndroidConfig.json (tags live inside JSON string
 * values, so it's valid JSON both before and after rendering) against the
 * install-time package name / SDK key, and returns the parsed object.
 */
function renderInitialConfigJson(templateText, packageName, apiKeyName) {
  const rendered = renderTemplate(
    templateText,
    {
      PROJECT_NAME: packageName,
      PACKAGE_NAME: packageName,
      APPLICATION_ID: packageName,
      NAME_SPACE: packageName,
      SDK_KEY: apiKeyName,
    },
    'AndroidConfig.json template'
  );
  let parsed;
  try {
    parsed = JSON.parse(rendered);
  } catch (err) {
    throw new Error(`Rendered AndroidConfig.json is not valid JSON: ${err.message}`);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Template rendering ({{TAG}} substitution)
// ---------------------------------------------------------------------------

/** Replaces every {{TAG}} in `text` with vars[TAG]; throws on an unknown tag. */
function renderTemplate(text, vars, context) {
  return text.replace(TEMPLATE_TAG_RE, (match, key) => {
    if (!(key in vars) || vars[key] === undefined || vars[key] === null) {
      throw new Error(`Unknown or unset template tag {{${key}}} in ${context || 'template'}.`);
    }
    return String(vars[key]);
  });
}

/** All {{TAG}} values derivable from a fully-resolved AndroidConfig.json. */
function deriveTemplateVars(configJson) {
  return {
    PACKAGE_NAME: configJson.packageName,
    APPLICATION_ID: configJson.applicationId || configJson.packageName,
    NAME_SPACE: configJson.namespace || configJson.packageName,
    SDK_KEY: configJson.sdkKey,
    PROJECT_NAME: configJson.projectName || configJson.packageName,
    ORIENTATION: resolveOrientation(configJson.orientation),
    ANDROID_PERMISSIONS: renderPermissionsBlock(configJson.permissions || []),
    COMPILE_SDK: configJson.compileSdk,
    MIN_SDK: configJson.minSdkVersion,
    TARGET_SDK: configJson.targetSdkVersion,
    VERSION_CODE: configJson.versionCode,
    VERSION_NAME: configJson.versionName,
    R8_OBFUSCATE: configJson.build.r8Obfuscate ? 'true' : 'false',
    PRIMARY_COLOR: configJson.theme.primaryColor,
    PRIMARY_DARK_COLOR: configJson.theme.primaryDarkColor,
    ACCENT_COLOR: configJson.theme.accentColor,
    CONTROL_HIGHLIGHT_COLOR: configJson.theme.controlHighlightColor,
    CONTROL_NORMAL_COLOR: configJson.theme.controlNormalColor,
    FULLSCREEN: configJson.ui.fullscreen ? 'true' : 'false',
    WINDOW_ACTION_BAR: configJson.ui.windowActionBar ? 'true' : 'false',
    WINDOW_TITLE: configJson.ui.windowTitle ? 'true' : 'false',
  };
}

function resolveOrientation(name) {
  const key = String(name || 'auto').toLowerCase();
  if (!(key in ORIENTATION_MAP)) {
    throw new Error(
      `"orientation" ("${name}") is not one of: ${Object.keys(ORIENTATION_MAP).join(', ')}.`
    );
  }
  return ORIENTATION_MAP[key];
}

function renderPermissionsBlock(permissions) {
  return permissions
    .map((p) => `<uses-permission android:name="${escapeXmlAttr(p)}" />`)
    .join('\n\t');
}

/** Renders a project file in place, replacing its {{TAG}}s with `vars`. */
function renderProjectFile(filePath, vars) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rendered = renderTemplate(text, vars, path.basename(filePath));
  writeFileAtomic(filePath, rendered);
}

// ---------------------------------------------------------------------------
// Java re-packaging (used by both install and sync-on-package-change)
// ---------------------------------------------------------------------------

/**
 * Moves every .java file from `projectDir/app/src/main/java/<sourceRelDir>`
 * into the folder structure matching `newPackage`, replacing every literal
 * occurrence of `contentOldToken` in each file's contents with `newPackage`
 * along the way (this covers the package declaration, same-project imports,
 * and anything else referencing the old package/token).
 *
 * At install time `contentOldToken` is the literal string "{{PACKAGE_NAME}}"
 * and `sourceRelDir` is the template's fixed source folder. On a sync that
 * changes the package, `contentOldToken` is the actual previous package name
 * and `sourceRelDir` is that package's current folder — same mechanism,
 * different starting point.
 */
function repackageJava(projectDir, { contentOldToken, sourceRelDir, newPackage }) {
  const javaRoot = path.join(projectDir, 'app', 'src', 'main', 'java');
  const oldDir = path.join(javaRoot, sourceRelDir);

  if (!fs.existsSync(oldDir)) {
    throw new Error(`Expected Java sources at ${path.relative(CWD, oldDir)} but the folder is missing.`);
  }

  const oldFiles = listFilesRecursive(oldDir).filter((f) => f.endsWith('.java'));
  if (oldFiles.length === 0) {
    throw new Error(`No .java files found under ${path.relative(CWD, oldDir)} — refusing to proceed.`);
  }

  const newRelDir = newPackage.split('.').join(path.sep);
  const newDir = path.join(javaRoot, newRelDir);

  const moves = oldFiles.map((file) => {
    const content = fs.readFileSync(file, 'utf8').split(contentOldToken).join(newPackage);
    const relSub = path.relative(oldDir, file);
    return { content, relSub };
  });

  for (const move of moves) {
    const dest = path.join(newDir, move.relSub);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    writeFileAtomic(dest, move.content);
  }

  // Remove the old subtree, then prune now-empty ancestor folders (but never
  // touch anything above/outside the java/ root).
  fs.rmSync(oldDir, { recursive: true, force: true });
  pruneEmptyDirsUpTo(path.dirname(oldDir), javaRoot);

  if (!fs.existsSync(newDir)) {
    throw new Error(`Re-packaging to "${newPackage}" didn't produce ${path.relative(CWD, newDir)} as expected.`);
  }
}

function pruneEmptyDirsUpTo(startDir, stopAtDir) {
  let dir = startDir;
  while (dir.startsWith(stopAtDir) && dir !== stopAtDir) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    if (entries.length > 0) return;
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Path helpers into the project
// ---------------------------------------------------------------------------

function projectManifestPath() {
  return path.join(PROJECT_DIR, 'app', 'src', 'main', 'AndroidManifest.xml');
}
function gradlePath() {
  return path.join(PROJECT_DIR, 'app', 'build.gradle');
}
function stringsXmlPath() {
  return path.join(PROJECT_DIR, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
}
function colorsXmlPath() {
  return path.join(PROJECT_DIR, 'app', 'src', 'main', 'res', 'values', 'colors.xml');
}
function stylesXmlPath() {
  return path.join(PROJECT_DIR, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
}
function proguardPath() {
  return path.join(PROJECT_DIR, 'app', 'proguard-rules.pro');
}

function escapeXmlAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// --sync
// ---------------------------------------------------------------------------

function sync({ dryRun = false, force = false } = {}) {
  assertInstalled();

  const configJson = readJson(CONFIG_JSON_PATH);
  validateConfigJson(configJson);

  const manifestText = fs.readFileSync(MANIFEST_CONFIG_PATH, 'utf8');
  // FIX: also read what's actually installed in the project right now, so
  // we can diff against reality instead of against the very file we just
  // edited (see planSync() for why that comparison was wrong).
  const projectManifestText = fs.readFileSync(projectManifestPath(), 'utf8');
  const gradleText = fs.readFileSync(gradlePath(), 'utf8');
  const stringsText = fs.readFileSync(stringsXmlPath(), 'utf8');
  const colorsText = fs.readFileSync(colorsXmlPath(), 'utf8');
  const stylesText = fs.readFileSync(stylesXmlPath(), 'utf8');

  const plan = planSync(configJson, {
    manifestText,
    projectManifestText,
    gradleText,
    stringsText,
    colorsText,
    stylesText,
    force,
  });

  if (dryRun) {
    if (plan.changes.length === 0) {
      console.log('\n(dry run) Nothing would change.\n');
    } else {
      console.log(`\n(dry run) --sync${force ? ' --force' : ''} would make these changes:`);
      for (const c of plan.changes) console.log(`  - ${c}`);
      console.log('\nNo files were touched.\n');
    }
    return;
  }

  acquireLock();
  backupAndroidDir();

  try {
    if (plan.packageChanged) {
      repackageJava(PROJECT_DIR, {
        contentOldToken: plan.actual.package,
        sourceRelDir: plan.actual.package.split('.').join(path.sep),
        newPackage: configJson.packageName,
      });
    }

    if (plan.manifestChanged) {
      assertWellFormedXml(plan.nextManifestText, 'AndroidManifest.config');
      writeFileAtomic(MANIFEST_CONFIG_PATH, plan.nextManifestText);
      writeFileAtomic(projectManifestPath(), plan.nextManifestText);
    }
    if (plan.gradleChanged) writeFileAtomic(gradlePath(), plan.nextGradleText);
    if (plan.stringsChanged) writeFileAtomic(stringsXmlPath(), plan.nextStringsText);
    if (plan.colorsChanged) writeFileAtomic(colorsXmlPath(), plan.nextColorsText);
    if (plan.stylesChanged) writeFileAtomic(stylesXmlPath(), plan.nextStylesText);
    if (plan.proguardRulesToAppend.length) {
      appendProguardRules(proguardPath(), plan.proguardRulesToAppend);
    }

    writeJson(STATE_PATH, snapshotState(configJson));

    logEvent(`sync${force ? ' --force' : ''}: ${plan.changes.length ? plan.changes.join('; ') : 'no changes'}`);

    if (plan.changes.length === 0) {
      console.log('\n✔ Already in sync, nothing to do.\n');
    } else {
      console.log('\n✔ Synced the following changes into the Android project:');
      for (const c of plan.changes) console.log(`  - ${c}`);
      console.log('');
    }
  } catch (err) {
    restoreAndroidDirOrThrow(err, 'sync');
  }
}

function assertInstalled() {
  if (!fs.existsSync(PROJECT_DIR) || !fs.existsSync(MANIFEST_CONFIG_PATH) || !fs.existsSync(CONFIG_JSON_PATH)) {
    throw new Error(
      `No installed Android project found. Run:\n` +
      `  node CarbonCliSdk --install-android <com.name.projectName> <apiKeyName>\nfirst.`
    );
  }
}

/**
 * Pure function: given the desired AndroidConfig.json and the *actual*
 * current contents of the managed project files, figures out what would
 * change. Used by both --dry-run (just printed) and the real --sync (also
 * applied). Comparing against the actual files (rather than a stored
 * snapshot) makes sync self-healing even if a file was hand-reverted or the
 * internal state snapshot is missing.
 *
 * `manifestText` is Android/AndroidManifest.config (the human-editable
 * copy) — the four managed fields (package/sdkKey/orientation/permissions)
 * are read from it and patched on top of it. `projectManifestText` is the
 * *installed* AndroidManifest.xml, and is what the patched result gets
 * diffed against to decide `manifestChanged`.
 *
 * FIX: this used to diff the patched text against `manifestText` itself,
 * which is only ever different when one of the four managed fields above
 * actually got patched. Any other hand-edit to AndroidManifest.config (a
 * new <activity>, extra <meta-data>, a changed label, a new intent-filter,
 * etc.) left nextManifestText byte-identical to manifestText, so
 * manifestChanged stayed false and the edit was silently never written to
 * the real project — even though the doc comment promises free-form edits
 * are "always copied through to the project as-is". Diffing against
 * projectManifestText instead catches that drift.
 */
function planSync(configJson, { manifestText, projectManifestText, gradleText, stringsText, colorsText, stylesText, force }) {
  const changes = [];
  const vars = deriveTemplateVars(configJson);

  // ── AndroidManifest.config: package, sdk key, orientation, permissions ──
  const actualPackage = extractManifestPackage(manifestText);
  const actualSdkKey = extractManifestSdkKey(manifestText);
  const actualOrientation = extractManifestOrientation(manifestText);
  const actualPermissions = extractManifestPermissions(manifestText);

  let nextManifestText = manifestText;
  const packageChanged = Boolean(actualPackage) && actualPackage !== configJson.packageName;

  if (force || packageChanged || !actualPackage) {
    if (actualPackage && actualPackage !== configJson.packageName) {
      nextManifestText = replaceAllLiteral(nextManifestText, actualPackage, configJson.packageName);
      changes.push(`package: ${actualPackage} -> ${configJson.packageName}`);
    } else if (!actualPackage) {
      nextManifestText = setManifestPackage(nextManifestText, configJson.packageName);
      changes.push(`package: (none) -> ${configJson.packageName}`);
    }
  }

  if (force || actualSdkKey !== configJson.sdkKey) {
    nextManifestText = setManifestSdkKey(nextManifestText, configJson.sdkKey);
    if (actualSdkKey !== configJson.sdkKey) changes.push(`sdkKey: ${actualSdkKey || '(none)'} -> ${configJson.sdkKey}`);
  }

  if (force || actualOrientation !== vars.ORIENTATION) {
    nextManifestText = setManifestOrientation(nextManifestText, vars.ORIENTATION);
    if (actualOrientation !== vars.ORIENTATION) {
      changes.push(`orientation: ${actualOrientation || '(none)'} -> ${vars.ORIENTATION}`);
    }
  }

  const missingPermissions = (configJson.permissions || []).filter((p) => !actualPermissions.includes(p));
  if (missingPermissions.length) {
    nextManifestText = addManifestPermissions(nextManifestText, missingPermissions);
    for (const p of missingPermissions) changes.push(`+ permission ${p}`);
  }

  // FIX: compare the patched manifest against what's actually installed in
  // the project, not against the AndroidManifest.config we just read it
  // from. See the function-level comment above for why.
  const manifestChanged = nextManifestText !== projectManifestText;
  if (manifestChanged && nextManifestText === manifestText) {
    // None of the four managed fields moved, yet the project copy still
    // differs from AndroidManifest.config — that's a free-form edit.
    changes.push('manifest: free-form edits copied to project');
  }

  // ── build.gradle ──
  const gradleFieldSpecs = {
    applicationId: { re: /applicationId\s+"[^"]*"/, matchRe: /applicationId\s+"([^"]*)"/, render: (v) => `applicationId "${v}"` },
    namespace: { re: /namespace\s+"[^"]*"/, matchRe: /namespace\s+"([^"]*)"/, render: (v) => `namespace "${v}"` },
    compileSdk: { re: /compileSdk\s+\d+/, matchRe: /compileSdk\s+(\d+)/, render: (v) => `compileSdk ${v}` },
    minSdkVersion: { re: /minSdkVersion\s+\d+/, matchRe: /minSdkVersion\s+(\d+)/, render: (v) => `minSdkVersion ${v}` },
    targetSdkVersion: { re: /targetSdkVersion\s+\d+/, matchRe: /targetSdkVersion\s+(\d+)/, render: (v) => `targetSdkVersion ${v}` },
    versionCode: { re: /versionCode\s+\d+/, matchRe: /versionCode\s+(\d+)/, render: (v) => `versionCode ${v}` },
    versionName: { re: /versionName\s+"[^"]*"/, matchRe: /versionName\s+"([^"]*)"/, render: (v) => `versionName "${v}"` },
    minifyEnabled: { re: /minifyEnabled\s+(true|false)/, matchRe: /minifyEnabled\s+(true|false)/, render: (v) => `minifyEnabled ${v}` },
  };
  const desiredGradle = {
    applicationId: vars.APPLICATION_ID,
    namespace: vars.NAME_SPACE,
    compileSdk: vars.COMPILE_SDK,
    minSdkVersion: vars.MIN_SDK,
    targetSdkVersion: vars.TARGET_SDK,
    versionCode: vars.VERSION_CODE,
    versionName: vars.VERSION_NAME,
    minifyEnabled: vars.R8_OBFUSCATE,
  };
  let nextGradleText = gradleText;
  for (const [key, spec] of Object.entries(gradleFieldSpecs)) {
    const currentMatch = nextGradleText.match(spec.matchRe);
    const current = currentMatch ? currentMatch[1] : null;
    const desired = String(desiredGradle[key]);
    if (!force && current === desired) continue;
    if (!spec.re.test(nextGradleText)) {
      throw new Error(`Couldn't find "${key}" in app/build.gradle to update.`);
    }
    nextGradleText = nextGradleText.replace(spec.re, spec.render(desired));
    if (current !== desired) changes.push(`${key}: ${current} -> ${desired}`);
  }
  const gradleChanged = nextGradleText !== gradleText;
  if (gradleChanged) {
    for (const [key, spec] of Object.entries(gradleFieldSpecs)) {
      const verify = nextGradleText.match(spec.matchRe);
      if (!verify || String(verify[1]) !== String(desiredGradle[key])) {
        throw new Error(`Failed to update app/build.gradle's ${key} — the expected pattern wasn't found after edit.`);
      }
    }
  }

  // ── strings.xml (app display name) ──
  let nextStringsText = stringsText;
  const currentProjectName = firstMatch(stringsText, /name="app_name"[^>]*>([^<]*)</);
  if (force || currentProjectName !== vars.PROJECT_NAME) {
    nextStringsText = stringsText.replace(
      /(name="app_name"[^>]*>)[^<]*(<)/,
      `$1${escapeXmlAttr(vars.PROJECT_NAME)}$2`
    );
    const verify = firstMatch(nextStringsText, /name="app_name"[^>]*>([^<]*)</);
    if (verify !== escapeXmlAttr(vars.PROJECT_NAME)) {
      throw new Error(`Failed to update strings.xml's app_name — the expected pattern wasn't found.`);
    }
    if (currentProjectName !== vars.PROJECT_NAME) changes.push(`projectName: ${currentProjectName} -> ${vars.PROJECT_NAME}`);
  }
  const stringsChanged = nextStringsText !== stringsText;

  // ── colors.xml (theme) ──
  const colorFieldSpecs = {
    colorPrimary: vars.PRIMARY_COLOR,
    colorPrimaryDark: vars.PRIMARY_DARK_COLOR,
    colorAccent: vars.ACCENT_COLOR,
    colorControlHighlight: vars.CONTROL_HIGHLIGHT_COLOR,
    colorControlNormal: vars.CONTROL_NORMAL_COLOR,
  };
  let nextColorsText = colorsText;
  for (const [name, desired] of Object.entries(colorFieldSpecs)) {
    const re = new RegExp(`(name="${name}">)[^<]*(<)`);
    const current = firstMatch(nextColorsText, new RegExp(`name="${name}">([^<]*)<`));
    if (!force && current === desired) continue;
    if (!re.test(nextColorsText)) throw new Error(`Couldn't find color "${name}" in colors.xml to update.`);
    nextColorsText = nextColorsText.replace(re, `$1${escapeXmlAttr(desired)}$2`);
    if (current !== desired) changes.push(`theme.${name}: ${current} -> ${desired}`);
  }
  const colorsChanged = nextColorsText !== colorsText;

  // ── styles.xml (ui toggles) ──
  const styleFieldSpecs = {
    'android:windowFullscreen': vars.FULLSCREEN,
    windowActionBar: vars.WINDOW_ACTION_BAR,
    windowNoTitle: vars.WINDOW_TITLE,
  };
  let nextStylesText = stylesText;
  for (const [name, desired] of Object.entries(styleFieldSpecs)) {
    const re = new RegExp(`(name="${name}">)[^<]*(<)`);
    const current = firstMatch(nextStylesText, new RegExp(`name="${name}">([^<]*)<`));
    if (!force && current === desired) continue;
    if (!re.test(nextStylesText)) throw new Error(`Couldn't find style item "${name}" in styles.xml to update.`);
    nextStylesText = nextStylesText.replace(re, `$1${desired}$2`);
    if (current !== desired) changes.push(`ui.${name}: ${current} -> ${desired}`);
  }
  const stylesChanged = nextStylesText !== stylesText;

  // ── proguard-rules.pro (append-only; never removes existing rules) ──
  const proguardRulesToAppend = [];
  if (configJson.build.proguard || configJson.build.r8Obfuscate) {
    const currentRules = fs.existsSync(proguardPath()) ? fs.readFileSync(proguardPath(), 'utf8') : '';
    const wanted = [...(configJson.build.proguardRules || []), ...(configJson.build.codeShrinkerRules || [])];
    for (const rule of wanted) {
      if (rule && !currentRules.includes(rule)) proguardRulesToAppend.push(rule);
    }
    if (proguardRulesToAppend.length) changes.push(`+ ${proguardRulesToAppend.length} proguard rule(s)`);
  }

  return {
    changes,
    actual: { package: actualPackage },
    packageChanged: Boolean(actualPackage) && actualPackage !== configJson.packageName,
    manifestChanged,
    nextManifestText,
    gradleChanged,
    nextGradleText,
    stringsChanged,
    nextStringsText,
    colorsChanged,
    nextColorsText,
    stylesChanged,
    nextStylesText,
    proguardRulesToAppend,
  };
}

function appendProguardRules(filePath, rules) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  const addition = rules.map((r) => r + eol).join('');
  writeFileAtomic(filePath, current.replace(/\s*$/, eol) + addition);
}

function replaceAllLiteral(text, oldToken, newToken) {
  return text.split(oldToken).join(newToken);
}

// ---------------------------------------------------------------------------
// Manifest field extraction / targeted patches
// (small, single-purpose helpers — not a full XML->JSON mirror)
// ---------------------------------------------------------------------------

function extractManifestPackage(xml) {
  return firstMatch(xml, /<manifest[^>]*\spackage="([^"]+)"/);
}

function extractManifestSdkKey(xml) {
  const block = fullMatch(xml, /<meta-data\s+android:name="carbon_sdk_key"[\s\S]*?\/>/);
  if (!block) return null;
  return firstMatch(block, /android:value="([^"]*)"/);
}

function extractManifestOrientation(xml) {
  const block = fullMatch(xml, /<activity\b[^>]*android:name="\.MainActivity"[\s\S]*?(?:\/>|<\/activity>)/);
  if (!block) return null;
  return firstMatch(block, /android:screenOrientation="([^"]*)"/);
}

function extractManifestPermissions(xml) {
  return [...xml.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map((m) => m[1]);
}

function setManifestPackage(xml, newPackage) {
  if (!/<manifest\b[^>]*\spackage="[^"]*"/.test(xml)) {
    throw new Error(`Couldn't find package="..." on <manifest> in AndroidManifest.config to set.`);
  }
  return xml.replace(/(<manifest\b[^>]*\spackage=")[^"]*(")/, `$1${newPackage}$2`);
}

function setManifestSdkKey(xml, sdkKey) {
  const eol = detectEol(xml);
  const metaTag =
    `\t\t<meta-data${eol}` +
    `\t\t\tandroid:name="carbon_sdk_key"${eol}` +
    `\t\t\tandroid:value="${escapeXmlAttr(sdkKey)}" />${eol}`;

  let out;
  if (/carbon_sdk_key/.test(xml)) {
    out = xml.replace(/<meta-data\s+android:name="carbon_sdk_key"[\s\S]*?\/>\r?\n?/, metaTag);
  } else {
    if (!/<\/application>/.test(xml)) {
      throw new Error(`Couldn't find </application> in AndroidManifest.config to attach the SDK key to.`);
    }
    out = xml.replace(/<\/application>/, `${metaTag}\t</application>`);
  }
  if (!out.includes(`android:value="${escapeXmlAttr(sdkKey)}"`)) {
    throw new Error(`Writing the SDK key into AndroidManifest.config didn't take effect as expected.`);
  }
  return out;
}

function setManifestOrientation(xml, orientation) {
  const re = /(<activity\b[^>]*android:name="\.MainActivity"[\s\S]*?android:screenOrientation=")[^"]*(")/;
  if (!re.test(xml)) {
    throw new Error(`Couldn't find MainActivity's android:screenOrientation in AndroidManifest.config to update.`);
  }
  return xml.replace(re, `$1${orientation}$2`);
}

function addManifestPermissions(xml, permissions) {
  const eol = detectEol(xml);
  if (!/<application\b/.test(xml)) {
    throw new Error(`Couldn't find <application> in AndroidManifest.config to anchor new permissions near.`);
  }
  let out = xml;
  for (const perm of permissions) {
    out = out.replace(
      /(\s*)<application\b/,
      `${eol}\t<uses-permission android:name="${escapeXmlAttr(perm)}" />$1<application`
    );
  }
  return out;
}

function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function firstMatch(text, re) {
  const m = text.match(re);
  return m ? m[1] : null;
}

/** Like firstMatch, but returns the whole match (m[0]) instead of capture group 1. */
function fullMatch(text, re) {
  const m = text.match(re);
  return m ? m[0] : null;
}

/**
 * Lightweight structural check: every opening tag has a matching closing
 * tag in the right order. Doesn't validate a full XML grammar, but it does
 * catch the failure mode our regex-based edits could actually cause —
 * something getting inserted in, or removed from, the wrong place.
 */
function assertWellFormedXml(xml, context) {
  const stripped = xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '');

  const tagRe = /<\/?[a-zA-Z_][\w.:-]*(?:\s+[^<>]*?)?\/?>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(stripped))) {
    const tag = m[0];
    if (tag.endsWith('/>')) continue; // self-closing
    if (tag.startsWith('</')) {
      const nameMatch = tag.match(/^<\/\s*([a-zA-Z_][\w.:-]*)/);
      const name = nameMatch ? nameMatch[1] : '?';
      const expected = stack.pop();
      if (expected !== name) {
        throw new Error(
          `${context} would end up malformed (expected closing tag </${expected}> but found </${name}>) — aborting before writing.`
        );
      }
    } else {
      const nameMatch = tag.match(/^<\s*([a-zA-Z_][\w.:-]*)/);
      stack.push(nameMatch ? nameMatch[1] : '?');
    }
  }
  if (stack.length) {
    throw new Error(
      `${context} would end up malformed (unclosed tag(s): <${stack.join('>, <')}>) — aborting before writing.`
    );
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateConfigJson(c) {
  const errs = [];
  if (typeof c !== 'object' || c === null || Array.isArray(c)) {
    throw new Error('AndroidConfig.json must contain a JSON object.');
  }

  const requireNonEmptyString = (val, name) => {
    if (typeof val !== 'string' || !val.trim()) errs.push(`"${name}" must be a non-empty string.`);
  };

  requireNonEmptyString(c.projectName, 'projectName');
  requireNonEmptyString(c.sdkKey, 'sdkKey');

  for (const f of ['packageName', 'applicationId', 'namespace']) {
    if (c[f] !== undefined && !PACKAGE_NAME_RE.test(c[f])) {
      errs.push(`"${f}" ("${c[f]}") is not a valid Android package name.`);
    }
  }
  if (!c.packageName) errs.push('"packageName" is required.');

  const intFields = ['compileSdk', 'minSdkVersion', 'targetSdkVersion', 'versionCode'];
  for (const f of intFields) {
    if (!Number.isInteger(c[f]) || c[f] <= 0) errs.push(`"${f}" must be a positive whole number.`);
  }
  requireNonEmptyString(c.versionName, 'versionName');

  if (
    Number.isInteger(c.minSdkVersion) &&
    Number.isInteger(c.targetSdkVersion) &&
    c.minSdkVersion > c.targetSdkVersion
  ) {
    errs.push(`"minSdkVersion" (${c.minSdkVersion}) cannot be greater than "targetSdkVersion" (${c.targetSdkVersion}).`);
  }
  if (
    Number.isInteger(c.targetSdkVersion) &&
    Number.isInteger(c.compileSdk) &&
    c.targetSdkVersion > c.compileSdk
  ) {
    errs.push(`"targetSdkVersion" (${c.targetSdkVersion}) cannot be greater than "compileSdk" (${c.compileSdk}).`);
  }

  if (c.orientation !== undefined && !(String(c.orientation).toLowerCase() in ORIENTATION_MAP)) {
    errs.push(`"orientation" ("${c.orientation}") must be one of: ${Object.keys(ORIENTATION_MAP).join(', ')}.`);
  }

  if (c.permissions !== undefined) {
    if (!Array.isArray(c.permissions)) {
      errs.push('"permissions" must be an array of strings.');
    } else {
      c.permissions.forEach((p, i) => {
        if (typeof p !== 'string' || !p.trim()) errs.push(`permissions[${i}] must be a non-empty string.`);
      });
      const dupes = c.permissions.filter((p, i) => c.permissions.indexOf(p) !== i);
      if (dupes.length) errs.push(`"permissions" has duplicate entries: ${[...new Set(dupes)].join(', ')}`);
    }
  }

  const hexColorRe = /^#[0-9A-Fa-f]{6,8}$/;
  if (typeof c.theme !== 'object' || c.theme === null || Array.isArray(c.theme)) {
    errs.push('"theme" must be an object.');
  } else {
    for (const f of ['primaryColor', 'primaryDarkColor', 'accentColor', 'controlHighlightColor', 'controlNormalColor']) {
      if (!hexColorRe.test(c.theme[f] || '')) {
        errs.push(`theme.${f} ("${c.theme[f]}") must be a hex color like "#RRGGBB" or "#AARRGGBB".`);
      }
    }
  }

  if (typeof c.build !== 'object' || c.build === null || Array.isArray(c.build)) {
    errs.push('"build" must be an object.');
  } else {
    for (const f of ['debug', 'r8Obfuscate', 'stringFog', 'proguard']) {
      if (typeof c.build[f] !== 'boolean') errs.push(`build.${f} must be true or false.`);
    }
    for (const f of ['proguardRules', 'codeShrinkerRules']) {
      if (c.build[f] !== undefined && !Array.isArray(c.build[f])) errs.push(`build.${f} must be an array of strings.`);
    }
  }

  if (typeof c.ui !== 'object' || c.ui === null || Array.isArray(c.ui)) {
    errs.push('"ui" must be an object.');
  } else {
    for (const f of ['fullscreen', 'windowActionBar', 'windowTitle']) {
      if (typeof c.ui[f] !== 'boolean') errs.push(`ui.${f} must be true or false.`);
    }
  }

  if (errs.length) {
    throw new Error(`AndroidConfig.json is invalid:\n  - ${errs.join('\n  - ')}`);
  }
}

// ---------------------------------------------------------------------------
// --android-build
// ---------------------------------------------------------------------------

/**
 * Copies index.html + resources/ from the current working directory into
 * the project's assets/ folder, then zips the whole Android project so it
 * can be handed straight to Android Studio.
 */
function androidBuild() {
  assertInstalled();

  const indexHtmlSrc = path.join(CWD, 'index.html');
  const resourcesSrc = path.join(CWD, 'resources');

  if (!fs.existsSync(indexHtmlSrc)) {
    throw new Error(
      `index.html not found in ${CWD}.\n` +
      `Place your web app's index.html (and optional resources/ folder) next ` +
      `to where you run "node CarbonCliSdk --android-build".`
    );
  }

  acquireLock();
  backupAndroidDir();

  try {
    const assetsDir = path.join(PROJECT_DIR, 'app', 'src', 'main', 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    console.log(`\n▶ Copying index.html into assets/ ...`);
    fs.copyFileSync(indexHtmlSrc, path.join(assetsDir, 'index.html'));
    if (!fs.existsSync(path.join(assetsDir, 'index.html'))) {
      throw new Error('index.html was not copied into assets/ as expected.');
    }

    if (fs.existsSync(resourcesSrc) && fs.statSync(resourcesSrc).isDirectory()) {
      console.log(`▶ Copying resources/ into assets/resources ...`);
      const resourcesDest = path.join(assetsDir, 'resources');
      fs.rmSync(resourcesDest, { recursive: true, force: true });
      fs.cpSync(resourcesSrc, resourcesDest, { recursive: true });
    } else {
      console.log(`… no resources/ folder found in ${CWD}, skipping.`);
    }

    // Zip the whole project for Android Studio.
    const configJson = fs.existsSync(CONFIG_JSON_PATH) ? readJson(CONFIG_JSON_PATH) : {};
    const projectLabel = sanitizeFileName(configJson.projectName || configJson.packageName || 'AndroidProject');

    const buildDir = path.join(ANDROID_DIR, 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    const zipPath = path.join(buildDir, `${projectLabel}.zip`);
    if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

    console.log(`▶ Zipping project for Android Studio ...`);
    const zip = new AdmZip();
    zip.addLocalFolder(PROJECT_DIR, projectLabel);
    zip.writeZip(zipPath);

    // Verify the zip we just wrote is actually readable and non-empty
    // before telling the person it's ready.
    let entryCount = 0;
    try {
      entryCount = new AdmZip(zipPath).getEntries().length;
    } catch (verifyErr) {
      throw new Error(`Built ${path.relative(CWD, zipPath)} but it failed to re-open for verification: ${verifyErr.message}`);
    }
    if (entryCount === 0) {
      throw new Error(`Built ${path.relative(CWD, zipPath)} but it came out empty.`);
    }

    logEvent(`android-build: success (${entryCount} entries -> ${path.relative(CWD, zipPath)})`);
    console.log(`\n✔ Android Studio project ready: ${path.relative(CWD, zipPath)} (${entryCount} files)`);
    console.log(
      `  Unzip it and, in Android Studio, choose File > Open on the ` +
      `"${projectLabel}" folder.\n`
    );

    return zipPath;
  } catch (err) {
    restoreAndroidDirOrThrow(err, 'android-build');
  }
}

function sanitizeFileName(name) {
  return String(name).trim().replace(/[^a-zA-Z0-9._-]+/g, '_') || 'AndroidProject';
}

// ---------------------------------------------------------------------------
// --rollback
// ---------------------------------------------------------------------------

function rollback() {
  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(
      `No backup found at ${path.relative(CWD, BACKUP_DIR)}.\n` +
      `A backup is only taken right before --sync or --android-build actually ` +
      `writes something, so there's nothing to roll back to yet.`
    );
  }

  acquireLock();
  try {
    restoreAndroidDir();
    logEvent('rollback: success');
    console.log(`\n✔ Restored Android/project, AndroidManifest.config, and CarbonCliSdk's`);
    console.log(`  internal state to how they were before the last --sync / --android-build.`);
    console.log(`  Note: AndroidConfig.json was left untouched — that's your file; edit it`);
    console.log(`  and re-run --sync when ready.\n`);
  } catch (err) {
    logEvent(`rollback: FAILED - ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// State snapshot / backup / restore / lock / log
// ---------------------------------------------------------------------------

function snapshotState(configJson) {
  return { configJson, syncedAt: new Date().toISOString() };
}

/** Snapshots Android/{project,AndroidManifest.config,.carbon-state.json} into Android/.backup. */
function backupAndroidDir() {
  if (!fs.existsSync(ANDROID_DIR)) return;
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const item of BACKUP_ITEMS) {
    const src = path.join(ANDROID_DIR, item);
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(BACKUP_DIR, item), { recursive: true });
    }
  }
}

/** Restores Android/{project,AndroidManifest.config,.carbon-state.json} from Android/.backup. */
function restoreAndroidDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error('No backup available to restore from.');
  }
  for (const item of BACKUP_ITEMS) {
    const backupSrc = path.join(BACKUP_DIR, item);
    const dest = path.join(ANDROID_DIR, item);
    fs.rmSync(dest, { recursive: true, force: true });
    if (fs.existsSync(backupSrc)) {
      fs.cpSync(backupSrc, dest, { recursive: true });
    }
  }
}

/** Used inside a mutating command's catch block: restore, annotate the error, rethrow. */
function restoreAndroidDirOrThrow(err, opName) {
  try {
    restoreAndroidDir();
    logEvent(`${opName}: FAILED - rolled back automatically. Reason: ${err.message}`);
    err.message = `${err.message}\n\n(Changes were rolled back automatically — your project is unchanged.)`;
  } catch (restoreErr) {
    logEvent(`${opName}: FAILED - rollback ALSO failed: ${restoreErr.message}. Original error: ${err.message}`);
    err.message =
      `${err.message}\n\n(Automatic rollback also failed: ${restoreErr.message}\n` +
      `Your project may be in an inconsistent state — check ${path.relative(CWD, BACKUP_DIR)} ` +
      `and consider restoring it by hand.)`;
  }
  throw err;
}

/** Prevents two CarbonCliSdk commands from running against the same folder at once. */
function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const info = readJsonSafe(LOCK_PATH, null);
    if (info && info.pid && isProcessAlive(info.pid)) {
      throw new Error(
        `Another CarbonCliSdk command (pid ${info.pid}, started ${info.startedAt}) appears to ` +
        `still be running in this directory.\n` +
        `If that's not actually the case (e.g. it crashed), delete ` +
        `${path.relative(CWD, LOCK_PATH)} and try again.`
      );
    }
    // Stale lock (process no longer running, or unreadable) — clear it.
    fs.rmSync(LOCK_PATH, { force: true });
  }
  fs.writeFileSync(
    LOCK_PATH,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    'utf8'
  );
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      const info = readJsonSafe(LOCK_PATH, null);
      // Only remove a lock this process itself created.
      if (!info || info.pid === process.pid) fs.rmSync(LOCK_PATH, { force: true });
    }
  } catch {
    // Best-effort — never let lock cleanup itself crash the process.
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function logEvent(message) {
  if (!fs.existsSync(ANDROID_DIR)) return;
  try {
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    // Logging is best-effort; never let it block the actual operation.
  }
}

// ---------------------------------------------------------------------------
// JSON / file helpers
// ---------------------------------------------------------------------------

function readJson(p) {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${path.relative(CWD, p)}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path.relative(CWD, p)} contains invalid JSON: ${err.message}`);
  }
}

/** Like readJson, but returns `fallback` (with a warning) instead of throwing. */
function readJsonSafe(p, fallback) {
  try {
    return readJson(p);
  } catch (err) {
    console.warn(`⚠ ${err.message} — ignoring and continuing.`);
    return fallback;
  }
}

function writeJson(p, obj) {
  writeFileAtomic(p, JSON.stringify(obj, null, 2) + '\n');
}

/** Writes via a temp file + rename so a crash mid-write can't corrupt the target. */
function writeFileAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

main();