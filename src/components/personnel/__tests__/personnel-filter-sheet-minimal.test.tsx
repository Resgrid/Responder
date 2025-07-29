// Minimal test to verify basic functionality
import React from 'react';

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
    isFilterSheetOpen: true,
    setIsFilterSheetOpen: jest.fn(),
    filters: {
      departments: [],
      roles: [],
      groups: [],
      statusTypes: [],
    },
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
  }),
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PersonnelFilterSheet Minimal Test', () => {
  it('should import without crashing', () => {
    const PersonnelFilterSheet = require('../personnel-filter-sheet').PersonnelFilterSheet;
    expect(PersonnelFilterSheet).toBeDefined();
  });
});
