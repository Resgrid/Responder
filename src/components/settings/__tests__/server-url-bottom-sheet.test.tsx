import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock useWindowDimensions using jest.spyOn in beforeEach to avoid TurboModule issues

// Mock Platform separately to avoid TurboModule issues
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
}));

import { useAnalytics } from '@/hooks/use-analytics';

import { ServerUrlBottomSheet } from '../server-url-bottom-sheet';

const mockSetUrl = jest.fn().mockResolvedValue(undefined);
const mockGetUrl = jest.fn().mockResolvedValue('https://test.com/api/v4');
const mockGetSystemConfig = jest.fn().mockResolvedValue({
  Data: {
    Locations: [
      { Name: 'US East', ApiUrl: 'https://east.resgrid.com', DisplayName: '', LocationInfo: '', IsDefault: false, AllowsFreeAccounts: true },
      { Name: 'US West', ApiUrl: 'https://west.resgrid.com/api/v4', DisplayName: '', LocationInfo: '', IsDefault: false, AllowsFreeAccounts: true },
    ],
  },
});
const mockFormSetValue = jest.fn();
let mockFormValues: { url: string } = { url: 'https://test.com' };
let mockSelectOnValueChange: ((value: string) => void) | undefined;
const mockOnUrlChanged = jest.fn().mockResolvedValue(undefined);
const mockIsAuthenticated = jest.fn(() => false);

// Mock all dependencies
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@/api/config', () => ({
  getSystemConfig: () => mockGetSystemConfig(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.server_url': 'Server URL',
        'settings.server': 'Server',
        'settings.custom': 'Custom',
        'settings.enter_server_url': 'Enter Resgrid API URL',
        'settings.server_url_note': 'Note: This is the URL of the Resgrid API',
        'loading.loadingData': 'Loading data...',
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
  useColorScheme: jest.fn(() => ({ colorScheme: 'light' })),
  cssInterop: jest.fn(),
  styled: jest.fn(() => (Component: any) => Component),
}));

// Remove duplicate Platform mock since it's already in the react-native mock above

jest.mock('react-hook-form', () => ({
  useForm: () => {
    const React = require('react');
    const [, forceRender] = React.useState(0);

    const setValue = (name: 'url', value: string) => {
      mockFormValues = { ...mockFormValues, [name]: value };
      mockFormSetValue(name, value);
      forceRender((current: number) => current + 1);
    };

    return {
      control: {},
      handleSubmit: (fn: Function) => () => fn({ ...mockFormValues }),
      setValue,
      formState: { errors: {} },
    };
  },
  Controller: ({ name, render }: any) =>
    render({
      field: {
        onChange: (value: string) => {
          mockFormValues = { ...mockFormValues, [name]: value };
        },
        value: mockFormValues[name as keyof typeof mockFormValues] ?? '',
      },
    }),
}));

jest.mock('@/stores/app/server-url-store', () => ({
  useServerUrlStore: () => ({
    getUrl: mockGetUrl,
    setUrl: mockSetUrl,
  }),
}));

jest.mock('@/stores/auth/store', () => ({
  __esModule: true,
  default: (selector: (state: { isAuthenticated: () => boolean }) => boolean) => selector({ isAuthenticated: mockIsAuthenticated }),
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

// Mock UI components with React Native components
jest.mock('../../ui/actionsheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Actionsheet: ({ children, isOpen }: any) => (isOpen ? React.createElement(View, { testID: 'actionsheet' }, children) : null),
    ActionsheetBackdrop: ({ children }: any) => React.createElement(View, { testID: 'actionsheet-backdrop' }, children),
    ActionsheetContent: ({ children }: any) => React.createElement(View, { testID: 'actionsheet-content' }, children),
    ActionsheetDragIndicator: () => React.createElement(View, { testID: 'drag-indicator' }),
    ActionsheetDragIndicatorWrapper: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../ui/button', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    Button: ({ children, onPress }: any) => React.createElement(TouchableOpacity, { testID: 'button', onPress }, children),
    ButtonText: ({ children }: any) => React.createElement(Text, {}, children),
    ButtonSpinner: () => React.createElement(View, { testID: 'button-spinner' }),
  };
});

jest.mock('../../ui/form-control', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    FormControl: ({ children }: any) => React.createElement(View, {}, children),
    FormControlLabel: ({ children }: any) => React.createElement(View, {}, children),
    FormControlLabelText: ({ children }: any) => React.createElement(Text, {}, children),
    FormControlHelperText: ({ children }: any) => React.createElement(Text, {}, children),
    FormControlError: ({ children }: any) => React.createElement(View, {}, children),
    FormControlErrorText: ({ children }: any) => React.createElement(Text, {}, children),
  };
});

jest.mock('../../ui/center', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Center: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HStack: ({ children }: any) => React.createElement(View, { style: { flexDirection: 'row' } }, children),
  };
});

jest.mock('../../ui/input', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  return {
    Input: ({ children }: any) => React.createElement(View, {}, children),
    InputField: (props: any) => React.createElement(TextInput, { testID: 'input-field', ...props }),
  };
});

