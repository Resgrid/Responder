import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';
import { usePersonnelStore } from '@/stores/personnel/store';

import { PersonnelFilterSheet } from '../personnel-filter-sheet';

// Mock the analytics hook
jest.mock('@/hooks/use-analytics');
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

// Mock the personnel store
jest.mock('@/stores/personnel/store');
const mockUsePersonnelStore = usePersonnelStore as jest.MockedFunction<typeof usePersonnelStore>;

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://test.com',
        enableDevelopmentMode: false,
      },
    },
  },
}));

// Mock MMKV storage
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(undefined),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  })),
}));

// Mock loading component
jest.mock('@/components/common/loading', () => ({
  Loading: () => 'Loading...',
}));

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: 'div',
  ActionsheetBackdrop: 'div',
  ActionsheetContent: 'div',
  ActionsheetDragIndicator: 'div',
  ActionsheetDragIndicatorWrapper: 'div',
}));

jest.mock('../../ui/badge', () => ({
  Badge: 'span',
}));

jest.mock('../../ui/box', () => ({
  Box: 'div',
}));

jest.mock('../../ui/button', () => ({
  Button: 'button',
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: 'input',
}));

jest.mock('../../ui/heading', () => ({
  Heading: 'h1',
}));

jest.mock('../../ui/hstack', () => ({
  HStack: 'div',
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: 'button',
}));

jest.mock('../../ui/text', () => ({
  Text: 'span',
}));

jest.mock('../../ui/vstack', () => ({
  VStack: 'div',
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Filter: 'div',
  X: 'div',
  Check: 'div',
}));

describe('PersonnelFilterSheet Analytics', () => {
  const mockTrackEvent = jest.fn();
  const mockStore = {
    filterOptions: [
      { Id: '1', Name: 'Department A', Type: 'Department' },
      { Id: '2', Name: 'Role B', Type: 'Role' },
    ],
    selectedFilters: ['1'],
    isFilterSheetOpen: true,
    isLoadingFilters: false,
    closeFilterSheet: jest.fn(),
    toggleFilter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock analytics hook
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUsePersonnelStore.mockReturnValue(mockStore as any);
  });

  it('tracks filter sheet view when opened', () => {
    render(<PersonnelFilterSheet />);

    expect(mockTrackEvent).toHaveBeenCalledWith('personnel_filter_sheet_viewed', {
      timestamp: expect.any(String),
      totalFilterOptions: 2,
      activeFilterCount: 1,
      filterTypesAvailable: 'Department,Role',
      hasFiltersApplied: true,
      isLoading: false,
    });
  });

  it('does not track analytics when sheet is closed', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isFilterSheetOpen: false,
    } as any);

    render(<PersonnelFilterSheet />);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks filter toggle analytics when filter is selected', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('filter-item-2'));

    expect(mockTrackEvent).toHaveBeenCalledWith('personnel_filter_toggled', {
      timestamp: expect.any(String),
      filterId: '2',
      filterName: 'Role B',
      filterType: 'Role',
      action: 'added',
      previousActiveCount: 1,
      newActiveCount: 2,
    });
  });
});
