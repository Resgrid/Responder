import * as Notifications from 'expo-notifications';
import { openWeatherAlertDetail } from '@/components/weather-alerts/weather-alert-navigation';
import { usePushNotificationModalStore } from '@/stores/push-notification/store';

// Mock expo-device so tests don't attempt to load native modules
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock auth module to prevent side effects and getBaseApiUrl errors
jest.mock('@/lib/auth', () => ({
  useAuthStore: jest.fn(),
}));
// Mock the store, keeping the real parseNotificationData so eventCode routing stays realistic
jest.mock('@/stores/push-notification/store', () => ({
  ...jest.requireActual('@/stores/push-notification/store'),
  usePushNotificationModalStore: {
    getState: jest.fn(),
  },
}));

// Mock the weather alert navigation helper used for weather push deep links
jest.mock('@/components/weather-alerts/weather-alert-navigation', () => ({
  openWeatherAlertDetail: jest.fn(() => Promise.resolve()),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  deleteNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

// Mock other dependencies
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/storage/app', () => ({
  getDeviceUuid: jest.fn(),
  getBaseApiUrl: jest.fn(() => ''),
}));

jest.mock('@/api/devices/push', () => ({
  registerUnitDevice: jest.fn(),
}));

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: {
    getState: jest.fn(() => ({ unit: { id: 'test-unit' } })),
  },
}));

jest.mock('@/stores/security/store', () => ({
  securityStore: {
    getState: jest.fn(() => ({ accessToken: 'test-token' })),
  },
}));

