#import "IosControls.h"

#if __has_include("IosControls-Swift.h")
#import "IosControls-Swift.h"
#else
#import <IosControls/IosControls-Swift.h>
#endif

@implementation IosControls

+ (NSString *)moduleName
{
  return @"IosControls";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeIosControlsSpecJSI>(params);
}

- (NSNumber *)isSupported
{
  return @([RNIosControlsStore shared].isSupported);
}

- (void)configure:(NSString *)optionsJson
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject
{
  NSData *data = [optionsJson dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *options = data
      ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil]
      : nil;
  NSString *appGroup = [options isKindOfClass:[NSDictionary class]] ? options[@"appGroup"] : nil;

  if (![appGroup isKindOfClass:[NSString class]] || appGroup.length == 0) {
    reject(@"E_INVALID_APP_GROUP", @"configure: `appGroup` is required", nil);
    return;
  }

  if (![[RNIosControlsStore shared] configureWithAppGroup:appGroup]) {
    reject(@"E_APP_GROUP_UNAVAILABLE",
           [NSString stringWithFormat:
                @"Could not open App Group \"%@\". Check that the group is listed in both the app "
                @"and the widget extension entitlements.",
                appGroup],
           nil);
    return;
  }

  resolve(nil);
}

- (void)setControlState:(NSString *)kind
              stateJson:(NSString *)stateJson
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  [[RNIosControlsStore shared] setStateWithKind:kind patchJSON:stateJson];
  resolve(nil);
}

- (void)getControlState:(NSString *)kind
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  resolve([[RNIosControlsStore shared] getStateWithKind:kind]);
}

- (void)reloadControls:(NSString *)kind
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
  [[RNIosControlsStore shared] reloadControlsWithKind:kind];
  resolve(nil);
}

- (void)getInitialControlEvent:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject
{
  resolve([[RNIosControlsStore shared] takeLaunchEvent]);
}

- (void)drainPendingEvents:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  resolve([[RNIosControlsStore shared] drainEvents]);
}

@end
