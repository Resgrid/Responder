import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { registerDevice, registerUnitDevice } from '@/api/devices/push';
import { useAuthStore } from '@/lib/auth';
import { getModernNotificationSoundsEnabled, hasMigratedNotificationChannelSounds, markNotificationChannelSoundsMigrated } from '@/lib/hooks/use-modern-notification-sounds';
import { logger } from '@/lib/logging';
import { getDeviceUuid } from '@/lib/storage/app';
import { usePushNotificationModalStore } from '@/stores/push-notification/store';
import { securityStore } from '@/stores/security/store';

// Define notification response types
export interface PushNotificationData {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationChannelConfig {
  id: string;
  name: string;
  description: string;
  // Sound used when the modern notification sounds preference is enabled (the
  // default). Every non-custom channel has one so it plays audio, even if the
  // channel was silent before.
  modernSound: string;
  // Sound used when the preference is disabled. `undefined` restores the
  // channel's original behaviour (silent for channels that never had a sound).
  classicSound?: string;
  // Defaults to true when omitted.
  vibration?: boolean;
}

/**
 * Android notification channels, excluding the c1–c25 custom call tones which
 * always use their own dedicated sounds. The channel id is what the Resgrid
 * backend targets, and on Android the channel (not the push payload) owns the
 * sound. When the modern sounds preference is enabled (the default) every
 * channel here plays its modern sound; when disabled they fall back to the
 * classic sound, or to silence for channels that had no sound originally.
 */
const NOTIFICATION_CHANNELS: NotificationChannelConfig[] = [
  { id: 'calls', name: 'Generic Call', description: 'Generic Call', modernSound: 'modernnotification' },
  { id: '0', name: 'Emergency Call', description: 'Emergency Call', modernSound: 'moderncallemergency', classicSound: 'callemergency' },
  { id: '1', name: 'High Call', description: 'High Call', modernSound: 'moderncallhigh', classicSound: 'callhigh' },
  { id: '2', name: 'Medium Call', description: 'Medium Call', modernSound: 'moderncallmedium', classicSound: 'callmedium' },
  { id: '3', name: 'Low Call', description: 'Low Call', modernSound: 'moderncalllow', classicSound: 'calllow' },
  { id: 'notif', name: 'Notification', description: 'Notifications', modernSound: 'modernnotification', vibration: false },
  { id: 'message', name: 'Message', description: 'Messages', modernSound: 'modernmessage', vibration: false },
];

class PushNotificationService {
  private static instance: PushNotificationService;
  private pushToken: string | null = null;
  private notificationListener: { remove: () => void } | null = null;
  private responseListener: { remove: () => void } | null = null;
  // Identifier of the last notification response we surfaced, used to avoid presenting the launch
  // response twice (once from getLastNotificationResponseAsync and once from the response listener).
  private lastHandledResponseId: string | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async createNotificationChannel(id: string, name: string, description: string, sound?: string, vibration: boolean = true): Promise<void> {
    const channelConfig: any = {
      name,
      description,
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#FF231F7C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    };

    if (vibration) {
      channelConfig.vibrationPattern = [0, 250, 250, 250];
    }

    if (sound) {
      channelConfig.sound = sound;
    }

    await Notifications.setNotificationChannelAsync(id, channelConfig);
  }

  private async setupAndroidNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const useModernSounds = getModernNotificationSoundsEnabled();

      // One-time migration for upgraded installs: Android locks a channel's
      // sound at creation time, so standard channels created by a previous
      // version would ignore the (modern) sound configuration below. Delete
      // them once so the loop recreates them with the current sounds.
      if (!hasMigratedNotificationChannelSounds()) {
        for (const channel of NOTIFICATION_CHANNELS) {
          await Notifications.deleteNotificationChannelAsync(channel.id);
        }
        markNotificationChannelSoundsMigrated();
      }

      // Standard call/notification/message channels
      for (const channel of NOTIFICATION_CHANNELS) {
        const sound = useModernSounds ? channel.modernSound : channel.classicSound;
        await this.createNotificationChannel(channel.id, channel.name, channel.description, sound, channel.vibration ?? true);
      }

      // Custom call channels (c1-c25) keep their own dedicated tones.
      for (let i = 1; i <= 25; i++) {
        const channelId = `c${i}`;
        await this.createNotificationChannel(channelId, `Custom Call ${i}`, `Custom Call Tone ${i}`, channelId);
      }

      logger.info({
        message: 'Android notification channels setup completed',
        context: { useModernSounds },
      });
    } catch (error) {
      logger.error({
        message: 'Error setting up Android notification channels',
        context: { error },
      });
    }
  }

