# API reference

Every function is safe to call on any platform. On Android and iOS < 18 the argument
validation still runs — so a typo fails fast in development — and the call then
resolves without touching native code.

```ts
import {
  addControlEventListener,
  configure,
  getControlState,
  getInitialControlEvent,
  isSupported,
  refreshControlEvents,
  reloadControls,
  setControlState,
} from 'react-native-ios-controls';
```

---

## `configure(options)`

```ts
function configure(options: { appGroup: string }): Promise<void>;
```

Connects the module to the App Group your app and widget extension share. Call it
once, as early as possible — nothing else does anything useful until it has run.

It also starts draining the event queue: once on the spot, and again every time the
app becomes active.

**Throws** a `TypeError` synchronously (as a rejected promise) when `appGroup` is
missing, not a string, or does not start with `group.`. **Rejects** with
`E_APP_GROUP_UNAVAILABLE` when iOS refuses to open the container, which almost always
means the identifier does not match the entitlements.

```ts
await configure({ appGroup: 'group.com.acme.app' });
```

The value must be identical to the one in `RNControlsConfig.swift` and in both
entitlements files. `npx react-native-ios-controls init` writes all three together.

---

## `setControlState(kind, state)`

```ts
function setControlState(kind: string, state: ControlState): Promise<void>;
```

Writes the renderable state of one control. The patch is **merged** into what is
already stored, so you can change a single field without restating the others.

This does not re-render anything on its own — follow it with `reloadControls`.

```ts
await setControlState('focus', { title: 'Deep Work', sfSymbol: 'moon.stars.fill' });
await reloadControls('focus');
```

`ControlState` fields:

| Field | Type | Effect |
| --- | --- | --- |
| `value` | `boolean` | On/off state. Toggles only; ignored by buttons. |
| `title` | `string` | The control's label. |
| `subtitle` | `string` | A toggle's value label. Defaults to `On`/`Off`. |
| `sfSymbol` | `string` | SF Symbol name, e.g. `moon.fill`. An unknown name renders blank. |
| `tint` | `string` | `#RGB`, `#RRGGBB` or `#RRGGBBAA`. Applied when the control is active. |

**Throws** on an empty `kind`, a non-boolean `value`, a non-string text field, or a
`tint` that is not hex. Unknown keys are dropped rather than sent to native.

---

## `getControlState(kind)`

```ts
function getControlState(kind: string): Promise<ControlState | null>;
```

Reads back what is stored. Resolves to `null` when the control has never been written
— which is also what you get for a `kind` that does not exist, since the store has no
notion of which kinds are declared in Swift.

Fields the store does not hold are simply absent, so read them with a fallback:

```ts
const state = await getControlState('focus');
const title = state?.title ?? 'Focus';
```

---

## `reloadControls(kind?)`

```ts
function reloadControls(kind?: string): Promise<void>;
```

Asks WidgetKit to re-render your controls, via `ControlCenter.shared`. Pass a `kind`
to reload one, or omit it to reload all of them.

The promise resolves once the request is handed to WidgetKit — **not** once the
control has visibly changed. WidgetKit budgets and coalesces reloads, so a rapid
sequence of calls will not produce a matching sequence of re-renders. Write all your
state first, then reload once.

---

## `addControlEventListener(listener)`

```ts
function addControlEventListener(
  listener: (event: ControlEvent) => void
): EventSubscription;
```

Subscribes to control interactions. Returns a handle with `remove()`.

Events that arrived before the **first** listener attached are replayed to it
immediately, so a listener registered inside a `useEffect` cannot miss the press that
launched the app. Later listeners only receive events from the moment they subscribe.

Each event is delivered at most once across all listeners, keyed on `event.id`; the
module remembers the last 128 ids. A listener that throws does not prevent delivery to
the others.

```ts
useEffect(() => {
  const subscription = addControlEventListener((event) => {
    if (event.kind === 'focus') setFocusOn(event.value === true);
  });
  return () => subscription.remove();
}, []);
```

`ControlEvent` fields:

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `string` | Matches the `kind` declared in Swift. |
| `action` | `'press' \| 'toggle'` | `toggle` for toggles, `press` for buttons. |
| `value` | `boolean \| undefined` | The new value. Present on `toggle` only. |
| `id` | `string` | Unique per interaction. Use it to de-duplicate. |
| `timestamp` | `number` | Milliseconds since the epoch. |

---

## `getInitialControlEvent()`

```ts
function getInitialControlEvent(): Promise<ControlEvent | null>;
```

The control press that launched the app, or `null` if it started any other way. Only
`rnButtonControl` presses can launch the app; toggles never do.

The event is cleared once read, so a later call in the same session resolves to
`null`.

The same press is *also* delivered to your listeners — it is one interaction reported
through two channels. If you consume both, de-duplicate on `id`:

```ts
const launch = await getInitialControlEvent();
if (launch && !events.some((event) => event.id === launch.id)) {
  setEvents((previous) => [launch, ...previous]);
}
```

---

## `refreshControlEvents()`

```ts
function refreshControlEvents(): Promise<void>;
```

Drains the queue now rather than waiting for the next foreground transition. Rarely
needed — `configure` already drains on launch and on every `active` transition, which
covers dismissing Control Center over your app. Reach for this if you drive the app
from a background task and want to flush explicitly.

Never rejects: a failed drain is retried on the next transition.

---

## `isSupported`

```ts
const isSupported: boolean;
```

`true` only on iOS 18 or newer with the native module linked. Evaluated once at import.

Use it to change what you render, not to guard calls — the calls are already safe:

```ts
{!isSupported && <Text>Controls need iOS 18.</Text>}
```

---

## Helpers

These are exported mainly so the serialization format can be tested, but they are
stable and occasionally useful:

| Export | Signature |
| --- | --- |
| `serializeControlState` | `(state: ControlState) => string` |
| `parseControlState` | `(raw: string \| null) => ControlState \| null` |
| `parseControlEvent` | `(raw: unknown) => ControlEvent \| null` |

---

## Swift surface

Available inside your widget extension once `init` has run. See
[how-controls-work.md](./how-controls-work.md) for the storage format.

| Symbol | Purpose |
| --- | --- |
| `rnToggleControl(kind:displayName:description:defaultState:)` | Declares a toggle control. |
| `rnButtonControl(kind:displayName:description:defaultState:)` | Declares a button that opens the app. |
| `rnSilentButtonControl(kind:displayName:description:defaultState:)` | Declares a button that does not open the app. |
| `RNControlState` | Swift mirror of the JS `ControlState`. |
| `RNControlStore` | Reads and writes the App Group directly. |
| `RNSetControlValueIntent` | `SetValueIntent` behind every toggle. |
| `RNOpenAppControlIntent` / `RNPressControlIntent` | Intents behind the two button kinds. |
