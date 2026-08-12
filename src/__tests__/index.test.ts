import { AppState, Platform, type AppStateStatus } from 'react-native';
import { createFakeNative, makeEvent, type FakeNative } from './mockNative';

type LibraryModule = typeof import('../index');

type Loaded = {
  lib: LibraryModule;
  native: FakeNative;
  /** Simulates the app coming back to the foreground. */
  becomeActive: () => void;
};

/**
 * Loads a fresh copy of the module with the native side faked out. The module
 * reads `Platform.OS` and `isSupported()` once at import time, so each scenario
 * needs its own registry.
 */
function load({
  supported = true,
  platform = 'ios',
  native = createFakeNative(supported),
}: {
  supported?: boolean;
  platform?: 'ios' | 'android';
  native?: FakeNative;
} = {}): Loaded {
  const handlers: Array<(status: AppStateStatus) => void> = [];

  let lib!: LibraryModule;
  jest.isolateModules(() => {
    // Only the two members the module actually imports are faked. Spreading the
    // real react-native here would evaluate every lazy export and blow up on
    // unrelated TurboModules that have no native binary under Jest.
    jest.doMock('react-native', () => ({
      Platform: {
        OS: platform,
        select: (spec: Record<string, unknown>) => spec[platform],
      },
      AppState: {
        currentState: 'active',
        addEventListener: (
          _event: string,
          handler: (status: AppStateStatus) => void
        ) => {
          handlers.push(handler);
          return { remove: () => {} };
        },
      },
    }));
    jest.doMock('../NativeIosControls', () => ({
      __esModule: true,
      default: platform === 'ios' ? native : null,
    }));
    lib = require('../index');
  });

  return {
    lib,
    native,
    becomeActive: () => handlers.forEach((handler) => handler('active')),
  };
}

/** Lets queued promise callbacks inside the module run. */
const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(() => resolve());
  });

afterEach(() => {
  jest.resetModules();
  jest.dontMock('react-native');
  jest.dontMock('../NativeIosControls');
});

describe('platform detection', () => {
  it('reports support on iOS when the native module says so', () => {
    expect(load().lib.isSupported).toBe(true);
  });

  it('reports no support on Android', () => {
    expect(load({ platform: 'android' }).lib.isSupported).toBe(false);
  });

  it('reports no support when native says the OS is too old', () => {
    expect(load({ supported: false }).lib.isSupported).toBe(false);
  });

  it('leaves the real Platform untouched between scenarios', () => {
    expect(['ios', 'android', 'web', 'windows', 'macos']).toContain(
      Platform.OS
    );
  });
});

describe('configure validation', () => {
  it('rejects a missing app group', async () => {
    const { lib } = load();
    await expect(
      lib.configure({} as unknown as { appGroup: string })
    ).rejects.toThrow('`appGroup` is required');
  });

  it('rejects a non-string app group', async () => {
    const { lib } = load();
    await expect(
      lib.configure({ appGroup: 42 as unknown as string })
    ).rejects.toThrow('`appGroup` is required');
  });

  it('rejects an app group without the group. prefix', async () => {
    const { lib } = load();
    await expect(lib.configure({ appGroup: 'com.acme.app' })).rejects.toThrow(
      'must start with "group."'
    );
  });

  it('rejects a non-object argument', async () => {
    const { lib } = load();
    await expect(
      lib.configure(null as unknown as { appGroup: string })
    ).rejects.toThrow('options must be an object');
  });

  it('forwards a valid app group to native as JSON', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });
    expect(native.calls).toContain(
      'configure:{"appGroup":"group.com.acme.app"}'
    );
  });

  it('validates on Android too, then no-ops', async () => {
    const { lib, native } = load({ platform: 'android' });
    await expect(lib.configure({ appGroup: 'nope' })).rejects.toThrow(
      'must start with "group."'
    );
    await expect(
      lib.configure({ appGroup: 'group.com.acme.app' })
    ).resolves.toBeUndefined();
    expect(native.calls).toHaveLength(0);
  });
});

