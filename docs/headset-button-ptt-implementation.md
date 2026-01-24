# Headset Button PTT (Push-to-Talk) Implementation

This document describes the implementation of AirPods/Bluetooth earbuds button support for Push-to-Talk (PTT) functionality with LiveKit.

## Overview

AirPods and standard Bluetooth earbuds use AVRCP (Audio/Video Remote Control Profile) to communicate media button events. Unlike specialized PTT devices (Aina, B01 Inrico, HYS) that use BLE characteristics, standard Bluetooth audio devices send button events through the system's audio session.

This implementation adds support for using the play/pause button on AirPods and other Bluetooth earbuds to mute/unmute the microphone during a LiveKit voice call.

## Files Modified/Created

### New Files

1. **`src/services/headset-button.service.ts`**
   - Core service that handles media button events from AirPods and Bluetooth earbuds
   - Listens for `DeviceEventEmitter` events: `HeadsetButtonEvent`, `AudioRouteChange`, `RemoteControlEvent`, `MediaButtonEvent`
   - Provides methods for toggling microphone, starting/stopping monitoring
   - Supports configurable PTT modes: toggle, push-to-talk, disabled

2. **`src/lib/hooks/use-headset-button-ptt.ts`**
   - Custom React hook for easy integration with components
   - Auto-starts/stops monitoring based on LiveKit connection status
   - Provides `toggleMicrophone`, `startMonitoring`, `stopMonitoring` functions

3. **`src/services/__tests__/headset-button.service.test.ts`**
   - Comprehensive unit tests for the headset button service

### Modified Files

1. **`src/stores/app/bluetooth-audio-store.ts`**
   - Added `PttMode` type and `HeadsetButtonConfig` interface
   - Added `isHeadsetButtonMonitoring` state
   - Added `headsetButtonConfig` state
   - Added `setIsHeadsetButtonMonitoring` and `setHeadsetButtonConfig` actions

2. **`src/stores/app/livekit-store.ts`**
   - Added import for `headsetButtonService`
   - Added `toggleMicrophone` and `setMicrophoneEnabled` actions
   - Added `startHeadsetButtonMonitoring` and `stopHeadsetButtonMonitoring` actions
   - Modified `connectToRoom` to auto-start headset button monitoring
   - Modified `disconnectFromRoom` to auto-stop headset button monitoring

3. **`src/translations/en.json`**
   - Added translations for headset button PTT feature

4. **`src/translations/es.json`**
   - Added Spanish translations for headset button PTT feature

5. **`src/translations/ar.json`**
   - Added Arabic translations for headset button PTT feature

## Usage

### Basic Usage with the Hook

```typescript
import { useHeadsetButtonPTT } from '@/lib/hooks/use-headset-button-ptt';

function MyVoiceComponent() {
  const {
    isMonitoring,
    isConnected,
    isMuted,
    toggleMicrophone,
    startMonitoring,
    stopMonitoring,
  } = useHeadsetButtonPTT();

  return (
    <View>
      <Text>Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</Text>
      <Text>Muted: {isMuted ? 'Yes' : 'No'}</Text>
      <Button onPress={toggleMicrophone} title="Toggle Mute" />
    </View>
  );
}
```

### Configuration Options

```typescript
const { updateConfig } = useHeadsetButtonPTT({
  autoStartOnConnect: true,  // Auto-start when LiveKit connects
  autoStopOnDisconnect: true, // Auto-stop when LiveKit disconnects
  pttMode: 'toggle',         // 'toggle', 'push_to_talk', or 'disabled'
  soundFeedback: true,       // Play sounds when muting/unmuting
});

// Update configuration at runtime
updateConfig({
  playPauseAction: 'toggle_mute',  // What to do on play/pause press
  doubleClickAction: 'none',       // What to do on double click
  longPressAction: 'none',         // What to do on long press
});
```

### Using the Service Directly

```typescript
import { headsetButtonService } from '@/services/headset-button.service';

// Initialize the service
await headsetButtonService.initialize();

// Start monitoring
headsetButtonService.startMonitoring();

// Toggle microphone
await headsetButtonService.toggleMicrophone();

// Enable microphone
await headsetButtonService.enableMicrophone();

// Disable microphone
await headsetButtonService.disableMicrophone();

// Stop monitoring
headsetButtonService.stopMonitoring();
```

## How It Works

1. When a user connects to a LiveKit room, the headset button monitoring is automatically started.

2. The service listens for media button events from the system:
   - On iOS: Remote control events via `AVAudioSession`
   - On Android: Media button events via `AudioManager`

3. When the play/pause button is pressed on AirPods or Bluetooth earbuds:
   - Single tap: Toggle microphone mute state
   - Double tap: Configurable action (default: none)
   - Long press: Configurable action (default: none)

4. Sound feedback is played when muting/unmuting (configurable).

5. When the user disconnects from the LiveKit room, monitoring is automatically stopped.

## Supported Button Types

| Button Type | Description |
|------------|-------------|
| `play_pause` | Play/Pause media button (main action button) |
| `hook` | Headset hook button (answer/end call) |
| `next` | Skip to next track |
| `previous` | Skip to previous track |
| `stop` | Stop media playback |

## PTT Modes

| Mode | Description |
|------|-------------|
| `toggle` | Tap to toggle between muted and unmuted |
| `push_to_talk` | Hold to talk, release to mute (not yet implemented) |
| `disabled` | Headset buttons don't affect microphone |

## Native Module Requirements

For full functionality, native modules need to be implemented to:

1. **iOS**: Register for remote control events via `MPRemoteCommandCenter`
2. **Android**: Register a `MediaSession` and handle `MediaButtonReceiver`

The service is designed to receive events from these native modules via `DeviceEventEmitter`. The expected event format:

```typescript
// HeadsetButtonEvent
{
  type: 'play_pause' | 'hook' | 'next' | 'previous' | 'stop',
  source: 'airpods' | 'bluetooth_headset' | 'wired_headset',
  deviceName: string
}
```

## Testing

Run the tests with:

```bash
yarn test -- --testPathPattern="headset-button" --no-coverage
```

## Future Enhancements

1. Implement native modules for iOS and Android to capture media button events
2. Add push-to-talk (hold to talk) mode
3. Add support for volume button controls
4. Add support for custom button mappings
5. Integrate with iOS CallKit for better system integration
