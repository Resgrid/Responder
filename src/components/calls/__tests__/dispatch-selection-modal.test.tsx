import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DispatchSelectionModal } from '../dispatch-selection-modal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
}));

jest.mock('@/hooks/use-keyboard-height', () => ({
  useKeyboardHeight: () => 0,
}));

jest.mock('@/components/ui/actionsheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Passthrough = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);

  return {
    Actionsheet: ({ children, isOpen }: { children?: React.ReactNode; isOpen: boolean }) => (isOpen ? React.createElement(View, null, children) : null),
    ActionsheetBackdrop: () => null,
    ActionsheetContent: Passthrough,
    ActionsheetDragIndicator: () => null,
    ActionsheetDragIndicatorWrapper: Passthrough,
  };
});

jest.mock('@/components/ui/lucide-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = () => React.createElement(View);

  return { CheckIcon: MockIcon, SearchIcon: MockIcon, UsersIcon: MockIcon, X: MockIcon };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

const URL = 'https://api.resgrid.dev/api/v4/UnitTypeIcons/abc';

const mockStoreState = {
  data: {
    users: [],
    groups: [],
    roles: [],
    units: [
      { Id: '7', Type: 'Unit', Name: 'Medic 7', Selected: false, TypeIconUrl: URL, TypeMapIcon: 'ambulance' },
      { Id: '8', Type: 'Unit', Name: 'Engine 8', Selected: false },
    ],
  },
  selection: { everyone: false, users: [], groups: [], roles: [], units: [] },
  isLoading: false,
  error: null,
  searchQuery: '',
  fetchDispatchData: jest.fn(),
  refreshDispatchData: jest.fn(),
  setSelection: jest.fn(),
  toggleEveryone: jest.fn(),
  toggleUser: jest.fn(),
  toggleGroup: jest.fn(),
  toggleRole: jest.fn(),
  toggleUnit: jest.fn(),
  setSearchQuery: jest.fn(),
  clearSelection: jest.fn(),
};

jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: () => mockStoreState,
}));

// The type icon is decorative (hidden from accessibility), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };

describe('DispatchSelectionModal unit type icons', () => {
  it("shows each unit's type icon next to its name, and the name alone when the server sends none", () => {
    render(<DispatchSelectionModal isVisible={true} onClose={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.getByText('Medic 7')).toBeTruthy();
    expect(screen.getByText('Engine 8')).toBeTruthy();

    expect(screen.getByTestId('dispatch-unit-type-icon-7', HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId('dispatch-unit-type-icon-8', HIDDEN)).toBeNull();
    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: URL });
  });
});
