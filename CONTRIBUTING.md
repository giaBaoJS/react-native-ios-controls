# Contributing

Thanks for taking a look. This library is small but its moving parts span JavaScript,
Objective-C++, Swift, and Xcode project surgery, so this page is mostly about where
things live and how to check your change actually works.

## Getting set up

```sh
git clone https://github.com/giaBaoJS/react-native-ios-controls
cd react-native-ios-controls
yarn
```

You need Xcode 16+ and an iOS 18+ simulator runtime. Controls do not exist below
iOS 18, so there is no way to test the interesting paths on an older runtime.

## Layout

| Path | What it is |
| --- | --- |
| `src/` | The JavaScript API, validation, event buffering and de-duplication. |
| `ios/IosControls.{h,mm}` | TurboModule shim; forwards to Swift. |
| `ios/IosControlsStore.swift` | App-side App Group store and `reloadControls`. |
| `ios/ControlWidgets/` | The drop-in compiled into the user's targets. **Not** in the podspec. |
| `cli/` | `react-native-ios-controls init`: Node front end, Ruby `xcodeproj` back end. |
| `example/` | The reference integration, produced by the CLI itself. |
| `docs/` | Setup, API and internals. |

`ios/ControlWidgets/` is deliberately excluded from `IosControls.podspec`. Those files
belong to the app's own targets; compiling them in the pod as well would duplicate the
`AppIntent` symbols.

There are two implementations of the App Group store — one in the pod for the app, one
in the drop-in for the extension — because a widget extension cannot link CocoaPods
targets. **If you change the storage format, change both**, and update
`docs/how-controls-work.md`, which is the spec they agree on.

## Checks

```sh
yarn lint
yarn typecheck
yarn test
```

`yarn test` covers the JavaScript layer with the native module mocked: configure
validation, state serialization, event buffering and de-duplication, and the
unsupported-platform path.

Building the example:

```sh
cd example/ios && pod install
cd example && yarn build:ios
cd example/android && ./gradlew assembleDebug
```

## Testing a change for real

Unit tests cannot tell you whether a control renders, so anything touching Swift or
the CLI needs a run through the example app:

1. `yarn example start` and run the app on an iOS 18+ simulator.
2. Open Control Center, press and hold, **Add a Control**, add **Focus** and **Quick
   Capture**.
3. Toggle Focus — the app's event stream should show a `toggle` event, and the card's
   switch should follow it.
4. Change the title, symbol and tint in the app, hit **Reload controls**, reopen
   Control Center — the control should have the new look.
5. Kill the app, press **Quick Capture** — the app should cold-start and report a
   `press`.

**Build with normal simulator signing.** A build with `CODE_SIGNING_ALLOWED=NO` strips
entitlements, the App Group silently becomes a private store, and controls render as
blank circles with no events — which looks exactly like a broken change.

If you touch the CLI, verify it against a *fresh* project too, not only the example,
and check `--dry-run` and the refuse-to-run-twice path.

## Commits and pull requests

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), written in English. Keep the
subject line about what changed and why, not how.

In the pull request, say what you tested and on which runtime. If a change is
Simulator-verified but not device-verified, say so — this project would rather be
honest about coverage than assume.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
