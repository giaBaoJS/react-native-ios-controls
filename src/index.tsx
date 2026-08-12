import { AppState, Platform, type AppStateStatus } from 'react-native';
import NativeIosControls from './NativeIosControls';
import type {
  ConfigureOptions,
  ControlEvent,
  ControlEventListener,
  ControlState,
  EventSubscription,
} from './types';

export type {
  ConfigureOptions,
  ControlAction,
  ControlEvent,
  ControlEventListener,
  ControlState,
  EventSubscription,
} from './types';

const LINKING_ERROR =
  "The package 'react-native-ios-controls' doesn't seem to be linked. Run `pod install` and rebuild the app.";

/** How many delivered event ids to remember for de-duplication. */
const SEEN_EVENT_LIMIT = 128;

/**
 * True when the current platform can host iOS 18 controls.
 *
 * On Android and on iOS < 18 this is `false` and every function in this module
 * becomes a well-defined no-op rather than throwing.
 */
export const isSupported: boolean = (() => {
  if (Platform.OS !== 'ios') return false;
  if (NativeIosControls == null) return false;
  try {
    return NativeIosControls.isSupported();
  } catch {
    return false;
  }
})();

let configured = false;
const listeners = new Set<ControlEventListener>();
/** Events that arrived before any listener attached. */
let bufferedEvents: ControlEvent[] = [];
const seenEventIds: string[] = [];
const seenEventIdSet = new Set<string>();
let appStateSubscription: { remove(): void } | null = null;

function requireNative() {
  if (NativeIosControls == null) throw new Error(LINKING_ERROR);
  return NativeIosControls;
}

function markSeen(id: string): boolean {
  if (seenEventIdSet.has(id)) return false;
  seenEventIdSet.add(id);
  seenEventIds.push(id);
  while (seenEventIds.length > SEEN_EVENT_LIMIT) {
    const evicted = seenEventIds.shift();
    if (evicted !== undefined) seenEventIdSet.delete(evicted);
  }
  return true;
}

function isControlEvent(value: unknown): value is ControlEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<ControlEvent>;
  return (
    typeof event.kind === 'string' &&
    (event.action === 'press' || event.action === 'toggle') &&
    typeof event.id === 'string' &&
    typeof event.timestamp === 'number'
  );
}

/**
 * Normalizes a raw record from the App Group queue into a `ControlEvent`.
 * Returns `null` for anything malformed so one bad record can't poison a drain.
 */
export function parseControlEvent(raw: unknown): ControlEvent | null {
  if (!isControlEvent(raw)) return null;
  const event: ControlEvent = {
    kind: raw.kind,
    action: raw.action,
    id: raw.id,
    timestamp: raw.timestamp,
  };
  if (typeof raw.value === 'boolean') event.value = raw.value;
  return event;
}

/** Serializes a partial `ControlState`, dropping unknown and undefined fields. */
export function serializeControlState(state: ControlState): string {
  if (typeof state !== 'object' || state === null) {
    throw new TypeError('setControlState: state must be an object');
  }
  const out: ControlState = {};
  if (state.value !== undefined) {
    if (typeof state.value !== 'boolean') {
      throw new TypeError('setControlState: `value` must be a boolean');
    }
    out.value = state.value;
  }
  for (const key of ['title', 'subtitle', 'sfSymbol', 'tint'] as const) {
    const value = state[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      throw new TypeError(`setControlState: \`${key}\` must be a string`);
    }
    out[key] = value;
  }
  if (
    out.tint !== undefined &&
    !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(out.tint)
  ) {
    throw new TypeError(
      'setControlState: `tint` must be a hex color such as #7C5CFF'
    );
  }
  return JSON.stringify(out);
}

