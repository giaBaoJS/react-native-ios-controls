require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "IosControls"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/giaBaoJS/react-native-ios-controls.git", :tag => "#{s.version}" }

  # ios/ControlWidgets is deliberately excluded: those sources belong to the
  # user's widget extension target (and, for the intents, to the app target as
  # well), added by `npx react-native-ios-controls init`. Compiling them here
  # too would duplicate the AppIntent symbols.
  s.source_files         = "ios/*.{h,m,mm,swift}"
  s.private_header_files = "ios/*.h"

  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }

  install_modules_dependencies(s)
end
