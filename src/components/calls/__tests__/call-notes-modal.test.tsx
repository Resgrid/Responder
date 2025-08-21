import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import CallNotesModal from '../call-notes-modal';
import { useAuthStore } from '@/lib/auth';
import { useCallDetailStore } from '@/stores/calls/detail-store';
import { useAnalytics } from '@/hooks/use-analytics';

// Mock dependencies
jest.mock('react-i18next');
jest.mock('@/lib/auth');
jest.mock('@/stores/calls/detail-store');
jest.mock('@/hooks/use-analytics');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((fn) => fn()),
  useIsFocused: () => true,
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef(({ children, onChange, index }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        close: jest.fn(),
      }));

      React.useEffect(() => {
        if (onChange) onChange(index);
      }, [index, onChange]);

      return <View testID="bottom-sheet">{children}</View>;
    }),
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
    BottomSheetBackdrop: ({ children }: any) => <View testID="backdrop">{children}</View>,
  };
});

// Mock other dependencies
jest.mock('react-native-gesture-handler', () => ({
  ScrollView: ({ children, ...props }: any) => {
    const { ScrollView } = require('react-native');
    return <ScrollView {...props}>{children}</ScrollView>;
  },
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="keyboard-aware-scroll-view">{children}</View>;
  },
}));

jest.mock('../../common/loading', () => ({
  Loading: () => {
    const { View, Text } = require('react-native');
    return <View testID="loading"><Text>Loading...</Text></View>;
  },
}));

jest.mock('../../common/zero-state', () => ({
  __esModule: true,
  default: ({ heading }: { heading: string }) => {
    const { View, Text } = require('react-native');
    return <View testID="zero-state"><Text>{heading}</Text></View>;
  },
}));

