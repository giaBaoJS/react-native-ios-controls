/**
 * Every code sample printed in README.md and docs/*.md, compiled against the
 * real API so documentation cannot drift from it.
 *
 * `yarn typecheck` is the assertion. Keep each block byte-identical to the
 * sample it mirrors; if a sample has to change here, change it in the doc too.
 */

import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import {
  addControlEventListener,
  configure,
  getControlState,
  getInitialControlEvent,
  isSupported,
  parseControlEvent,
  parseControlState,
  refreshControlEvents,
  reloadControls,
  serializeControlState,
  setControlState,
  type ConfigureOptions,
  type ControlEvent,
  type ControlState,
  type EventSubscription,
} from '../index';

/* README — “Why”, the three-call summary ---------------------------------- */

export async function readmeWhy() {
  await configure({ appGroup: 'group.com.acme.app' });

  await setControlState('focus', {
    title: 'Deep Work',
    sfSymbol: 'moon.fill',
    value: true,
  });
  await reloadControls('focus');

  addControlEventListener((event) => {
    console.log(event.kind, event.action, event.value);
  });
}

/* README — “Setup”, configure -------------------------------------------- */

export async function readmeSetup() {
  await configure({ appGroup: 'group.com.acme.app' });
}

/* README — “Quick start” -------------------------------------------------- */

export function FocusPanel() {
  const [events, setEvents] = useState<ControlEvent[]>([]);

  useEffect(() => {
    const subscription = addControlEventListener((event) => {
      setEvents((previous) => [event, ...previous]);
    });
    configure({ appGroup: 'group.com.acme.app' });
    return () => subscription.remove();
  }, []);

  async function goDeep() {
    await setControlState('focus', {
      value: true,
      title: 'Deep Work',
      sfSymbol: 'moon.stars.fill',
      tint: '#7C5CFF',
    });
    await reloadControls('focus');
    const state = await getControlState('focus');
    console.log(state?.title);
  }

  return <Text onPress={goDeep}>{events.length} control events</Text>;
}

/* README — the published type shapes -------------------------------------- */

type DocumentedConfigureOptions = { appGroup: string };

type DocumentedControlState = {
  value?: boolean;
  title?: string;
  subtitle?: string;
  sfSymbol?: string;
  tint?: string;
};

type DocumentedControlEvent = {
  kind: string;
  action: 'press' | 'toggle';
  value?: boolean;
  id: string;
  timestamp: number;
};

/** Fails to compile if the documented shape drifts from the exported one. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const _configureOptionsMatch: Exact<
  ConfigureOptions,
  DocumentedConfigureOptions
> = true;
export const _controlStateMatch: Exact<ControlState, DocumentedControlState> =
  true;
export const _controlEventMatch: Exact<ControlEvent, DocumentedControlEvent> =
  true;

/* README — the API table signatures --------------------------------------- */

export const _configure: (options: ConfigureOptions) => Promise<void> =
  configure;
export const _setControlState: (
  kind: string,
  state: ControlState
) => Promise<void> = setControlState;
export const _getControlState: (kind: string) => Promise<ControlState | null> =
  getControlState;
export const _reloadControls: (kind?: string) => Promise<void> = reloadControls;
export const _getInitialControlEvent: () => Promise<ControlEvent | null> =
  getInitialControlEvent;
export const _addControlEventListener: (
  cb: (e: ControlEvent) => void
) => EventSubscription = addControlEventListener;
export const _refreshControlEvents: () => Promise<void> = refreshControlEvents;
export const _isSupported: boolean = isSupported;

/* docs/API.md — helper signatures ----------------------------------------- */

export const _serialize: (state: ControlState) => string =
  serializeControlState;
export const _parseState: (raw: string | null) => ControlState | null =
  parseControlState;
export const _parseEvent: (raw: unknown) => ControlEvent | null =
  parseControlEvent;

/* docs/API.md — setControlState, then reload ------------------------------ */

export async function apiSetThenReload() {
  await setControlState('focus', {
    title: 'Deep Work',
    sfSymbol: 'moon.stars.fill',
  });
  await reloadControls('focus');
}

/* docs/API.md — getControlState with a fallback --------------------------- */

export async function apiReadWithFallback() {
  const state = await getControlState('focus');
  const title = state?.title ?? 'Focus';
  return title;
}

/* docs/API.md — listener in an effect ------------------------------------- */

export function ApiListenerSample() {
  const [, setFocusOn] = useState(false);

  useEffect(() => {
    const subscription = addControlEventListener((event) => {
      if (event.kind === 'focus') setFocusOn(event.value === true);
    });
    return () => subscription.remove();
  }, []);

  return null;
}

/* docs/API.md — de-duplicating the launch event --------------------------- */

export async function apiLaunchDedupe(
  events: ControlEvent[],
  setEvents: (update: (previous: ControlEvent[]) => ControlEvent[]) => void
) {
  const launch = await getInitialControlEvent();
  if (launch && !events.some((event) => event.id === launch.id)) {
    setEvents((previous) => [launch, ...previous]);
  }
}

/* README — branching on isSupported --------------------------------------- */

export function SupportNotice() {
  return <>{!isSupported && <Text>Controls need iOS 18.</Text>}</>;
}
