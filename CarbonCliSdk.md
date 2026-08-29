# CarbonCliSdk
`CarbonCliSdk` is `android application` building tools of `Carbon Framework`.

## Important

Brfore using `CarbonCliSdk` run this command 
```bash
npm run build
```

## 1. Folder structure

```
your-project/
├── index.html                  # your web app entry point (used by --android-build)
├── resources/                  # optional web assets (used by --android-build)
├── .carbon-cli.lock            # transient lock file, auto-removed when a command finishes
└── Android/
    ├── AndroidManifest.config  # EDIT THIS — plain manifest XML, synced to the project
    ├── AndroidConfig.json      # EDIT THIS — plain JSON, synced to the project
    ├── .carbon-state.json      # internal: last-synced config snapshot
    ├── .carbon-sync.log        # internal: history of install/sync/build/rollback actions
    ├── .backup/                # internal: automatic pre-write snapshot (used by --rollback)
    ├── build/
    │   └── <projectName>.zip   # output of --android-build, ready for Android Studio
    └── project/                # the actual Android Studio project
        └── app/
            ├── build.gradle
            ├── proguard-rules.pro
            └── src/main/
                ├── AndroidManifest.xml
                ├── assets/               # index.html + resources/ land here
                ├── java/com/name/projectName/   # your package's Java sources
                └── res/values/
                    ├── strings.xml       # app_name
                    ├── colors.xml        # theme colors
                    └── styles.xml        # fullscreen / action bar / title toggles
```

**Rule of thumb:** you only ever hand-edit `Android/AndroidManifest.config` and `Android/AndroidConfig.json`. Everything under `Android/project/` is generated/managed — `--sync` will overwrite the managed parts of it.

---

## 2. `AndroidManifest.config` syntax

This is real manifest XML — not a special format — with a few fields the CLI actively manages. Anything else you add (new activities, extra `<meta-data>`, permissions declared some other way, intent filters, labels, etc.) is left alone and copied through to the project as-is on `--sync`.

### Managed fields

| Field | Where it lives in the XML | Driven by |
|---|---|---|
| Package name | `<manifest package="...">` | `AndroidConfig.json → packageName` |
| SDK key | `<meta-data android:name="carbon_sdk_key" android:value="..."/>` inside `<application>` | `AndroidConfig.json → sdkKey` |
| Orientation | `android:screenOrientation="..."` on the `.MainActivity` `<activity>` | `AndroidConfig.json → orientation` |
| Permissions | `<uses-permission android:name="..."/>` elements | `AndroidConfig.json → permissions[]` (additive only — the CLI never removes a permission you already have) |

### Example (fully resolved, after install)

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.acme.weatherapp">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">

        <meta-data
            android:name="carbon_sdk_key"
            android:value="MY_API_KEY_123" />

        <activity
            android:name=".MainActivity"
            android:screenOrientation="unspecified"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>
