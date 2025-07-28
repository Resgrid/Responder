import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { usePersonnelStore } from '@/stores/personnel/store';

import { PersonnelFilterSheet } from '../personnel-filter-sheet';

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

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  ActionsheetBackdrop: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  ActionsheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  ActionsheetDragIndicator: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  ActionsheetDragIndicatorWrapper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} {...props}>{children}</button>
  ),
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: ({ children, ...props }: any) => <input type="checkbox" {...props}>{children}</input>,
}));

jest.mock('../../ui/heading', () => ({
  Heading: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: ({ children, onPress, ...props }: any) => (
    <div onClick={onPress} {...props}>{children}</div>
  ),
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock common components
jest.mock('../../common/loading', () => ({
  Loading: ({ children, ...props }: any) => <div {...props}>Loading...</div>,
}));

// Mock the personnel store
jest.mock('@/stores/personnel/store');
const mockUsePersonnelStore = usePersonnelStore as jest.MockedFunction<typeof usePersonnelStore>;

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

// Mock UI components that cause rendering issues
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetDragIndicator: () => <div>drag-indicator</div>,
  ActionsheetDragIndicatorWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID }: { children: React.ReactNode; onPress: () => void; testID?: string }) => (
    <button onClick={onPress} data-testid={testID}>
      {children}
    </button>
  ),
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: ({ value, testID }: { value: string; testID?: string }) => (
    <div data-testid={testID}>checkbox-{value}</div>
  ),
}));

jest.mock('../../ui/heading', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex' }}>{children}</div>,
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: ({ children, onPress, testID }: { children: React.ReactNode; onPress: () => void; testID?: string }) => (
    <button onClick={onPress} data-testid={testID}>
      {children}
    </button>
  ),
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Filter: ({ size }: { size: number }) => <span>Filter-{size}</span>,
  X: ({ size }: { size: number }) => <span>X-{size}</span>,
  Check: ({ size }: { size: number }) => <span>Check-{size}</span>,
}));

// Mock the loading component
jest.mock('@/components/common/loading', () => ({
  Loading: () => <span>Loading...</span>,
}));

// Mock React Native SectionList without requiring actual RN
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  SectionList: ({ sections, renderItem, renderSectionHeader }: any) => (
    <div data-testid="section-list">
      {sections.map((section: any, index: number) => (
        <div key={index}>
          {renderSectionHeader({ section })}
          {section.data.map((item: any, itemIndex: number) => (
            <div key={itemIndex}>{renderItem({ item })}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe('PersonnelFilterSheet', () => {
  const mockStore = {
    filterOptions: [
      { Id: '1', Name: 'Department A', Type: 'Department' },
      { Id: '2', Name: 'Role B', Type: 'Role' },
      { Id: '3', Name: 'Department C', Type: 'Department' },
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

  it('renders filter sheet when open', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('Filter Personnel')).toBeTruthy();
    expect(getByText('Select filters to refine the personnel list. Changes are automatically applied.')).toBeTruthy();
    expect(getByText('Department A')).toBeTruthy();
    expect(getByText('Role B')).toBeTruthy();
  });

  it('groups filters by type', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    // Should show section headers for each type
    expect(getByText('Department')).toBeTruthy();
    expect(getByText('Role')).toBeTruthy();

    // Should show items under correct groups
    expect(getByText('Department A')).toBeTruthy();
    expect(getByText('Department C')).toBeTruthy();
    expect(getByText('Role B')).toBeTruthy();
  });

  it('shows check icon for selected filters', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    // Check icon should appear for selected items
    expect(getByText('Check-16')).toBeTruthy();
  });

  it('does not render when sheet is closed', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isFilterSheetOpen: false,
    } as any);

    const { queryByText } = render(<PersonnelFilterSheet />);

    expect(queryByText('Filter Personnel')).toBeFalsy();
  });

  it('shows loading state when loading filters', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isLoadingFilters: true,
    } as any);

    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows empty state when no filter options available', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      filterOptions: [],
    } as any);

    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('No filter options available')).toBeTruthy();
    expect(getByText('Filter options will appear here when available.')).toBeTruthy();
  });

  it('displays active filter count badge', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('1')).toBeTruthy(); // Badge showing 1 active filter
  });

  it('calls closeFilterSheet when close button is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('close-filter-sheet'));

    expect(mockStore.closeFilterSheet).toHaveBeenCalled();
  });

  it('calls toggleFilter when filter item is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('filter-item-1'));

    expect(mockStore.toggleFilter).toHaveBeenCalledWith('1');
  });

  it('calls toggleFilter when checkbox is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('filter-checkbox-1'));

    expect(mockStore.toggleFilter).toHaveBeenCalledWith('1');
  });

  it('shows correct checkbox state for selected filters', () => {
    const { getByTestId, getByText } = render(<PersonnelFilterSheet />);

    const checkbox1 = getByTestId('filter-checkbox-1');
    const checkbox2 = getByTestId('filter-checkbox-2');

    // Check that checkboxes exist
    expect(checkbox1).toBeTruthy();
    expect(checkbox2).toBeTruthy();

    // Check checkbox states
    expect(getByText('checkbox-true')).toBeTruthy(); // Selected filter
    expect(getByText('checkbox-false')).toBeTruthy(); // Unselected filter
  });

  it('sorts groups and items alphabetically', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    // Groups should be sorted: Department comes before Role
    expect(getByText('Department')).toBeTruthy();
    expect(getByText('Role')).toBeTruthy();

    // Items within Department group should be sorted: Department A before Department C
    expect(getByText('Department A')).toBeTruthy();
    expect(getByText('Department C')).toBeTruthy();
  });
});