jest.mock('../../ui/select', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Select: ({ children, onValueChange }: any) => {
      mockSelectOnValueChange = onValueChange;
      return React.createElement(View, { testID: 'server-select' }, children);
    },
    SelectBackdrop: ({ children }: any) => React.createElement(View, {}, children),
    SelectContent: ({ children }: any) => React.createElement(View, {}, children),
    SelectDragIndicator: () => React.createElement(View, {}),
    SelectDragIndicatorWrapper: ({ children }: any) => React.createElement(View, {}, children),
    SelectIcon: () => React.createElement(View, {}),
    SelectInput: ({ value, placeholder }: any) => React.createElement(Text, { testID: 'select-input' }, value || placeholder),
    SelectItem: ({ label, value }: any) => React.createElement(TouchableOpacity, { testID: `select-item-${value}`, onPress: () => mockSelectOnValueChange?.(value) }, React.createElement(Text, {}, label)),
    SelectPortal: ({ children }: any) => React.createElement(View, {}, children),
    SelectTrigger: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../ui/text', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children }: any) => React.createElement(RNText, {}, children),
  };
});

jest.mock('../../ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VStack: ({ children }: any) => React.createElement(View, { style: { flexDirection: 'column' } }, children),
  };
});

describe('ServerUrlBottomSheet', () => {
  const mockTrackEvent = jest.fn();
  const mockOnClose = jest.fn();
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
  // mockUseWindowDimensions is already defined at the top level

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onUrlChanged: mockOnUrlChanged,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetUrl.mockClear();
    mockGetUrl.mockClear();
    mockGetSystemConfig.mockClear();
    mockFormSetValue.mockClear();
    mockOnUrlChanged.mockClear();
    mockIsAuthenticated.mockReset();
    mockIsAuthenticated.mockReturnValue(false);
    mockTrackEvent.mockReset();
    mockTrackEvent.mockReset();
    mockTrackEvent.mockReset();
    mockTrackEvent.mockReset();
    mockTrackEvent.mockReset();
    mockFormValues = { url: 'https://test.com' };
    mockSelectOnValueChange = undefined;

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Mock useWindowDimensions using jest.spyOn to avoid TurboModule issues
    const ReactNative = require('react-native');
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
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

      expect(screen.getByText('Server')).toBeTruthy();
      expect(screen.getByText('Server URL')).toBeTruthy();
      expect(screen.getByTestId('input-field')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByTestId('button-spinner')).toBeTruthy();
      expect(screen.getByText('Loading data...')).toBeTruthy();
    });

    it('loads locations and shows custom when url does not match', async () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetSystemConfig).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('select-input').props.children).toBe('Custom');
    });

    it('loads custom urls as domain only without trailing slash or path', async () => {
      mockGetUrl.mockResolvedValueOnce('https://custom.resgrid.dev/api/v4/');

      render(<ServerUrlBottomSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('select-input').props.children).toBe('Custom');
        expect(screen.getByTestId('input-field').props.value).toBe('https://custom.resgrid.dev');
      });
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
      // Mock landscape dimensions using jest.spyOn
      const ReactNative = require('react-native');
      jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
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
      expect(consoleSpy).toHaveBeenCalledWith('Failed to track server URL sheet view analytics:', expect.any(Error));

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

    it('saves normalized custom url with api suffix', async () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockSetUrl).toHaveBeenCalledWith('https://test.com/api/v4');
      });

      expect(mockOnUrlChanged).not.toHaveBeenCalled();
    });

    it('disables text input when current url matches a configured location', async () => {
      mockGetUrl.mockResolvedValueOnce('https://west.resgrid.com/api/v4');

      render(<ServerUrlBottomSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('select-input').props.children).toBe('US West');
      });

      expect(screen.getByTestId('input-field').props.editable).toBe(false);
    });

    it('fills the text box with the selected location ApiUrl', async () => {
      render(<ServerUrlBottomSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('select-item-US East')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('select-item-US East'));

      await waitFor(() => {
        expect(screen.getByTestId('select-input').props.children).toBe('US East');
        expect(screen.getByTestId('input-field').props.value).toBe('https://east.resgrid.com');
      });

      expect(mockFormSetValue).toHaveBeenCalledWith('url', 'https://east.resgrid.com');
    });

    it('re-enables text input when custom is selected', async () => {
      mockGetUrl.mockResolvedValueOnce('https://west.resgrid.com/api/v4');

      render(<ServerUrlBottomSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('select-input').props.children).toBe('US West');
      });

      fireEvent.press(screen.getByTestId('select-item-__custom__'));

      await waitFor(() => {
        expect(screen.getByTestId('select-input').props.children).toBe('Custom');
      });

      expect(screen.getByTestId('input-field').props.editable).toBe(true);
    });

    it('logs out through callback after saving when authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(true);

      render(<ServerUrlBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockSetUrl).toHaveBeenCalledWith('https://test.com/api/v4');
      });

      await waitFor(() => {
        expect(mockOnUrlChanged).toHaveBeenCalledTimes(1);
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
