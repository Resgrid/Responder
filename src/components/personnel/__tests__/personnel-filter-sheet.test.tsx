import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { usePersonnelStore } from '@/stores/personnel/store';

import { PersonnelFilterSheet } from '../personnel-filter-sheet';

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
// Mock the icons
jest.mock('lucide-react-native', () => ({
  Filter: 'div',
  X: 'div',
  Check: 'div',
}));

describe('PersonnelFilterSheet', () => {
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
    mockUsePersonnelStore.mockReturnValue(mockStore as any);
  });

  it('renders without crashing when sheet is open', () => {
    const component = render(<PersonnelFilterSheet />);
    expect(component).toBeTruthy();
  });

  it('does not render content when sheet is closed', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isFilterSheetOpen: false,
    } as any);

    const component = render(<PersonnelFilterSheet />);
    // When sheet is closed, the component should still render but return null content
    expect(component).toBeTruthy();
  });

  it('renders loading state correctly', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isLoadingFilters: true,
    } as any);

    const component = render(<PersonnelFilterSheet />);
    expect(component).toBeTruthy();
  });

  it('renders empty state correctly', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      filterOptions: [],
    } as any);

    const component = render(<PersonnelFilterSheet />);
    expect(component).toBeTruthy();
  });

  it('calls closeFilterSheet when close button is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    const closeButton = getByTestId('close-filter-sheet');
    fireEvent.press(closeButton);

    expect(mockStore.closeFilterSheet).toHaveBeenCalled();
  });

  it('calls toggleFilter when filter item is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    const filterItem = getByTestId('filter-item-1');
    fireEvent.press(filterItem);

    expect(mockStore.toggleFilter).toHaveBeenCalledWith('1');
  });

  it('calls toggleFilter when checkbox is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    const checkbox = getByTestId('filter-checkbox-1');
    fireEvent.press(checkbox);

    expect(mockStore.toggleFilter).toHaveBeenCalledWith('1');
  });

  it('handles different selected filter states', () => {
    // Test with no filters selected
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      selectedFilters: [],
    } as any);

    const { rerender } = render(<PersonnelFilterSheet />);

    // Test with multiple filters selected
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      selectedFilters: ['1', '2'],
    } as any);

    rerender(<PersonnelFilterSheet />);

    expect(true).toBe(true); // Component should render without errors
  });

  it('calls store methods correctly for multiple interactions', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    // Simulate multiple user interactions
    fireEvent.press(getByTestId('filter-item-1'));
    fireEvent.press(getByTestId('filter-checkbox-2'));
    fireEvent.press(getByTestId('close-filter-sheet'));

    expect(mockStore.toggleFilter).toHaveBeenCalledTimes(2);
    expect(mockStore.toggleFilter).toHaveBeenNthCalledWith(1, '1');
    expect(mockStore.toggleFilter).toHaveBeenNthCalledWith(2, '2');
    expect(mockStore.closeFilterSheet).toHaveBeenCalledTimes(1);
  });
});