describe('Push Notification Service Integration', () => {
  const mockShowNotificationModal = jest.fn();
  const mockGetState = usePushNotificationModalStore.getState as jest.Mock;
  let notificationReceivedHandler: (notification: Notifications.Notification) => void;
  let notificationResponseHandler: (response: Notifications.NotificationResponse) => void;

  beforeAll(() => {
    // Setup mocks first
    mockGetState.mockReturnValue({
      showNotificationModal: mockShowNotificationModal,
    });

    // Mock the notification listener registration
    (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
      (handler) => {
        notificationReceivedHandler = handler;
        return { remove: jest.fn() };
      }
    );

    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
      (handler) => {
        notificationResponseHandler = handler;
        return { remove: jest.fn() };
      }
    );

    // Import and initialize the service after mocks are set up
    require('../push-notification');
  });

  beforeEach(() => {
    // Only clear the showNotificationModal mock between tests, not the addNotificationReceivedListener mock
    mockShowNotificationModal.mockClear();
    (openWeatherAlertDetail as jest.Mock).mockClear();
    mockGetState.mockReturnValue({
      showNotificationModal: mockShowNotificationModal,
    });
  });

  const createMockNotification = (data: any): Notifications.Notification =>
    ({
      date: Date.now(),
      request: {
        identifier: 'test-id',
        content: {
          title: data.title || null,
          subtitle: null,
          body: data.body || null,
          data: data.data || {},
          sound: null,
        },
        trigger: null,
      },
    } as Notifications.Notification);

  describe('notification received handler', () => {
    it('should show modal for call notification with eventCode', () => {
      const notification = createMockNotification({
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
          callId: '1234',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'C:1234',
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
          callId: '1234',
        },
      });
    });

    it('should show modal for message notification with eventCode', () => {
      const notification = createMockNotification({
        title: 'New Message',
        body: 'You have a new message from dispatch',
        data: {
          eventCode: 'M:5678',
          messageId: '5678',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'M:5678',
        title: 'New Message',
        body: 'You have a new message from dispatch',
        data: {
          eventCode: 'M:5678',
          messageId: '5678',
        },
      });
    });

    it('should show modal for chat notification with eventCode', () => {
      const notification = createMockNotification({
        title: 'Chat Message',
        body: 'New message in chat',
        data: {
          eventCode: 'T:9101',
          chatId: '9101',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'T:9101',
        title: 'Chat Message',
        body: 'New message in chat',
        data: {
          eventCode: 'T:9101',
          chatId: '9101',
        },
      });
    });

    it('should show modal for group chat notification with eventCode', () => {
      const notification = createMockNotification({
        title: 'Group Chat',
        body: 'New message in group chat',
        data: {
          eventCode: 'G:1121',
          groupId: '1121',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'G:1121',
        title: 'Group Chat',
        body: 'New message in group chat',
        data: {
          eventCode: 'G:1121',
          groupId: '1121',
        },
      });
    });

    it('should not show modal for notification without eventCode', () => {
      const notification = createMockNotification({
        title: 'Regular Notification',
        body: 'This is a regular notification without eventCode',
        data: {
          someOtherData: 'value',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('should not show modal for notification with empty eventCode', () => {
      const notification = createMockNotification({
        title: 'Empty Event Code',
        body: 'This notification has empty eventCode',
        data: {
          eventCode: '',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('should not show modal for notification without data', () => {
      const notification = createMockNotification({
        title: 'No Data',
        body: 'This notification has no data object',
        data: null,
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('should handle notification with only title', () => {
      const notification = createMockNotification({
        title: 'Emergency Call',
        data: {
          eventCode: 'C:1234',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'C:1234',
        title: 'Emergency Call',
        body: undefined,
        data: {
          eventCode: 'C:1234',
        },
      });
    });

    it('should handle notification with only body', () => {
      const notification = createMockNotification({
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'C:1234',
        title: undefined,
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
        },
      });
    });

    it('should handle notification with additional data fields', () => {
      const notification = createMockNotification({
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
          callId: '1234',
          priority: 'high',
          location: 'Main St',
          additionalInfo: {
            units: ['E1', 'L1'],
            timestamp: '2023-12-07T10:30:00Z',
          },
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'C:1234',
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
          callId: '1234',
          priority: 'high',
          location: 'Main St',
          additionalInfo: {
            units: ['E1', 'L1'],
            timestamp: '2023-12-07T10:30:00Z',
          },
        },
      });
    });

    it('should not show modal for notification with non-string eventCode', () => {
      const notification = createMockNotification({
        title: 'Non-string Event Code',
        body: 'This notification has non-string eventCode',
        data: {
          eventCode: 123, // Number instead of string
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('should show modal (not navigate) for weather alert received in the foreground', () => {
      const notification = createMockNotification({
        title: 'Severe Weather',
        body: 'Tornado warning in your area',
        data: {
          eventCode: 'W:9012',
          alertId: '9012',
        },
      });

      notificationReceivedHandler(notification);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'W:9012',
        title: 'Severe Weather',
        body: 'Tornado warning in your area',
        data: {
          eventCode: 'W:9012',
          alertId: '9012',
        },
      });
      expect(openWeatherAlertDetail).not.toHaveBeenCalled();
    });

    it('should register notification listener on initialization', () => {
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    });
  });

  describe('notification response handler (tap to open)', () => {
    let responseCounter = 0;
    const createMockResponse = (data: any): Notifications.NotificationResponse => {
      responseCounter += 1;
      const notification = createMockNotification(data);
      // Give each response a distinct identifier so the dedup guard treats them as separate taps.
      (notification.request as any).identifier = `response-${responseCounter}`;
      return {
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification,
      } as Notifications.NotificationResponse;
    };

    it('should navigate straight to the weather alert detail when a weather notification is tapped', () => {
      const response = createMockResponse({
        title: 'Severe Weather',
        body: 'Tornado warning in your area',
        data: {
          eventCode: 'W:9012',
          alertId: '9012',
        },
      });

      notificationResponseHandler(response);

      expect(openWeatherAlertDetail).toHaveBeenCalledWith('9012', { maxAttempts: 20, retryDelayMs: 250 });
      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('should fall back to the modal when a weather notification has no alert id', () => {
      const response = createMockResponse({
        title: 'Severe Weather',
        body: 'Tornado warning in your area',
        data: {
          eventCode: 'W:',
        },
      });

      notificationResponseHandler(response);

      expect(openWeatherAlertDetail).not.toHaveBeenCalled();
      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'W:',
        title: 'Severe Weather',
        body: 'Tornado warning in your area',
        data: {
          eventCode: 'W:',
        },
      });
    });

    it('should show modal for call notification when tapped', () => {
      const response = createMockResponse({
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
        },
      });

      notificationResponseHandler(response);

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'C:1234',
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
        },
      });
    });

    it('should not show modal when the tapped notification has no eventCode', () => {
      const response = createMockResponse({
        title: 'Regular Notification',
        body: 'No eventCode here',
        data: {
          someOtherData: 'value',
        },
      });

      notificationResponseHandler(response);

      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('should not surface the same response twice (dedup guard)', () => {
      const response = createMockResponse({
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
        },
      });

      notificationResponseHandler(response);
      notificationResponseHandler(response);

      expect(mockShowNotificationModal).toHaveBeenCalledTimes(1);
    });

    it('should register response listener on initialization', () => {
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });
  });

  describe('cold start (app launched from a killed state by tapping a notification)', () => {
    it('replays a weather launch notification and navigates to the alert detail', async () => {
      // Require the already-initialized singleton (cached from beforeAll) to reach its launch handler.
      const { pushNotificationService } = require('../push-notification');

      const launchResponse = {
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: createMockNotification({
          title: 'Severe Weather',
          body: 'Tornado warning in your area',
          data: {
            eventCode: 'W:9012',
            alertId: '9012',
          },
        }),
      } as Notifications.NotificationResponse;
      (launchResponse.notification.request as any).identifier = 'launch-response';

      (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValueOnce(launchResponse);
      mockShowNotificationModal.mockClear();

      await (pushNotificationService as any).presentLaunchNotificationResponse();

      expect(openWeatherAlertDetail).toHaveBeenCalledWith('9012', { maxAttempts: 20, retryDelayMs: 250 });
      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });

    it('replays a non-weather launch notification response so the modal is shown', async () => {
      const { pushNotificationService } = require('../push-notification');

      const launchResponse = {
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: createMockNotification({
          title: 'Emergency Call',
          body: 'Structure fire at Main St',
          data: {
            eventCode: 'C:1234',
          },
        }),
      } as Notifications.NotificationResponse;
      (launchResponse.notification.request as any).identifier = 'launch-response-call';

      (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValueOnce(launchResponse);
      mockShowNotificationModal.mockClear();

      await (pushNotificationService as any).presentLaunchNotificationResponse();

      expect(mockShowNotificationModal).toHaveBeenCalledWith({
        eventCode: 'C:1234',
        title: 'Emergency Call',
        body: 'Structure fire at Main St',
        data: {
          eventCode: 'C:1234',
        },
      });
    });

    it('does not present anything when the app was not launched from a notification', async () => {
      const { pushNotificationService } = require('../push-notification');

      (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValueOnce(null);
      mockShowNotificationModal.mockClear();

      await (pushNotificationService as any).presentLaunchNotificationResponse();

      expect(mockShowNotificationModal).not.toHaveBeenCalled();
    });
  });
});