describe('state serialization', () => {
  it('round-trips every field', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });
    await lib.setControlState('focus', {
      value: true,
      title: 'Deep Work',
      subtitle: 'On',
      sfSymbol: 'moon.fill',
      tint: '#7C5CFF',
    });
    expect(await lib.getControlState('focus')).toEqual({
      value: true,
      title: 'Deep Work',
      subtitle: 'On',
      sfSymbol: 'moon.fill',
      tint: '#7C5CFF',
    });
    expect(native.states.focus).toBeDefined();
  });

  it('omits undefined fields rather than sending nulls', () => {
    expect(
      lib_serialize({ title: 'Focus', subtitle: undefined, value: undefined })
    ).toBe('{"title":"Focus"}');
  });

  it('drops unknown fields', () => {
    expect(lib_serialize({ title: 'Focus', bogus: 1 } as never)).toBe(
      '{"title":"Focus"}'
    );
  });

  it('rejects a wrongly typed value', () => {
    expect(() => lib_serialize({ value: 'yes' as never })).toThrow(
      '`value` must be a boolean'
    );
  });

  it('rejects a wrongly typed title', () => {
    expect(() => lib_serialize({ title: 3 as never })).toThrow(
      '`title` must be a string'
    );
  });

  it.each(['#fff', '#7C5CFF', '#7C5CFFAA'])('accepts hex tint %s', (tint) => {
    expect(() => lib_serialize({ tint })).not.toThrow();
  });

  it.each(['rebeccapurple', '7C5CFF', '#12', 'rgb(1,2,3)'])(
    'rejects non-hex tint %s',
    (tint) => {
      expect(() => lib_serialize({ tint })).toThrow('must be a hex color');
    }
  );

  it('parses malformed native payloads as null', () => {
    const { lib } = load();
    expect(lib.parseControlState('not json')).toBeNull();
    expect(lib.parseControlState('[1,2]')).toBeNull();
    expect(lib.parseControlState(null)).toBeNull();
  });

  it('ignores wrongly typed fields coming back from native', () => {
    const { lib } = load();
    expect(
      lib.parseControlState('{"value":"true","title":"Focus","tint":5}')
    ).toEqual({ title: 'Focus' });
  });

  it('requires a non-empty kind', async () => {
    const { lib } = load();
    await expect(lib.setControlState('', { value: true })).rejects.toThrow(
      '`kind` is required'
    );
    await expect(lib.getControlState('')).rejects.toThrow('`kind` is required');
  });
});

// Helper that keeps the serialization cases readable.
function lib_serialize(state: Parameters<LibraryModule['setControlState']>[1]) {
  return load().lib.serializeControlState(state);
}

describe('reloadControls', () => {
  it('passes a kind straight through', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });
    await lib.reloadControls('focus');
    expect(native.calls).toContain('reloadControls:focus');
  });

  it('sends null to mean "all controls"', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });
    await lib.reloadControls();
    expect(native.calls).toContain('reloadControls:null');
  });
});

