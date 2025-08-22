import { describe, expect, it, jest } from '@jest/globals';
// Mock external dependencies to allow importing of the component without executing native code
jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Filter: () => null,
  X: () => null,
}));
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
}));
jest.mock('@/stores/units/store', () => ({
  useUnitsStore: () => ({
    filterOptions: [],
    selectedFilters: [],
    isFilterSheetOpen: false,
    isLoadingFilters: false,
    closeFilterSheet: jest.fn(),
    toggleFilter: jest.fn(),
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def: string) => def }),
}));
jest.mock('react-native', () => ({
  SectionList: () => null,
}));
jest.mock('@/components/common/loading', () => ({
  Loading: () => null,
}));
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children }: { children: any }) => children,
  ActionsheetBackdrop: () => null,
  ActionsheetContent: ({ children }: { children: any }) => children,
  ActionsheetDragIndicator: () => null,
  ActionsheetDragIndicatorWrapper: ({ children }: { children: any }) => children,
}));
jest.mock('../../ui/badge', () => ({ Badge: ({ children }: { children: any }) => children }));
jest.mock('../../ui/box', () => ({ Box: ({ children }: { children: any }) => children }));
jest.mock('../../ui/button', () => ({ Button: ({ children }: { children: any }) => children }));
jest.mock('../../ui/checkbox', () => ({ Checkbox: () => null }));
jest.mock('../../ui/heading', () => ({ Heading: ({ children }: { children: any }) => children }));
jest.mock('../../ui/hstack', () => ({ HStack: ({ children }: { children: any }) => children }));
jest.mock('../../ui/pressable', () => ({ Pressable: ({ children }: { children?: any }) => children }));
jest.mock('../../ui/text', () => ({ Text: ({ children }: { children?: any }) => children }));
jest.mock('../../ui/vstack', () => ({ VStack: ({ children }: { children?: any }) => children }));

describe('UnitsFilterSheet component', () => {
  it('should be importable', () => {
    // This test simply validates that the module can be loaded
    // Integration tests would require a running React Native environment with proper mocking
    const { UnitsFilterSheet } = require('../units-filter-sheet');

    expect(typeof UnitsFilterSheet).toBe('function');
  });
});
