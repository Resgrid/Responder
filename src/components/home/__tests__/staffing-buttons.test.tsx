import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { useStaffingBottomSheetStore } from '@/stores/staffing/staffing-bottom-sheet-store';

import { StaffingButtons } from '../staffing-buttons';

jest.mock('@/components/common/loading', () => ({
  Loading: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'loading' });
  },
}));

jest.mock('@/stores/home/home-store');
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/staffing/staffing-bottom-sheet-store');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseHomeStore = useHomeStore as unknown as jest.Mock;
const mockUseCoreStore = useCoreStore as unknown as jest.Mock;
const mockUseStaffingStore = useStaffingBottomSheetStore as unknown as jest.Mock;

const createStaffing = (overrides: Partial<StatusesResultData>): StatusesResultData => ({
  Id: 0,
  Type: 0,
  StateId: 0,
  Text: '',
  BColor: '#16a34a',
  Color: '#ffffff',
  Gps: false,
  Note: 0,
  Detail: 0,
  ...overrides,
});

const available = createStaffing({ Id: 1, Text: 'Available', Note: 0 });
const delayed = createStaffing({ Id: 2, Text: 'Delayed', Note: 1 });
const unavailable = createStaffing({ Id: 3, Text: 'Unavailable', Note: 2 });

describe('StaffingButtons', () => {
  const setIsOpen = jest.fn();
  const quickSubmitStaffing = jest.fn();
  let quickSubmittingId: number | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    quickSubmittingId = null;
    quickSubmitStaffing.mockResolvedValue('submitted');

    mockUseHomeStore.mockReturnValue({ isLoadingOptions: false });
    mockUseCoreStore.mockReturnValue({ activeStaffing: [available, delayed, unavailable] });
    mockUseStaffingStore.mockImplementation((selector: (state: { setIsOpen: jest.Mock; quickSubmitStaffing: jest.Mock; quickSubmittingId: number | null }) => unknown) =>
      selector({ setIsOpen, quickSubmitStaffing, quickSubmittingId })
    );
  });

  it('sets a level with no note in one tap', () => {
    render(<StaffingButtons />);
    fireEvent.press(screen.getByTestId('staffing-button-1'));
    expect(quickSubmitStaffing).toHaveBeenCalledWith(available);
    expect(setIsOpen).not.toHaveBeenCalled();
  });

  it('sets a level with an optional note in one tap', () => {
    render(<StaffingButtons />);
    fireEvent.press(screen.getByTestId('staffing-button-2'));
    expect(quickSubmitStaffing).toHaveBeenCalledWith(delayed);
  });

  it('opens the sheet when a note is required', () => {
    render(<StaffingButtons />);
    fireEvent.press(screen.getByTestId('staffing-button-3'));
    expect(setIsOpen).toHaveBeenCalledWith(true, unavailable);
    expect(quickSubmitStaffing).not.toHaveBeenCalled();
  });

  it('long press opens the sheet so a note can still be added', () => {
    render(<StaffingButtons />);
    fireEvent(screen.getByTestId('staffing-button-1'), 'longPress');
    expect(setIsOpen).toHaveBeenCalledWith(true, available);
    expect(quickSubmitStaffing).not.toHaveBeenCalled();
  });

  it('describes the tap behaviour accurately to screen readers', () => {
    render(<StaffingButtons />);

    const quick = screen.getByTestId('staffing-button-1');
    expect(quick.props.accessibilityRole).toBe('button');
    expect(quick.props.accessibilityLabel).toBe('Available');
    expect(quick.props.accessibilityHint).toBe('home.staffing.quick_set_hint');
    expect(quick.props.accessibilityActions).toEqual([{ name: 'activate' }, { name: 'longpress', label: 'home.staffing.add_note_action' }]);

    const withNote = screen.getByTestId('staffing-button-3');
    expect(withNote.props.accessibilityHint).toBe('home.staffing.note_required_hint');
    expect(withNote.props.accessibilityActions).toEqual([{ name: 'activate' }]);
    expect(withNote.props.onLongPress).toBeUndefined();
  });

  it('maps accessibility actions to the same behaviour as touch', () => {
    render(<StaffingButtons />);
    fireEvent(screen.getByTestId('staffing-button-1'), 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
    expect(setIsOpen).toHaveBeenCalledWith(true, available);
    fireEvent(screen.getByTestId('staffing-button-1'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(quickSubmitStaffing).toHaveBeenCalledWith(available);
  });

  it('shows progress on the level being saved and disables the rest', () => {
    quickSubmittingId = 1;
    render(<StaffingButtons />);

    expect(screen.getByTestId('staffing-button-spinner-1')).toBeTruthy();
    expect(screen.queryByTestId('staffing-button-spinner-2')).toBeNull();
    expect(screen.getByTestId('staffing-button-1').props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(screen.getByTestId('staffing-button-2').props.isDisabled).toBe(true);
  });

  it('shows loading while options load and an empty message without options', () => {
    mockUseHomeStore.mockReturnValue({ isLoadingOptions: true });
    const { rerender } = render(<StaffingButtons />);
    expect(screen.getByTestId('loading')).toBeTruthy();

    mockUseHomeStore.mockReturnValue({ isLoadingOptions: false });
    mockUseCoreStore.mockReturnValue({ activeStaffing: [] });
    rerender(<StaffingButtons />);
    expect(screen.getByText('home.staffing.no_options_available')).toBeTruthy();
  });
});