  /**
   * Re-applies the channel sounds after the user toggles the "modern
   * notification sounds" preference. Android locks a channel's sound at creation
   * time, so each channel must be deleted and recreated for the new sound to
   * take effect.
   */
  public async refreshNotificationChannelSounds(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const useModernSounds = getModernNotificationSoundsEnabled();

      for (const channel of NOTIFICATION_CHANNELS) {
        await Notifications.deleteNotificationChannelAsync(channel.id);
        const sound = useModernSounds ? channel.modernSound : channel.classicSound;
        await this.createNotificationChannel(channel.id, channel.name, channel.description, sound, channel.vibration ?? true);
      }

      logger.info({
        message: 'Android notification channel sounds refreshed',
        context: { useModernSounds },
      });
    } catch (error) {
      logger.error({
        message: 'Error refreshing Android notification channel sounds',
        context: { error },
      });
    }
  }

  private async initialize(): Promise<void> {
    // Set up notification listeners synchronously before channel setup to ensure immediate registration
    this.notificationListener = Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
    this.responseListener = Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

    // Set up Android notification channels
    await this.setupAndroidNotificationChannels();

    // Handle a cold start: when the app is launched from a killed state by tapping a notification,
    // the response listener above misses that initial tap, so replay it from the last response.
    await this.presentLaunchNotificationResponse();

    logger.info({
      message: 'Push notification service initialized',
    });
  }

  private presentLaunchNotificationResponse = async (): Promise<void> => {
    try {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        this.handleNotificationResponse(lastResponse);
      }
    } catch (error) {
      logger.error({
        message: 'Error handling launch notification response',
        context: { error },
      });
    }
  };

  // Surface a notification in the in-app modal when it carries a string eventCode
  // (e.g. "C:1234" call, "W:9012" weather alert). Shared by the foreground-received and
  // tap-response handlers so a tapped notification stays visible after the app opens.
  private presentNotificationModal = (content: Notifications.NotificationContent): void => {
    const data = content.data;

    if (data && data.eventCode && typeof data.eventCode === 'string') {
      const notificationData: PushNotificationData & { eventCode: string } = {
        eventCode: data.eventCode as string,
        data,
      };

      if (content.title) {
        notificationData.title = content.title;
      }

      if (content.body) {
        notificationData.body = content.body;
      }

      // Show the notification modal using the store
      usePushNotificationModalStore.getState().showNotificationModal(notificationData);
    }
  };

  private handleNotificationReceived = (notification: Notifications.Notification): void => {
    logger.info({
      message: 'Notification received',
      context: {
        data: notification.request.content.data,
      },
    });

    this.presentNotificationModal(notification.request.content);
  };

  private handleNotificationResponse = (response: Notifications.NotificationResponse): void => {
    const identifier = response.notification.request.identifier;

    // Skip if we already surfaced this exact response — guards against the cold-start replay and
    // the response listener both firing for the notification that launched the app.
    if (identifier && identifier === this.lastHandledResponseId) {
      return;
    }
    this.lastHandledResponseId = identifier ?? this.lastHandledResponseId;

    logger.info({
      message: 'Notification response received',
      context: {
        data: response.notification.request.content.data,
      },
    });

    // Mirror the foreground behaviour when the user taps a notification to open the app so the
    // (weather-alert or other) notification stays visible via the persistent modal instead of
    // the app opening to nothing.
    this.presentNotificationModal(response.notification.request.content);
  };

  public async registerForPushNotifications(userId: string, departmentCode: string): Promise<string | null> {
    if (!Device.isDevice) {
      logger.warn({
        message: 'Push notifications are not available on simulator/emulator',
      });
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn({
          message: 'Failed to get push notification permissions',
          context: { status: finalStatus },
        });
        return null;
      }

      // Get the token using the non-Expo push notification service method
      const devicePushToken = await Notifications.getDevicePushTokenAsync();

      // The token format depends on the platform
      const token = Platform.OS === 'ios' ? devicePushToken.data : devicePushToken.data;

      this.pushToken = token as string;

      logger.info({
        message: 'Push notification token obtained',
        context: {
          token: this.pushToken,
          userId,
          platform: Platform.OS,
        },
      });

      await registerDevice({
        UserId: userId,
        Token: this.pushToken,
        Platform: Platform.OS === 'ios' ? 1 : 2,
        DeviceUuid: getDeviceUuid() || '',
        Prefix: departmentCode,
      });

      return this.pushToken;
    } catch (error) {
      logger.error({
        message: 'Error registering for push notifications',
        context: { error },
      });
      return null;
    }
  }

  public getPushToken(): string | null {
    return this.pushToken;
  }

  public async sendTestNotification(): Promise<void> {
    if (!this.pushToken) {
      logger.warn({
        message: 'Cannot send test notification - no push token available',
      });
      return;
    }

    try {
      // This is a local test notification, not sent through a server
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from Resgrid Unit',
          data: { type: 'test', timestamp: new Date().toISOString() },
        },
        trigger: null, // Send immediately
      });

      logger.info({
        message: 'Test notification sent',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to send test notification',
        context: { error },
      });
    }
  }

  public cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();

// React hook for component usage
export const usePushNotifications = () => {
  const userId = useAuthStore((state) => state.userId);
  const rights = securityStore((state) => state.rights);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only register if we have an active user ID and it's different from the previous one
    if (rights && userId && userId !== previousUserIdRef.current) {
      pushNotificationService
        .registerForPushNotifications(userId, rights.DepartmentCode)
        .then((token) => {
          if (token) {
            logger.info({
              message: 'Successfully registered for push notifications',
              context: { userId: userId },
            });
          }
        })
        .catch((error) => {
          logger.error({
            message: 'Error in push notification registration hook',
            context: { error },
          });
        });

      previousUserIdRef.current = userId;
    }

    // Cleanup function
    return () => {
      // No need to clean up here as the service handles its own cleanup
    };
  }, [userId, rights]);

  return {
    pushToken: pushNotificationService.getPushToken(),
    sendTestNotification: () => pushNotificationService.sendTestNotification(),
  };
};
