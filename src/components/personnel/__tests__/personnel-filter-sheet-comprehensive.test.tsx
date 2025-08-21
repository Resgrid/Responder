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

// Mock loading component
jest.mock('@/components/common/loading', () => ({
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

// Mock UI components that support testID
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) => isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: any) => <div data-testid="actionsheet-backdrop">{children}</div>,
  ActionsheetContent: ({ children }: any) => <div data-testid="actionsheet-content">{children}</div>,
  ActionsheetDragIndicator: () => <div data-testid="drag-indicator" />,
  ActionsheetDragIndicatorWrapper: ({ children }: any) => <div data-testid="drag-wrapper">{children}</div>,
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children }: any) => <div data-testid="box">{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => (
    <button data-testid={testID} onClick={onPress}>
      {children}
    </button>
  ),
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: ({ onChange, testID }: any) => (
    <input data-testid={testID} type="checkbox" onChange={onChange} />
  ),
}));

jest.mock('../../ui/heading', () => ({
  Heading: ({ children }: any) => <h1 data-testid="heading">{children}</h1>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children }: any) => <div data-testid="hstack">{children}</div>,
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: ({ children, onPress, testID }: any) => (
    <button data-testid={testID} onClick={onPress}>
      {children}
    </button>
  ),
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children }: any) => <span data-testid="text">{children}</span>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children }: any) => <div data-testid="vstack">{children}</div>,
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
}));

// Mock React Native SectionList
jest.mock('react-native', () => ({
  SectionList: ({ sections, renderItem, renderSectionHeader }: any) => (
    <div data-testid="section-list">
      {sections?.map((section: any, sectionIndex: number) => (
        <div key={sectionIndex} data-testid={`section-${sectionIndex}`}>
          {renderSectionHeader && renderSectionHeader({ section })}
          {section.data?.map((item: any, itemIndex: number) => (
            <div key={itemIndex} data-testid={`item-${itemIndex}`}>
              {renderItem({ item })}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe('PersonnelFilterSheet Analytics', () => {
  const mockTrackEvent = jest.fn();
  const defaultStore = {
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

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUsePersonnelStore.mockReturnValue(defaultStore as any);
  });

  describe('View Analytics', () => {
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
        ...defaultStore,
        isFilterSheetOpen: false,
      } as any);

      render(<PersonnelFilterSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks analytics with no filters applied', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStore,
        selectedFilters: [],
      } as any);

      render(<PersonnelFilterSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_filter_sheet_viewed', {
        timestamp: expect.any(String),
        totalFilterOptions: 2,
        activeFilterCount: 0,
        filterTypesAvailable: 'Department,Role',
        hasFiltersApplied: false,
        isLoading: false,
      });
    });

    it('tracks analytics while loading', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStore,
        isLoadingFilters: true,
      } as any);

      render(<PersonnelFilterSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_filter_sheet_viewed', {
        timestamp: expect.any(String),
        totalFilterOptions: 2,
        activeFilterCount: 1,
        filterTypesAvailable: 'Department,Role',
        hasFiltersApplied: true,
        isLoading: true,
      });
    });

    it('tracks analytics with empty filter options', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStore,
        filterOptions: [],
        selectedFilters: [],
      } as any);

      render(<PersonnelFilterSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_filter_sheet_viewed', {
        timestamp: expect.any(String),
        totalFilterOptions: 0,
        activeFilterCount: 0,
        filterTypesAvailable: '',
        hasFiltersApplied: false,
        isLoading: false,
      });
    });
  });

  describe('Toggle Analytics', () => {
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

    it('tracks filter toggle analytics when filter is deselected', () => {
      const { getByTestId } = render(<PersonnelFilterSheet />);

      fireEvent.press(getByTestId('filter-item-1'));

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_filter_toggled', {
        timestamp: expect.any(String),
        filterId: '1',
        filterName: 'Department A',
        filterType: 'Department',
        action: 'removed',
        previousActiveCount: 1,
        newActiveCount: 0,
      });
    });

    it('tracks analytics when checkbox is clicked', () => {
      const { getByTestId } = render(<PersonnelFilterSheet />);

      fireEvent.press(getByTestId('filter-checkbox-2'));

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

  describe('Error Handling', () => {
    it('handles analytics errors gracefully during view', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockTrackEvent.mockImplementationOnce(() => {
        throw new Error('Analytics error');
      });

      render(<PersonnelFilterSheet />);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track personnel filter sheet view analytics:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles filter toggle analytics errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // First call succeeds (view analytics), second call fails (toggle analytics)
      mockTrackEvent
        .mockImplementationOnce(() => { }) // view analytics succeeds
        .mockImplementationOnce(() => {
          throw new Error('Toggle analytics error');
        });

      const { getByTestId } = render(<PersonnelFilterSheet />);

      fireEvent.press(getByTestId('filter-item-1'));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track personnel filter toggle analytics:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Component Behavior', () => {
    it('renders without crashing when sheet is open', () => {
      const component = render(<PersonnelFilterSheet />);
      expect(component.getByTestId('actionsheet')).toBeTruthy();
    });

    it('calls closeFilterSheet when close button is pressed', () => {
      const { getByTestId } = render(<PersonnelFilterSheet />);

      fireEvent.press(getByTestId('close-filter-sheet'));

      expect(defaultStore.closeFilterSheet).toHaveBeenCalled();
    });

    it('calls toggleFilter when filter item is pressed', () => {
      const { getByTestId } = render(<PersonnelFilterSheet />);

      fireEvent.press(getByTestId('filter-item-1'));

      expect(defaultStore.toggleFilter).toHaveBeenCalledWith('1');
    });
  });
});
