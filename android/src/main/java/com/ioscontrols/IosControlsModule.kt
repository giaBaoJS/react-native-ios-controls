package com.ioscontrols

import com.facebook.react.bridge.ReactApplicationContext

class IosControlsModule(reactContext: ReactApplicationContext) :
  NativeIosControlsSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeIosControlsSpec.NAME
  }
}
