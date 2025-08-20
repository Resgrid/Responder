# Bluetooth Audio Modal Analytics Implementation

## Overview

This document describes the analytics implementation for the Bluetooth Audio Modal component (`src/components/bluetooth/bluetooth-audio-modal.tsx`), which tracks user interactions with the Bluetooth audio device management interface for business intelligence and user behavior analysis.

## Implementation Summary

### Analytics Events Tracked

The following analytics events are now tracked in the Bluetooth Audio Modal:

#### Modal Interaction Events
- **`bluetooth_audio_modal_viewed`**: Triggered when the modal is opened
- **`bluetooth_audio_modal_closed`**: Triggered when the modal is closed (with time spent tracking)

#### Scanning Events  
- **`bluetooth_scan_started`**: Triggered when user starts scanning for devices
- **`bluetooth_scan_stopped`**: Triggered when user stops scanning
- **`bluetooth_scan_failed`**: Triggered when scanning fails

#### Device Connection Events
- **`bluetooth_device_connection_started`**: Triggered when user initiates device connection
- **`bluetooth_device_connected`**: Triggered when device connection succeeds
- **`bluetooth_device_connection_failed`**: Triggered when device connection fails
- **`bluetooth_device_disconnection_started`**: Triggered when user initiates device disconnection
- **`bluetooth_device_disconnected`**: Triggered when device disconnection succeeds
- **`bluetooth_device_disconnection_failed`**: Triggered when device disconnection fails

#### Microphone Control Events
- **`bluetooth_microphone_toggled`**: Triggered when user toggles microphone on/off
- **`bluetooth_microphone_toggle_failed`**: Triggered when microphone toggle fails

### Data Tracked

Each analytics event includes relevant contextual data:

#### Modal View Event Data
```typescript
{
  timestamp: string,                    // ISO 8601 timestamp
  bluetoothState: string,              // Current Bluetooth state
  availableDevicesCount: number,       // Number of available devices
  hasConnectedDevice: boolean,         // Whether a device is connected
  connectedDeviceId: string,          // ID of connected device
  connectedDeviceName: string,        // Name of connected device
  isLiveKitConnected: boolean,        // LiveKit connection status
  isAudioRoutingActive: boolean,      // Audio routing status
  hasConnectionError: boolean,        // Whether there's a connection error
  isScanning: boolean,               // Scanning status
  isConnecting: boolean,             // Connection in progress status
  recentButtonEventsCount: number,   // Number of recent button events
}
```

#### Device Connection Event Data
```typescript
{
  timestamp: string,
  deviceId: string,
  deviceName: string,
  hasAudioCapability: boolean,
  supportsMicrophoneControl: boolean,
  rssi?: number,
  previousConnectedDevice?: string,
  error?: string,
}
```

#### Microphone Toggle Event Data
```typescript
{
  timestamp: string,
  action: 'mute' | 'unmute',
  connectedDeviceId: string,
  connectedDeviceName: string,
  supportsMicrophoneControl: boolean,
  isLiveKitConnected: boolean,
  error?: string,
}
```

## Implementation Details

### Core Integration
- **Hook Used:** `useAnalytics()` from `@/hooks/use-analytics`
- **Error Handling:** All analytics calls are wrapped to prevent impact on core functionality
- **Performance:** Analytics calls are non-blocking and use optimized React patterns

### Modal Tracking Pattern
```typescript
// Track when modal opens
useEffect(() => {
  if (isOpen) {
    const openTime = Date.now();
    setModalOpenTime(openTime);
    
    trackEvent('bluetooth_audio_modal_viewed', {
      timestamp: new Date().toISOString(),
      bluetoothState,
      availableDevicesCount: availableDevices.length,
      hasConnectedDevice: !!connectedDevice,
      // ... other contextual data
    });
  }
}, [isOpen, trackEvent, /* dependencies */]);

// Track when modal closes
const handleClose = useCallback(() => {
  if (modalOpenTime !== null) {
    const timeSpent = Date.now() - modalOpenTime;
    trackEvent('bluetooth_audio_modal_closed', {
      timestamp: new Date().toISOString(),
      timeSpent,
      hasConnectedDevice: !!connectedDevice,
      connectedDeviceId: connectedDevice?.id || '',
      wasScanning: isScanning,
      closeMethod: 'user_action',
    });
  }
  onClose();
}, [modalOpenTime, trackEvent, connectedDevice, isScanning, onClose]);
```

### Action Tracking Pattern
```typescript
const handleConnectDevice = React.useCallback(
  async (device: BluetoothAudioDevice) => {
    if (isConnecting) return;

    try {
      trackEvent('bluetooth_device_connection_started', {
        timestamp: new Date().toISOString(),
        deviceId: device.id,
        deviceName: device.name || 'Unknown Device',
        hasAudioCapability: device.hasAudioCapability,
        supportsMicrophoneControl: device.supportsMicrophoneControl,
        rssi: device.rssi || 0,
        previousConnectedDevice: connectedDevice?.id || '',
      });
      
      await bluetoothAudioService.connectToDevice(device.id);
      
      trackEvent('bluetooth_device_connected', {
        timestamp: new Date().toISOString(),
        deviceId: device.id,
        deviceName: device.name || 'Unknown Device',
        hasAudioCapability: device.hasAudioCapability,
        supportsMicrophoneControl: device.supportsMicrophoneControl,
      });
    } catch (error) {
      trackEvent('bluetooth_device_connection_failed', {
        timestamp: new Date().toISOString(),
        deviceId: device.id,
        deviceName: device.name || 'Unknown Device',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  [isConnecting, trackEvent, connectedDevice]
);
```

