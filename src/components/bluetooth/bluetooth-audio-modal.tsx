import { type TFunction } from 'i18next';
import { AlertTriangle, Bluetooth, BluetoothConnected, CheckCircle, Mic, MicOff, RefreshCw, Signal, Wifi } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '@/components/ui/actionsheet';
import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { bluetoothAudioService } from '@/services/bluetooth-audio.service';
import { type AudioButtonEvent, type BluetoothAudioDevice, useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';

interface BluetoothAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUTTON_LABEL_KEYS: Record<AudioButtonEvent['button'], string> = {
  ptt_start: 'bluetooth.buttons.ptt_start',
  ptt_stop: 'bluetooth.buttons.ptt_stop',
  mute: 'bluetooth.buttons.mute',
  volume_up: 'bluetooth.buttons.volume_up',
  volume_down: 'bluetooth.buttons.volume_down',
  unknown: 'bluetooth.buttons.unknown',
};

/** "Long PTT Start" / "Double Mute" / "Mute" — built from whole phrases so translators
 *  can reorder the modifier, rather than concatenating a loose prefix. */
const formatButtonEventLabel = (t: TFunction, type: AudioButtonEvent['type'], button: AudioButtonEvent['button']): string => {
  const buttonLabel = t(BUTTON_LABEL_KEYS[button] ?? BUTTON_LABEL_KEYS.unknown);

  if (type === 'long_press') {
    return t('bluetooth.button_event.long_press', { button: buttonLabel });
  }

  if (type === 'double_press') {
    return t('bluetooth.button_event.double_press', { button: buttonLabel });
  }

  return buttonLabel;
};

const BluetoothAudioModal: React.FC<BluetoothAudioModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  // Selected field by field: an object selector builds a new reference on every store
  // write, so this modal would re-render on every button event and scan tick whether or
  // not anything it reads actually changed.
  const bluetoothState = useBluetoothAudioStore((state) => state.bluetoothState);
  const isScanning = useBluetoothAudioStore((state) => state.isScanning);
  const isConnecting = useBluetoothAudioStore((state) => state.isConnecting);
  const availableDevices = useBluetoothAudioStore((state) => state.availableDevices);
  const connectedDevice = useBluetoothAudioStore((state) => state.connectedDevice);
  const connectionError = useBluetoothAudioStore((state) => state.connectionError);
  const isAudioRoutingActive = useBluetoothAudioStore((state) => state.isAudioRoutingActive);
  const buttonEvents = useBluetoothAudioStore((state) => state.buttonEvents);
  const lastButtonAction = useBluetoothAudioStore((state) => state.lastButtonAction);

  const isLiveKitConnected = useLiveKitStore((state) => state.isConnected);
  const currentRoom = useLiveKitStore((state) => state.currentRoom);
  const { trackEvent } = useAnalytics();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [modalOpenTime, setModalOpenTime] = useState<number | null>(null);

  const handleStartScan = React.useCallback(async () => {
    try {
      trackEvent('bluetooth_scan_started', {
        timestamp: new Date().toISOString(),
        bluetoothState,
        hasConnectedDevice: !!connectedDevice,
        currentDevicesCount: availableDevices.length,
      });
      await bluetoothAudioService.startScanning(15000); // 15 second scan
    } catch (error) {
      console.error('Failed to start Bluetooth scan:', error);
      trackEvent('bluetooth_scan_failed', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        bluetoothState,
      });
    }
  }, [trackEvent, bluetoothState, connectedDevice, availableDevices.length]);

  useEffect(() => {
    // Update mic state from LiveKit
    if (currentRoom?.localParticipant) {
      setIsMicMuted(!currentRoom.localParticipant.isMicrophoneEnabled);
    }
  }, [currentRoom?.localParticipant, currentRoom?.localParticipant?.isMicrophoneEnabled]);

  // Track analytics when modal is opened
  useEffect(() => {
    if (isOpen) {
      const openTime = new Date().getTime();
      setModalOpenTime(openTime);

      trackEvent('bluetooth_audio_modal_viewed', {
        timestamp: new Date().toISOString(),
        bluetoothState,
        availableDevicesCount: availableDevices.length,
        hasConnectedDevice: !!connectedDevice,
        connectedDeviceId: connectedDevice?.id || '',
        connectedDeviceName: connectedDevice?.name || '',
        isLiveKitConnected,
        isAudioRoutingActive,
        hasConnectionError: !!connectionError,
        isScanning,
        isConnecting,
        recentButtonEventsCount: buttonEvents.length,
      });
    }
  }, [isOpen, trackEvent, bluetoothState, availableDevices.length, connectedDevice, isLiveKitConnected, isAudioRoutingActive, connectionError, isScanning, isConnecting, buttonEvents.length]);

  useEffect(() => {
    // Auto-start scanning when modal opens and Bluetooth is ready
    if (isOpen && bluetoothState === 'poweredOn' && !isScanning && !connectedDevice) {
      handleStartScan().catch((error) => {
        console.error('Failed to start scan:', error);
      });
    }
  }, [isOpen, bluetoothState, isScanning, connectedDevice, handleStartScan]);

  const handleStopScan = React.useCallback(() => {
    trackEvent('bluetooth_scan_stopped', {
      timestamp: new Date().toISOString(),
      bluetoothState,
      devicesFoundCount: availableDevices.length,
    });
    bluetoothAudioService.stopScanning();
  }, [trackEvent, bluetoothState, availableDevices.length]);

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
        console.error('Failed to connect to device:', error);
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

  const handleDisconnectDevice = React.useCallback(async () => {
    try {
      trackEvent('bluetooth_device_disconnection_started', {
        timestamp: new Date().toISOString(),
        deviceId: connectedDevice?.id || '',
        deviceName: connectedDevice?.name || 'Unknown Device',
        isAudioRoutingActive,
      });

      await bluetoothAudioService.disconnectDevice();

      trackEvent('bluetooth_device_disconnected', {
        timestamp: new Date().toISOString(),
        deviceId: connectedDevice?.id || '',
        deviceName: connectedDevice?.name || 'Unknown Device',
      });
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      trackEvent('bluetooth_device_disconnection_failed', {
        timestamp: new Date().toISOString(),
        deviceId: connectedDevice?.id || '',
        deviceName: connectedDevice?.name || 'Unknown Device',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [trackEvent, connectedDevice, isAudioRoutingActive]);

  const handleToggleMicrophone = React.useCallback(async () => {
    if (!currentRoom?.localParticipant) return;

    try {
      const newMuteState = !isMicMuted;

      trackEvent('bluetooth_microphone_toggled', {
        timestamp: new Date().toISOString(),
        action: newMuteState ? 'mute' : 'unmute',
        connectedDeviceId: connectedDevice?.id || '',
        connectedDeviceName: connectedDevice?.name || '',
        supportsMicrophoneControl: connectedDevice?.supportsMicrophoneControl || false,
        isLiveKitConnected,
      });

      await currentRoom.localParticipant.setMicrophoneEnabled(!newMuteState);
      setIsMicMuted(newMuteState);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      trackEvent('bluetooth_microphone_toggle_failed', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        connectedDeviceId: connectedDevice?.id || '',
      });
    }
  }, [currentRoom?.localParticipant, isMicMuted, trackEvent, connectedDevice, isLiveKitConnected]);

  const handleClose = useCallback(() => {
    if (modalOpenTime !== null) {
      const timeSpent = new Date().getTime() - modalOpenTime;
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

  const renderBluetoothState = () => {
    switch (bluetoothState) {
      case 'poweredOff':
        return (
          <VStack space="md" className="items-center p-4">
            <AlertTriangle size={48} color="orange" />
            <Text className="text-center">{t('bluetooth.powered_off_message')}</Text>
          </VStack>
        );
      case 'unauthorized':
        return (
          <VStack space="md" className="items-center p-4">
            <AlertTriangle size={48} color="red" />
            <Text className="text-center">{t('bluetooth.unauthorized_message')}</Text>
          </VStack>
        );
      case 'poweredOn':
        return null;
      default:
        return (
          <VStack space="md" className="items-center p-4">
            <Spinner size="large" />
            <Text className="text-center">{t('bluetooth.checking_status')}</Text>
          </VStack>
        );
    }
  };

  const renderConnectionError = () => {
    if (!connectionError) return null;

    return (
      <Card className="mb-4 border-red-200 bg-red-50 p-4">
        <HStack space="sm" className="items-center">
          <AlertTriangle size={20} color="red" />
          <VStack className="flex-1">
            <Text className="font-medium text-red-700">{t('bluetooth.connection_error')}</Text>
            <Text className="text-sm text-red-600">{connectionError}</Text>
          </VStack>
        </HStack>
      </Card>
    );
  };

  const renderConnectedDevice = () => {
    if (!connectedDevice) return null;

    return (
      <Card className="mb-4 border-green-200 bg-green-50 p-4">
        <HStack space="md" className="items-center justify-between">
          <HStack space="sm" className="flex-1 items-center">
            <BluetoothConnected size={24} color="green" />
            <VStack className="flex-1">
              <Text className="font-medium text-green-700">{connectedDevice.name || t('bluetooth.unknown_device')}</Text>
              <HStack space="xs" className="items-center">
                <Text className="text-sm text-green-600">{t('bluetooth.connected')}</Text>
                {isAudioRoutingActive ? (
                  <Badge variant="outline" className="ml-2">
                    <Text className="text-xs">{t('bluetooth.audio_active')}</Text>
                  </Badge>
                ) : null}
              </HStack>
              {connectedDevice.supportsMicrophoneControl ? <Text className="text-xs text-green-600">{t('bluetooth.button_control_available')}</Text> : null}
            </VStack>
          </HStack>

          <VStack space="xs" className="items-end">
            {isLiveKitConnected ? (
              <Button onPress={handleToggleMicrophone} variant="outline" size="sm">
                {isMicMuted ? <MicOff size={16} color="red" /> : <Mic size={16} color="green" />}
                <ButtonText className="ml-1">{isMicMuted ? t('bluetooth.unmute') : t('bluetooth.mute')}</ButtonText>
              </Button>
            ) : null}

            <Button onPress={handleDisconnectDevice} variant="outline" action="secondary" size="sm">
              <ButtonText>{t('bluetooth.disconnect')}</ButtonText>
            </Button>
          </VStack>
        </HStack>
      </Card>
    );
  };

  const renderRecentButtonEvents = () => {
    if (buttonEvents.length === 0) return null;

    const recentEvents = buttonEvents.slice(0, 3);

    return (
      <Card className="mb-4 p-4">
        <Heading size="sm" className="mb-2">
          {t('bluetooth.recent_button_events')}
        </Heading>
        <VStack space="xs">
          {recentEvents.map((event, index) => (
            <HStack key={`${event.timestamp}-${index}`} space="sm" className="items-center">
              <Text className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</Text>
              <Text className="text-sm">{formatButtonEventLabel(t, event.type, event.button)}</Text>
              {lastButtonAction && lastButtonAction.timestamp === event.timestamp ? (
                <Badge variant="outline" size="sm">
                  <Text className="text-xs">{t('bluetooth.button_event_applied')}</Text>
                </Badge>
              ) : null}
            </HStack>
          ))}
        </VStack>
      </Card>
    );
  };

  const renderDeviceList = () => {
    if (availableDevices.length === 0 && !isScanning) {
      return (
        <VStack space="md" className="items-center p-4">
          <Bluetooth size={48} color="gray" />
          <Text className="text-center text-gray-500">{t('bluetooth.no_devices_found')}</Text>
          <Button onPress={handleStartScan} variant="outline">
            <RefreshCw size={16} />
            <ButtonText className="ml-2">{t('bluetooth.start_scanning')}</ButtonText>
          </Button>
        </VStack>
      );
    }

    return (
      <VStack space="md">
        <HStack className="items-center justify-between">
          <Heading size="md">{t('bluetooth.available_devices')}</Heading>
          <Button onPress={isScanning ? handleStopScan : handleStartScan} variant="outline" size="sm" isDisabled={isConnecting}>
            {isScanning ? (
              <>
                <Spinner size="small" />
                <ButtonText className="ml-2">{t('bluetooth.stop_scan')}</ButtonText>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <ButtonText className="ml-2">{t('bluetooth.scan')}</ButtonText>
              </>
            )}
          </Button>
        </HStack>

        <ScrollView style={{ maxHeight: 200 }}>
          <VStack space="sm">
            {availableDevices.map((device) => (
              <Card key={device.id} className={`p-4 ${device.isConnected ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <HStack space="md" className="items-center justify-between">
                  <HStack space="sm" className="flex-1 items-center">
                    <Bluetooth size={20} color={device.isConnected ? 'green' : 'gray'} />
                    <VStack className="flex-1">
                      <Text className="font-medium">{device.name || t('bluetooth.unknown_device')}</Text>
                      <HStack space="xs" className="items-center">
                        {device.rssi ? (
                          <>
                            <Signal size={12} color="gray" />
                            <Text className="text-xs text-gray-500">{t('bluetooth.rssi_dbm', { rssi: device.rssi })}</Text>
                          </>
                        ) : null}
                        {device.hasAudioCapability ? (
                          <Badge variant="outline" size="sm">
                            <Text className="text-xs">{t('bluetooth.audio')}</Text>
                          </Badge>
                        ) : null}
                        {device.supportsMicrophoneControl ? (
                          <Badge variant="outline" size="sm">
                            <Text className="text-xs">{t('bluetooth.supports_mic_control')}</Text>
                          </Badge>
                        ) : null}
                      </HStack>
                    </VStack>
                  </HStack>

                  {!device.isConnected ? (
                    <Button onPress={() => handleConnectDevice(device)} size="sm" isDisabled={isConnecting}>
                      {isConnecting ? <Spinner size="small" /> : <ButtonText>{t('bluetooth.connect')}</ButtonText>}
                    </Button>
                  ) : (
                    <HStack space="xs" className="items-center">
                      <CheckCircle size={16} color="green" />
                      <Text className="text-sm text-green-600">{t('bluetooth.connected')}</Text>
                    </HStack>
                  )}
                </HStack>
              </Card>
            ))}
          </VStack>
        </ScrollView>
      </VStack>
    );
  };

  const bluetoothStateError = renderBluetoothState();

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose} snapPoints={[60]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-white px-4 py-2 dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <VStack space="lg" className="w-full py-4">
          <HStack className="items-center justify-between">
            <Heading size="xl">{t('bluetooth.title')}</Heading>
            {connectedDevice && isLiveKitConnected ? (
              <Badge variant="outline">
                <Wifi size={12} />
                <Text className="ml-1 text-xs">{t('bluetooth.livekit_active')}</Text>
              </Badge>
            ) : null}
          </HStack>

          <Box className="min-h-[400px]">
            {bluetoothStateError ? (
              bluetoothStateError
            ) : (
              <VStack space="md">
                {renderConnectionError()}
                {renderConnectedDevice()}
                {renderRecentButtonEvents()}
                {renderDeviceList()}
              </VStack>
            )}
          </Box>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};

export default BluetoothAudioModal;
