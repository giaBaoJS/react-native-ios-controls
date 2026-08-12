# Changelog

## 0.1.0

First release.

### Added

- **Runtime TurboModule** — `configure`, `setControlState`, `getControlState`,
  `reloadControls`, `getInitialControlEvent`, `addControlEventListener`,
  `refreshControlEvents` and `isSupported`, for driving iOS 18 `ControlWidget`
  controls from JavaScript.
- **Swift drop-in** for the widget extension: `rnToggleControl`, `rnButtonControl` and
  `rnSilentButtonControl` templates whose title, symbol, tint and value come from App
  Group storage, plus the `SetValueIntent` and `AppIntent` types behind them.
- **Setup CLI** — `npx react-native-ios-controls init` adds the widget extension
  target, its Info.plist and entitlements, the App Group on both targets, and the
  library's Swift sources with the correct target memberships. Backs up
  `project.pbxproj`, supports `--dry-run`, and refuses to run twice.
- **Event delivery** through the App Group queue, buffered for listeners that attach
  late and de-duplicated by event id, with cold-start presses reported by
  `getInitialControlEvent()`.
- **Android and iOS < 18 no-ops** — every call resolves, `getControlState` yields
  `null`, listeners never fire, and `isSupported` is `false`.
- **Example app** demonstrating a Focus toggle and a Quick Capture button, with live
  state, runtime restyling and an event stream.

### Known limitations

- Controls must be declared statically in Swift; a `kind` cannot be created at
  runtime.
- A widget extension target is required — there is no in-app-binary alternative.
- `reloadControls` is budgeted and coalesced by WidgetKit, so it is a request rather
  than a guarantee of an immediate re-render.
- Events are queued, not pushed: a toggle flipped while the app is suspended is
  delivered when the app is next active. The queue keeps 32 events.
- Verified on the iOS Simulator (iOS 26.3 runtime) and not yet on physical hardware,
  where the App Group must additionally exist in your Apple Developer account.
