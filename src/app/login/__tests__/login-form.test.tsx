// Mock nativewind first
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

    // Check that the form renders properly
    expect(screen.getByText('login.title')).toBeTruthy();
    expect(screen.getByText('login.change_server_url')).toBeTruthy();
  });

  it('should track analytics and show bottom sheet when server URL button is pressed', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Find and press the server URL button
    const serverUrlButton = screen.getByText('login.change_server_url');
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

    expect(screen.getByText('login.login_button_loading')).toBeTruthy();
  });

  it('should render with different prop combinations', () => {
    const { rerender } = render(
      <LoginForm
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    expect(screen.getByText('login.title')).toBeTruthy();

    // Test with error
    rerender(
      <LoginForm
        onSubmit={mockOnSubmit}
        error="Test error"
      />
    );

    expect(screen.getByText('login.title')).toBeTruthy();
  });
});
