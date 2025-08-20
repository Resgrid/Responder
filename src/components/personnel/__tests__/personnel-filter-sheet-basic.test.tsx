import { render } from '@testing-library/react-native';
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

describe('PersonnelFilterSheet Basic', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock analytics hook
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Simple mock that should not cause infinite loops
    mockUsePersonnelStore.mockReturnValue({
      filterOptions: [],
      selectedFilters: [],
      isFilterSheetOpen: false,
      isLoadingFilters: false,
      closeFilterSheet: jest.fn(),
      toggleFilter: jest.fn(),
    } as any);
  });

  it('renders without crashing', () => {
    const component = render(<PersonnelFilterSheet />);
    expect(component).toBeTruthy();
  });
});
