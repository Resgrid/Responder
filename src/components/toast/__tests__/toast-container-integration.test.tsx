import React from 'react';
import { render } from '@testing-library/react-native';

import { ToastContainer } from '@/components/toast/toast-container';
import { useToastStore } from '@/stores/toast/store';

// Mock the ToastMessage component
jest.mock('@/components/toast/toast', () => ({
  ToastMessage: ({ type, message, position }: any) => {
    const MockedToastMessage = require('react-native').Text;
    return <MockedToastMessage testID={`toast-${type}-${position}`}>{message}</MockedToastMessage>;
  },
}));

describe('ToastContainer Integration', () => {
  beforeEach(() => {
    // Clear the store before each test
    useToastStore.getState().toasts.forEach((toast) => {
      useToastStore.getState().removeToast(toast.id);
    });
  });

  it('should render toasts in different positions', () => {
    // Add toasts to different positions
    useToastStore.getState().showToast('error', 'Top message', 'Error', 'top', 4000);
    useToastStore.getState().showToast('info', 'Center message', 'Info', 'center', 3000);
    useToastStore.getState().showToast('success', 'Bottom message', 'Success', 'bottom', 5000);

    const { getByTestId } = render(<ToastContainer />);

    // Verify all toasts are rendered
    expect(getByTestId('toast-error-top')).toBeTruthy();
    expect(getByTestId('toast-info-center')).toBeTruthy();
    expect(getByTestId('toast-success-bottom')).toBeTruthy();
  });

  it('should render nothing when no toasts exist', () => {
    const { queryByTestId } = render(<ToastContainer />);

    expect(queryByTestId('toast-error-top')).toBeNull();
    expect(queryByTestId('toast-info-center')).toBeNull();
    expect(queryByTestId('toast-success-bottom')).toBeNull();
  });

  it('should render multiple toasts in the same position', () => {
    // Add multiple toasts to the same position
    useToastStore.getState().showToast('error', 'First message', 'Error 1', 'top', 4000);
    useToastStore.getState().showToast('warning', 'Second message', 'Warning', 'top', 4000);

    const { getAllByTestId } = render(<ToastContainer />);

    // Both toasts should be in the top position
    const topToasts = getAllByTestId(/toast-.*-top/);
    expect(topToasts).toHaveLength(2);
  });
});