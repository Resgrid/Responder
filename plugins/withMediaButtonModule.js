const { withDangerousMod, withMainApplication } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * iOS MediaButtonModule.swift content
 */
const IOS_SWIFT_MODULE = `import Foundation
import MediaPlayer
import React

@objc(MediaButtonModule)
class MediaButtonModule: RCTEventEmitter {
    
    private var hasListeners = false
    private var commandCenter: MPRemoteCommandCenter?
    
    override init() {
        super.init()
        commandCenter = MPRemoteCommandCenter.shared()
    }
    
    override static func moduleName() -> String! {
        return "MediaButtonModule"
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            "onMediaButtonPlayPause",
            "onMediaButtonPlay",
            "onMediaButtonPause",
            "onMediaButtonToggle",
            "onMediaButtonNext",
            "onMediaButtonPrevious"
        ]
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    @objc
    func startListening() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Setup play/pause toggle command (primary PTT trigger)
            self.commandCenter?.togglePlayPauseCommand.isEnabled = true
            self.commandCenter?.togglePlayPauseCommand.addTarget { [weak self] event in
                self?.sendEventIfListening("onMediaButtonToggle", body: ["timestamp": Date().timeIntervalSince1970 * 1000])
                return .success
            }
            
            // Setup play command
            self.commandCenter?.playCommand.isEnabled = true
            self.commandCenter?.playCommand.addTarget { [weak self] event in
                self?.sendEventIfListening("onMediaButtonPlay", body: ["timestamp": Date().timeIntervalSince1970 * 1000])
                return .success
            }
            
            // Setup pause command
            self.commandCenter?.pauseCommand.isEnabled = true
            self.commandCenter?.pauseCommand.addTarget { [weak self] event in
                self?.sendEventIfListening("onMediaButtonPause", body: ["timestamp": Date().timeIntervalSince1970 * 1000])
                return .success
            }
            
            // Setup next track command (optional - can be used for other PTT actions)
            self.commandCenter?.nextTrackCommand.isEnabled = true
            self.commandCenter?.nextTrackCommand.addTarget { [weak self] event in
                self?.sendEventIfListening("onMediaButtonNext", body: ["timestamp": Date().timeIntervalSince1970 * 1000])
                return .success
            }
            
            // Setup previous track command (optional)
            self.commandCenter?.previousTrackCommand.isEnabled = true
            self.commandCenter?.previousTrackCommand.addTarget { [weak self] event in
                self?.sendEventIfListening("onMediaButtonPrevious", body: ["timestamp": Date().timeIntervalSince1970 * 1000])
                return .success
            }
            
            // Setup now playing info to enable media controls
            var nowPlayingInfo = [String: Any]()
            nowPlayingInfo[MPMediaItemPropertyTitle] = "PTT Active"
            nowPlayingInfo[MPMediaItemPropertyArtist] = "Resgrid"
            nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
            nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = 0.0
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
            
            print("[MediaButtonModule] Started listening for media button events")
        }
    }
    
    @objc
    func stopListening() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.commandCenter?.togglePlayPauseCommand.removeTarget(nil)
            self.commandCenter?.playCommand.removeTarget(nil)
            self.commandCenter?.pauseCommand.removeTarget(nil)
            self.commandCenter?.nextTrackCommand.removeTarget(nil)
            self.commandCenter?.previousTrackCommand.removeTarget(nil)
            
            self.commandCenter?.togglePlayPauseCommand.isEnabled = false
            self.commandCenter?.playCommand.isEnabled = false
            self.commandCenter?.pauseCommand.isEnabled = false
            self.commandCenter?.nextTrackCommand.isEnabled = false
            self.commandCenter?.previousTrackCommand.isEnabled = false
            
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            
            print("[MediaButtonModule] Stopped listening for media button events")
        }
    }
    
    private func sendEventIfListening(_ eventName: String, body: [String: Any]?) {
        guard hasListeners else { return }
        sendEvent(withName: eventName, body: body)
    }
}
`;

