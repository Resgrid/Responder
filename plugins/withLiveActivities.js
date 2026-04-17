/* eslint-env node */
const { withDangerousMod, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_EXTENSION_NAME = 'CheckInTimerWidget';

/**
 * Reads a Swift source file from the live-activities plugin directory
 */
function readSwiftSource(filename) {
  const filePath = path.join(__dirname, 'live-activities', filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

/**
 * Add NSSupportsLiveActivities to Info.plist
 */
const withLiveActivitiesInfoPlist = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });
};

/**
 * Create the Widget Extension files in the iOS project
 */
const withLiveActivitiesFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, 'ios');
      const widgetDir = path.join(iosRoot, WIDGET_EXTENSION_NAME);

      // Create widget extension directory
      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      // Copy Swift source files
      const swiftFiles = ['CallCheckInAttributes.swift', 'CallCheckInLiveActivity.swift', 'LiveActivityModule.swift'];

      for (const filename of swiftFiles) {
        const source = readSwiftSource(filename);
        if (source) {
          fs.writeFileSync(path.join(widgetDir, filename), source);
        }
      }

      // Write the Widget Bundle entry point
      const widgetBundle = `
import SwiftUI
import WidgetKit

@main
struct CheckInTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            CallCheckInLiveActivity()
        }
    }
}
`;
      fs.writeFileSync(path.join(widgetDir, 'CheckInTimerWidgetBundle.swift'), widgetBundle);

      // Write Info.plist for the widget extension
      const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>Check-In Timer</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(widgetDir, 'Info.plist'), widgetInfoPlist);

      return config;
    },
  ]);
};

/**
 * Main plugin function
 */
module.exports = (config) => {
  config = withLiveActivitiesInfoPlist(config);
  config = withLiveActivitiesFiles(config);
  return config;
};
