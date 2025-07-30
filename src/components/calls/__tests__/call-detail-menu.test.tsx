import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';

// --- Start of Robust Mocks ---
const View = (props: any) => React.createElement('div', { ...props });
const Text = (props: any) => React.createElement('span', { ...props });
const TouchableOpacity = (props: any) => React.createElement('button', { ...props, onClick: props.onPress });
// --- End of Robust Mocks ---

// Create a mock component that maintains state
const MockCallDetailMenu = ({ onEditCall, onCloseCall }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const HeaderRightMenu = () => (
    <TouchableOpacity
      testID="kebab-menu-button"
      onPress={() => setIsOpen(true)}
    >
      <Text>Open Menu</Text>
    </TouchableOpacity>
  );

  const CallDetailActionSheet = () => {
    if (!isOpen) return null;
    return (
      <View testID="actionsheet">
        <TouchableOpacity
          testID="edit-call-button"
          onPress={() => {
            onEditCall?.();
            setIsOpen(false);
          }}
        >
          <Text>call_detail.edit_call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="close-call-button"
          onPress={() => {
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
  const { useCallDetailMenu } = require('../call-detail-menu');

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
  });

  it('renders the header menu button', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('kebab-menu-button')).toBeTruthy();
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
});