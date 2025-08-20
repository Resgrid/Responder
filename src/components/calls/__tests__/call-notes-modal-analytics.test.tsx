import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';
import CallNotesModal from '../call-notes-modal';
import { useAuthStore } from '@/lib/auth';
import { useCallDetailStore } from '@/stores/calls/detail-store';
import { useAnalytics } from '@/hooks/use-analytics';

// Mock analytics first
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock useFocusEffect
const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffect,
}));

// Mock other dependencies
jest.mock('react-i18next');
jest.mock('@/lib/auth');
jest.mock('@/stores/calls/detail-store');

// Mock other dependencies
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        close: jest.fn(),
      }));
      return <View testID="bottom-sheet">{children}</View>;
    }),
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
    BottomSheetBackdrop: () => <View testID="backdrop" />,
  };
});

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
  default: () => {
    const { View, Text } = require('react-native');
    return <View testID="zero-state"><Text>No notes found</Text></View>;
  },
}));

jest.mock('../../ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseCallDetailStore = useCallDetailStore as jest.MockedFunction<typeof useCallDetailStore>;

describe('CallNotesModal Analytics', () => {
  const mockTrackEvent = jest.fn();
  const mockFetchCallNotes = jest.fn();
  const mockAddNote = jest.fn();
  const mockSearchNotes = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    callId: 'test-call-id',
  };

  const mockCallNotes = [
    {
      CallNoteId: '1',
      Note: 'Test note 1',
      FullName: 'John Doe',
      TimestampFormatted: '2025-01-15 10:30 AM',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure useFocusEffect to immediately call the callback
    mockUseFocusEffect.mockImplementation((callback: () => void) => {
      callback();
    });

    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
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

    mockSearchNotes.mockReturnValue(mockCallNotes);
  });

  describe('Analytics Tracking', () => {
    it('tracks modal view analytics when opened', () => {
      render(<CallNotesModal {...defaultProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_modal_viewed', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        noteCount: 1,
        hasNotes: true,
        isLoading: false,
        hasSearchQuery: false,
      });
    });

    it('does not track analytics when modal is closed', () => {
      render(<CallNotesModal {...defaultProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks note addition analytics', async () => {
      mockAddNote.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(<CallNotesModal {...defaultProps} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const noteInput = getByPlaceholderText('callNotes.addNotePlaceholder');
      const addButton = getByText('callNotes.addNote');

      fireEvent.changeText(noteInput, 'New test note');
      fireEvent.press(addButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_note_added', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        noteLength: 13,
        userId: 'user-123',
      });
    });

    it('tracks search analytics', () => {
      const { getByPlaceholderText } = render(<CallNotesModal {...defaultProps} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const searchInput = getByPlaceholderText('callNotes.searchPlaceholder');
      fireEvent.changeText(searchInput, 'abc'); // 3 characters to trigger analytics

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_search', {
        timestamp: expect.any(String),
        callId: 'test-call-id',
        searchQuery: 'abc',
        resultCount: 1,
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
        noteCount: 1,
        hadSearchQuery: false,
      });
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
});
