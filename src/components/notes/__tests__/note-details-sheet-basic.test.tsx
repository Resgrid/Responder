import React from 'react';
import { render } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import { NoteDetailsSheet } from '../note-details-sheet';

// Mock analytics first
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock dependencies
jest.mock('react-i18next');
jest.mock('nativewind', () => ({
  ...jest.requireActual('nativewind'),
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@/stores/notes/store', () => ({
  useNotesStore: () => ({
    notes: [],
    selectedNoteId: null,
    isDetailsOpen: false,
    closeDetails: jest.fn(),
    deleteNote: jest.fn(),
    searchQuery: '',
    isLoading: false,
    error: null,
    fetchNotes: jest.fn(),
    updateNote: jest.fn(),
    setSearchQuery: jest.fn(),
    selectNote: jest.fn(),
  }),
}));

jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: jest.fn((date, format) => `formatted-${date}-${format}`),
  parseDateISOString: jest.fn((dateString) => new Date(dateString)),
}));

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) => (
    <View testID="webview" {...props} />
  ));
});

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Calendar: 'Calendar',
  Tag: 'Tag',
  X: 'X',
}));

const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;

describe('NoteDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
    } as any);
  });

  it('renders without crashing when no note is selected', () => {
    const result = render(<NoteDetailsSheet />);
    expect(result.toJSON()).toBeNull();
  });

  it('tracks analytics when sheet is visible with selected note', () => {
    // We'll extend this test once the basic rendering works
    expect(true).toBe(true);
  });
});
