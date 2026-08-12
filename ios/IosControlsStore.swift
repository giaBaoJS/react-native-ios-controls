import Foundation

#if canImport(WidgetKit)
  import WidgetKit
#endif

/// App-side implementation of the App Group store that backs
/// `react-native-ios-controls`.
///
/// The widget extension has its own copy of this logic in
/// `ios/ControlWidgets/RNControlsShared.swift` — the two are separate because a
/// widget extension cannot link the app's CocoaPods target. Both read and write
/// the format documented in `docs/how-controls-work.md`; keep them in step.
@objc(RNIosControlsStore)
public final class RNIosControlsStore: NSObject {

  @objc public static let shared = RNIosControlsStore()

  private let queue = DispatchQueue(label: "com.reactnativeioscontrols.store")
  private var appGroup: String?

  private enum Key {
    static let statePrefix = "rnic.state."
    static let events = "rnic.events"
    static let launchEvent = "rnic.launchEvent"
  }

  private var defaults: UserDefaults? {
    guard let appGroup else { return nil }
    return UserDefaults(suiteName: appGroup)
  }

  /// True when this device can host iOS 18 controls.
  @objc public var isSupported: Bool {
    if #available(iOS 18.0, *) { return true }
    return false
  }

  @objc public func configure(appGroup: String) -> Bool {
    queue.sync { self.appGroup = appGroup }
    return UserDefaults(suiteName: appGroup) != nil
  }

  // MARK: - State

  @objc public func setState(kind: String, patchJSON: String) {
    queue.sync {
      guard let defaults else { return }
      guard let patch = Self.decodeObject(patchJSON) else { return }
      var merged = Self.decodeObject(defaults.string(forKey: Key.statePrefix + kind) ?? "") ?? [:]
      for (key, value) in patch { merged[key] = value }
      if let encoded = Self.encode(merged) {
        defaults.set(encoded, forKey: Key.statePrefix + kind)
      }
    }
  }

  @objc public func getState(kind: String) -> String? {
    queue.sync {
      defaults?.string(forKey: Key.statePrefix + kind)
    }
  }

  // MARK: - Events

  /// Returns every queued event as a JSON array string and empties the queue.
  @objc public func drainEvents() -> String {
    queue.sync {
      guard let defaults else { return "[]" }
      let raw = defaults.string(forKey: Key.events) ?? "[]"
      defaults.removeObject(forKey: Key.events)
      return raw
    }
  }

  /// Returns — and clears — the event that launched the app, if any.
  @objc public func takeLaunchEvent() -> String? {
    queue.sync {
      guard let defaults, let raw = defaults.string(forKey: Key.launchEvent) else { return nil }
      defaults.removeObject(forKey: Key.launchEvent)
      return raw
    }
  }

  // MARK: - Reload

  @objc public func reloadControls(kind: String?) {
    #if canImport(WidgetKit)
      guard #available(iOS 18.0, *) else { return }
      if let kind, !kind.isEmpty {
        ControlCenter.shared.reloadControls(ofKind: kind)
      } else {
        ControlCenter.shared.reloadAllControls()
      }
    #endif
  }

  // MARK: - JSON helpers

  private static func decodeObject(_ json: String) -> [String: Any]? {
    guard let data = json.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return nil }
    return object
  }

  private static func encode(_ object: [String: Any]) -> String? {
    guard JSONSerialization.isValidJSONObject(object),
      let data = try? JSONSerialization.data(withJSONObject: object),
      let string = String(data: data, encoding: .utf8)
    else { return nil }
    return string
  }
}
