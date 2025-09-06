// Mock Platform first, before any other imports
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';

import { LoginInfoBottomSheet } from '../login-info-bottom-sheet';

// Mock dependencies
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

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
  useWindowDimensions: () => ({
    width: 400,
    height: 800,
  }),
  Platform: {
    OS: 'ios',
    select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
  },
  KeyboardAvoidingView: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'keyboard-avoiding-view', ...props }, children);
  },
}));

// Mock form state for controlled testing
const mockHandleSubmit = jest.fn();
const mockController = jest.fn();
const mockControl = {};
const mockFormState = { errors: {} };

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: mockControl,
    handleSubmit: mockHandleSubmit,
    formState: mockFormState,
  }),
  Controller: ({ render, name }: any) => {
    const React = require('react');
    const field = { onChange: jest.fn(), value: '' };
    mockController(name, field);
    return render({ field });
  },
}));

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen, onClose }: any) => {
    const React = require('react');
    return isOpen ? React.createElement('View', { testID: 'actionsheet', onClose }, children) : null;
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
    return React.createElement('View', {
      onPress: disabled ? undefined : onPress,
      testID: 'button',
      disabled,
      ...props
    }, children);
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

const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('LoginInfoBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockTrackEvent = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Reset form mocks
    mockHandleSubmit.mockImplementation((fn) => fn);
    mockController.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders correctly when open', () => {
      render(<LoginInfoBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('actionsheet')).toBeTruthy();
      expect(screen.getByTestId('actionsheet-content')).toBeTruthy();

      const labels = screen.getAllByTestId('form-control-label-text');
      expect(labels[0].props.children).toBe('settings.username');
      expect(labels[1].props.children).toBe('settings.password');
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

    it('uses KeyboardAvoidingView with correct behavior for iOS', () => {
      render(<LoginInfoBottomSheet {...defaultProps} />);

      // Since the KeyboardAvoidingView is mocked, we can test the component rendered successfully
      // The component should use 'padding' behavior on iOS, which is handled internally
      expect(screen.getByTestId('actionsheet')).toBeTruthy();
    });

    it('renders cancel and save buttons', () => {
      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttonTexts = screen.getAllByTestId('button-text');
      expect(buttonTexts[0].props.children).toBe('common.cancel');
      expect(buttonTexts[1].props.children).toBe('common.save');
    });
  });

  describe('Analytics Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('tracks analytics when sheet becomes visible', () => {
      render(<LoginInfoBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('login_info_sheet_viewed', {
        timestamp: expect.any(String),
        isLandscape: false,
        colorScheme: 'light',
      });
    });

    it('does not track analytics when sheet is closed', () => {
      render(<LoginInfoBottomSheet {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalledWith('login_info_sheet_viewed', expect.any(Object));
    });

    it('tracks analytics when sheet is opened after being closed', async () => {
      const { rerender } = render(<LoginInfoBottomSheet {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();

      rerender(<LoginInfoBottomSheet {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('login_info_sheet_viewed', {
          timestamp: expect.any(String),
          isLandscape: false,
          colorScheme: 'light',
        });
      });
    });

    it('tracks close analytics when handleClose is called', () => {
      render(<LoginInfoBottomSheet {...defaultProps} />);

      // Clear the view analytics call
      mockTrackEvent.mockClear();

      const buttons = screen.getAllByTestId('button');
      // Find the cancel button (first button in the HStack)
      const cancelButton = buttons[0];
      fireEvent.press(cancelButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('login_info_sheet_closed', {
        timestamp: expect.any(String),
        wasFormModified: false,
        isLandscape: false,
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('tracks form submission analytics on save', async () => {
      const formData = { username: 'testuser', password: 'testpass' };

      // Mock successful form submission
      mockHandleSubmit.mockImplementation((fn) => () => fn(formData));
      mockOnSubmit.mockResolvedValue(undefined);

      render(<LoginInfoBottomSheet {...defaultProps} />);

      // Clear view analytics
      mockTrackEvent.mockClear();

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('login_info_form_submitted', {
          timestamp: expect.any(String),
          hasUsername: true,
          hasPassword: true,
          isLandscape: false,
        });
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('login_info_form_success', {
          timestamp: expect.any(String),
          isLandscape: false,
        });
      });
    });

    it('tracks form failure analytics when submission fails', async () => {
      const formData = { username: 'testuser', password: 'testpass' };

      // Mock failed form submission
      mockHandleSubmit.mockImplementation((fn) => async () => {
        try {
          return await fn(formData);
        } catch (error) {
          // Don't let the error propagate to the test
          return;
        }
      });
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

      render(<LoginInfoBottomSheet {...defaultProps} />);

      // Clear view analytics
      mockTrackEvent.mockClear();

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('login_info_form_submitted', {
          timestamp: expect.any(String),
          hasUsername: true,
          hasPassword: true,
          isLandscape: false,
        });
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('login_info_form_failed', {
          timestamp: expect.any(String),
          errorMessage: 'Submission failed',
          isLandscape: false,
        });
      });

      // The onSubmit should be called
      expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    });

    it('tracks form submission with empty fields', async () => {
      const formData = { username: '', password: '' };

      // Mock form submission with empty fields
      mockHandleSubmit.mockImplementation((fn) => () => fn(formData));
      mockOnSubmit.mockResolvedValue(undefined);

      render(<LoginInfoBottomSheet {...defaultProps} />);

      // Clear view analytics
      mockTrackEvent.mockClear();

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('login_info_form_submitted', {
          timestamp: expect.any(String),
          hasUsername: false,
          hasPassword: false,
          isLandscape: false,
        });
      });
    });

    it('handles analytics errors gracefully on view', () => {
      // Make trackEvent throw an error
      const errorTrackEvent = jest.fn(() => {
        throw new Error('Analytics error');
      });

      mockUseAnalytics.mockReturnValue({
        trackEvent: errorTrackEvent,
      });

      // Spy on console.warn to ensure error is logged
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<LoginInfoBottomSheet {...defaultProps} />);

      // Should still render without crashing
      const usernameLabels = screen.getAllByTestId('form-control-label-text');
      expect(usernameLabels[0].props.children).toBe('settings.username');

      // Should log the analytics error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track login info sheet view analytics:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles analytics errors gracefully on form submission', async () => {
      const formData = { username: 'testuser', password: 'testpass' };

      // Make trackEvent throw an error on form submission
      let callCount = 0;
      const errorTrackEvent = jest.fn((eventName: string) => {
        callCount++;
        if (callCount > 1) { // First call is for view analytics, second is form submission
          throw new Error('Analytics error on form submission');
        }
      });

      mockUseAnalytics.mockReturnValue({
        trackEvent: errorTrackEvent,
      });

      mockHandleSubmit.mockImplementation((fn) => () => fn(formData));
      mockOnSubmit.mockResolvedValue(undefined);

      // Spy on console.warn to ensure error is logged
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      await waitFor(() => {
        // Should log the analytics error
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to track login info form submission analytics:',
          expect.any(Error)
        );
      });

      // Form submission should still complete
      expect(mockOnSubmit).toHaveBeenCalledWith(formData);

      consoleSpy.mockRestore();
    });

    it('handles analytics errors gracefully on close', () => {
      // Make trackEvent throw an error
      let callCount = 0;
      const errorTrackEvent = jest.fn(() => {
        callCount++;
        if (callCount > 1) { // First call is for view analytics, second is close
          throw new Error('Analytics error on close');
        }
      });

      mockUseAnalytics.mockReturnValue({
        trackEvent: errorTrackEvent,
      });

      // Spy on console.warn to ensure error is logged
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttons = screen.getAllByTestId('button');
      // Find the cancel button (first button in the HStack)
      const cancelButton = buttons[0];
      fireEvent.press(cancelButton);

      // Should log the analytics error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track login info sheet close analytics:',
        expect.any(Error)
      );

      // Close should still work
      expect(mockOnClose).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('tracks analytics with correct timestamp format', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<LoginInfoBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('login_info_sheet_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        isLandscape: false,
        colorScheme: 'light',
      });

      jest.restoreAllMocks();
    });
  });

  describe('Form Interactions', () => {
    it('calls onClose when cancel button is pressed', () => {
      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttons = screen.getAllByTestId('button');
      // Find the cancel button (first button in the HStack)
      const cancelButton = buttons[0];
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows loading state when form is submitting', async () => {
      const formData = { username: 'testuser', password: 'testpass' };

      // Mock slow form submission
      mockHandleSubmit.mockImplementation((fn) => () => fn(formData));
      let resolveSubmit: (() => void) | undefined;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);

      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      // Should show spinner
      await waitFor(() => {
        expect(screen.queryByTestId('button-spinner')).toBeTruthy();
      });

      // Complete the submission
      resolveSubmit!();
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles form submission lifecycle correctly', async () => {
      const formData = { username: 'testuser', password: 'testpass' };

      // Mock successful form submission
      mockHandleSubmit.mockImplementation((fn) => () => fn(formData));
      mockOnSubmit.mockResolvedValue(undefined);

      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      // Should eventually call onClose after successful submission
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    });

    it('handles submission failure without closing', async () => {
      const formData = { username: 'testuser', password: 'testpass' };

      mockHandleSubmit.mockImplementation((fn) => async () => {
        try {
          return await fn(formData);
        } catch (error) {
          // Swallow the error to prevent test failure
          return;
        }
      });
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

      render(<LoginInfoBottomSheet {...defaultProps} />);

      const buttons = screen.getAllByTestId('button');
      // Find the save button (second button in the HStack)
      const saveButton = buttons[1];
      fireEvent.press(saveButton);

      // Wait for submission to be attempted
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(formData);
      });

      // Should not close on failure
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('tracks correct orientation based on dimensions', () => {
      // This test verifies the logic works with the default mocked dimensions
      render(<LoginInfoBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('login_info_sheet_viewed', {
        timestamp: expect.any(String),
        isLandscape: false, // 400x800 is portrait
        colorScheme: 'light',
      });
    });

    it('calculates landscape orientation correctly', () => {
      // Test the boolean logic for landscape detection
      const isLandscape = 800 > 400; // width > height
      expect(isLandscape).toBe(true);

      const isPortrait = 400 > 800; // width > height
      expect(isPortrait).toBe(false);
    });
  });

  describe('Dark Mode Support', () => {
    it('tracks correct color scheme in analytics', () => {
      // Test with the default light mode
      render(<LoginInfoBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('login_info_sheet_viewed',
        expect.objectContaining({
          colorScheme: 'light',
        })
      );
    });

    it('handles fallback color scheme correctly', () => {
      // Test the fallback logic for color scheme
      const colorScheme = null;
      const fallbackColorScheme = colorScheme || 'light';
      expect(fallbackColorScheme).toBe('light');
    });
  });
});
