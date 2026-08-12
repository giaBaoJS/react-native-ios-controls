package com.ioscontrols

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

/**
 * Android no-op implementation.
 *
 * iOS 18 Controls have no Android equivalent, so rather than crash on a missing
 * module this stub keeps the JavaScript API callable everywhere: promises
 * resolve, `getControlState` yields null, the event queue stays empty, and
 * `isSupported` reports false so callers can branch cleanly.
 */
@ReactModule(name = IosControlsModule.NAME)
class IosControlsModule(reactContext: ReactApplicationContext) :
  NativeIosControlsSpec(reactContext) {

  override fun getName(): String = NAME

  override fun isSupported(): Boolean = false

  override fun configure(optionsJson: String, promise: Promise) {
    promise.resolve(null)
  }

  override fun setControlState(kind: String, stateJson: String, promise: Promise) {
    promise.resolve(null)
  }

  override fun getControlState(kind: String, promise: Promise) {
    promise.resolve(null)
  }

  override fun reloadControls(kind: String?, promise: Promise) {
    promise.resolve(null)
  }

  override fun getInitialControlEvent(promise: Promise) {
    promise.resolve(null)
  }

  override fun drainPendingEvents(promise: Promise) {
    promise.resolve("[]")
  }

  companion object {
    const val NAME = "IosControls"
  }
}
