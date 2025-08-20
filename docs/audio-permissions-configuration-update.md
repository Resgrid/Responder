# Audio Service Permissions and Configuration Update

## Overview
Updated the audio service configuration to include proper iOS microphone usage description and Android interruption mode for enhanced audio behavior across platforms.

## Changes Made

### 1. iOS Configuration (app.config.ts)
- **Added**: `NSMicrophoneUsageDescription` to iOS `infoPlist` section
- **Description**: "Allow Resgrid Responder to access the microphone for voice communication and push-to-talk functionality during emergency response."
- **Existing**: `UIBackgroundModes` already includes "audio" for background audio support

### 2. Android Configuration (app.config.ts) 
- **Existing**: `android.permission.RECORD_AUDIO` already declared in permissions array
- **Existing**: Foreground service permissions already properly configured:
  - `android.permission.FOREGROUND_SERVICE`
  - `android.permission.FOREGROUND_SERVICE_MICROPHONE`
  - `android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE`
  - `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`

### 3. Audio Service Configuration (src/services/audio.service.ts)
- **Added**: Import for `InterruptionModeAndroid` from expo-av
- **Added**: `interruptionModeAndroid: InterruptionModeAndroid.DuckOthers` to audio mode configuration
- **Behavior**: This ensures predictable Android audio behavior where the app's audio will duck (lower volume of) other audio instead of completely interrupting it

### 4. Test Updates (src/services/__tests__/audio.service.test.ts)
- **Added**: Mock for `InterruptionModeAndroid` to maintain test compatibility

## Runtime Permission Handling

The app already correctly handles runtime permissions using `expo-audio`:
- **Location**: `src/stores/app/livekit-store.ts`
- **Functions**: `getRecordingPermissionsAsync()` and `requestRecordingPermissionsAsync()`
- **Coverage**: Both Android and iOS platforms
- **Integration**: Permissions are requested when connecting to LiveKit rooms

## Audio Configuration Details

The audio service now uses the following configuration:
```typescript
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,                                    // Enable recording on iOS
  staysActiveInBackground: true,                               // Background audio support  
  playsInSilentModeIOS: true,                                 // Play in silent mode
  shouldDuckAndroid: true,                                    // Duck other audio on Android
  playThroughEarpieceAndroid: true,                           // Use earpiece when appropriate
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,         // iOS: Don't mix with other audio
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // Android: Duck other audio
});
```

## Benefits

1. **iOS**: Clear user-facing microphone permission explanation
2. **Android**: Predictable audio interruption behavior 
3. **Cross-platform**: Consistent audio behavior across platforms
4. **Compliance**: Meets platform requirements for audio permissions
5. **User Experience**: Better audio handling during emergency communications

## Verification

All changes have been verified to:
- ✅ Compile without TypeScript errors
- ✅ Import `InterruptionModeAndroid` correctly
- ✅ Include proper iOS permission description
- ✅ Maintain existing Android permissions
- ✅ Update test mocks appropriately
