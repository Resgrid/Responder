/* eslint-env node */
const { withDangerousMod, withEntitlementsPlist, withInfoPlist, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_EXTENSION_NAME = 'CheckInTimerWidget';
// Swift files that belong only in the widget extension target
const WIDGET_SWIFT_FILES = ['CallCheckInAttributes.swift', 'CallCheckInLiveActivity.swift'];
// Swift files that belong only in the main app target
const APP_SWIFT_FILES = ['LiveActivityModule.swift', 'CallCheckInAttributes.swift'];

/**
 * Reads a Swift source file from the live-activities plugin directory.
 */
function readSwiftSource(filename) {
  const filePath = path.join(__dirname, 'live-activities', filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

/**
 * Returns the XML content for a .entitlements plist with a single App Group.
 */
function entitlementsXml(appGroupId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroupId}</string>
  </array>
</dict>
</plist>
`;
}

function resolveAppGroupId(cfg, appGroupId) {
  if (appGroupId) {
    return appGroupId;
  }

  const bundleId = cfg.ios?.bundleIdentifier ?? 'com.example.app';
  return `group.${bundleId}`;
}

/**
 * Returns the Info.plist XML for the widget extension target.
 */
function widgetInfoPlistXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
}

/**
 * Add NSSupportsLiveActivities to the main app's Info.plist.
 */
const withLiveActivitiesInfoPlist = (config) => {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    return cfg;
  });
};

/**
 * Write all source files to their correct iOS directories.
 *
 * Widget-extension files  → ios/CheckInTimerWidget/
 * Main-app native module  → ios/<appName>/
 *
 * LiveActivityModule.swift imports React and cannot be compiled inside the
 * WidgetKit extension sandbox.  CallCheckInAttributes.swift is duplicated
 * so that both the extension and the main app each have the type in scope.
 */
const withLiveActivitiesFiles = (config, appGroupId) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, 'ios');
      const widgetDir = path.join(iosRoot, WIDGET_EXTENSION_NAME);
      const appName = IOSConfig.XcodeUtils.getHackyProjectName(projectRoot, cfg) || 'ResgridResponder';
      const appDir = path.join(iosRoot, appName);
      const resolvedAppGroupId = resolveAppGroupId(cfg, appGroupId);

      // ── 1. Widget extension directory ──────────────────────────────────────
      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      // ── 2. Widget-extension Swift sources ──────────────────────────────────
      for (const filename of WIDGET_SWIFT_FILES) {
        const source = readSwiftSource(filename);
        if (source) {
          fs.writeFileSync(path.join(widgetDir, filename), source);
        }
      }

      // ── 3. Widget bundle entry point ───────────────────────────────────────
      fs.writeFileSync(
        path.join(widgetDir, 'CheckInTimerWidgetBundle.swift'),
        `import SwiftUI
import WidgetKit

@main
struct CheckInTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            CallCheckInLiveActivity()
        }
    }
}
`
      );

      // ── 4. Widget extension Info.plist ─────────────────────────────────────
      fs.writeFileSync(path.join(widgetDir, 'Info.plist'), widgetInfoPlistXml());

      // ── 5. Widget extension entitlements (App Group) ───────────────────────
      fs.writeFileSync(path.join(widgetDir, `${WIDGET_EXTENSION_NAME}.entitlements`), entitlementsXml(resolvedAppGroupId));

      // ── 6. LiveActivityModule.swift → main app dir ─────────────────────────
      //   This file imports React and uses RCTPromiseResolveBlock; it must be
      //   compiled as part of the main application target, NOT the extension.
      const liveActivityModuleSource = readSwiftSource('LiveActivityModule.swift');
      if (liveActivityModuleSource) {
        fs.writeFileSync(path.join(appDir, 'LiveActivityModule.swift'), liveActivityModuleSource);
      }

      // ── 7. CallCheckInAttributes.swift copy → main app dir ─────────────────
      //   LiveActivityModule references CallCheckInAttributes; the main app
      //   needs its own copy since the type lives in the extension module.
      const attrsSource = readSwiftSource('CallCheckInAttributes.swift');
      if (attrsSource) {
        fs.writeFileSync(path.join(appDir, 'CallCheckInAttributes.swift'), attrsSource);
      }

      // ── 8. Remove stale LiveActivityModule.swift from widget dir (if any) ──
      //   Previous plugin runs may have placed it there incorrectly.
      const stalePath = path.join(widgetDir, 'LiveActivityModule.swift');
      if (fs.existsSync(stalePath)) {
        fs.unlinkSync(stalePath);
      }

      return cfg;
    },
  ]);
};

/**
 * Add the shared App Group to the main application target's entitlements.
 * This uses the managed withEntitlementsPlist modifier so that the change
 * is written back through Expo's plist serialiser (safe, idempotent).
 */
const withLiveActivitiesAppEntitlements = (config, appGroupId) => {
  return withEntitlementsPlist(config, (cfg) => {
    const resolvedAppGroupId = resolveAppGroupId(cfg, appGroupId);
    const existing = cfg.modResults['com.apple.security.application-groups'];
    if (!Array.isArray(existing) || !existing.includes(resolvedAppGroupId)) {
      cfg.modResults['com.apple.security.application-groups'] = [...(Array.isArray(existing) ? existing : []), resolvedAppGroupId];
    }
    return cfg;
  });
};

/**
 * Register the CheckInTimerWidget extension target in the Xcode project.
 *
 * Uses withXcodeProject (pbxproj-aware) so that:
 *   • A PBXNativeTarget of type com.apple.product-type.app-extension is created
 *   • Sources (widget Swift files), Frameworks (WidgetKit, SwiftUI, ActivityKit)
 *     and Resources build phases are wired to that target
 *   • LiveActivityModule.swift + CallCheckInAttributes.swift are added to the
 *     main app target's Compile Sources phase
 *   • Build settings for the extension are patched (SWIFT_VERSION, INFOPLIST_FILE,
 *     CODE_SIGN_ENTITLEMENTS, deployment target, bundle id, etc.)
 *   • The whole operation is idempotent: if the target already exists, it skips
 */
const withLiveActivitiesXcodeProject = (config) => {
  return withXcodeProject(config, (cfg) => {
    const xcodeProject = cfg.modResults;
    const bundleId = cfg.ios?.bundleIdentifier ?? 'com.example.app';
    const widgetBundleId = `${bundleId}.${WIDGET_EXTENSION_NAME}`;
    const deploymentTarget = '16.2';
    const projectName = IOSConfig.XcodeUtils.getProductName(xcodeProject) || 'ResgridResponder';

    // ── Idempotency guard ────────────────────────────────────────────────────
    // addTarget() stores target names with surrounding quotes in the comment
    // section, so pbxTargetByName requires the quoted form for lookup.
    if (xcodeProject.pbxTargetByName(`"${WIDGET_EXTENSION_NAME}"`)) {
      return cfg;
    }

    // ── 1. Create the widget extension target ────────────────────────────────
    //   addTarget('name', 'app_extension', subfolder, bundleId) creates:
    //     • PBXNativeTarget entry
    //     • XCBuildConfiguration entries (Debug + Release) with basic settings
    //     • Adds a PBXCopyFilesBuildPhase (Embed App Extensions) to the main app
    //     • Adds a target dependency from the main app to this extension
    const target = xcodeProject.addTarget(WIDGET_EXTENSION_NAME, 'app_extension', WIDGET_EXTENSION_NAME, widgetBundleId);

    // ── 2. Add build phases to the extension target ──────────────────────────
    xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

    // ── 3. Create a PBXGroup for the widget extension directory ───────────────
    //   ensureGroupRecursively creates the group under the project's main group
    //   if it does not already exist, so repeated runs are safe.
    IOSConfig.XcodeUtils.ensureGroupRecursively(xcodeProject, WIDGET_EXTENSION_NAME);

    // ── 4. Add widget Swift sources to the extension's Compile Sources phase ──
    const widgetSourceFiles = ['CallCheckInAttributes.swift', 'CallCheckInLiveActivity.swift', 'CheckInTimerWidgetBundle.swift'];
    for (const filename of widgetSourceFiles) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${WIDGET_EXTENSION_NAME}/${filename}`,
        groupName: WIDGET_EXTENSION_NAME,
        project: xcodeProject,
        targetUuid: target.uuid,
      });
    }

    // ── 5. Add LiveActivityModule + shared attributes to the main app target ──
    //   These files have React imports and must be compiled in the app target.
    const appTarget = xcodeProject.getTarget('com.apple.product-type.application');
    if (appTarget) {
      for (const filename of APP_SWIFT_FILES) {
        IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
          filepath: `${projectName}/${filename}`,
          groupName: projectName,
          project: xcodeProject,
          targetUuid: appTarget.uuid,
        });
      }
    }

    // ── 6. Add required system frameworks to the extension target ────────────
    //   WidgetKit – widget configuration API
    //   SwiftUI   – UI rendering in the extension
    //   ActivityKit – Live Activity push / request API
    for (const framework of ['WidgetKit.framework', 'SwiftUI.framework', 'ActivityKit.framework']) {
      xcodeProject.addFramework(framework, { target: target.uuid, link: true });
    }

    // ── 7. Patch build settings for the extension target ─────────────────────
    //   addTarget() creates sensible defaults but uses the wrong Info.plist path
    //   ("CheckInTimerWidget/CheckInTimerWidget-Info.plist"); we correct it and
    //   add the settings required for a WidgetKit extension.
    const buildSection = xcodeProject.pbxXCBuildConfigurationSection();
    const configListKey = target.pbxNativeTarget.buildConfigurationList;
    const configList = xcodeProject.pbxXCConfigurationList()[configListKey];

    if (configList && Array.isArray(configList.buildConfigurations)) {
      for (const { value: configUuid } of configList.buildConfigurations) {
        const buildConfig = buildSection[configUuid];
        if (!buildConfig || typeof buildConfig !== 'object') {
          continue;
        }
        const s = buildConfig.buildSettings;
        // Correct the Info.plist path set by addTarget()
        s.INFOPLIST_FILE = `${WIDGET_EXTENSION_NAME}/Info.plist`;
        // Code-sign entitlements for the extension
        s.CODE_SIGN_ENTITLEMENTS = `${WIDGET_EXTENSION_NAME}/${WIDGET_EXTENSION_NAME}.entitlements`;
        // Swift version must match the main app
        s.SWIFT_VERSION = '5.0';
        // Minimum deployment target required for Live Activities
        s.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
        // Mirror the main app's device family and versioning
        s.TARGETED_DEVICE_FAMILY = '"1,2"';
        s.CURRENT_PROJECT_VERSION = 1;
        s.MARKETING_VERSION = '1.0';
        s.SKIP_INSTALL = 'YES';
      }
    }

    return cfg;
  });
};

/**
 * Main plugin entry point – applied in the order that matters:
 *   1. Info.plist key first (no dependencies)
 *   2. Files on disk before the pbxproj references them
 *   3. Entitlements for the main app (withEntitlementsPlist)
 *   4. Xcode project registration last (needs the files to already exist)
 */
module.exports = (config, { appGroupId } = {}) => {
  config = withLiveActivitiesInfoPlist(config);
  config = withLiveActivitiesFiles(config, appGroupId);
  config = withLiveActivitiesAppEntitlements(config, appGroupId);
  config = withLiveActivitiesXcodeProject(config);
  return config;
};