/**
 * iOS MediaButtonModule.m (Objective-C bridge) content
 */
const IOS_OBJC_BRIDGE = `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(MediaButtonModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startListening)
RCT_EXTERN_METHOD(stopListening)

@end
`;

/**
 * Android MediaButtonModule.kt content
 */
const ANDROID_MODULE = `package {{PACKAGE_NAME}}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.util.Log
import android.view.KeyEvent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class MediaButtonModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        private const val TAG = "MediaButtonModule"
    }

    private var mediaSession: MediaSession? = null
    private var isListening = false
    private var mediaButtonReceiver: BroadcastReceiver? = null

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "MediaButtonModule"
    }

    @ReactMethod
    fun startListening() {
        if (isListening) return

        val context = reactApplicationContext ?: return

        // Create media session for capturing media button events
        mediaSession = MediaSession(context, "ResgridPTT").apply {
            // Set the media button callback
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() {
                    sendEvent("onMediaButtonEvent", createParams(KeyEvent.KEYCODE_MEDIA_PLAY, "ACTION_DOWN"))
                }

                override fun onPause() {
                    sendEvent("onMediaButtonEvent", createParams(KeyEvent.KEYCODE_MEDIA_PAUSE, "ACTION_DOWN"))
                }

                override fun onStop() {
                    sendEvent("onMediaButtonEvent", createParams(KeyEvent.KEYCODE_MEDIA_STOP, "ACTION_DOWN"))
                }

                override fun onSkipToNext() {
                    sendEvent("onMediaButtonEvent", createParams(KeyEvent.KEYCODE_MEDIA_NEXT, "ACTION_DOWN"))
                }

                override fun onSkipToPrevious() {
                    sendEvent("onMediaButtonEvent", createParams(KeyEvent.KEYCODE_MEDIA_PREVIOUS, "ACTION_DOWN"))
                }

                override fun onMediaButtonEvent(mediaButtonEvent: Intent): Boolean {
                    val keyEvent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        mediaButtonEvent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        mediaButtonEvent.getParcelableExtra(Intent.EXTRA_KEY_EVENT)
                    }
                    
                    keyEvent?.let { event ->
                        val action = when (event.action) {
                            KeyEvent.ACTION_DOWN -> "ACTION_DOWN"
                            KeyEvent.ACTION_UP -> "ACTION_UP"
                            else -> "UNKNOWN"
                        }
                        
                        // Handle play/pause toggle and headset hook (primary PTT triggers)
                        when (event.keyCode) {
                            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
                            KeyEvent.KEYCODE_HEADSETHOOK,
                            KeyEvent.KEYCODE_MEDIA_PLAY,
                            KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                                sendEvent("onMediaButtonEvent", createParams(event.keyCode, action))
                                return true
                            }
                        }
                    }
                    return super.onMediaButtonEvent(mediaButtonEvent)
                }
            })

            // Set playback state to enable media button handling
            val playbackState = PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY or
                    PlaybackState.ACTION_PAUSE or
                    PlaybackState.ACTION_PLAY_PAUSE or
                    PlaybackState.ACTION_STOP or
                    PlaybackState.ACTION_SKIP_TO_NEXT or
                    PlaybackState.ACTION_SKIP_TO_PREVIOUS
                )
                .setState(PlaybackState.STATE_PLAYING, 0, 1.0f)
                .build()
            setPlaybackState(playbackState)

            // Activate the session
            isActive = true
        }

        // Register a broadcast receiver for media button events (fallback)
        mediaButtonReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (Intent.ACTION_MEDIA_BUTTON == intent?.action) {
                    val keyEvent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT)
                    }
                    
                    keyEvent?.let { event ->
                        val action = when (event.action) {
                            KeyEvent.ACTION_DOWN -> "ACTION_DOWN"
                            KeyEvent.ACTION_UP -> "ACTION_UP"
                            else -> "UNKNOWN"
                        }
                        sendEvent("onMediaButtonEvent", createParams(event.keyCode, action))
                    }
                }
            }
        }

        val filter = IntentFilter(Intent.ACTION_MEDIA_BUTTON)
        filter.priority = IntentFilter.SYSTEM_HIGH_PRIORITY
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(mediaButtonReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            context.registerReceiver(mediaButtonReceiver, filter)
        }

        isListening = true
    }

    @ReactMethod
    fun stopListening() {
        if (!isListening) return

        mediaSession?.apply {
            isActive = false
            release()
        }
        mediaSession = null

        mediaButtonReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                Log.d(TAG, "Failed to unregister media button receiver: \${e.message}")
            }
        }
        mediaButtonReceiver = null

        isListening = false
    }

    private fun createParams(keyCode: Int, action: String): WritableMap {
        return Arguments.createMap().apply {
            putInt("keyCode", keyCode)
            putString("action", action)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun onHostResume() {
        // App is in foreground - ensure media session is active
        mediaSession?.isActive = true
    }

    override fun onHostPause() {
        // App is in background - keep media session active for background audio
    }

    override fun onHostDestroy() {
        stopListening()
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter Support
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter Support
    }
}
`;

