import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { recordCommunicationTestPushResponse } from '@/api/communication-tests/communication-tests';
import { useAnalytics } from '@/hooks/use-analytics';
import { usePushNotificationModalStore } from '@/stores/push-notification/store';
import { useToastStore } from '@/stores/toast/store';

import { PushNotificationModal } from '../push-notification-modal';

jest.mock('@/components/ui/modal', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Modal: ({ children, isOpen }: any) => (isOpen ? React.createElement(View, { testID: 'modal' }, children) : null),
    ModalBackdrop: ({ children }: any) => React.createElement(View, {}, children),
    ModalContent: ({ children }: any) => React.createElement(View, {}, children),
    ModalHeader: ({ children }: any) => React.createElement(View, {}, children),
    ModalBody: ({ children }: any) => React.createElement(View, {}, children),
    ModalFooter: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return { Text: ({ children }: any) => React.createElement(Text, {}, children) };
});

// Unlike the shared modal test's mock, this one forwards testID and isDisabled so the confirm
// button can be targeted and its pending state asserted.
jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return {
    Button: ({ children, onPress, testID, isDisabled }: any) => React.createElement(TouchableOpacity, { onPress, testID, disabled: isDisabled }, children),
    ButtonText: ({ children }: any) => React.createElement(Text, {}, children),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');

  return { HStack: ({ children, testID }: any) => React.createElement(View, { testID }, children) };
});

jest.mock('@/components/ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');

  return { VStack: ({ children }: any) => React.createElement(View, {}, children) };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: jest.fn() }));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/stores/push-notification/store', () => ({
  // Keep the real isSafeRouteId; the modal calls it while deciding which action buttons to render.
  ...jest.requireActual('@/stores/push-notification/store'),
  usePushNotificationModalStore: jest.fn(),
}));

jest.mock('@/stores/weather-alerts/weather-alerts-store', () => ({
  useWeatherAlertsStore: { getState: jest.fn(() => ({ handleAlertReceived: jest.fn() })) },
}));

jest.mock('@/api/communication-tests/communication-tests', () => ({
  recordCommunicationTestPushResponse: jest.fn(),
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: { getState: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const RESPONSE_TOKEN = '9f2c4a1b8e7d4f0a';

describe('PushNotificationModal communication test confirmation', () => {
  const hideNotificationModal = jest.fn();
  const showToast = jest.fn();

  const setNotification = (overrides: Record<string, unknown> = {}) => {
    (usePushNotificationModalStore as unknown as jest.Mock).mockReturnValue({
      isOpen: true,
      notification: {
        type: 'communication-test',
        id: RESPONSE_TOKEN,
        eventCode: `CT:${RESPONSE_TOKEN}`,
        title: 'Communication Test',
        body: 'Monthly Check: this is only a test.',
        ...overrides,
      },
      hideNotificationModal,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalytics as jest.Mock).mockReturnValue({ trackEvent: jest.fn() });
    (useToastStore.getState as jest.Mock).mockReturnValue({ showToast });
  });

  it('shows the confirm button and the test explanation', () => {
    setNotification();

    render(<PushNotificationModal />);

    expect(screen.getByTestId('confirm-receipt-button')).toBeTruthy();
    expect(screen.getByTestId('communication-test-prompt')).toBeTruthy();
  });

  it('posts the response token from the event code and closes on success', async () => {
    setNotification();
    (recordCommunicationTestPushResponse as jest.Mock).mockResolvedValue({ Status: 'success' });

    render(<PushNotificationModal />);
    fireEvent.press(screen.getByTestId('confirm-receipt-button'));

    await waitFor(() => {
      expect(recordCommunicationTestPushResponse).toHaveBeenCalledWith(RESPONSE_TOKEN);
    });

    await waitFor(() => {
      expect(hideNotificationModal).toHaveBeenCalled();
    });
    expect(showToast).toHaveBeenCalledWith('success', 'push_notifications.communication_test_confirmed');
  });

  it('keeps the modal open so the responder can retry when the post fails', async () => {
    setNotification();
    (recordCommunicationTestPushResponse as jest.Mock).mockRejectedValue(new Error('offline'));

    render(<PushNotificationModal />);
    fireEvent.press(screen.getByTestId('confirm-receipt-button'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('error', 'push_notifications.communication_test_failed');
    });

    // Dismissing here would strand the responder with no way back to the token, and the run
    // would record them as unreachable on push.
    expect(hideNotificationModal).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-receipt-button').props.disabled).toBe(false);
  });

  it('does not offer confirmation for other notification types', () => {
    setNotification({ type: 'call', id: '1234', eventCode: 'C:1234' });

    render(<PushNotificationModal />);

    expect(screen.queryByTestId('confirm-receipt-button')).toBeNull();
    expect(screen.queryByTestId('communication-test-prompt')).toBeNull();
  });

  it('does not offer confirmation when the push carried no token', () => {
    setNotification({ id: '', eventCode: 'CT:' });

    render(<PushNotificationModal />);

    expect(screen.queryByTestId('confirm-receipt-button')).toBeNull();
  });
});
