/* eslint-disable max-lines-per-function */
import type { ConfigContext, ExpoConfig } from '@expo/config';
import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import { ClientEnv, Env } from './env';
const packageJSON = require('./package.json');

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.APP_ENV !== 'production',
  badges: [
    {
      text: Env.APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

const liveActivityExtension = {
  targetName: 'CheckInTimerWidget',
  bundleIdentifier: `${Env.BUNDLE_ID}.CheckInTimerWidget`,
  entitlements: {
    'com.apple.security.application-groups': [Env.IOS_APP_GROUP],
  },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.NAME,
  description: `${Env.NAME} Resgrid Responder`,
  owner: Env.EXPO_ACCOUNT_OWNER,
  scheme: [Env.SCHEME, 'resgrid'],
  slug: 'resgrid-responder',
  version: Env.VERSION.toString(),
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    icon: './assets/ios-icon.png',
    version: packageJSON.version,
    buildNumber: packageJSON.version,
    supportsTablet: true,
    bundleIdentifier: Env.BUNDLE_ID,
    ...(Env.IOS_APPLE_TEAM_ID ? { appleTeamId: Env.IOS_APPLE_TEAM_ID } : {}),
    requireFullScreen: true,
    infoPlist: {
      UIBackgroundModes: ['remote-notification', 'audio', 'bluetooth-central', 'voip'],
      ITSAppUsesNonExemptEncryption: false,
      UIViewControllerBasedStatusBarAppearance: false,
      NSSupportsLiveActivities: true,
      NSBluetoothAlwaysUsageDescription:
        'Resgrid Responder uses Bluetooth to connect to wireless headsets and speaker-microphone accessories for Push-to-Talk audio. For example, when you pair a Bluetooth speaker-mic, pressing its talk button transmits your voice to your department audio channel.',
      NSMicrophoneUsageDescription:
        'Resgrid Responder uses the microphone to capture your voice for Push-to-Talk and voice communication with your department. For example, when you press and hold the talk button, your voice is transmitted live to dispatchers and other responders on the channel.',
      LSApplicationQueriesSchemes: ['resgrid'],
    },
    entitlements: {
      ...((Env.APP_ENV === 'production' || Env.APP_ENV === 'internal') && {
        'com.apple.developer.usernotifications.critical-alerts': true,
        'com.apple.developer.usernotifications.time-sensitive': true,
      }),
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    version: packageJSON.version,
    versionCode: parseInt(packageJSON.versionCode),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2484c4',
    },
    // 'pan' makes Android scroll the window under the IME on its own. That fights
    // react-native-keyboard-controller: its KeyboardAvoidingView re-measures on every
    // layout, so the OS pan feeds back into the computed padding and the composer
    // settles *under* the keyboard. Edge-to-edge means the OS no longer resizes for us
    // either, so 'resize' leaves keyboard avoidance entirely to the library.
    softwareKeyboardLayoutMode: 'resize',
    package: Env.PACKAGE,
    googleServicesFile: 'google-services.json',
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'resgrid' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: [
      'android.permission.WAKE_LOCK',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAPTURE_AUDIO_OUTPUT',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
    // FOREGROUND_SERVICE_CONNECTED_DEVICE is blocked, not merely absent: Bluetooth PTT handsets
    // route through the microphone FGS session, so the type is unused, and Play rejects any
    // declared foreground-service type whose use case cannot be demonstrated in the app.
    blockedPermissions: ['android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO', 'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE'],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: '#2a7dd5',
        image: './assets/adaptive-icon.png',
        imageWidth: 250,
      },
    ],
    [
      'expo-font',
      {
        fonts: ['./assets/fonts/Inter.ttf'],
      },
    ],
    'expo-localization',
    'expo-router',
    ['react-native-edge-to-edge'],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2a7dd5',
        permissions: {
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: true,
          },
        },
        sounds: [
          'assets/audio/notification.wav',
          'assets/audio/callclosed.wav',
          'assets/audio/callupdated.wav',
          'assets/audio/callemergency.wav',
          'assets/audio/callhigh.wav',
          'assets/audio/calllow.wav',
          'assets/audio/callmedium.wav',
          'assets/audio/newcall.wav',
          'assets/audio/newchat.wav',
          'assets/audio/newmessage.wav',
          'assets/audio/newshift.wav',
          'assets/audio/newtraining.wav',
          'assets/audio/personnelstaffingupdated.wav',
          'assets/audio/personnelstatusupdated.wav',
          'assets/audio/troublealert.wav',
          'assets/audio/unitnotice.wav',
          'assets/audio/unitstatusupdated.wav',
          'assets/audio/upcomingshift.wav',
          'assets/audio/upcomingtraining.wav',
          'assets/audio/modernavailabilityalert.wav',
          'assets/audio/moderncalendar.wav',
          'assets/audio/moderncallclosed.wav',
          'assets/audio/moderncallemergency.wav',
          'assets/audio/moderncallhigh.wav',
          'assets/audio/moderncalllow.wav',
          'assets/audio/moderncallmedium.wav',
          'assets/audio/moderncallupdated.wav',
          'assets/audio/modernchat.wav',
          'assets/audio/modernmessage.wav',
          'assets/audio/modernnotification.wav',
          'assets/audio/modernpersonnelstatus.wav',
          'assets/audio/modernresourceorder.wav',
          'assets/audio/modernshift.wav',
          'assets/audio/modernstaffing.wav',
          'assets/audio/moderntraining.wav',
          'assets/audio/moderntroublealert.wav',
          'assets/audio/modernunitnotice.wav',
          'assets/audio/modernunitstatus.wav',
          'assets/audio/modernweatheralert.wav',
          'assets/audio/custom/c1.wav',
          'assets/audio/custom/c2.wav',
          'assets/audio/custom/c3.wav',
          'assets/audio/custom/c4.wav',
          'assets/audio/custom/c5.wav',
          'assets/audio/custom/c6.wav',
          'assets/audio/custom/c7.wav',
          'assets/audio/custom/c8.wav',
          'assets/audio/custom/c9.wav',
          'assets/audio/custom/c10.wav',
          'assets/audio/custom/c11.wav',
          'assets/audio/custom/c12.wav',
          'assets/audio/custom/c13.wav',
          'assets/audio/custom/c14.wav',
          'assets/audio/custom/c15.wav',
          'assets/audio/custom/c16.wav',
          'assets/audio/custom/c17.wav',
          'assets/audio/custom/c18.wav',
          'assets/audio/custom/c19.wav',
          'assets/audio/custom/c20.wav',
          'assets/audio/custom/c21.wav',
          'assets/audio/custom/c22.wav',
          'assets/audio/custom/c23.wav',
          'assets/audio/custom/c24.wav',
          'assets/audio/custom/c25.wav',
        ],
        requestPermissions: true,
      },
    ],
    [
      '@rnmapbox/maps',
      {
        // Keep in step with the `mapbox` field of the installed @rnmapbox/maps — the JS
        // bindings are generated against a specific native SDK, and pinning an older one
        // makes style props the bindings emit (symbolZOffset and friends) trap natively.
        RNMapboxMapsVersion: '11.23.1',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Resgrid Responder uses your location while you use the app to show your position on the department map and to attach your coordinates when you set a status or respond to a call. For example, when you mark yourself responding, dispatch sees which responders are closest to the scene.',
        locationAlwaysAndWhenInUsePermission:
          'Resgrid Responder uses your location, including in the background, to keep your department dispatch map updated with your position. For example, while you are en route to an emergency call, your location is periodically sent to dispatchers so they can track your arrival, even when the app is not on screen.',
        locationAlwaysPermission:
          'Resgrid Responder uses your location in the background to keep your department dispatch map updated with your position. For example, while you are en route to an emergency call, your location is periodically sent to dispatchers so they can track your arrival, even when the app is not on screen.',
        // Required even though getMotionActivityAsync() is never called: expo-location links
        // CoreMotion (MotionActivityPermissionRequester), and App Store static analysis rejects
        // the binary with ITMS-90683 whenever the framework is referenced and the string is absent.
        motionUsagePermission:
          'Resgrid Responder uses motion data to improve the accuracy of the location shown on the department map. For example, while you are driving to a call, motion data helps distinguish travel from a stop so dispatchers see an accurate position and heading.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        taskManager: {
          locationTaskName: 'location-updates',
          locationTaskOptions: {
            accuracy: 'balanced',
            distanceInterval: 10,
            timeInterval: 5000,
          },
        },
      },
    ],
    [
      'expo-task-manager',
      {
        taskManager: {
          taskName: 'location-updates',
        },
      },
    ],
    [
      'expo-screen-orientation',
      {
        initialOrientation: 'DEFAULT',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraProguardRules: '-keep class expo.modules.location.** { *; }',
          extraMavenRepos: ['../../node_modules/@notifee/react-native/android/libs'],
          targetSdkVersion: 36,
        },
        ios: {
          // The real floor for this dependency set: React Native 0.85's
          // `min_ios_version_supported` and every Expo/RN pod top out at 16.4, and the
          // Live Activity extension guards itself with `@available(iOS 16.2, *)`.
          // Anything higher only locks responders out of installing the app.
          deploymentTarget: '18.1',
        },
      },
    ],
    [
      'expo-asset',
      {
        assets: [
          'assets/mapping',
          'assets/audio/ui/space_notification1.mp3',
          'assets/audio/ui/space_notification2.mp3',
          'assets/audio/ui/positive_interface_beep.mp3',
          'assets/audio/ui/software_interface_start.mp3',
          'assets/audio/ui/software_interface_back.mp3',
        ],
      },
    ],
    [
      'expo-document-picker',
      {
        iCloudContainerEnvironment: 'Production',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: 'sentry',
        project: 'responder',
        url: 'https://sentry.resgrid.net/',
      },
    ],
    [
      'expo-navigation-bar',
      {
        position: 'relative',
        visibility: 'hidden',
        behavior: 'inset-touch',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'Resgrid Responder uses the microphone to capture your voice for Push-to-Talk and voice communication with your department. For example, when you press and hold the talk button, your voice is transmitted live to dispatchers and other responders on the channel.',
      },
    ],
    'expo-video',
    [
      'expo-image-picker',
      {
        cameraPermission:
          'Resgrid Responder uses the camera to take photos that you attach to calls. For example, you can photograph an incident scene and attach the image to the active call for dispatchers and other responders to see.',
        photosPermission:
          'Resgrid Responder uses your photo library so you can attach existing photos to calls and chat messages. For example, you can select a saved photo of an incident scene and share it with dispatch and other responders on the call.',
      },
    ],
    'react-native-ble-manager',
    [
      'expo-secure-store',
      {
        // Required even though biometric-gated storage is not used: expo-secure-store
        // instantiates LAContext() unconditionally (SecureStoreModule.swift), so App Store
        // static analysis flags a missing NSFaceIDUsageDescription with ITMS-90683.
        faceIDPermission:
          'Resgrid Responder uses Face ID to unlock the securely stored credentials that keep you signed in to your department. For example, after your device locks, Face ID confirms it is you before the app restores your session.',
      },
    ],
    'expo-web-browser',
    'expo-image',
    'expo-sharing',
    'expo-status-bar',
    '@livekit/react-native-expo-plugin',
    [
      // Explicit strings so the plugin's vague "$(PRODUCT_NAME) needs access" defaults
      // can never surface if plugin ordering changes (it only writes keys that are unset).
      '@config-plugins/react-native-webrtc',
      {
        cameraPermission:
          'Resgrid Responder uses the camera to take photos that you attach to calls. For example, you can photograph an incident scene and attach the image to the active call for dispatchers and other responders to see.',
        microphonePermission:
          'Resgrid Responder uses the microphone to capture your voice for Push-to-Talk and voice communication with your department. For example, when you press and hold the talk button, your voice is transmitted live to dispatchers and other responders on the channel.',
      },
    ],
    '@config-plugins/react-native-callkeep',
    './customGradle.plugin.js',
    './customManifest.plugin.js',
    './plugins/withInCallAudioModule.js',
    [
      './plugins/withLiveActivities.js',
      {
        appGroupId: Env.IOS_APP_GROUP,
      },
    ],
    ['app-icon-badge', appIconBadgeConfig],
  ],
  extra: {
    ...ClientEnv,
    eas: {
      projectId: Env.EAS_PROJECT_ID,
      build: {
        experimental: {
          ios: {
            appExtensions: [liveActivityExtension],
          },
        },
      },
    },
  },
});