</manifest>
```

### Template tags (only present *before* `--install-android` renders them)

`{{PACKAGE_NAME}}`, `{{ANDROID_PERMISSIONS}}`, `{{ORIENTATION}}`, `{{SDK_KEY}}` — you never need to type these yourself; they're resolved once at install time. After that, `AndroidManifest.config` is plain, valid XML.

### Orientation values accepted in `AndroidConfig.json`

| `AndroidConfig.json` value | Rendered as `android:screenOrientation` |
|---|---|
| `auto` / `unspecified` | `unspecified` |
| `portrait` | `portrait` |
| `landscape` | `landscape` |
| `reverse_portrait` | `reversePortrait` |
| `reverse_landscape` | `reverseLandscape` |
| `sensor_portrait` | `sensorPortrait` |
| `sensor_landscape` | `sensorLandscape` |
| `sensor` | `sensor` |
| `full_sensor` | `fullSensor` |
| `locked` | `locked` |

---

## 3. `AndroidConfig.json` syntax

Fully resolved plain JSON — no template tags remain after install. This is validated (types, ranges, package-name shape, color format, SDK ordering) before every write.

```json
{
  "projectName": "Weather App",
  "packageName": "com.acme.weatherapp",
  "applicationId": "com.acme.weatherapp",
  "namespace": "com.acme.weatherapp",
  "sdkKey": "MY_API_KEY_123",

  "compileSdk": 34,
  "minSdkVersion": 24,
  "targetSdkVersion": 34,
  "versionCode": 1,
  "versionName": "1.0.0",

  "orientation": "unspecified",
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE"
  ],

  "theme": {
    "primaryColor": "#2196F3",
    "primaryDarkColor": "#1976D2",
    "accentColor": "#FF4081",
    "controlHighlightColor": "#332196F3",
    "controlNormalColor": "#61000000"
  },

  "build": {
    "debug": false,
    "r8Obfuscate": true,
    "stringFog": false,
    "proguard": true,
    "proguardRules": [
      "-keep class com.acme.weatherapp.** { *; }"
    ],
    "codeShrinkerRules": []
  },

  "ui": {
    "fullscreen": false,
    "windowActionBar": true,
    "windowTitle": true
  }
}
```

### Field reference & defaults

| Field                         | Type     | Required | Validation                                                                           | Typical default             |
| ----------------------------- | -------- | -------- | ------------------------------------------------------------------------------------ | --------------------------- |
| `projectName`                 | string   | ✅        | non-empty                                                                            | your app's display name     |
| `packageName`                 | string   | ✅        | `com.name.projectName` shape (`^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`)               | set at install time         |
| `applicationId`               | string   | optional | same shape as `packageName` if present                                               | falls back to `packageName` |
| `namespace`                   | string   | optional | same shape as `packageName` if present                                               | falls back to `packageName` |
| `sdkKey`                      | string   | ✅        | non-empty                                                                            | set at install time         |
| `compileSdk`                  | integer  | ✅        | positive whole number, ≥ `targetSdkVersion`                                          | `34`                        |
| `minSdkVersion`               | integer  | ✅        | positive whole number, ≤ `targetSdkVersion`                                          | `21`–`24`                   |
| `targetSdkVersion`            | integer  | ✅        | positive whole number, between `minSdkVersion` and `compileSdk`                      | `34`                        |
| `versionCode`                 | integer  | ✅        | positive whole number                                                                | `1`                         |
| `versionName`                 | string   | ✅        | non-empty                                                                            | `"1.0.0"`                   |
| `orientation`                 | string   | optional | one of the values in the orientation table above                                     | `auto`                      |
| `permissions`                 | string[] | optional | no duplicates, no empty strings                                                      | `[]`                        |
| `theme.primaryColor`          | string   | ✅        | hex `#RRGGBB` or `#AARRGGBB`                                                         | `#2196F3`                   |
| `theme.primaryDarkColor`      | string   | ✅        | hex `#RRGGBB`/`#AARRGGBB`                                                            | `#1976D2`                   |
| `theme.accentColor`           | string   | ✅        | hex `#RRGGBB`/`#AARRGGBB`                                                            | `#FF4081`                   |
| `theme.controlHighlightColor` | string   | ✅        | hex `#RRGGBB`/`#AARRGGBB`                                                            | `#332196F3`                 |
| `theme.controlNormalColor`    | string   | ✅        | hex `#RRGGBB`/`#AARRGGBB`                                                            | `#61000000`                 |
| `build.debug`                 | boolean  | ✅        | —                                                                                    | `false`                     |
| `build.r8Obfuscate`           | boolean  | ✅        | drives `minifyEnabled` in `build.gradle`                                             | `true`                      |
| `build.stringFog`             | boolean  | ✅        | —                                                                                    | `false`                     |
| `build.proguard`              | boolean  | ✅        | if true (or `r8Obfuscate` is true), `proguardRules`/`codeShrinkerRules` get appended | `true`                      |
| `build.proguardRules`         | string[] | optional | array of strings                                                                     | `[]`                        |
| `build.codeShrinkerRules`     | string[] | optional | array of strings                                                                     | `[]`                        |
| `ui.fullscreen`               | boolean  | ✅        | drives `windowFullscreen`                                                            | `false`                     |
| `ui.windowActionBar`          | boolean  | ✅        | —                                                                                    | `true`                      |
| `ui.windowTitle`              | boolean  | ✅        | —                                                                                    | `true`                      |

**Ordering rule enforced by validation:** `minSdkVersion ≤ targetSdkVersion ≤ compileSdk`. A violation is reported as a single clear error rather than a half-applied write.

---

## 4. Commands

### `--install-android <com.name.projectName> <apiKeyName>`

Scaffolds a brand-new `Android/` folder: unzips the bundled template, renders `AndroidManifest.config` + `AndroidConfig.json` for your package name and SDK key, and physically relocates the Java sources into that package. Fails cleanly (removes any partial `Android/` folder) if anything goes wrong.

**When to use it:** once, the first time you wrap a web app for Android.

```bash
node CarbonCliSdk --install-android com.acme.weatherapp MY_API_KEY_123
```

### `--sync [--dry-run] [--force]`

Re-reads both config files and pushes any differences into the real project (`AndroidManifest.xml`, `build.gradle`, `strings.xml`, `colors.xml`, `styles.xml`, `proguard-rules.pro`). If `packageName` changed, Java sources are re-packaged (moved + rewritten) automatically. Free-form manifest edits (new activities, extra meta-data, changed labels, etc.) are copied through even if none of the managed fields moved.

- `--dry-run` — preview the change list, write nothing.
- `--force` — reapply every managed field even if it already matches what's on disk (useful if you suspect drift, or after restoring an old backup by hand).

**When to use it:** every time you edit `AndroidManifest.config` or `AndroidConfig.json`.

```bash
# see what would change first
node CarbonCliSdk --sync --dry-run

# apply it
node CarbonCliSdk --sync

# force every managed field to be rewritten
node CarbonCliSdk --sync --force
```

### `--android-build`

Copies `index.html` and `resources/` from the current directory into the project's `assets/` folder, then zips the whole Android project into `Android/build/<projectName>.zip`. The zip is re-opened and checked for entries before being reported as ready.

