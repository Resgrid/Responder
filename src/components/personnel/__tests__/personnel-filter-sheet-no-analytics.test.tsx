import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { usePersonnelStore } from '@/stores/personnel/store';

import { PersonnelFilterSheetNoAnalytics } from '../personnel-filter-sheet-no-analytics';

// Mock the personnel store
jest.mock('@/stores/personnel/store');
const mockUsePersonnelStore = usePersonnelStore as jest.MockedFunction<typeof usePersonnelStore>;

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

// Mock UI components (simple)
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) => isOpen ? <div>{children}</div> : null,
  ActionsheetBackdrop: 'div',
  ActionsheetContent: 'div',
  ActionsheetDragIndicator: 'div',
  ActionsheetDragIndicatorWrapper: 'div',
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../ui/box', () => ({
  Box: 'div',
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => <button onClick={onPress} data-testid={testID}>{children}</button>,
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: ({ onChange, testID }: any) => <input onChange={onChange} data-testid={testID} type="checkbox" />,
}));

jest.mock('../../ui/heading', () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: 'div',
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: ({ children, onPress, testID }: any) => <button onClick={onPress} data-testid={testID}>{children}</button>,
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: 'div',
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Filter: () => <div>Filter</div>,
  X: () => <div>X</div>,
  Check: () => <div>Check</div>,
}));

// Mock loading component
jest.mock('@/components/common/loading', () => ({
  Loading: () => <div>Loading...</div>,
}));

// Mock React Native components
jest.mock('react-native', () => ({
  SectionList: ({ sections, renderItem, renderSectionHeader }: any) => (
    <div>
      {sections?.map((section: any, sectionIndex: number) => (
        <div key={sectionIndex}>
          {renderSectionHeader && renderSectionHeader({ section })}
          {section.data?.map((item: any, itemIndex: number) => (
            <div key={itemIndex}>
              {renderItem({ item })}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe('PersonnelFilterSheetNoAnalytics', () => {
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
    const component = render(<PersonnelFilterSheetNoAnalytics />);
    expect(component).toBeTruthy();
  });

  it('calls closeFilterSheet when close button is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheetNoAnalytics />);
    const closeButton = getByTestId('close-filter-sheet');
    fireEvent.press(closeButton);
    expect(mockStore.closeFilterSheet).toHaveBeenCalled();
  });
});