describe('event buffering and de-duplication', () => {
  it('buffers events that arrive before a listener attaches, then replays them', async () => {
    const { lib, native } = load();
    native.queue = [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })];
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    lib.addControlEventListener((event) => seen.push(event.id));
    expect(seen).toEqual(['a', 'b']);
  });

  it('replays the buffer only to the first listener', async () => {
    const { lib, native } = load();
    native.queue = [makeEvent({ id: 'a' })];
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const first: string[] = [];
    const second: string[] = [];
    lib.addControlEventListener((event) => first.push(event.id));
    lib.addControlEventListener((event) => second.push(event.id));
    expect(first).toEqual(['a']);
    expect(second).toEqual([]);
  });

  it('never delivers the same event id twice', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    lib.addControlEventListener((event) => seen.push(event.id));

    native.queue = [makeEvent({ id: 'dup' })];
    await lib.refreshControlEvents();
    native.queue = [makeEvent({ id: 'dup' }), makeEvent({ id: 'fresh' })];
    await lib.refreshControlEvents();

    expect(seen).toEqual(['dup', 'fresh']);
  });

  it('fans out to every listener', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const a: string[] = [];
    const b: string[] = [];
    lib.addControlEventListener((event) => a.push(event.id));
    lib.addControlEventListener((event) => b.push(event.id));

    native.queue = [makeEvent({ id: 'x' })];
    await lib.refreshControlEvents();

    expect(a).toEqual(['x']);
    expect(b).toEqual(['x']);
  });

  it('stops delivering after remove()', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    const subscription = lib.addControlEventListener((e) => seen.push(e.id));
    subscription.remove();

    native.queue = [makeEvent({ id: 'ignored' })];
    await lib.refreshControlEvents();

    expect(seen).toEqual([]);
  });

  it('keeps delivering to healthy listeners when one throws', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    lib.addControlEventListener(() => {
      throw new Error('listener blew up');
    });
    lib.addControlEventListener((event) => seen.push(event.id));

    native.queue = [makeEvent({ id: 'survives' })];
    await lib.refreshControlEvents();

    expect(seen).toEqual(['survives']);
  });

  it('drains when the app becomes active', async () => {
    const { lib, native, becomeActive } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    lib.addControlEventListener((event) => seen.push(event.id));

    native.queue = [makeEvent({ id: 'foregrounded' })];
    becomeActive();
    await flush();

    expect(seen).toEqual(['foregrounded']);
  });

  it('skips malformed records instead of failing the whole drain', async () => {
    const { lib, native } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    lib.addControlEventListener((event) => seen.push(event.id));

    native.queue = [
      { kind: 'focus' },
      makeEvent({ id: 'good' }),
      { kind: 'focus', action: 'sideways', id: 'x', timestamp: 1 },
      null,
    ];
    await lib.refreshControlEvents();

    expect(seen).toEqual(['good']);
  });

  it('rejects a non-function listener', () => {
    const { lib } = load();
    expect(() => lib.addControlEventListener(undefined as never)).toThrow(
      'listener must be a function'
    );
  });

  it('keeps the value field only when it is a boolean', () => {
    const { lib } = load();
    expect(
      lib.parseControlEvent(makeEvent({ value: 'true' }))?.value
    ).toBeUndefined();
    expect(lib.parseControlEvent(makeEvent({ value: false }))?.value).toBe(
      false
    );
  });
});

describe('cold start', () => {
  it('reports the event that launched the app', async () => {
    const { lib, native } = load();
    native.launchEvent = makeEvent({ id: 'launch', action: 'press' });
    await lib.configure({ appGroup: 'group.com.acme.app' });

    expect(await lib.getInitialControlEvent()).toEqual({
      kind: 'focus',
      action: 'press',
      value: true,
      id: 'launch',
      timestamp: 1_700_000_000_000,
    });
  });

  it('resolves to null on a normal launch', async () => {
    const { lib } = load();
    await lib.configure({ appGroup: 'group.com.acme.app' });
    expect(await lib.getInitialControlEvent()).toBeNull();
  });
});

describe('unsupported platform path', () => {
  it('resolves every call without touching native', async () => {
    const { lib, native } = load({ platform: 'android' });

    await expect(
      lib.configure({ appGroup: 'group.com.acme.app' })
    ).resolves.toBeUndefined();
    await expect(
      lib.setControlState('focus', { value: true })
    ).resolves.toBeUndefined();
    await expect(lib.getControlState('focus')).resolves.toBeNull();
    await expect(lib.reloadControls('focus')).resolves.toBeUndefined();
    await expect(lib.getInitialControlEvent()).resolves.toBeNull();
    await expect(lib.refreshControlEvents()).resolves.toBeUndefined();

    expect(native.calls).toEqual([]);
  });

  it('still validates its arguments', async () => {
    const { lib } = load({ platform: 'android' });
    await expect(
      lib.setControlState('focus', { tint: 'purple' })
    ).rejects.toThrow('must be a hex color');
  });

  it('never fires listeners', async () => {
    const { lib } = load({ platform: 'android' });
    await lib.configure({ appGroup: 'group.com.acme.app' });

    const seen: string[] = [];
    lib.addControlEventListener((event) => seen.push(event.id));
    await lib.refreshControlEvents();

    expect(seen).toEqual([]);
  });

  it('behaves the same on iOS 17', async () => {
    const { lib, native } = load({ supported: false });
    await lib.configure({ appGroup: 'group.com.acme.app' });
    await lib.setControlState('focus', { value: true });
    expect(native.calls).toEqual([]);
    expect(await lib.getControlState('focus')).toBeNull();
  });
});

describe('AppState wiring', () => {
  it('exists on the real react-native module', () => {
    expect(typeof AppState.addEventListener).toBe('function');
  });
});
