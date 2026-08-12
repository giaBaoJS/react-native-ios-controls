# Setup

A control cannot live in your app binary. It has to live in a **widget extension**,
which a React Native app does not have. That target — plus the App Group that lets the
two processes talk — is all this page is about.

Use the CLI unless you have a reason not to.

---

## The fast path

```sh
npm install react-native-ios-controls
npx react-native-ios-controls init
cd ios && pod install
```

Preview it first if you like — this writes nothing:

```sh
npx react-native-ios-controls init --dry-run
```

```
Dry run — nothing was written.

  app target            MyApp (com.acme.app)
  extension target      ControlsExtension (com.acme.app.controls)
  app group             group.com.acme.app
  ...
```

Options:

| Flag | Default | |
| --- | --- | --- |
| `--project <path>` | autodetected in `ios/` | Point at the `.xcodeproj` if you have more than one. |
| `--app-group <id>` | `group.<app bundle id>` | Must start with `group.`. |
| `--name <name>` | `ControlsExtension` | Extension target name. |
| `--dry-run` | off | Print the plan and exit. |
| `--force` | off | Re-create a target that already exists. |

The CLI backs up `project.pbxproj` to a timestamped copy before saving, and refuses to
run twice, so it cannot half-apply on a second invocation. It shells out to Ruby and
the `xcodeproj` gem, which ships with CocoaPods.

Finally, call `configure` once on app start:

```ts
import { configure } from 'react-native-ios-controls';

await configure({ appGroup: 'group.com.acme.app' });
```

---

## What it produced

```
ios/
├── ControlsExtension/
│   ├── Controls.swift                 ← yours to edit: declares your controls
│   ├── ControlsExtension.entitlements
│   ├── Info.plist
│   └── RNControlsWidgets.swift        ← library: control templates
├── ReactNativeIosControls/
│   ├── RNControlsConfig.swift         ← generated: your App Group
│   └── RNControlsShared.swift         ← library: store + AppIntents
└── MyApp/
    └── MyApp.entitlements             ← App Group added here too
```

Target membership is the part people get wrong:

| File | App target | Extension target |
| --- | --- | --- |
| `RNControlsConfig.swift` | ✅ | ✅ |
| `RNControlsShared.swift` | ✅ | ✅ |
| `RNControlsWidgets.swift` | ❌ | ✅ |
| `Controls.swift` | ❌ | ✅ |

The two shared files are in **both** targets on purpose. An `AppIntent` with
`openAppWhenRun = true` cannot run inside an extension — iOS fails the press with
`LNContextErrorDomain 2001, "openAppWhenRun is not supported in extensions"` and your
button does nothing at all. Compiling the intent into the app as well lets the system
run it in the app process and bring the app forward.

---

## Manual setup

If you would rather not run the CLI, or it cannot handle your project, here is exactly
what to do. In Xcode, with your workspace open:

### 1. Add the extension target

**File → New → Target → Widget Extension.** Name it `ControlsExtension`. Uncheck
"Include Live Activity" and "Include Configuration App Intent". Activate the scheme if
prompted.

Then on the new target's **General** tab set the minimum deployment to **iOS 18.0**,
and delete the sample `ControlsExtension.swift`/`ControlsExtensionBundle.swift` files
Xcode generated.

### 2. Point the Info.plist at WidgetKit

`ios/ControlsExtension/Info.plist` needs:

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.widgetkit-extension</string>
</dict>
```

Xcode's template already writes this. Verify it — nothing works without it.

### 3. Add the App Group to both targets

**Signing & Capabilities → + Capability → App Groups**, on the app target *and* the
extension target. Add the same identifier to both, e.g. `group.com.acme.app`.

On a real device the group must also exist in your Apple Developer account and be
enabled for both bundle IDs. The Simulator does not check.

### 4. Copy the library's Swift sources

From `node_modules/react-native-ios-controls/ios/ControlWidgets/`:

- `RNControlsShared.swift` → add to **both** targets
- `RNControlsWidgets.swift` → add to the **extension** target only

### 5. Create RNControlsConfig.swift

Add to **both** targets:

```swift
enum RNControlsConfig {
  static let appGroup = "group.com.acme.app"
}
```

### 6. Declare your controls

Create `Controls.swift` in the **extension** target only:

```swift
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct FocusControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    rnToggleControl(
      kind: "focus",
      displayName: "Focus",
      description: "Turn Focus on or off.",
      defaultState: RNControlState(
        value: false,
        title: "Focus",
        sfSymbol: "moon.fill",
        tint: "#7C5CFF"
      )
    )
  }
}

@available(iOS 18.0, *)
struct QuickCaptureControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    rnButtonControl(
      kind: "quickCapture",
      displayName: "Quick Capture",
      description: "Open the app and start a note.",
      defaultState: RNControlState(title: "Capture", sfSymbol: "bolt.fill")
    )
  }
}

@main
@available(iOS 18.0, *)
struct ControlsExtensionBundle: WidgetBundle {
  var body: some Widget {
    FocusControl()
    QuickCaptureControl()
  }
}
```

`defaultState` is what the add-a-control gallery shows before your app has written
anything. Everything in it can be overridden at runtime from JavaScript.

### 7. Check the extension is embedded

App target → **Build Phases** → **Embed Foundation Extensions** should list
`ControlsExtension.appex`. Xcode adds this with the target; if it is missing the
control never appears in the gallery.

---

## Verify it

1. Build and run on an iOS 18+ simulator or device.
2. Swipe down from the top-right corner to open Control Center.
3. Press and hold, tap **Add a Control**, search for your control's `displayName`.
4. Tap it to place it, tap outside the grid, then press it.

Your app should receive a `ControlEvent` the next time it is active.

If the control is missing, or renders as a blank circle, see the troubleshooting
section in the [README](../README.md#troubleshooting) — the blank-circle case in
particular is almost always a build with `CODE_SIGNING_ALLOWED=NO`, which strips the
entitlements that make the App Group real.

---

## A working reference

`example/` in this repository is a complete integration produced by this exact CLI. If
something is not lining up, diff your project against it.
