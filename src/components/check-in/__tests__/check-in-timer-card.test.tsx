import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { CheckInTimerCard } from '../check-in-timer-card';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce((str, [k, v]) => str.replace(`{{${k}}}`, String(v)), key);
      }
      return key;
    },
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Timer: () => 'Timer',
}));

const mockStatus = {
  TargetType: 0,
  TargetTypeName: 'Personnel',
  TargetEntityId: '1',
  TargetName: 'John Doe',
  UnitId: null,
  LastCheckIn: '2026-04-12T10:00:00',
  DurationMinutes: 20,
  WarningThresholdMinutes: 5,
  ElapsedMinutes: 5,
  Status: 'Ok',
};

describe('CheckInTimerCard', () => {
  it('should render the actual personnel or unit name in the title', () => {
    const { getByText } = render(<CheckInTimerCard status={mockStatus} onCheckIn={jest.fn()} isCurrentUser={true} />);

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Personnel')).toBeTruthy();
  });

  it('should use resolved unit name when available', () => {
    const { getByText, rerender } = render(<CheckInTimerCard status={{ ...mockStatus, TargetName: '', TargetTypeName: 'Unit' }} onCheckIn={jest.fn()} isCurrentUser={true} />);

    // When TargetName is empty and no resolvedTargetName, the generic type name must NOT appear
    // in the header — the translated fallback should be shown instead.
    expect(getByText('check_in.unknown_unit')).toBeTruthy();

    rerender(<CheckInTimerCard status={{ ...mockStatus, TargetType: 1, TargetTypeName: 'Unit', TargetName: 'Unit' }} resolvedTargetName="Engine 4" onCheckIn={jest.fn()} isCurrentUser={true} />);

    expect(getByText('Engine 4')).toBeTruthy();
  });

  it('should never show a generic API placeholder like "UnitType" as the card header', () => {
    const { getAllByText, getByText } = render(<CheckInTimerCard status={{ ...mockStatus, TargetType: 1, TargetTypeName: 'UnitType', TargetName: 'UnitType', UnitId: 42 }} onCheckIn={jest.fn()} isCurrentUser={true} />);

    // "UnitType" may appear once in the sub-header (TargetTypeName) but the main bold title
    // must show the translated fallback, not the raw API placeholder.
    // The fallback translation key must be present in the header.
    expect(getByText('check_in.unknown_unit')).toBeTruthy();
    // "UnitType" must not appear more than once (only the subtitle, not also the header)
    expect(getAllByText('UnitType').length).toBe(1);
  });

  it('should keep non-personnel non-unit titles generic', () => {
    const { getAllByText } = render(<CheckInTimerCard status={{ ...mockStatus, TargetType: 2, TargetTypeName: 'IC', TargetName: 'Command' }} onCheckIn={jest.fn()} isCurrentUser={true} />);

    // For non-named types the TargetTypeName is used as-is; it appears in both header and subtitle.
    expect(getAllByText('IC').length).toBeGreaterThanOrEqual(1);
  });

  it('should show Check In button for current user', () => {
    const { getByTestId } = render(<CheckInTimerCard status={mockStatus} onCheckIn={jest.fn()} isCurrentUser={true} />);

    expect(getByTestId('check-in-button')).toBeTruthy();
  });

  it('should not show Check In button for non-current user', () => {
    const { queryByTestId } = render(<CheckInTimerCard status={mockStatus} onCheckIn={jest.fn()} isCurrentUser={false} />);

    expect(queryByTestId('check-in-button')).toBeNull();
  });

  it('should call onCheckIn with correct params', () => {
    const onCheckIn = jest.fn();
    const { getByTestId } = render(<CheckInTimerCard status={mockStatus} onCheckIn={onCheckIn} isCurrentUser={true} />);

    fireEvent.press(getByTestId('check-in-button'));
    expect(onCheckIn).toHaveBeenCalledWith(0, undefined, 'John Doe');
  });

  it('should pass unitId when available', () => {
    const onCheckIn = jest.fn();
    const statusWithUnit = { ...mockStatus, TargetType: 1, TargetTypeName: 'Unit', TargetName: 'Unit', UnitId: 42 };
    const { getByTestId } = render(<CheckInTimerCard status={statusWithUnit} resolvedTargetName="Engine 1" onCheckIn={onCheckIn} isCurrentUser={true} />);

    fireEvent.press(getByTestId('check-in-button'));
    expect(onCheckIn).toHaveBeenCalledWith(1, 42, 'Engine 1');
  });
});
