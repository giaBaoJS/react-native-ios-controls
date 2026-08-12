import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * TurboModule spec.
 *
 * Structured payloads cross the bridge as JSON strings rather than codegen
 * structs. That keeps the native surface stable while the `ControlState` and
 * `ControlEvent` shapes evolve, and it keeps a single serialization format
 * shared by the app, the widget extension, and the App Group store on disk.
 * See `docs/how-controls-work.md` for the on-disk format.
 */
export interface Spec extends TurboModule {
  /** `optionsJson` is a serialized `ConfigureOptions`. */
  configure(optionsJson: string): Promise<void>;
  /** `stateJson` is a serialized partial `ControlState`. */
  setControlState(kind: string, stateJson: string): Promise<void>;
  /** Resolves to a serialized `ControlState`, or `null` if never written. */
  getControlState(kind: string): Promise<string | null>;
  /** Pass `null` to reload every control this app declares. */
  reloadControls(kind: string | null): Promise<void>;
  /** Serialized `ControlEvent` that cold-started the app, or `null`. */
  getInitialControlEvent(): Promise<string | null>;
  /** Serialized `ControlEvent[]`; clears the queue as a side effect. */
  drainPendingEvents(): Promise<string>;
  /** True on iOS 18+, false on Android and older iOS. */
  isSupported(): boolean;
}

export default TurboModuleRegistry.get<Spec>('IosControls');