**When to use it:** whenever your web app changed and you want a fresh Android Studio–ready project, or right before shipping a build.

```bash
node CarbonCliSdk --android-build
# -> Android/build/WeatherApp.zip
```

Then in Android Studio: unzip it, **File → Open**, select the unzipped folder.

### `--rollback`

Restores `Android/project`, `Android/AndroidManifest.config`, and internal state from the automatic backup taken before the most recent `--sync` or `--android-build`. `AndroidConfig.json` is deliberately left untouched (it's your source-of-truth file).

**When to use it:** a `--sync` or `--android-build` broke something and you want to undo it before re-editing and re-running.

```bash
node CarbonCliSdk --rollback
```

### `--help`

```bash
node CarbonCliSdk --help
```

---

## 5. Edit examples

### Add a permission

Edit `Android/AndroidConfig.json`:

```json
"permissions": [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.CAMERA"
]
```

Then:

```bash
node CarbonCliSdk --sync
```

```
✔ Synced the following changes into the Android project:
  - + permission android.permission.CAMERA
```

Permissions are additive-only through `AndroidConfig.json` — removing an entry from the array will **not** remove the `<uses-permission>` line from the manifest. To remove one, delete it directly from `Android/AndroidManifest.config` instead.

### Change orientation

`AndroidConfig.json`:

```json
"orientation": "landscape"
```

```bash
node CarbonCliSdk --sync
```

```
✔ Synced the following changes into the Android project:
  - orientation: unspecified -> landscape
```

### Rotate the SDK key

`AndroidConfig.json`:

```json
"sdkKey": "NEW_KEY_456"
```

```bash
node CarbonCliSdk --sync
```

### Rename the package

`AndroidConfig.json`:

```json
"packageName": "com.acme.weatherapp2"
```

```bash
node CarbonCliSdk --sync
```

This re-packages every Java source file (moves + rewrites package declarations/imports) and updates the manifest, `build.gradle`, etc. — the biggest single change `--sync` can make, so it's worth a `--dry-run` first:

```bash
node CarbonCliSdk --sync --dry-run
```

> Note: only `AndroidConfig.json` drives the package name. If you hand-edit `package="..."` directly in `AndroidManifest.config`, `--sync` will overwrite it back to whatever `AndroidConfig.json.packageName` says — change the JSON, not the manifest, to rename the package.

### Free-form manifest edit (e.g. add a second activity)

Edit `Android/AndroidManifest.config` directly — this is just XML:

```xml
<activity
    android:name=".SettingsActivity"
    android:exported="false"
    android:label="Settings" />
```

```bash
node CarbonCliSdk --sync
```

```
✔ Synced the following changes into the Android project:
  - manifest: free-form edits copied to project
```

The manifest is checked for balanced tags before being written; a malformed edit is rejected (and rolled back) rather than saved.

### Change the theme colors

`AndroidConfig.json`:

```json
"theme": {
  "primaryColor": "#4CAF50",
  "primaryDarkColor": "#388E3C",
  "accentColor": "#FFC107",
  "controlHighlightColor": "#334CAF50",
  "controlNormalColor": "#61000000"
}
```

```bash
node CarbonCliSdk --sync
```

### Toggle fullscreen / hide the action bar

`AndroidConfig.json`:

```json
"ui": {
  "fullscreen": true,
  "windowActionBar": false,
  "windowTitle": false
}
```

```bash
node CarbonCliSdk --sync
```

---

## 6. Proguard rules

Rules are **append-only** — `--sync` never removes an existing rule from `proguard-rules.pro`, it only adds ones that aren't already present. Rules are only applied if `build.proguard` or `build.r8Obfuscate` is `true`.

`AndroidConfig.json`:

```json
"build": {
  "r8Obfuscate": true,
  "proguard": true,
  "proguardRules": [
    "-keep class com.acme.weatherapp.model.** { *; }",
    "-keepattributes Signature",
    "-dontwarn okhttp3.**"
  ],
  "codeShrinkerRules": [
    "-keep class com.acme.weatherapp.jsbridge.** { *; }"
  ]
}
```

```bash
node CarbonCliSdk --sync
```

```
✔ Synced the following changes into the Android project:
  - + 4 proguard rule(s)
```

`proguardRules` and `codeShrinkerRules` are just concatenated and appended — split them however makes sense to you (e.g. keep `codeShrinkerRules` for shrinker-specific rules like keeping your JS bridge classes, and `proguardRules` for general keep/dontwarn rules).

---

## 7. Safety notes

- Every write-capable command (`--sync`, `--android-build`) takes an automatic backup of `Android/project`, `Android/AndroidManifest.config`, and internal state before touching anything, and rolls back automatically if it fails partway through.
- `AndroidConfig.json` is validated before any write — a bad value is reported as one clear error, never a half-applied change.
- `AndroidManifest.xml` rewrites are checked for balanced tags before being saved.
- A lock file (`.carbon-cli.lock`) stops two commands from running against the same `Android/` folder at once; a stale lock from a crashed process is detected and cleared automatically.
- Every action (attempted or successful) is appended to `Android/.carbon-sync.log`.
