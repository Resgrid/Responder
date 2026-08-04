# Audio Stream Store

## Overview

The audio stream store uses `expo-audio`, the audio package supported by the current Expo SDK. Remote streams are created with `createAudioPlayer()` and their loading, buffering, playback, completion, and error states are observed through `playbackStatusUpdate` events.

## Player lifecycle

```typescript
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

await setAudioModeAsync({
  allowsRecording: false,
  shouldPlayInBackground: true,
  playsInSilentMode: true,
  interruptionMode: 'duckOthers',
  shouldRouteThroughEarpiece: false,
});

const streamUrl = stream?.Url?.trim();
if (!streamUrl) {
  throw new Error('Audio stream URL is required');
}

const player: AudioPlayer = createAudioPlayer(streamUrl, {
  updateInterval: 1000,
  keepAudioSessionActive: true,
  preferredForwardBufferDuration: 5,
});

player.addListener('playbackStatusUpdate', (status) => {
  // Synchronize playback and buffering state and handle status.error.
});
player.play();
```

Call `player.pause()` followed by `player.remove()` when replacing or stopping a stream. `remove()` releases the native player and its listeners.

## State

`useAudioStreamStore` exposes the available streams, the current stream and player, loading and buffering flags, and the `playStream`, `stopStream`, and `cleanup` operations. The public store API remains stable for UI consumers.

## Dependencies

Use Expo's SDK-aware installer when changing audio dependencies:

```bash
yarn expo install expo-audio
```

Run `yarn expo install --check` after dependency changes to ensure every native package matches the installed Expo SDK.

## Configuration

The app config enables background audio and declares microphone permissions for PTT and LiveKit calls. Runtime microphone permissions are handled with `react-native-permissions` so permission prompts do not race the active LiveKit or CallKeep audio session.

## Troubleshooting

1. For silent-mode playback, verify `playsInSilentMode: true`.
2. For remote stream stalls, inspect the `isBuffering` and `error` fields delivered by `playbackStatusUpdate`.
3. For background playback, verify the platform background-audio configuration and keep the player audio session active.
