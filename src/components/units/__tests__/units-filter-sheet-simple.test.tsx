import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UnitsFilterSheet } from '../units-filter-sheet';
import { useUnitsStore } from '../../../stores/units/store';

// Mock the icons to avoid SVG issues
jest.mock('lucide-react-native', () => ({
  Check: 'Check',
  Filter: 'Filter',
  X: 'X',
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the units store
const mockStore = {
  filterOptions: [
    { name: 'Group 1', selected: false },
    { name: 'Group 2', selected: true },
  ],
  toggleFilter: jest.fn(),
  closeFilterSheet: jest.fn(),
  saveSelectedFilters: jest.fn(),
  clearSelectedFilters: jest.fn(),
};

jest.mock('../../../stores/units/store', () => ({
  useUnitsStore: jest.fn(),
}));

// Mock UI components
jest.mock('@resgrid/ui', () => ({
  Button: ({ onPress, children, ...props }: any) =>
    React.createElement('button', { onPress, testID: props.testID, ...props }, children),
  Card: ({ children }: any) => React.createElement('div', {}, children),
  CardContent: ({ children }: any) => React.createElement('div', {}, children),
  CardHeader: ({ children }: any) => React.createElement('div', {}, children),
  CardTitle: ({ children }: any) => React.createElement('div', {}, children),
  Checkbox: ({ checked, onCheckedChange, testID }: any) =>
    React.createElement('input', {
      type: 'checkbox',
      checked,
      onChange: onCheckedChange,
      testID
    }),
  Text: ({ children }: any) => React.createElement('span', {}, children),
}));

describe('UnitsFilterSheet', () => {
  beforeEach(() => {
    (useUnitsStore as jest.Mock).mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  it('should render filter options', () => {
    const { getByText } = render(<UnitsFilterSheet />);

    expect(getByText('Group 1')).toBeTruthy();
    expect(getByText('Group 2')).toBeTruthy();
  });

  it('should toggle filter when checkbox is pressed', () => {
    const { getByTestId } = render(<UnitsFilterSheet />);

    const checkbox = getByTestId('filter-checkbox-0');
    fireEvent.press(checkbox);

    expect(mockStore.toggleFilter).toHaveBeenCalledWith(0);
  });

  it('should save filters when save button is pressed', () => {
    const { getByTestId } = render(<UnitsFilterSheet />);

    const saveButton = getByTestId('save-filters-button');
    fireEvent.press(saveButton);

    expect(mockStore.saveSelectedFilters).toHaveBeenCalled();
  });

  it('should clear filters when clear button is pressed', () => {
    const { getByTestId } = render(<UnitsFilterSheet />);

    const clearButton = getByTestId('clear-filters-button');
    fireEvent.press(clearButton);

    expect(mockStore.clearSelectedFilters).toHaveBeenCalled();
  });

  it('should close sheet when close button is pressed', () => {
    const { getByTestId } = render(<UnitsFilterSheet />);

    const closeButton = getByTestId('close-filter-sheet-button');
    fireEvent.press(closeButton);

    expect(mockStore.closeFilterSheet).toHaveBeenCalled();
  });
});