/**
 * Android MediaButtonPackage.kt content
 */
const ANDROID_PACKAGE = `package {{PACKAGE_NAME}}

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

class MediaButtonPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(MediaButtonModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<View, ReactShadowNode<*>>> {
        return emptyList()
    }
}
`;

/**
 * Resolves the Android namespace/package name from build.gradle or build.gradle.kts.
 * Probes both Groovy and Kotlin DSL files and uses a regex that handles both syntaxes:
 * - Groovy: namespace 'com.example.app' or namespace "com.example.app"
 * - Kotlin DSL: namespace = "com.example.app"
 *
 * @param {string} projectRoot - The project root directory
 * @param {string} fallback - Fallback package name if not found (default: 'wtdt.resgrid.andriod')
 * @returns {string} The resolved namespace or fallback
 */
function resolveBasePackageName(projectRoot, fallback = 'wtdt.resgrid.andriod') {
  // Regex that accepts optional equals sign for both Groovy and Kotlin DSL
  const namespaceRegex = /namespace\s*(?:=)?\s*['"]([^'"]+)['"]/;

  // Probe build.gradle (Groovy DSL) first
  const groovyPath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (fs.existsSync(groovyPath)) {
    const content = fs.readFileSync(groovyPath, 'utf-8');
    const match = content.match(namespaceRegex);
    if (match) {
      return match[1];
    }
  }

  // Probe build.gradle.kts (Kotlin DSL) as fallback
  const ktsPath = path.join(projectRoot, 'android', 'app', 'build.gradle.kts');
  if (fs.existsSync(ktsPath)) {
    const content = fs.readFileSync(ktsPath, 'utf-8');
    const match = content.match(namespaceRegex);
    if (match) {
      return match[1];
    }
  }

  return fallback;
}

/**
 * Expo config plugin to add MediaButtonModule for AirPods/earbuds PTT support.
 *
 * This plugin:
 * 1. Creates the MediaButtonModule.swift and MediaButtonModule.m files in the iOS project
 * 2. Updates the bridging header to include necessary imports
 * 3. Creates MediaButtonModule.kt and MediaButtonPackage.kt for Android
 * 4. Registers the package in MainApplication.kt
 */
