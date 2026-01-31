const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Android InCallAudioModule.kt content
 * Uses SoundPool to play sounds on the VOICE_COMMUNICATION stream.
 */
const ANDROID_MODULE = `package {{PACKAGE_NAME}}

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*

class InCallAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "InCallAudioModule"
    }

    private var soundPool: SoundPool? = null
    private val soundMap = HashMap<String, Int>()
    private val loadedSounds = HashSet<Int>()
    private var isInitialized = false

    override fun getName(): String {
        return "InCallAudioModule"
    }

    @ReactMethod
    fun initializeAudio() {
        if (isInitialized) return

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(1)
            .setAudioAttributes(audioAttributes)
            .build()

        soundPool?.setOnLoadCompleteListener { _, sampleId, status ->
            if (status == 0) {
                loadedSounds.add(sampleId)
                Log.d(TAG, "Sound loaded successfully: $sampleId")
            } else {
                Log.e(TAG, "Failed to load sound $sampleId, status: $status")
            }
        }

        isInitialized = true
        Log.d(TAG, "InCallAudioModule initialized with USAGE_VOICE_COMMUNICATION")
    }

    @ReactMethod
    fun loadSound(name: String, resourceName: String) {
        if (!isInitialized) initializeAudio()

        val context = reactApplicationContext
        var resId = context.resources.getIdentifier(resourceName, "raw", context.packageName)

        // Fallback: Try identifying without package name if first attempt fails (though context.packageName is usually correct)
        if (resId == 0) {
             Log.w(TAG, "Resource $resourceName not found in \${context.packageName}, trying simplified lookup")
             // Reflection-based lookup if needed, but getIdentifier is standard.
        }

        if (resId != 0) {
            soundPool?.let { pool ->
                val soundId = pool.load(context, resId, 1)
                soundMap[name] = soundId
                Log.d(TAG, "Loading sound: $name from resource: $resourceName (id: $soundId, resId: $resId)")
            }
        } else {
            Log.e(TAG, "Resource not found: $resourceName in package \${context.packageName}")
        }
    }

    @ReactMethod
    fun playSound(name: String) {
        val soundId = soundMap[name]
        if (soundId != null) {
            if (loadedSounds.contains(soundId)) {
                val streamId = soundPool?.play(soundId, 1.0f, 1.0f, 1, 0, 1.0f)
                if (streamId == 0) {
                    Log.e(TAG, "Failed to play sound: $name (id: $soundId). StreamId is 0. Check Volume/Focus.")
                } else {
                    Log.d(TAG, "Playing sound: $name (id: $soundId, stream: $streamId)")
                }
            } else {
                Log.w(TAG, "Sound $name (id: $soundId) is not ready yet. Ignoring play request.")
            }
        } else {
            Log.w(TAG, "Sound not found in map: $name")
        }
    }

    @ReactMethod
    fun cleanup() {
        soundPool?.release()
        soundPool = null
        soundMap.clear()
        loadedSounds.clear()
        isInitialized = false
        Log.d(TAG, "InCallAudioModule cleaned up")
    }
}
`;

/**
 * Android InCallAudioPackage.kt content
 */
const ANDROID_PACKAGE = `package {{PACKAGE_NAME}}

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

class InCallAudioPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(InCallAudioModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<View, ReactShadowNode<*>>> {
        return emptyList()
    }
}
`;

/**
 * Helper to resolve package name
 */
function resolveBasePackageName(projectRoot, fallback = 'com.resgrid.unit') {
  const namespaceRegex = /namespace\s*(?:=)?\s*['"]([^'"]+)['"]/;

  const groovyPath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (fs.existsSync(groovyPath)) {
    const content = fs.readFileSync(groovyPath, 'utf-8');
    const match = content.match(namespaceRegex);
    if (match) return match[1];
  }

  const ktsPath = path.join(projectRoot, 'android', 'app', 'build.gradle.kts');
  if (fs.existsSync(ktsPath)) {
    const content = fs.readFileSync(ktsPath, 'utf-8');
    const match = content.match(namespaceRegex);
    if (match) return match[1];
  }

  return fallback;
}

const withInCallAudioModule = (config) => {
  // 1. Copy Assets to Android res/raw
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resRawPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');

      if (!fs.existsSync(resRawPath)) {
        fs.mkdirSync(resRawPath, { recursive: true });
      }

      const assets = ['software_interface_start.mp3', 'software_interface_back.mp3', 'positive_interface_beep.mp3', 'space_notification1.mp3', 'space_notification2.mp3'];

      const sourceBase = path.join(projectRoot, 'assets', 'audio', 'ui');

      assets.forEach((filename) => {
        const sourcePath = path.join(sourceBase, filename);
        const destPath = path.join(resRawPath, filename);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`[withInCallAudioModule] Copied ${filename} to res/raw/${filename}`);
        } else {
          console.warn(`[withInCallAudioModule] Source audio file not found: ${sourcePath}`);
        }
      });

      return config;
    },
  ]);

  // 2. Add Native Module Code
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageName = resolveBasePackageName(projectRoot);
      const packagePath = packageName.replace(/\./g, '/');
      const androidSrcPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);

      if (!fs.existsSync(androidSrcPath)) {
        fs.mkdirSync(androidSrcPath, { recursive: true });
      }

      // InCallAudioModule.kt
      const modulePath = path.join(androidSrcPath, 'InCallAudioModule.kt');
      const moduleContent = ANDROID_MODULE.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
      fs.writeFileSync(modulePath, moduleContent);
      console.log('[withInCallAudioModule] Created InCallAudioModule.kt');

      // InCallAudioPackage.kt
      const packageFilePath = path.join(androidSrcPath, 'InCallAudioPackage.kt');
      const packageContent = ANDROID_PACKAGE.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
      fs.writeFileSync(packageFilePath, packageContent);
      console.log('[withInCallAudioModule] Created InCallAudioPackage.kt');

      return config;
    },
  ]);

  // 3. Register Package in MainApplication.kt
  config = withMainApplication(config, (config) => {
    const mainApplication = config.modResults;
    const projectRoot = config.modRequest.projectRoot;

    if (!mainApplication.contents.includes('InCallAudioPackage')) {
      const basePackageName = resolveBasePackageName(projectRoot);
      const importStatement = `import ${basePackageName}.InCallAudioPackage`;

      if (!mainApplication.contents.includes(importStatement)) {
        mainApplication.contents = mainApplication.contents.replace(/^(package\s+[^\n]+\n)/, `$1${importStatement}\n`);
      }

      const packagesPattern = /val packages = PackageList\(this\)\.packages(\.toMutableList\(\))?/;
      const packagesMatch = mainApplication.contents.match(packagesPattern);

      if (packagesMatch) {
        // Using the simplest replacement that ensures toMutableList()
        const replacement = `val packages = PackageList(this).packages.toMutableList()\n            packages.add(InCallAudioPackage())`;

        // Avoid double adding if MediaButtonPackage logic already changed it to mutable
        if (mainApplication.contents.includes('packages.add(MediaButtonPackage()')) {
          // Add ours after MediaButtonPackage
          mainApplication.contents = mainApplication.contents.replace('packages.add(MediaButtonPackage())', 'packages.add(MediaButtonPackage())\n            packages.add(InCallAudioPackage())');
        } else {
          // Standard replacement
          mainApplication.contents = mainApplication.contents.replace(packagesPattern, replacement);
        }
        console.log('[withInCallAudioModule] Registered InCallAudioPackage in MainApplication.kt');
      }
    }

    return config;
  });

  return config;
};

module.exports = withInCallAudioModule;
