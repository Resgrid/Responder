import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

import { PersonnelCard } from '../personnel-card';

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('@/stores/security/store', () => ({
  useSecurityStore: () => ({ canUserViewPII: true }),
}));

jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: () => 'Formatted Date',
  parseDateISOString: (date: string) => new Date(date),
  safeFormatTimestamp: () => 'Formatted Date',
  getAvatarUrl: (userId: string) => `https://example.com/avatar/${userId}`,
  getInitials: () => 'JD',
  getColorFromString: () => '#000000',
}));

// The role icon is decorative (the name is shown beside it), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };
const ROLE_ICON_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/role-abc';

const createPersonnel = (overrides: Partial<PersonnelInfoResultData> = {}): PersonnelInfoResultData => ({
  UserId: 'user-1',
  IdentificationNumber: '',
  DepartmentId: '1',
  FirstName: 'Jane',
  LastName: 'Medic',
  EmailAddress: '',
  MobilePhone: '',
  GroupId: '',
  GroupName: '',
  StatusId: '',
  Status: '',
  StatusColor: '',
  StatusTimestamp: '',
  StatusDestinationId: '',
  StatusDestinationName: '',
  StaffingId: '',
  Staffing: '',
  StaffingColor: '',
  StaffingTimestamp: '',
  Roles: ['Paramedic', 'Driver'],
  ...overrides,
});

describe('PersonnelCard role icon', () => {
  it('shows the uploaded role icon beside the name when the person has one', () => {
    render(<PersonnelCard personnel={createPersonnel({ RoleIconUrl: ROLE_ICON_URL })} onPress={jest.fn()} />);

    const wrapper = screen.getByTestId('personnel-role-icon-user-1', HIDDEN);
    expect(wrapper.props.accessible).toBe(false);
    expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toEqual({ uri: ROLE_ICON_URL });
    expect(image.props.style).toEqual({ width: 20, height: 20 });
    expect(screen.getByText('Jane Medic')).toBeTruthy();
    // The role badges are unchanged.
    expect(screen.getByText('Paramedic')).toBeTruthy();
    expect(screen.getByText('Driver')).toBeTruthy();
  });

  it('renders no role icon when RoleIconUrl is null or absent (older servers)', () => {
    const { rerender } = render(<PersonnelCard personnel={createPersonnel({ RoleIconUrl: null })} onPress={jest.fn()} />);

    expect(screen.queryByTestId('personnel-role-icon-user-1', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.getByText('Jane Medic')).toBeTruthy();

    rerender(<PersonnelCard personnel={createPersonnel()} onPress={jest.fn()} />);

    expect(screen.queryByTestId('personnel-role-icon-user-1', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.getByText('Jane Medic')).toBeTruthy();
  });

  it('drops the role icon but keeps the name when the icon fails to load', () => {
    render(<PersonnelCard personnel={createPersonnel({ RoleIconUrl: ROLE_ICON_URL })} onPress={jest.fn()} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.getByText('Jane Medic')).toBeTruthy();
  });

  it('still opens the person when the card with a role icon is pressed', () => {
    const onPress = jest.fn();
    render(<PersonnelCard personnel={createPersonnel({ RoleIconUrl: ROLE_ICON_URL })} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('personnel-card-user-1'));

    expect(onPress).toHaveBeenCalledWith('user-1');
  });
});
