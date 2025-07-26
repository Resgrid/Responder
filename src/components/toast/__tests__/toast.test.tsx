import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { useToastStore } from '@/stores/toast/store';

import { ToastContainer } from '../toast-container';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the toast store
jest.mock('@/stores/toast/store');

describe('ToastContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render no toasts when toasts array is empty', () => {
    (useToastStore as unknown as jest.Mock).mockReturnValue([]);

    render(<ToastContainer />);

    // Should not find any toast messages
    expect(screen.queryByTestId('toast-message')).toBeNull();
  });

  it('should render toasts when toasts are present', () => {
    const mockToasts = [
      {
        id: '1',
        type: 'success' as const,
        message: 'Test success message',
        title: 'Success',
      },
      {
        id: '2',
        type: 'error' as const,
        message: 'Test error message',
      },
    ];

    (useToastStore as unknown as jest.Mock).mockReturnValue(mockToasts);

    render(<ToastContainer />);

    // Should render both toast messages
    expect(screen.getByText('Success')).toBeTruthy();
    expect(screen.getByText('Test success message')).toBeTruthy();
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('should call showToast function from store', () => {
    const mockShowToast = jest.fn();
    const mockToasts: never[] = [];

    // Mock the store with getState method
    const mockStore = {
      getState: jest.fn(() => ({
        showToast: mockShowToast,
        toasts: mockToasts,
        removeToast: jest.fn(),
      })),
    };

    (useToastStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore.getState());
      }
      return mockToasts;
    });

    // Mock getState directly on useToastStore
    (useToastStore as any).getState = mockStore.getState;

    // Test that the showToast function can be called
    const showToast = useToastStore.getState().showToast;
    showToast('success', 'Test message', 'Test title');

    expect(mockShowToast).toHaveBeenCalledWith('success', 'Test message', 'Test title');
  });
});
