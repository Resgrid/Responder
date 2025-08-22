import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';

import { useAnalytics } from '@/hooks/use-analytics';
import { useNotesStore } from '@/stores/notes/store';
import { NoteResultData } from '@/models/v4/notes/noteResultData';

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
  useColorScheme: jest.fn(),
  cssInterop: jest.fn(),
  styled: jest.fn(() => (Component: any) => Component),
}));
jest.mock('@/stores/notes/store');
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

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    contains: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
    clearAll: jest.fn(),
  })),
}));

// Don't mock react-native broadly to avoid TurboModule issues

// Mock UI components
jest.mock('../../ui/actionsheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Actionsheet: ({ children, testID, ...props }: any) => 
      React.createElement(View, { testID, ...props }, children),
    ActionsheetBackdrop: ({ children, ...props }: any) => 
      React.createElement(View, { ...props }, children),
    ActionsheetContent: ({ children, ...props }: any) => 
      React.createElement(View, { ...props }, children),
    ActionsheetDragIndicator: ({ children, ...props }: any) => 
      React.createElement(View, { ...props }, children),
    ActionsheetDragIndicatorWrapper: ({ children, ...props }: any) => 
      React.createElement(View, { ...props }, children),
  };
});

jest.mock('../../ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Box: ({ children, ...props }: any) => 
      React.createElement(View, { ...props }, children),
  };
});

jest.mock('../../ui/button', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    Button: ({ children, testID, onPress, ...props }: any) => 
      React.createElement(TouchableOpacity, { testID, onPress, ...props }, children),
  };
});

jest.mock('../../ui/divider', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Divider: ({ ...props }: any) => 
      React.createElement(View, { ...props }),
  };
});

jest.mock('../../ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Heading: ({ children, ...props }: any) => 
      React.createElement(Text, { ...props }, children),
  };
});

jest.mock('../../ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HStack: ({ children, ...props }: any) => 
      React.createElement(View, { style: { flexDirection: 'row' }, ...props }, children),
  };
});

jest.mock('../../ui/text', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => 
      React.createElement(RNText, { ...props }, children),
  };
});

jest.mock('../../ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VStack: ({ children, ...props }: any) => 
      React.createElement(View, { style: { flexDirection: 'column' }, ...props }, children),
  };
});

const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;
const mockUseNotesStore = useNotesStore as jest.MockedFunction<typeof useNotesStore>;

