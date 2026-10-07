import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { HoldToConfirmButton, STATUS_HOLD_DURATION_MS } from '../hold-to-confirm-button';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return new Proxy({}, { get: () => icon });
});

const renderButton = (props: Partial<React.ComponentProps<typeof HoldToConfirmButton>> = {}) => {
  const onConfirm = jest.fn();
  const onTap = jest.fn();

  render(
    <HoldToConfirmButton testID="hold" onConfirm={onConfirm} onTap={onTap} backgroundColor="#f0ad4e" foregroundColor="#000000" {...props}>
      <Text>Vertrokken</Text>
    </HoldToConfirmButton>
  );

  return { onConfirm, onTap, button: screen.getByTestId('hold') };
};

describe('HoldToConfirmButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('confirms once the hold reaches the full duration', () => {
    const { onConfirm, onTap, button } = renderButton();

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(STATUS_HOLD_DURATION_MS - 1);
    });
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Letting go after completion is not a tap and does not confirm again.
    fireEvent(button, 'pressOut');
    expect(onTap).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('counts down while held', () => {
    const { button } = renderButton();

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(screen.getByTestId('hold-countdown')).toBeTruthy();
    expect(screen.getByText('1.4s')).toBeTruthy();
  });

  it('cancels when released early, and treats a quick release as a tap', () => {
    const { onConfirm, onTap, button } = renderButton();

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent(button, 'pressOut');
    expect(onTap).toHaveBeenCalledTimes(1);

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    fireEvent(button, 'pressOut');
    expect(onTap).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(STATUS_HOLD_DURATION_MS * 2);
    });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId('hold-countdown')).toBeNull();
  });

  it('honours a custom duration', () => {
    const { onConfirm, button } = renderButton({ durationMs: 500 });

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', () => {
    const { onConfirm, button } = renderButton({ disabled: true });

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(STATUS_HOLD_DURATION_MS);
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('lets a screen reader confirm with the activate action', () => {
    const { onConfirm, button } = renderButton();

    fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('resets after confirming so the button can be held again', () => {
    const { onConfirm, button } = renderButton();

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(STATUS_HOLD_DURATION_MS);
    });
    fireEvent(button, 'pressOut');
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent(button, 'pressIn');
    act(() => {
      jest.advanceTimersByTime(STATUS_HOLD_DURATION_MS);
    });

    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