/** Parses a `ControlState` payload coming back from native. */
export function parseControlState(raw: string | null): ControlState | null {
  if (raw == null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const source = parsed as Record<string, unknown>;
  const state: ControlState = {};
  if (typeof source.value === 'boolean') state.value = source.value;
  for (const key of ['title', 'subtitle', 'sfSymbol', 'tint'] as const) {
    if (typeof source[key] === 'string') state[key] = source[key] as string;
  }
  return state;
}

function deliver(events: ControlEvent[]) {
  const fresh = events.filter((event) => markSeen(event.id));
  if (fresh.length === 0) return;
  if (listeners.size === 0) {
    bufferedEvents = bufferedEvents.concat(fresh);
    return;
  }
  for (const event of fresh) {
    for (const listener of Array.from(listeners)) {
      try {
        listener(event);
      } catch {
        // A throwing listener must not stop delivery to the others.
      }
    }
  }
}

async function drain() {
  if (!isSupported || !configured) return;
  try {
    const raw = await requireNative().drainPendingEvents();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const events = parsed
      .map(parseControlEvent)
      .filter((event): event is ControlEvent => event !== null);
    deliver(events);
  } catch {
    // The queue is best-effort: a failed drain is retried on the next
    // foreground transition rather than surfaced to the app.
  }
}

function handleAppStateChange(status: AppStateStatus) {
  if (status === 'active') {
    drain().catch(() => {});
  }
}

/**
 * Connects this module to your App Group. Call once, before anything else.
 *
 * On Android and iOS < 18 this resolves without doing anything.
 *
 * @throws if `appGroup` is missing or not a `group.`-prefixed string.
 */
export async function configure(options: ConfigureOptions): Promise<void> {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('configure: options must be an object');
  }
  const { appGroup } = options;
  if (typeof appGroup !== 'string' || appGroup.length === 0) {
    throw new TypeError('configure: `appGroup` is required');
  }
  if (!appGroup.startsWith('group.')) {
    throw new TypeError(
      `configure: \`appGroup\` must start with "group." (received "${appGroup}")`
    );
  }
  if (!isSupported) {
    configured = true;
    return;
  }
  await requireNative().configure(JSON.stringify({ appGroup }));
  configured = true;
  if (appStateSubscription == null) {
    appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
  }
  await drain();
}

/**
 * Updates a control's rendered state. Call {@link reloadControls} afterwards to
 * make Control Center pick the change up.
 */
export async function setControlState(
  kind: string,
  state: ControlState
): Promise<void> {
  if (typeof kind !== 'string' || kind.length === 0) {
    throw new TypeError('setControlState: `kind` is required');
  }
  const payload = serializeControlState(state);
  if (!isSupported) return;
  await requireNative().setControlState(kind, payload);
}

/** Reads back a control's stored state, or `null` if it was never written. */
export async function getControlState(
  kind: string
): Promise<ControlState | null> {
  if (typeof kind !== 'string' || kind.length === 0) {
    throw new TypeError('getControlState: `kind` is required');
  }
  if (!isSupported) return null;
  return parseControlState(await requireNative().getControlState(kind));
}

/**
 * Asks WidgetKit to re-render your controls.
 *
 * @param kind Reload only this control. Omit to reload all of them.
 */
export async function reloadControls(kind?: string): Promise<void> {
  if (!isSupported) return;
  await requireNative().reloadControls(kind ?? null);
}

/**
 * The control interaction that launched the app, if it was launched by one.
 *
 * Resolves to `null` when the app started any other way. The same event is also
 * delivered to listeners, so most apps only need one of the two.
 */
export async function getInitialControlEvent(): Promise<ControlEvent | null> {
  if (!isSupported) return null;
  const raw = await requireNative().getInitialControlEvent();
  if (raw == null) return null;
  try {
    return parseControlEvent(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Subscribes to control interactions.
 *
 * Events that arrived before the first listener attached are replayed to it
 * immediately, so a listener registered in a `useEffect` never misses the press
 * that launched the app. Each event is delivered at most once.
 */
export function addControlEventListener(
  listener: ControlEventListener
): EventSubscription {
  if (typeof listener !== 'function') {
    throw new TypeError('addControlEventListener: listener must be a function');
  }
  const isFirst = listeners.size === 0;
  listeners.add(listener);
  if (isFirst && bufferedEvents.length > 0) {
    const replay = bufferedEvents;
    bufferedEvents = [];
    for (const event of replay) {
      try {
        listener(event);
      } catch {
        // ignored, see deliver()
      }
    }
  }
  return {
    remove() {
      listeners.delete(listener);
    },
  };
}

/**
 * Drains the App Group event queue now, instead of waiting for the next
 * foreground transition. Rarely needed — `configure` already drains on launch
 * and whenever the app becomes active.
 */
export async function refreshControlEvents(): Promise<void> {
  await drain();
}

/** @internal Test-only hook that resets module state. */
export function __resetForTests() {
  configured = false;
  listeners.clear();
  bufferedEvents = [];
  seenEventIds.length = 0;
  seenEventIdSet.clear();
  appStateSubscription?.remove();
  appStateSubscription = null;
}