describe('NoteDetailsSheet', () => {
  const mockCloseDetails = jest.fn();
  const mockDeleteNote = jest.fn();

  const mockNote: NoteResultData = {
    NoteId: 'test-note-id',
    UserId: 'test-user-id',
    Title: 'Test Note Title',
    Body: '<p>Test note body content</p>',
    Color: '#FF5733',
    Category: 'Business',
    ExpiresOn: '2025-12-31T23:59:59Z',
    AddedOn: '2025-01-15T10:30:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AppState to prevent MMKV issues
    const { AppState } = require('react-native');
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({}) as any);
    jest.spyOn(AppState, 'removeEventListener').mockImplementation(() => {});

    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
    } as any);

    mockUseColorScheme.mockReturnValue({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    mockUseNotesStore.mockReturnValue({
      notes: [mockNote],
      selectedNoteId: 'test-note-id',
      isDetailsOpen: true,
      closeDetails: mockCloseDetails,
      deleteNote: mockDeleteNote,
      searchQuery: '',
      isLoading: false,
      error: null,
      fetchNotes: jest.fn(),
      updateNote: jest.fn(),
      setSearchQuery: jest.fn(),
      selectNote: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders note details correctly', () => {
      const { getByText, getByTestId } = render(<NoteDetailsSheet />);

      expect(getByText('Test Note Title')).toBeTruthy();
      expect(getByText('Business')).toBeTruthy();
      expect(getByTestId('webview')).toBeTruthy();
    });

    it('renders formatted date when AddedOn is available', () => {
      const { getByText } = render(<NoteDetailsSheet />);

      // The mock parseDateISOString returns a new Date() which formats as a readable string
      expect(getByText(/formatted.*-yyyy-MM-dd HH:mm Z/)).toBeTruthy();
    });

    it('does not render category section when category is empty', () => {
      const noteWithoutCategory = { ...mockNote, Category: '' };
      mockUseNotesStore.mockReturnValue({
        notes: [noteWithoutCategory],
        selectedNoteId: 'test-note-id',
        isDetailsOpen: true,
        closeDetails: mockCloseDetails,
        deleteNote: mockDeleteNote,
        searchQuery: '',
        isLoading: false,
        error: null,
        fetchNotes: jest.fn(),
        updateNote: jest.fn(),
        setSearchQuery: jest.fn(),
        selectNote: jest.fn(),
      });

      const { queryByText } = render(<NoteDetailsSheet />);

      expect(queryByText('Business')).toBeNull();
    });

    it('returns null when no note is selected', () => {
      mockUseNotesStore.mockReturnValue({
        notes: [mockNote],
        selectedNoteId: null,
        isDetailsOpen: true,
        closeDetails: mockCloseDetails,
        deleteNote: mockDeleteNote,
        searchQuery: '',
        isLoading: false,
        error: null,
        fetchNotes: jest.fn(),
        updateNote: jest.fn(),
        setSearchQuery: jest.fn(),
        selectNote: jest.fn(),
      });

      const result = render(<NoteDetailsSheet />);

      expect(result.toJSON()).toBeNull();
    });

    it('returns null when selected note is not found', () => {
      mockUseNotesStore.mockReturnValue({
        notes: [mockNote],
        selectedNoteId: 'non-existent-id',
        isDetailsOpen: true,
        closeDetails: mockCloseDetails,
        deleteNote: mockDeleteNote,
        searchQuery: '',
        isLoading: false,
        error: null,
        fetchNotes: jest.fn(),
        updateNote: jest.fn(),
        setSearchQuery: jest.fn(),
        selectNote: jest.fn(),
      });

      const result = render(<NoteDetailsSheet />);

      expect(result.toJSON()).toBeNull();
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode styles correctly', () => {
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'dark',
        setColorScheme: jest.fn(),
        toggleColorScheme: jest.fn(),
      });

      const { getByTestId } = render(<NoteDetailsSheet />);
      const webview = getByTestId('webview');

      // Check that WebView source contains dark mode colors
      expect(webview.props.source.html).toContain('#E5E7EB'); // dark mode text color
      expect(webview.props.source.html).toContain('#374151'); // dark mode background
    });

    it('applies light mode styles correctly', () => {
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: jest.fn(),
        toggleColorScheme: jest.fn(),
      });

      const { getByTestId } = render(<NoteDetailsSheet />);
      const webview = getByTestId('webview');

      // Check that WebView source contains light mode colors
      expect(webview.props.source.html).toContain('#1F2937'); // light mode text color
      expect(webview.props.source.html).toContain('#F9FAFB'); // light mode background
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks view analytics when sheet becomes visible', () => {
      render(<NoteDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('note_details_sheet_viewed', {
        timestamp: expect.any(String),
        noteId: 'test-note-id',
        hasCategory: true,
        hasExpiryDate: true,
        bodyLength: 29, // length of '<p>Test note body content</p>'
        titleLength: 15, // length of 'Test Note Title'
        noteColor: '#FF5733',
        hasAddedDate: true,
      });
    });

    it('does not track analytics when sheet is closed', () => {
      mockUseNotesStore.mockReturnValue({
        notes: [mockNote],
        selectedNoteId: 'test-note-id',
        isDetailsOpen: false,
        closeDetails: mockCloseDetails,
        deleteNote: mockDeleteNote,
        searchQuery: '',
        isLoading: false,
        error: null,
        fetchNotes: jest.fn(),
        updateNote: jest.fn(),
        setSearchQuery: jest.fn(),
        selectNote: jest.fn(),
      });

      render(<NoteDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks analytics with correct data for note without optional fields', () => {
      const minimalNote: NoteResultData = {
        NoteId: 'minimal-note-id',
        UserId: 'test-user-id',
        Title: 'Title',
        Body: 'Body',
        Color: '',
        Category: '',
        ExpiresOn: '',
        AddedOn: '',
      };

      mockUseNotesStore.mockReturnValue({
        notes: [minimalNote],
        selectedNoteId: 'minimal-note-id',
        isDetailsOpen: true,
        closeDetails: mockCloseDetails,
        deleteNote: mockDeleteNote,
        searchQuery: '',
        isLoading: false,
        error: null,
        fetchNotes: jest.fn(),
        updateNote: jest.fn(),
        setSearchQuery: jest.fn(),
        selectNote: jest.fn(),
      });

      render(<NoteDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('note_details_sheet_viewed', {
        timestamp: expect.any(String),
        noteId: 'minimal-note-id',
        hasCategory: false,
        hasExpiryDate: false,
        bodyLength: 4,
        titleLength: 5,
        noteColor: '',
        hasAddedDate: false,
      });
    });

    it('tracks close analytics when manually closed', () => {
      const { getByTestId } = render(<NoteDetailsSheet />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      // Find and press the close button (X icon)
      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('note_details_sheet_closed', {
        timestamp: expect.any(String),
        noteId: 'test-note-id',
        wasManualClose: true,
      });

      expect(mockCloseDetails).toHaveBeenCalled();
    });

    it('handles analytics errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      expect(() => {
        render(<NoteDetailsSheet />);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track note details sheet view analytics:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles close analytics errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      // Mock trackEvent to throw error only on close event
      mockTrackEvent.mockImplementation((eventName) => {
        if (eventName === 'note_details_sheet_closed') {
          throw new Error('Close analytics error');
        }
      });

      const { getByTestId } = render(<NoteDetailsSheet />);

      const closeButton = getByTestId('close-button');

      expect(() => {
        fireEvent.press(closeButton);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track note details sheet close analytics:',
        expect.any(Error)
      );

      expect(mockCloseDetails).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('re-tracks analytics when note changes', () => {
      const { rerender } = render(<NoteDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      // Change to a different note
      const newNote: NoteResultData = {
        ...mockNote,
        NoteId: 'new-note-id',
        Title: 'New Note Title',
      };

      mockUseNotesStore.mockReturnValue({
        notes: [newNote],
        selectedNoteId: 'new-note-id',
        isDetailsOpen: true,
        closeDetails: mockCloseDetails,
        deleteNote: mockDeleteNote,
        searchQuery: '',
        isLoading: false,
        error: null,
        fetchNotes: jest.fn(),
        updateNote: jest.fn(),
        setSearchQuery: jest.fn(),
        selectNote: jest.fn(),
      });

      rerender(<NoteDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenLastCalledWith('note_details_sheet_viewed', {
        timestamp: expect.any(String),
        noteId: 'new-note-id',
        hasCategory: true,
        hasExpiryDate: true,
        bodyLength: 29,
        titleLength: 14, // length of 'New Note Title'
        noteColor: '#FF5733',
        hasAddedDate: true,
      });
    });
  });

  describe('User Interactions', () => {
    it('calls handleClose when close button is pressed', () => {
      const { getByTestId } = render(<NoteDetailsSheet />);

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockCloseDetails).toHaveBeenCalled();
    });

    it('calls handleClose when actionsheet onClose is triggered', () => {
      const { getByTestId } = render(<NoteDetailsSheet />);

      // Simulate backdrop press or swipe down
      const actionsheet = getByTestId('actionsheet');
      fireEvent(actionsheet, 'onClose');

      expect(mockCloseDetails).toHaveBeenCalled();
    });
  });

  describe('WebView Content', () => {
    it('renders note body content in WebView', () => {
      const { getByTestId } = render(<NoteDetailsSheet />);
      const webview = getByTestId('webview');

      expect(webview.props.source.html).toContain('<p>Test note body content</p>');
    });

    it('includes proper WebView styling', () => {
      const { getByTestId } = render(<NoteDetailsSheet />);
      const webview = getByTestId('webview');

      const html = webview.props.source.html;
      expect(html).toContain('font-family: system-ui, -apple-system, sans-serif');
      expect(html).toContain('font-size: 16px');
      expect(html).toContain('line-height: 1.5');
      expect(html).toContain('max-width: 100%');
    });

    it('configures WebView props correctly', () => {
      const { getByTestId } = render(<NoteDetailsSheet />);
      const webview = getByTestId('webview');

      expect(webview.props.originWhitelist).toEqual(['*']);
      expect(webview.props.scrollEnabled).toBe(false);
      expect(webview.props.showsVerticalScrollIndicator).toBe(false);
      expect(webview.props.androidLayerType).toBe('software');
    });
  });
});
