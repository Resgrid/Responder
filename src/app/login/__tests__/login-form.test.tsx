// Local mocks for Gluestack UI utilities to avoid TypeErrors
jest.mock('@gluestack-ui/nativewind-utils/tva', () => ({
  tva: jest.fn().mockImplementation(() => jest.fn().mockReturnValue('')),
}));

jest.mock('@gluestack-ui/nativewind-utils/withStyleContext', () => ({
  withStyleContext: jest.fn().mockImplementation((Component) => Component),
  useStyleContext: jest.fn().mockReturnValue({}),
}));

jest.mock('@gluestack-ui/nativewind-utils/withStyleContextAndStates', () => ({
  withStyleContextAndStates: jest.fn().mockImplementation((Component) => Component),
}));

jest.mock('@gluestack-ui/nativewind-utils/withStates', () => ({
  withStates: jest.fn().mockImplementation((Component) => Component),
}));

jest.mock('@gluestack-ui/nativewind-utils/IsWeb', () => ({
  isWeb: false,
}));

jest.mock('@gluestack-ui/nativewind-utils', () => ({
  tva: jest.fn().mockImplementation(() => jest.fn().mockReturnValue('')),
  withStyleContext: jest.fn().mockImplementation((Component) => Component),
  withStyleContextAndStates: jest.fn().mockImplementation((Component) => Component),
  useStyleContext: jest.fn().mockReturnValue({}),
  withStates: jest.fn().mockImplementation((Component) => Component),
  isWeb: false,
}));

// Mock UI components to ensure proper rendering
jest.mock('@/components/ui', () => {
  const React = jest.requireActual('react');
  return {
    View: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref, testID: 'view' }, children)
    ),
  };
});

jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual('react');
  return {
    Button: React.forwardRef(({ children, onPress, ...props }: any, ref: any) =>
      React.createElement('button', { ...props, ref, testID: 'button', onClick: onPress }, children)
    ),
    ButtonText: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'button-text' }, children)
    ),
    ButtonSpinner: React.forwardRef(({ ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'button-spinner' }, 'Loading...')
    ),
  };
});

jest.mock('@/components/ui/form-control', () => {
  const React = jest.requireActual('react');
  return {
    FormControl: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref, testID: 'form-control' }, children)
    ),
    FormControlError: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref, testID: 'form-control-error' }, children)
    ),
    FormControlErrorIcon: React.forwardRef(({ ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'form-control-error-icon' })
    ),
    FormControlErrorText: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'form-control-error-text' }, children)
    ),
    FormControlLabel: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('label', { ...props, ref, testID: 'form-control-label' }, children)
    ),
    FormControlLabelText: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'form-control-label-text' }, children)
    ),
  };
});

jest.mock('@/components/ui/input', () => {
  const React = jest.requireActual('react');
  return {
    Input: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref, testID: 'input' }, children)
    ),
    InputField: React.forwardRef(({ onChange, onChangeText, ...props }: any, ref: any) =>
      React.createElement('input', {
        ...props,
        ref,
        testID: 'input-field',
        onChange: (e: any) => {
          if (onChangeText) onChangeText(e.target.value);
          if (onChange) onChange(e);
        }
      })
    ),
    InputIcon: React.forwardRef(({ ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'input-icon' })
    ),
    InputSlot: React.forwardRef(({ children, onPress, ...props }: any, ref: any) =>
      React.createElement('button', { ...props, ref, testID: 'input-slot', onClick: onPress }, children)
    ),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = jest.requireActual('react');
  return {
    Text: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref, testID: 'text' }, children)
    ),
  };
});

// Mock React Native components
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    ...ReactNative,
    Image: React.forwardRef(({ source, ...props }: any, ref: any) =>
      React.createElement('img', { ...props, ref, testID: 'image', src: typeof source === 'object' ? source.uri : source })
    ),
    Keyboard: {
      dismiss: jest.fn(),
    },
  };
});

// Mock Lucide React Native icons
jest.mock('lucide-react-native', () => ({
  AlertTriangle: jest.fn(() => 'AlertTriangle'),
  EyeIcon: jest.fn(() => 'EyeIcon'),
  EyeOffIcon: jest.fn(() => 'EyeOffIcon'),
}));

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => fn,
    formState: { errors: {} },
  }),
  Controller: ({ render }: any) => render({ field: { onChange: jest.fn(), onBlur: jest.fn(), value: '' } }),
}));

// Mock keyboard controller
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: ({ children }: any) => children,
}));

// Mock analytics hook at the top level
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock ServerUrlBottomSheet at the top level
const mockServerUrlBottomSheet = jest.fn();
jest.mock('@/components/settings/server-url-bottom-sheet', () => ({
  ServerUrlBottomSheet: (props: any) => {
    mockServerUrlBottomSheet(props);
    return null;
  },
}));

// Mock colors
jest.mock('@/constants/colors', () => ({
  light: {
    neutral: {
      400: '#999999',
    },
  },
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { LoginForm } from '../login-form';

// Integration tests to verify server URL functionality
describe('LoginForm Server URL Integration', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockServerUrlBottomSheet.mockClear();
  });

  it('should render login form with server URL button', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Check that the form renders properly - there should be multiple text elements
    expect(screen.getAllByTestId('text').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('button')).toHaveLength(2);
  });

  it('should track analytics and show bottom sheet when server URL button is pressed', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Find and press the server URL button (the second button)
    const buttons = screen.getAllByTestId('button');
    const serverUrlButton = buttons[1]; // Second button is the server URL button
    fireEvent.press(serverUrlButton);

    // Assert that analytics tracking was called
    expect(mockTrackEvent).toHaveBeenCalledWith('login_server_url_pressed', {
      timestamp: expect.any(String),
    });

    // Assert that ServerUrlBottomSheet was called with isOpen: true
    expect(mockServerUrlBottomSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: expect.any(Function),
      })
    );
  });

  it('should render with loading state', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />);

    // Check that the loading button is rendered with spinner
    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    expect(screen.getAllByTestId('button')).toHaveLength(2);
  });

  it('should render with different prop combinations', () => {
    const { rerender } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    // Check basic rendering
    expect(screen.getAllByTestId('button')).toHaveLength(2);

    // Test with error
    rerender(
      <LoginForm
        onSubmit={mockOnSubmit}
        error="Test error"
      />
    );

    // Should still render the basic structure
    expect(screen.getAllByTestId('button')).toHaveLength(2);
  });
});
