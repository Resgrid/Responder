import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useCallDetailMenu } from '../call-detail-menu';

// Mock the security store
jest.mock('@/stores/security/store', () => ({
  useSecurityStore: jest.fn(),
}));

// Mock the i18next hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Mock the UI components
jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen, testID }: { children: React.ReactNode; isOpen: boolean; testID?: string }) => {
    const { View } = require('react-native');
    return isOpen ? <View testID={testID}>{children}</View> : null;
  },
  ActionsheetBackdrop: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-backdrop">{children}</View>;
  },
  ActionsheetContent: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-content">{children}</View>;
  },
  ActionsheetDragIndicator: () => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator" />;
  },
  ActionsheetDragIndicatorWrapper: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator-wrapper">{children}</View>;
  },
  ActionsheetItem: ({ children, onPress, testID }: { children: React.ReactNode; onPress: () => void; testID?: string }) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity testID={testID} onPress={onPress}>{children}</TouchableOpacity>;
  },
  ActionsheetItemText: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('lucide-react-native', () => ({
  EditIcon: () => null,
  XIcon: () => null,
  MoreVerticalIcon: () => {
    const { View } = require('react-native');
    return <View />;
  },
}));

jest.mock('@/components/ui/', () => ({
  Pressable: ({ children, onPress, onPressIn, testID }: { children: React.ReactNode; onPress?: () => void; onPressIn?: () => void; testID?: string }) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity testID={testID} onPress={onPress || onPressIn}>{children}</TouchableOpacity>;
  },
}));

describe('Call Detail Menu Integration Test', () => {
  const mockOnEditCall = jest.fn();
  const mockOnCloseCall = jest.fn();
  const mockTrackEvent = jest.fn();
  const { useSecurityStore } = require('@/stores/security/store');
  const { useAnalytics } = require('@/hooks/use-analytics');

  const TestComponent = () => {
    const { HeaderRightMenu, CallDetailActionSheet } = useCallDetailMenu({
      onEditCall: mockOnEditCall,
      onCloseCall: mockOnCloseCall,
    });

    return (
      <>
        <HeaderRightMenu />
        <CallDetailActionSheet />
      </>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    useAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default mock - user CAN create calls
    useSecurityStore.mockReturnValue({
      canUserCreateCalls: true,
      getRights: jest.fn(),
      isUserDepartmentAdmin: false,
      isUserGroupAdmin: jest.fn(),
      canUserCreateNotes: false,
      canUserCreateMessages: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
    });
  });

  it('should render the header menu button and actionsheet', () => {
    render(<TestComponent />);

    // Check if the kebab menu button is rendered
    expect(screen.getByTestId('kebab-menu-button')).toBeTruthy();
  });

  it('should not render the header menu button when user cannot create calls', () => {
    useSecurityStore.mockReturnValue({
      canUserCreateCalls: false,
      getRights: jest.fn(),
      isUserDepartmentAdmin: false,
      isUserGroupAdmin: jest.fn(),
      canUserCreateNotes: false,
      canUserCreateMessages: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
    });

    render(<TestComponent />);

    // Check that the kebab menu button is not rendered
    expect(screen.queryByTestId('kebab-menu-button')).toBeNull();
  });

  it('should open actionsheet when menu button is pressed', async () => {
    render(<TestComponent />);

    const menuButton = screen.getByTestId('kebab-menu-button');
    fireEvent.press(menuButton);

    // Wait for the actionsheet to appear
    await waitFor(() => {
      expect(screen.getByTestId('call-detail-actionsheet')).toBeTruthy();
    });
  });

  it('should call onEditCall when edit button is pressed', async () => {
    render(<TestComponent />);

    // Open the menu
    const menuButton = screen.getByTestId('kebab-menu-button');
    fireEvent.press(menuButton);

    // Wait for the actionsheet and press edit button
    await waitFor(() => {
      const editButton = screen.getByTestId('edit-call-button');
      fireEvent.press(editButton);
    });

    expect(mockOnEditCall).toHaveBeenCalledTimes(1);
  });

  it('should call onCloseCall when close button is pressed', async () => {
    render(<TestComponent />);

    // Open the menu
    const menuButton = screen.getByTestId('kebab-menu-button');
    fireEvent.press(menuButton);

    // Wait for the actionsheet and press close button
    await waitFor(() => {
      const closeButton = screen.getByTestId('close-call-button');
      fireEvent.press(closeButton);
    });

    expect(mockOnCloseCall).toHaveBeenCalledTimes(1);
  });

  // Analytics Integration Tests
  it('should track analytics when menu is opened', async () => {
    render(<TestComponent />);

    const menuButton = screen.getByTestId('kebab-menu-button');
    fireEvent.press(menuButton);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
        timestamp: expect.any(String),
        canEditCall: true,
      });
    });
  });

  it('should track analytics when edit button is pressed', async () => {
    render(<TestComponent />);

    const menuButton = screen.getByTestId('kebab-menu-button');
    fireEvent.press(menuButton);

    await waitFor(() => {
      const editButton = screen.getByTestId('edit-call-button');
      fireEvent.press(editButton);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_edit_selected', {
      timestamp: expect.any(String),
    });
  });

  it('should track analytics when close button is pressed', async () => {
    render(<TestComponent />);

    const menuButton = screen.getByTestId('kebab-menu-button');
    fireEvent.press(menuButton);

    await waitFor(() => {
      const closeButton = screen.getByTestId('close-call-button');
      fireEvent.press(closeButton);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_close_selected', {
      timestamp: expect.any(String),
    });
  });
});
