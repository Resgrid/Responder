// Mock Platform first, before any other imports
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { LoginInfoBottomSheet } from '../login-info-bottom-sheet';

// Mock analytics
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
  }),
}));

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
  }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useWindowDimensions: () => ({
    width: 400,
    height: 800,
  }),
  Platform: {
    OS: 'ios',
    select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
  },
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => fn,
    formState: { errors: {} },
  }),
  Controller: ({ render, name }: any) => {
    const React = require('react');
    const field = { onChange: jest.fn(), value: '' };
    return render({ field });
  },
}));

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) => {
    const React = require('react');
    return isOpen ? React.createElement('View', { testID: 'actionsheet' }, children) : null;
  },
  ActionsheetBackdrop: (props: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'actionsheet-backdrop' });
  },
  ActionsheetContent: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'actionsheet-content', ...props }, children);
  },
  ActionsheetDragIndicator: (props: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'actionsheet-drag-indicator' });
  },
  ActionsheetDragIndicatorWrapper: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'actionsheet-drag-indicator-wrapper', ...props }, children);
  },
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, disabled, ...props }: any) => {
    const React = require('react');
    return React.createElement('Pressable', { onPress: disabled ? undefined : onPress, testID: 'button', ...props }, children);
  },
  ButtonText: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: 'button-text', ...props }, children);
  },
  ButtonSpinner: (props: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'button-spinner' });
  },
}));

jest.mock('../../ui/form-control', () => ({
  FormControl: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'form-control', ...props }, children);
  },
  FormControlLabel: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'form-control-label', ...props }, children);
  },
  FormControlLabelText: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: 'form-control-label-text', ...props }, children);
  },
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'hstack', ...props }, children);
  },
}));

jest.mock('../../ui/input', () => ({
  Input: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'input', ...props }, children);
  },
  InputField: ({ onChangeText, value, placeholder, autoCapitalize, autoCorrect, textContentType, autoComplete, type, ...props }: any) => {
    const React = require('react');
    return React.createElement('TextInput', {
      testID: 'input-field',
      onChangeText,
      value,
      placeholder,
      autoCapitalize,
      autoCorrect,
      textContentType,
      autoComplete,
      secureTextEntry: type === 'password',
      ...props,
    });
  },
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'vstack', ...props }, children);
  },
}));

describe('LoginInfoBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<LoginInfoBottomSheet {...defaultProps} />);

    expect(screen.getByTestId('actionsheet')).toBeTruthy();
    expect(screen.getByTestId('actionsheet-content')).toBeTruthy();
    // KeyboardAvoidingView is present but without testID - that's expected

    // Find the texts within the label components
    const labelTexts = screen.getAllByTestId('form-control-label-text');
    expect(labelTexts[0].props.children).toBe('settings.username');
    expect(labelTexts[1].props.children).toBe('settings.password');
  });

  it('does not render when closed', () => {
    render(<LoginInfoBottomSheet {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('actionsheet')).toBeNull();
  });

  it('renders username field with correct properties', () => {
    render(<LoginInfoBottomSheet {...defaultProps} />);

    const usernameFields = screen.getAllByTestId('input-field');
    const usernameField = usernameFields[0]; // First input field is username

    expect(usernameField.props.autoCapitalize).toBe('none');
    expect(usernameField.props.autoCorrect).toBe(false);
    expect(usernameField.props.textContentType).toBe('username');
    expect(usernameField.props.autoComplete).toBe('username');
    expect(usernameField.props.placeholder).toBe('settings.enter_username');
  });

  it('renders password field with correct properties', () => {
    render(<LoginInfoBottomSheet {...defaultProps} />);

    const inputFields = screen.getAllByTestId('input-field');
    const passwordField = inputFields[1]; // Second input field is password

    expect(passwordField.props.autoCapitalize).toBe('none');
    expect(passwordField.props.autoCorrect).toBe(false);
    expect(passwordField.props.textContentType).toBe('password');
    expect(passwordField.props.autoComplete).toBe('password');
    expect(passwordField.props.secureTextEntry).toBe(true);
    expect(passwordField.props.placeholder).toBe('settings.enter_password');
  });

  it('uses KeyboardAvoidingView for iOS', () => {
    render(<LoginInfoBottomSheet {...defaultProps} />);

    // KeyboardAvoidingView should be present in the rendered output
    // We can verify it exists by checking the component tree structure
    const vstack = screen.getByTestId('vstack');
    expect(vstack).toBeTruthy();
    // The VStack is wrapped by RNKeyboardAvoidingView, so we need to go up one more level
    expect(vstack.parent?.parent?.type).toBe('RNKeyboardAvoidingView');
  });

  it('renders cancel and save buttons', () => {
    render(<LoginInfoBottomSheet {...defaultProps} />);

    const buttonTexts = screen.getAllByTestId('button-text');
    expect(buttonTexts[0].props.children).toBe('common.cancel');
    expect(buttonTexts[1].props.children).toBe('common.save');
  });

  it('calls onClose when cancel button is pressed', () => {
    render(<LoginInfoBottomSheet {...defaultProps} />);

    const buttons = screen.getAllByTestId('button');
    const cancelButton = buttons[0]; // First button is cancel
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
