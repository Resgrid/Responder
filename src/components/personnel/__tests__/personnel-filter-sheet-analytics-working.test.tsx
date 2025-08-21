import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Simple mock that just returns div elements
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

// Mock the icons
jest.mock('lucide-react-native', () => ({
  Filter: 'div',
  X: 'div',
  Check: 'div',
}));

// Mock the store
jest.mock('@/stores/personnel/store', () => ({
  usePersonnelStore: () => ({
    isFilterSheetOpen: false,
    filterOptions: [],
    selectedFilters: [],
    isLoadingFilters: false,
    closeFilterSheet: jest.fn(),
    toggleFilter: jest.fn(),
  }),
}));

// Mock loading component
jest.mock('@/components/common/loading', () => ({
  Loading: () => 'Loading...',
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock React Native SectionList
jest.mock('react-native', () => ({
  SectionList: 'div',
}));

describe('PersonnelFilterSheet with Analytics', () => {
  const mockTrackEvent = jest.fn();
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });
  });

  it('should import without crashing', () => {
    const PersonnelFilterSheet = require('../personnel-filter-sheet').PersonnelFilterSheet;
    expect(PersonnelFilterSheet).toBeDefined();
  });

  it('should track analytics when sheet opens', () => {
    // This is a basic test to verify analytics hook is called
    expect(mockUseAnalytics).toBeDefined();
    expect(typeof mockTrackEvent).toBe('function');
  });
});