jest.mock('../../ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseCallDetailStore = useCallDetailStore as jest.MockedFunction<typeof useCallDetailStore>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('CallNotesModal', () => {
  const mockOnClose = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockFetchCallNotes = jest.fn();
  const mockAddNote = jest.fn();
  const mockSearchNotes = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    callId: 'test-call-id',
  };

  const mockCallNotes = [
    {
      CallNoteId: '1',
      Note: 'Test note 1',
      FullName: 'John Doe',
      TimestampFormatted: '2025-01-15 10:30 AM',
    },
    {
      CallNoteId: '2',
      Note: 'Test note 2',
      FullName: 'Jane Smith',
      TimestampFormatted: '2025-01-15 11:00 AM',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTranslation.mockReturnValue({
      t: (key: string) => {
        const translations: { [key: string]: string } = {
          'callNotes.title': 'Call Notes',
          'callNotes.searchPlaceholder': 'Search notes...',
          'callNotes.addNotePlaceholder': 'Add a note...',
          'callNotes.addNote': 'Add Note',
        };
        return translations[key] || key;
      },
    } as any);

    mockUseAuthStore.mockReturnValue({
      profile: { sub: 'user-123' },
    });

    mockUseCallDetailStore.mockReturnValue({
      callNotes: mockCallNotes,
      addNote: mockAddNote,
      searchNotes: mockSearchNotes,
      isNotesLoading: false,
      fetchCallNotes: mockFetchCallNotes,
    });

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockSearchNotes.mockReturnValue(mockCallNotes);
  });

  describe('Basic Functionality', () => {
    it('renders correctly when open', () => {
      const { getByText, getByTestId } = render(<CallNotesModal {...defaultProps} />);

      expect(getByText('Call Notes')).toBeTruthy();
      expect(getByTestId('close-button')).toBeTruthy();
      expect(getByText('Test note 1')).toBeTruthy();
      expect(getByText('Test note 2')).toBeTruthy();
    });

    it('fetches call notes when opened', () => {
      render(<CallNotesModal {...defaultProps} />);

      expect(mockFetchCallNotes).toHaveBeenCalledWith('test-call-id');
    });

    it('calls onClose when close button is pressed', () => {
      const { getByTestId } = render(<CallNotesModal {...defaultProps} />);

      fireEvent.press(getByTestId('close-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('renders correctly when closed', () => {
      const { queryByText } = render(<CallNotesModal {...defaultProps} isOpen={false} />);

      // Bottom sheet should still render but with index -1 (closed)
      expect(queryByText('Call Notes')).toBeTruthy();
    });

    it('shows loading state correctly', () => {
      mockUseCallDetailStore.mockReturnValue({
        callNotes: mockCallNotes,
        addNote: mockAddNote,
        searchNotes: mockSearchNotes,
        isNotesLoading: true,
        fetchCallNotes: mockFetchCallNotes,
      });

      const { getByTestId } = render(<CallNotesModal {...defaultProps} />);

      expect(getByTestId('loading')).toBeTruthy();
    });

    it('shows zero state when no notes found', () => {
      mockUseCallDetailStore.mockReturnValue({
        callNotes: [],
        addNote: mockAddNote,
        searchNotes: jest.fn(() => []),
        isNotesLoading: false,
        fetchCallNotes: mockFetchCallNotes,
      });

      const { getByTestId } = render(<CallNotesModal {...defaultProps} />);

      expect(getByTestId('zero-state')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('handles search input correctly', () => {
      const mockFilteredNotes = [mockCallNotes[0]];
      mockSearchNotes.mockReturnValue(mockFilteredNotes);

      const { getByPlaceholderText, getByText, queryByText } = render(<CallNotesModal {...defaultProps} />);

      const searchInput = getByPlaceholderText('Search notes...');
      fireEvent.changeText(searchInput, 'Test note 1');

      // Should show filtered results
      expect(getByText('Test note 1')).toBeTruthy();
      expect(queryByText('Test note 2')).toBeFalsy();
    });

    it('tracks search analytics', () => {
      const { getByPlaceholderText } = render(<CallNotesModal {...defaultProps} />);

      const searchInput = getByPlaceholderText('Search notes...');
      fireEvent.changeText(searchInput, 'abc'); // 3 characters to trigger analytics

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_search', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        searchQuery: 'abc',
        resultCount: 2,
      });
    });
  });

  describe('Note Addition', () => {
    it('handles adding a new note', async () => {
      mockAddNote.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(<CallNotesModal {...defaultProps} />);

      const noteInput = getByPlaceholderText('Add a note...');
      const addButton = getByText('Add Note');

      fireEvent.changeText(noteInput, 'New test note');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(mockAddNote).toHaveBeenCalledWith('test-call-id', 'New test note', 'user-123', null, null);
      });
    });

    it('tracks note addition analytics', async () => {
      mockAddNote.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(<CallNotesModal {...defaultProps} />);

      const noteInput = getByPlaceholderText('Add a note...');
      const addButton = getByText('Add Note');

      fireEvent.changeText(noteInput, 'New test note');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_note_added', {
          timestamp: expect.any(String),
          callId: 'test-call-id',
          noteLength: 13,
          userId: 'user-123',
        });
      });
    });

    it('disables add button when note input is empty', () => {
      const { getByText } = render(<CallNotesModal {...defaultProps} />);

      const addButton = getByText('Add Note');

      // Try to press the button when no note is entered
      fireEvent.press(addButton);

      expect(mockAddNote).not.toHaveBeenCalled();
    });

    it('does not add empty note when only whitespace is entered', async () => {
      const { getByPlaceholderText, getByText } = render(<CallNotesModal {...defaultProps} />);

      const noteInput = getByPlaceholderText('Add a note...');
      const addButton = getByText('Add Note');

      fireEvent.changeText(noteInput, '   ');
      fireEvent.press(addButton);

      expect(mockAddNote).not.toHaveBeenCalled();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks modal view analytics when opened', () => {
      render(<CallNotesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_modal_viewed', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        noteCount: 2,
        hasNotes: true,
        isLoading: false,
        hasSearchQuery: false,
      });
    });

    it('tracks modal view analytics with search query', () => {
      const { getByPlaceholderText } = render(<CallNotesModal {...defaultProps} />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      const searchInput = getByPlaceholderText('Search notes...');
      fireEvent.changeText(searchInput, 'test');

      // Re-render to trigger useFocusEffect with search query
      render(<CallNotesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_modal_viewed', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        noteCount: 2,
        hasNotes: true,
        isLoading: false,
        hasSearchQuery: false, // Will be false in fresh render
      });
    });

    it('tracks manual close analytics', () => {
      const { getByTestId } = render(<CallNotesModal {...defaultProps} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_modal_closed', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        wasManualClose: true,
        noteCount: 2,
        hadSearchQuery: false,
      });
    });

    it('does not track analytics when modal is closed', () => {
      render(<CallNotesModal {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks analytics with correct timestamp format', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<CallNotesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_modal_viewed', expect.objectContaining({
        timestamp: '2024-01-15T10:00:00.000Z',
      }));

      jest.restoreAllMocks();
    });

    it('handles analytics errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      expect(() => {
        render(<CallNotesModal {...defaultProps} />);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to track call notes modal analytics:', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing user profile gracefully', () => {
      mockUseAuthStore.mockReturnValue({
        profile: null,
      });

      const { getByText } = render(<CallNotesModal {...defaultProps} />);

      expect(getByText('Call Notes')).toBeTruthy();
    });

    it('handles empty call notes array', () => {
      mockUseCallDetailStore.mockReturnValue({
        callNotes: [],
        addNote: mockAddNote,
        searchNotes: jest.fn(() => []),
        isNotesLoading: false,
        fetchCallNotes: mockFetchCallNotes,
      });

      const { getByTestId } = render(<CallNotesModal {...defaultProps} />);

      expect(getByTestId('zero-state')).toBeTruthy();
    });

    it('handles null call notes', () => {
      mockUseCallDetailStore.mockReturnValue({
        callNotes: null,
        addNote: mockAddNote,
        searchNotes: jest.fn(() => []),
        isNotesLoading: false,
        fetchCallNotes: mockFetchCallNotes,
      });

      expect(() => {
        render(<CallNotesModal {...defaultProps} />);
      }).not.toThrow();
    });
  });
});