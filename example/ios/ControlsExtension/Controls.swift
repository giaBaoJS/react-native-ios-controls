//
//  Controls.swift
//  ControlsExtension
//
//  This file is yours to edit — declare one `ControlWidget` per control you
//  want to offer, then list them all in the `WidgetBundle` at the bottom.
//
//  A control's `kind` is the identifier you use from JavaScript in
//  `setControlState(kind, ...)` and the one you receive on `ControlEvent.kind`.
//

import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct FocusControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    rnToggleControl(
      kind: "focus",
      displayName: "Focus",
      description: "Turn Focus on or off without unlocking your phone.",
      defaultState: RNControlState(
        value: false,
        title: "Focus",
        sfSymbol: "moon.fill",
        tint: "#7C5CFF"
      )
    )
  }
}

@available(iOS 18.0, *)
struct QuickCaptureControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    rnButtonControl(
      kind: "quickCapture",
      displayName: "Quick Capture",
      description: "Open the app and start a new note.",
      defaultState: RNControlState(
        title: "Capture",
        sfSymbol: "bolt.fill",
        tint: "#22D3A7"
      )
    )
  }
}

@main
@available(iOS 18.0, *)
struct ControlsExtensionBundle: WidgetBundle {
  var body: some Widget {
    FocusControl()
    QuickCaptureControl()
  }
}
