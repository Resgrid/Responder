# Audio Permissions and Configuration

## Platform configuration

- iOS declares `NSMicrophoneUsageDescription` and includes `audio` in `UIBackgroundModes`.
- Android declares recording, connected-device, media-playback, and foreground-service permissions needed by PTT and LiveKit calls.
- The `expo-audio` config plugin supplies the user-facing microphone permission message.

## Audio session configuration

The audio service uses the current cross-platform `expo-audio` field names:

```typescript
import { setAudioModeAsync } from 'expo-audio';

await setAudioModeAsync({
  allowsRecording: true,
  shouldPlayInBackground: true,
  playsInSilentMode: true,
  shouldRouteThroughEarpiece: true,
  interruptionMode: Platform.OS === 'android' ? 'duckOthers' : 'mixWithOthers',
});
```

Android ducks other audio while Responder is active. iOS mixes short UI sounds with the active communication session. LiveKit routing can override the earpiece setting for a selected speaker, wired headset, or Bluetooth device.

## Runtime permission handling

`src/stores/app/livekit-store.ts` uses `react-native-permissions` for both Android and iOS microphone access. Permission handling remains separate from audio-session activation so it cannot race LiveKit or CallKeep during a call.

## Verification

After changing native audio configuration, run:

```bash
yarn type-check
yarn expo install --check
```
