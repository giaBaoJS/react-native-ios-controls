# react-native-ios-controls example

A working integration of the library, and the reference to diff against when your own
setup misbehaves. Its `ios/` directory was produced by running
`npx react-native-ios-controls init` — nothing in it was hand-assembled.

It ships two controls:

| Control | `kind` | Type | On press |
| --- | --- | --- | --- |
| Focus | `focus` | toggle | Runs a `SetValueIntent`, emits a `toggle` event |
| Quick Capture | `quickCapture` | button | Opens the app, emits a `press` event |

The app shows each control's live state, lets you change its title, SF Symbol and tint
at runtime, and streams the events coming back from Control Center.

## Run it

You need an **iOS 18+** simulator or device. Controls do not exist below iOS 18.

```sh
yarn                      # from the repo root
cd example/ios && pod install && cd ..
yarn start                # Metro on 8081
yarn ios
```

Android also builds and runs — every library call is a no-op there, and the app says
so instead of pretending:

```sh
cd android && ./gradlew assembleDebug
```

> Build with normal simulator signing. `CODE_SIGNING_ALLOWED=NO` strips entitlements,
> which silently turns the App Group into a private store: the controls render as
> blank circles and no event ever arrives.

## Try the whole loop

1. Swipe down from the top-right corner to open Control Center.
2. Press and hold, tap **Add a Control**, search for **Focus**, tap it to place it.
   Repeat for **Quick Capture**.
3. Tap outside the grid, then tap the Focus control. It flips, and the app's card
   follows it with a `toggle` event in the stream.
4. Back in the app, change Focus's title, symbol and tint, then hit **Reload
   controls**. Reopen Control Center — the control has the new look.
5. Kill the app entirely and press **Quick Capture**. The app cold-starts and reports
   the `press`.

## Where to look

| File | |
| --- | --- |
| `src/App.tsx` | The whole demo: configure, state editing, event stream. |
| `src/theme.ts` | Design tokens — spacing, radii, type ramp, light and dark palettes. |
| `src/Glyph.tsx` | View-drawn stand-ins for SF Symbols, which RN cannot render. |
| `ios/ControlsExtension/Controls.swift` | The two control declarations. |
| `ios/ReactNativeIosControls/` | Generated config and the shared store + intents. |

The App Group is `group.ioscontrols.example`, set in `src/App.tsx`,
`ios/ReactNativeIosControls/RNControlsConfig.swift`, and both entitlements files. All
four must agree.
