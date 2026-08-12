import type { Spec } from '../NativeIosControls';

export type FakeNative = Spec & {
  /** Queue that `drainPendingEvents` will hand out on the next call. */
  queue: unknown[];
  launchEvent: unknown | null;
  states: Record<string, string>;
  calls: string[];
};

/**
 * Builds an in-memory stand-in for the TurboModule with the same contract:
 * JSON in, JSON out, and a queue that empties when drained.
 */
export function createFakeNative(supported = true): FakeNative {
  const native: FakeNative = {
    queue: [],
    launchEvent: null,
    states: {},
    calls: [],

    isSupported: () => supported,

    configure: async (optionsJson: string) => {
      native.calls.push(`configure:${optionsJson}`);
    },

    setControlState: async (kind: string, stateJson: string) => {
      native.calls.push(`setControlState:${kind}:${stateJson}`);
      const previous = native.states[kind]
        ? JSON.parse(native.states[kind])
        : {};
      native.states[kind] = JSON.stringify({
        ...previous,
        ...JSON.parse(stateJson),
      });
    },

    getControlState: async (kind: string) => native.states[kind] ?? null,

    reloadControls: async (kind: string | null) => {
      native.calls.push(`reloadControls:${String(kind)}`);
    },

    getInitialControlEvent: async () => {
      const event = native.launchEvent;
      native.launchEvent = null;
      return event == null ? null : JSON.stringify(event);
    },

    drainPendingEvents: async () => {
      const drained = JSON.stringify(native.queue);
      native.queue = [];
      return drained;
    },
  } as FakeNative;

  return native;
}

export function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'focus',
    action: 'toggle',
    value: true,
    id: 'evt-1',
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}