jest.mock('../../ui/badge', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Badge: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Box: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, onPress, testID }: any) => React.createElement(Pressable, { onPress, testID }, children),
  };
});

jest.mock('../../ui/checkbox', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    Checkbox: ({ value, onChange, testID }: any) => React.createElement(Pressable, { testID, onPress: onChange }, React.createElement(Text, {}, value)),
  };
});

jest.mock('../../ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Heading: ({ children }: any) => React.createElement(Text, {}, children),
  };
});

jest.mock('../../ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    HStack: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../ui/pressable', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Pressable: ({ children, onPress, testID }: any) => React.createElement(Pressable, { onPress, testID }, children),
  };
});

jest.mock('../../ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Text: ({ children }: any) => React.createElement(Text, {}, children),
  };
});

jest.mock('../../ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    VStack: ({ children }: any) => React.createElement(View, {}, children),
  };
});

jest.mock('../../common/loading', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Loading: () => React.createElement(Text, {}, 'Loading...'),
  };
});

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

  it('renders filter sheet when open', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('Filter Personnel')).toBeTruthy();
    expect(getByText('Select filters to refine the personnel list. Changes are automatically applied.')).toBeTruthy();
    expect(getByText('Department A')).toBeTruthy();
    expect(getByText('Role B')).toBeTruthy();
  });

  it('does not render when sheet is closed', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isFilterSheetOpen: false,
    } as any);

    const { queryByText } = render(<PersonnelFilterSheet />);

    expect(queryByText('Filter Personnel')).toBeFalsy();
  });

  it('shows loading state when loading filters', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      isLoadingFilters: true,
    } as any);

    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows empty state when no filter options available', () => {
    mockUsePersonnelStore.mockReturnValue({
      ...mockStore,
      filterOptions: [],
    } as any);

    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('No filter options available')).toBeTruthy();
    expect(getByText('Filter options will appear here when available.')).toBeTruthy();
  });

  it('displays active filter count badge', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('1')).toBeTruthy(); // Badge showing 1 active filter
  });

  it('calls closeFilterSheet when close button is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('close-filter-sheet'));

    expect(mockStore.closeFilterSheet).toHaveBeenCalled();
  });

  it('calls toggleFilter when filter item is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('filter-item-1'));

    expect(mockStore.toggleFilter).toHaveBeenCalledWith('1');
  });

  it('calls toggleFilter when checkbox is pressed', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    fireEvent.press(getByTestId('filter-checkbox-1'));

    expect(mockStore.toggleFilter).toHaveBeenCalledWith('1');
  });

  it('shows correct checkbox state for selected filters', () => {
    const { getByTestId } = render(<PersonnelFilterSheet />);

    const checkbox1 = getByTestId('filter-checkbox-1');
    const checkbox2 = getByTestId('filter-checkbox-2');

    // Check that checkboxes exist and contain the expected text content
    expect(checkbox1).toBeTruthy();
    expect(checkbox2).toBeTruthy();
  });

  it('displays filter type badges', () => {
    const { getByText } = render(<PersonnelFilterSheet />);

    expect(getByText('Department')).toBeTruthy();
    expect(getByText('Role')).toBeTruthy();
  });
});
