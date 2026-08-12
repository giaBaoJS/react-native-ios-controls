/**
 * Public types for react-native-ios-controls.
 *
 * A "control" is an iOS 18 `ControlWidget` — the button or toggle a user can add
 * to Control Center, the Lock Screen, or the Action Button.
 */

/** Options passed to {@link configure}. */
export type ConfigureOptions = {
  /**
   * The App Group identifier shared by your app and its widget extension,
   * e.g. `group.com.acme.app`. This is the channel the app and the control
   * extension use to exchange state and events.
   */
  appGroup: string;
};

/**
 * The renderable state of a single control.
 *
 * Every field is optional: whatever you omit keeps the value the control
 * already had (or the default declared in Swift, for a control that has never
 * had state written).
 */
export type ControlState = {
  /** On/off value. Only meaningful for toggle controls. */
  value?: boolean;
  /** The control's primary label, shown under the glyph. */
  title?: string;
  /** Secondary label. Rendered by toggles as the on/off value label. */
  subtitle?: string;
  /** SF Symbol name, e.g. `moon.fill`. Invalid names render as a blank glyph. */
  sfSymbol?: string;
  /**
   * Tint color applied when the control is active.
   * Accepts `#RGB`, `#RRGGBB`, or `#RRGGBBAA`.
   */
  tint?: string;
};

/** What the user did to a control. */
export type ControlAction = 'press' | 'toggle';

/** An interaction with one of your controls. */
export type ControlEvent = {
  /** The control's `kind` — the same string you declared in Swift. */
  kind: string;
  /** `toggle` for toggle controls, `press` for button controls. */
  action: ControlAction;
  /** The new on/off value. Present for `toggle` events only. */
  value?: boolean;
  /** Unique id for this event, used to de-duplicate redelivery. */
  id: string;
  /** When the interaction happened, in milliseconds since the epoch. */
  timestamp: number;
};

/** Handle returned by {@link addControlEventListener}. */
export type EventSubscription = {
  remove(): void;
};

/** Callback invoked for each control interaction. */
export type ControlEventListener = (event: ControlEvent) => void;
