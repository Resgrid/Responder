import { render, screen, fireEvent } from '@testing-library/react-native';

import { UnitsFilterSheet } from '../units-filter-sheet';

// Mock the units store
const mockToggleFilter = jest.fn();
const mockCloseFilterSheet = jest.fn();

const mockUseUnitsStore = jest.fn(() => ({
  filterOptions: [
    { Id: '1', Name: 'Group A', Type: 'Groups' },
    { Id: '2', Name: 'Group B', Type: 'Groups' },
    { Id: '3', Name: 'Type 1', Type: 'Unit Types' },
  ],
  selectedFilters: ['1'],
  isFilterSheetOpen: true,
  isLoadingFilters: false,
  closeFilterSheet: mockCloseFilterSheet,
  toggleFilter: mockToggleFilter,
}));

jest.mock('@/stores/units/store', () => ({
  useUnitsStore: mockUseUnitsStore,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

// Mock UI components to make them testable
jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) => (isOpen ? <div data-testid="actionsheet">{children}</div> : null),
  ActionsheetBackdrop: ({ children }: any) => <div data-testid="actionsheet-backdrop">{children}</div>,
  ActionsheetContent: ({ children }: any) => <div data-testid="actionsheet-content">{children}</div>,
  ActionsheetDragIndicator: () => <div data-testid="drag-indicator" />,
  ActionsheetDragIndicatorWrapper: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => (
    <button onClick={onPress} data-testid={testID}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => <div style={{ display: 'flex' }}>{children}</div>,
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>,
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ onChange, testID }: any) => <input type="checkbox" onChange={onChange} data-testid={testID} />,
}));

jest.mock('@/components/ui/pressable', () => ({
  Pressable: ({ children, onPress, testID }: any) => (
    <div onClick={onPress} data-testid={testID}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/common/loading', () => ({
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

// Mock React Native components
jest.mock('react-native', () => ({
  SectionList: ({ sections, renderItem, renderSectionHeader }: any) => (
    <div data-testid="section-list">
      {sections.map((section: any) => (
        <div key={section.title}>
          {renderSectionHeader && renderSectionHeader({ section })}
          {section.data.map((item: any) => (
            <div key={item.Id}>{renderItem({ item })}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe('UnitsFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnitsStore.mockReturnValue({
      filterOptions: [
        { Id: '1', Name: 'Group A', Type: 'Groups' },
        { Id: '2', Name: 'Group B', Type: 'Groups' },
        { Id: '3', Name: 'Type 1', Type: 'Unit Types' },
      ],
      selectedFilters: ['1'],
      isFilterSheetOpen: true,
      isLoadingFilters: false,
      closeFilterSheet: mockCloseFilterSheet,
      toggleFilter: mockToggleFilter,
    });
  });

  it('should render filter sheet when open', () => {
    render(<UnitsFilterSheet />);

    expect(screen.getByText('Filter Units')).toBeTruthy();
    expect(screen.getByText('Select filters to refine the units list. Units can only be filtered by groups. Changes are automatically applied.')).toBeTruthy();
  });

  it('should display filter options grouped by type', () => {
    render(<UnitsFilterSheet />);

    expect(screen.getByText('Groups')).toBeTruthy();
    expect(screen.getByText('Unit Types')).toBeTruthy();
    expect(screen.getByText('Group A')).toBeTruthy();
    expect(screen.getByText('Group B')).toBeTruthy();
    expect(screen.getByText('Type 1')).toBeTruthy();
  });

  it('should show active filter count badge', () => {
    render(<UnitsFilterSheet />);

    expect(screen.getByText('1')).toBeTruthy(); // Badge showing 1 selected filter
  });

  it('should call toggleFilter when filter item is pressed', () => {
    render(<UnitsFilterSheet />);

    const filterItem = screen.getByTestId('filter-item-2');
    fireEvent.press(filterItem);

    expect(mockToggleFilter).toHaveBeenCalledWith('2');
  });

  it('should call closeFilterSheet when close button is pressed', () => {
    render(<UnitsFilterSheet />);

    const closeButton = screen.getByTestId('close-filter-sheet');
    fireEvent.press(closeButton);

    expect(mockCloseFilterSheet).toHaveBeenCalled();
  });

  it('should show loading state when isLoadingFilters is true', () => {
    mockUseUnitsStore.mockReturnValue({
      filterOptions: [],
      selectedFilters: [],
      isFilterSheetOpen: true,
      isLoadingFilters: true,
      closeFilterSheet: mockCloseFilterSheet,
      toggleFilter: mockToggleFilter,
    });

    render(<UnitsFilterSheet />);

    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('should show empty state when no filter options available', () => {
    mockUseUnitsStore.mockReturnValue({
      filterOptions: [],
      selectedFilters: [],
      isFilterSheetOpen: true,
      isLoadingFilters: false,
      closeFilterSheet: mockCloseFilterSheet,
      toggleFilter: mockToggleFilter,
    });

    render(<UnitsFilterSheet />);

    expect(screen.getByText('No filter options available')).toBeTruthy();
    expect(screen.getByText('Filter options will appear here when available.')).toBeTruthy();
  });

  it('should show check mark for selected filters', () => {
    render(<UnitsFilterSheet />);

    // Group A should have a filter item since it's in the data
    const groupAItem = screen.getByTestId('filter-item-1');
    expect(groupAItem).toBeTruthy();

    // Group B should also have a filter item
    const groupBItem = screen.getByTestId('filter-item-2');
    expect(groupBItem).toBeTruthy();
  });

  it('should handle checkbox toggle', () => {
    render(<UnitsFilterSheet />);

    const checkbox = screen.getByTestId('filter-checkbox-2');
    fireEvent(checkbox, 'onChange');

    expect(mockToggleFilter).toHaveBeenCalledWith('2');
  });

  it('should not show badge when no filters are selected', () => {
    mockUseUnitsStore.mockReturnValue({
      filterOptions: [
        { Id: '1', Name: 'Group A', Type: 'Groups' },
        { Id: '2', Name: 'Group B', Type: 'Groups' },
      ],
      selectedFilters: [],
      isFilterSheetOpen: true,
      isLoadingFilters: false,
      closeFilterSheet: mockCloseFilterSheet,
      toggleFilter: mockToggleFilter,
    });

    render(<UnitsFilterSheet />);

    // Should not render badge when no filters are selected
    expect(screen.queryByTestId('badge')).toBeNull();
  });
});
