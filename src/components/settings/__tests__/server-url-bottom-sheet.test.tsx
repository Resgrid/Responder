import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';

import { ServerUrlBottomSheet } from '../server-url-bottom-sheet';

// Mock all dependencies
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.server_url': 'Server URL',
        'settings.enter_server_url': 'Enter Resgrid API URL',
        'settings.server_url_note': 'Note: This is the URL of the Resgrid API',
        'form.required': 'This field is required',
        'form.invalid_url': 'Please enter a valid URL',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios' },
  useWindowDimensions: jest.fn(),
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: Function) => () => fn({ url: 'https://test.com' }),
    setValue: jest.fn(),
    formState: { errors: {} },
  }),
  Controller: ({ render }: any) =>
    render({
      field: {
        onChange: jest.fn(),
        value: 'https://test.com',
      },
    }),
}));

jest.mock('@/stores/app/server-url-store', () => ({
  useServerUrlStore: () => ({
    getUrl: jest.fn().mockResolvedValue('https://test.com/api/v4'),
    setUrl: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/lib/env', () => ({
  Env: { API_VERSION: 'v4' },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components more simply
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) => isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: any) => <div data-testid="actionsheet-backdrop">{children}</div>,
  ActionsheetContent: ({ children }: any) => <div data-testid="actionsheet-content">{children}</div>,
  ActionsheetDragIndicator: () => <div data-testid="drag-indicator" />,
  ActionsheetDragIndicatorWrapper: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress }: any) => <button data-testid="button" onClick={onPress}>{children}</button>,
  ButtonText: ({ children }: any) => <span>{children}</span>,
  ButtonSpinner: () => <div data-testid="button-spinner" />,
}));

jest.mock('../../ui/form-control', () => ({
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormControlLabel: ({ children }: any) => <div>{children}</div>,
  FormControlLabelText: ({ children }: any) => <label>{children}</label>,
  FormControlHelperText: ({ children }: any) => <div>{children}</div>,
  FormControlError: ({ children }: any) => <div>{children}</div>,
  FormControlErrorText: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../ui/center', () => ({
  Center: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children }: any) => <div style={{ display: 'flex' }}>{children}</div>,
}));

jest.mock('../../ui/input', () => ({
  Input: ({ children }: any) => <div>{children}</div>,
  InputField: (props: any) => <input data-testid="input-field" {...props} />,
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children }: any) => <div>{children}</div>,
}));

describe('ServerUrlBottomSheet', () => {
  const mockTrackEvent = jest.fn();
  const mockOnClose = jest.fn();
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
  const mockUseWindowDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default mock for window dimensions (portrait)
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  describe('Basic Rendering', () => {
    it('renders when open', () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);
      expect(screen.getByTestId('actionsheet')).toBeTruthy();
    });

    it('does not render when closed', () => {
      render(<ServerUrlBottomSheet {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('actionsheet')).toBeNull();
    });

    it('renders form elements', () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      expect(screen.getByText('Server URL')).toBeTruthy();
      expect(screen.getByTestId('input-field')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Save')).toBeTruthy();
    });
  });

  describe('Analytics Integration', () => {
    it('tracks view analytics when sheet becomes visible', () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('server_url_sheet_viewed', {
        timestamp: expect.any(String),
        isLandscape: false,
        colorScheme: 'light',
      });
    });

    it('tracks view analytics with landscape orientation', () => {
      // Mock landscape dimensions
      mockUseWindowDimensions.mockReturnValue({
        width: 812,
        height: 375,
        scale: 2,
        fontScale: 1,
      });

      render(<ServerUrlBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('server_url_sheet_viewed', {
        timestamp: expect.any(String),
        isLandscape: true,
        colorScheme: 'light',
      });
    });

    it('does not track view analytics when sheet is closed', () => {
      render(<ServerUrlBottomSheet {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks close analytics when cancel button is pressed', () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('server_url_sheet_closed', {
        timestamp: expect.any(String),
        wasFormModified: false,
        isLandscape: false,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles analytics errors gracefully', () => {
      // Make trackEvent throw an error
      const errorTrackEvent = jest.fn(() => {
        throw new Error('Analytics error');
      });

      mockUseAnalytics.mockReturnValue({
        trackEvent: errorTrackEvent,
      });

      // Spy on console.warn to ensure error is logged
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<ServerUrlBottomSheet {...defaultProps} />);

      // Should log the analytics error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track server URL sheet view analytics:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Form Interactions', () => {
    it('tracks form submission analytics', async () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('server_url_form_submitted', {
          timestamp: expect.any(String),
          hasUrl: true,
          urlLength: 16, // Length of 'https://test.com'
          isLandscape: false,
        });
      });
    });

    it('tracks form success analytics', async () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('server_url_form_success', {
          timestamp: expect.any(String),
          isLandscape: false,
        });
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('handles dark color scheme in analytics', () => {
      const { useColorScheme } = require('nativewind');

      // Mock dark color scheme
      useColorScheme.mockReturnValue({ colorScheme: 'dark' });

      render(<ServerUrlBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('server_url_sheet_viewed', {
        timestamp: expect.any(String),
        isLandscape: false,
        colorScheme: 'dark',
      });
    });

    it('handles null color scheme with fallback', () => {
      const { useColorScheme } = require('nativewind');

      // Mock null color scheme
      useColorScheme.mockReturnValue({ colorScheme: null });

      render(<ServerUrlBottomSheet {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('server_url_sheet_viewed', {
        timestamp: expect.any(String),
        isLandscape: false,
        colorScheme: 'light',
      });
    });
  });
});