const withMediaButtonModule = (config) => {
  // Add iOS native module files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName;
      const iosProjectPath = path.join(projectRoot, 'ios', projectName);

      // Ensure the directory exists
      if (!fs.existsSync(iosProjectPath)) {
        fs.mkdirSync(iosProjectPath, { recursive: true });
      }

      // Write MediaButtonModule.swift
      const swiftPath = path.join(iosProjectPath, 'MediaButtonModule.swift');
      fs.writeFileSync(swiftPath, IOS_SWIFT_MODULE);
      console.log('[withMediaButtonModule] Created MediaButtonModule.swift');

      // Write MediaButtonModule.m (Objective-C bridge)
      const objcPath = path.join(iosProjectPath, 'MediaButtonModule.m');
      fs.writeFileSync(objcPath, IOS_OBJC_BRIDGE);
      console.log('[withMediaButtonModule] Created MediaButtonModule.m');

      // Update bridging header
      const bridgingHeaderPath = path.join(iosProjectPath, `${projectName}-Bridging-Header.h`);
      if (fs.existsSync(bridgingHeaderPath)) {
        let bridgingHeaderContents = fs.readFileSync(bridgingHeaderPath, 'utf-8');

        const requiredImports = ['#import <React/RCTBridgeModule.h>', '#import <React/RCTEventEmitter.h>'];

        let modified = false;
        for (const importLine of requiredImports) {
          if (!bridgingHeaderContents.includes(importLine)) {
            bridgingHeaderContents += `\n${importLine}`;
            modified = true;
          }
        }

        if (modified) {
          fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContents);
          console.log('[withMediaButtonModule] Updated bridging header with React Native imports');
        }
      }

      return config;
    },
  ]);

  // Add Android native module files
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // Resolve the package name from build.gradle or build.gradle.kts
      const packageName = resolveBasePackageName(projectRoot);

      const packagePath = packageName.replace(/\./g, '/');
      const androidSrcPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);

      // Ensure the directory exists
      if (!fs.existsSync(androidSrcPath)) {
        fs.mkdirSync(androidSrcPath, { recursive: true });
      }

      // Write MediaButtonModule.kt
      const modulePath = path.join(androidSrcPath, 'MediaButtonModule.kt');
      const moduleContent = ANDROID_MODULE.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
      fs.writeFileSync(modulePath, moduleContent);
      console.log('[withMediaButtonModule] Created MediaButtonModule.kt');

      // Write MediaButtonPackage.kt
      const packageFilePath = path.join(androidSrcPath, 'MediaButtonPackage.kt');
      const packageContent = ANDROID_PACKAGE.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
      fs.writeFileSync(packageFilePath, packageContent);
      console.log('[withMediaButtonModule] Created MediaButtonPackage.kt');

      return config;
    },
  ]);

  // Update MainApplication.kt to register the package
  config = withMainApplication(config, (config) => {
    const mainApplication = config.modResults;
    const projectRoot = config.modRequest.projectRoot;

    // Check if MediaButtonPackage is already imported/added
    if (!mainApplication.contents.includes('MediaButtonPackage')) {
      // Resolve the BASE package name from build.gradle or build.gradle.kts
      // This is where the native module files are actually created
      const basePackageName = resolveBasePackageName(projectRoot);

      // Add import statement using the BASE package name (not the variant-specific package)
      // The native module files are created in the base package, not in variant packages like 'development'
      const importStatement = `import ${basePackageName}.MediaButtonPackage`;
      if (!mainApplication.contents.includes(importStatement)) {
        // Add import after the package declaration line
        mainApplication.contents = mainApplication.contents.replace(/^(package\s+[^\n]+\n)/, `$1${importStatement}\n`);
        console.log(`[withMediaButtonModule] Added MediaButtonPackage import from base package: ${basePackageName}`);
      }

      // Add the package to getPackages()
      // Find the packages list and add our package
      const packagesPattern = /val packages = PackageList\(this\)\.packages(\.toMutableList\(\))?/;
      const packagesMatch = mainApplication.contents.match(packagesPattern);

      if (packagesMatch) {
        // Replace the packages declaration, ensuring toMutableList() is present so we can add our package
        mainApplication.contents = mainApplication.contents.replace(packagesPattern, `val packages = PackageList(this).packages.toMutableList()\n            packages.add(MediaButtonPackage())`);
        console.log('[withMediaButtonModule] Registered MediaButtonPackage in MainApplication.kt');
      }
    }

    return config;
  });

  return config;
};

module.exports = withMediaButtonModule;