## Test Coverage

Comprehensive unit tests have been implemented covering:

### Analytics Integration Tests
- Verifies `useAnalytics` hook is properly imported and used
- Tests that analytics events are called with correct parameters
- Validates data structure and types

### Event-Specific Tests
- **Modal View Tracking**: Tests tracking when modal is displayed with various states
- **Device Actions**: Tests tracking of device connection/disconnection operations
- **Microphone Control**: Tests tracking of microphone toggle operations
- **Scanning Operations**: Tests tracking of scan start/stop/failure events
- **Error Scenarios**: Tests tracking of error conditions

### Data Validation Tests
- **Timestamp Format**: Validates ISO 8601 timestamp format
- **Data Types**: Ensures all properties have correct JavaScript types
- **Required Properties**: Verifies all required fields are present
- **Edge Cases**: Tests handling of null/undefined values and error conditions

### Test File Structure
```
src/components/bluetooth/__tests__/bluetooth-audio-modal.test.tsx
├── Analytics Integration
│   ├── Basic hook integration
│   ├── Modal viewed tracking
│   ├── Modal closed tracking
│   └── Timestamp validation
├── Scanning Analytics
│   ├── Scan start tracking
│   ├── Scan stop tracking
│   └── Scan failure tracking
├── Device Connection Analytics
│   ├── Connection start tracking
│   ├── Connection success tracking
│   ├── Connection failure tracking
│   ├── Disconnection tracking
│   └── Disconnection failure tracking
├── Microphone Analytics
│   ├── Mute tracking
│   ├── Unmute tracking
│   └── Toggle failure tracking
├── Data Validation
│   ├── Required properties validation
│   ├── Data type validation
│   └── Missing data handling
└── Edge Cases
    ├── Modal closed state
    ├── Null device handling
    └── Hook stability
```

## Business Intelligence Value

### User Behavior Insights
- **Device Usage Patterns**: Track which Bluetooth devices are most commonly used
- **Connection Success Rates**: Monitor success/failure rates of device connections
- **Feature Adoption**: Measure usage of microphone control and audio routing features

### Product Optimization
- **Error Analysis**: Identify common connection issues and failure points
- **User Experience**: Track time spent in modal and interaction patterns
- **Performance Monitoring**: Monitor scanning times and connection latencies

### Operational Metrics
- **System Health**: Track Bluetooth subsystem reliability
- **User Engagement**: Measure frequency of Bluetooth audio usage
- **Support Optimization**: Identify areas where users need assistance

## Technical Implementation Notes

### Error Handling
- All analytics calls are wrapped in try-catch blocks
- Failed analytics calls do not impact core Bluetooth functionality
- Error states are tracked for debugging and improvement

### Performance Considerations
- Analytics calls are non-blocking and asynchronous
- Uses `useCallback` for optimized re-renders
- Minimal overhead on component performance
- Timestamps are generated efficiently

### Data Privacy
- Device IDs and names are tracked for analytics purposes
- No personally identifiable information is collected
- All data follows existing analytics privacy patterns

## Dependencies

- `@/hooks/use-analytics`: Core analytics hook
- `@/services/bluetooth-audio.service`: Bluetooth service integration
- `@/stores/app/bluetooth-audio-store`: Bluetooth state management
- `@/stores/app/livekit-store`: LiveKit integration state

## Related Files

- `src/components/bluetooth/bluetooth-audio-modal.tsx`: Main component
- `src/components/bluetooth/__tests__/bluetooth-audio-modal.test.tsx`: Test suite
- `src/hooks/use-analytics.ts`: Analytics hook implementation
- `src/services/aptabase.service.ts`: Analytics service layer

## Usage Examples

### Modal View Tracking
The modal automatically tracks when it becomes visible:
```typescript
// Automatically triggered when modal opens
trackEvent('bluetooth_audio_modal_viewed', {
  timestamp: '2024-01-15T10:00:00.000Z',
  bluetoothState: 'poweredOn',
  availableDevicesCount: 3,
  hasConnectedDevice: true,
  connectedDeviceId: 'device-123',
  connectedDeviceName: 'AirPods Pro',
  isLiveKitConnected: true,
  isAudioRoutingActive: true,
  hasConnectionError: false,
  isScanning: false,
  isConnecting: false,
  recentButtonEventsCount: 2,
});
```

### Device Connection Tracking
```typescript
// When user connects to a device
trackEvent('bluetooth_device_connection_started', {
  timestamp: '2024-01-15T10:01:00.000Z',
  deviceId: 'headset-456',
  deviceName: 'Bluetooth Headset',
  hasAudioCapability: true,
  supportsMicrophoneControl: true,
  rssi: -45,
  previousConnectedDevice: 'device-123',
});
```

### Microphone Control Tracking
```typescript
// When user toggles microphone
trackEvent('bluetooth_microphone_toggled', {
  timestamp: '2024-01-15T10:02:00.000Z',
  action: 'mute',
  connectedDeviceId: 'headset-456',
  connectedDeviceName: 'Bluetooth Headset',
  supportsMicrophoneControl: true,
  isLiveKitConnected: true,
});
```

This implementation provides comprehensive analytics coverage for the Bluetooth Audio Modal while maintaining excellent performance and reliability.
