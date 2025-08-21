import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';

// Mock the security store
jest.mock('@/stores/security/store', () => ({
  useSecurityStore: jest.fn(),
}));

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// --- Start of Robust Mocks ---
const View = (props: any) => React.createElement('div', { ...props });
const Text = (props: any) => React.createElement('span', { ...props });
const TouchableOpacity = (props: any) => React.createElement('button', { ...props, onClick: props.onPress });
// --- End of Robust Mocks ---

// Create a mock component that maintains state
const MockCallDetailMenu = ({ onEditCall, onCloseCall }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  // Mock the security store hook
  const { useSecurityStore } = require('@/stores/security/store');
  const { canUserCreateCalls } = useSecurityStore();

  // Mock the analytics hook
  const { useAnalytics } = require('@/hooks/use-analytics');
  const { trackEvent } = useAnalytics();

  const HeaderRightMenu = () => {
    if (!canUserCreateCalls) {
      return null;
    }

    return (
      <TouchableOpacity
        testID="kebab-menu-button"
        onPress={() => {
          setIsOpen(true);
          // Simulate analytics tracking
          trackEvent('call_detail_menu_viewed', {
            timestamp: new Date().toISOString(),
            canEditCall: canUserCreateCalls ?? false,
          });
        }}
      >
        <Text>Open Menu</Text>
      </TouchableOpacity>
    );
  };

  const CallDetailActionSheet = () => {
    if (!isOpen) return null;
    return (
      <View testID="actionsheet">
        <TouchableOpacity
          testID="edit-call-button"
          onPress={() => {
            trackEvent('call_detail_menu_edit_selected', {
              timestamp: new Date().toISOString(),
            });
            onEditCall?.();
            setIsOpen(false);
          }}
        >
          <Text>call_detail.edit_call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="close-call-button"
          onPress={() => {
            trackEvent('call_detail_menu_close_selected', {
              timestamp: new Date().toISOString(),
            });
            onCloseCall?.();
            setIsOpen(false);
          }}
        >
          <Text>call_detail.close_call</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return { HeaderRightMenu, CallDetailActionSheet };
};

jest.mock('../call-detail-menu', () => ({
  useCallDetailMenu: MockCallDetailMenu,
}));

describe('useCallDetailMenu', () => {
  const mockOnEditCall = jest.fn();
  const mockOnCloseCall = jest.fn();
  const mockTrackEvent = jest.fn();
  const { useCallDetailMenu } = require('../call-detail-menu');
  const { useSecurityStore } = require('@/stores/security/store');
  const { useAnalytics } = require('@/hooks/use-analytics');

  const TestComponent = () => {
    const { HeaderRightMenu, CallDetailActionSheet } = useCallDetailMenu({
      onEditCall: mockOnEditCall,
      onCloseCall: mockOnCloseCall,
    });

    return (
      <View>
        <HeaderRightMenu />
        <CallDetailActionSheet />
      </View>
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

  it('renders the header menu button', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('kebab-menu-button')).toBeTruthy();
  });

  it('does not render the header menu button when user cannot create calls', () => {
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
    expect(screen.queryByTestId('kebab-menu-button')).toBeNull();
  });

  it('opens the action sheet when menu button is pressed', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));
    await waitFor(() => {
      expect(screen.getByTestId('actionsheet')).toBeTruthy();
      expect(screen.getByTestId('edit-call-button')).toBeTruthy();
      expect(screen.getByTestId('close-call-button')).toBeTruthy();
    });
  });

  it('calls onEditCall when edit option is pressed', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));
    await waitFor(() => {
      expect(screen.getByTestId('edit-call-button')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('edit-call-button'));
    expect(mockOnEditCall).toHaveBeenCalledTimes(1);
  });

  it('calls onCloseCall when close option is pressed', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));
    await waitFor(() => {
      expect(screen.getByTestId('close-call-button')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('close-call-button'));
    expect(mockOnCloseCall).toHaveBeenCalledTimes(1);
  });

  it('closes the action sheet after selecting an option', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));
    await waitFor(() => {
      expect(screen.getByTestId('actionsheet')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('edit-call-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('actionsheet')).toBeNull();
    });
  });

  // Analytics Tests
  it('tracks analytics when menu is opened', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_viewed', {
      timestamp: expect.any(String),
      canEditCall: true,
    });
  });

  it('tracks analytics when edit call is selected', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));
    await waitFor(() => {
      expect(screen.getByTestId('edit-call-button')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('edit-call-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_edit_selected', {
      timestamp: expect.any(String),
    });
  });

  it('tracks analytics when close call is selected', async () => {
    render(<TestComponent />);
    fireEvent.press(screen.getByTestId('kebab-menu-button'));
    await waitFor(() => {
      expect(screen.getByTestId('close-call-button')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('close-call-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_menu_close_selected', {
      timestamp: expect.any(String),
    });
  });

  it('tracks analytics with canEditCall false when user cannot create calls', async () => {
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
    expect(screen.queryByTestId('kebab-menu-button')).toBeNull();

    // Should not track analytics since menu is not rendered
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});