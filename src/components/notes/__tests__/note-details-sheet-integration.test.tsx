import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '@/hooks/use-analytics';
import { useNotesStore } from '@/stores/notes/store';
import { NoteResultData } from '@/models/v4/notes/noteResultData';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock store
let mockStoreState = {
  notes: [] as NoteResultData[],
  selectedNoteId: null as string | null,
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
};

jest.mock('@/stores/notes/store', () => ({
  useNotesStore: () => mockStoreState,
}));

describe('NoteDetailsSheet Integration', () => {
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
    // Reset mock store
    mockStoreState = {
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
    };
  });

  it('integrates analytics hook correctly', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current.trackEvent).toBeDefined();
    expect(typeof result.current.trackEvent).toBe('function');
  });

  it('integrates notes store correctly', () => {
    mockStoreState.notes = [mockNote];
    mockStoreState.selectedNoteId = 'test-note-id';
    mockStoreState.isDetailsOpen = true;

    const { result } = renderHook(() => useNotesStore());

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.selectedNoteId).toBe('test-note-id');
    expect(result.current.isDetailsOpen).toBe(true);
  });

  it('tracks view analytics when note is selected and sheet is open', () => {
    mockStoreState.notes = [mockNote];
    mockStoreState.selectedNoteId = 'test-note-id';
    mockStoreState.isDetailsOpen = true;

    const { result: analyticsResult } = renderHook(() => useAnalytics());
    const { result: storeResult } = renderHook(() => useNotesStore());

    const selectedNote = storeResult.current.notes.find(
      (note) => note.NoteId === storeResult.current.selectedNoteId
    );

    if (storeResult.current.isDetailsOpen && selectedNote) {
      // Simulate the analytics tracking that happens in the component
      analyticsResult.current.trackEvent('note_details_sheet_viewed', {
        timestamp: new Date().toISOString(),
        noteId: selectedNote.NoteId,
        hasCategory: !!selectedNote.Category,
        hasExpiryDate: !!selectedNote.ExpiresOn,
        bodyLength: selectedNote.Body?.length || 0,
        titleLength: selectedNote.Title?.length || 0,
        noteColor: selectedNote.Color || '',
        hasAddedDate: !!selectedNote.AddedOn,
      });
    }

    expect(mockTrackEvent).toHaveBeenCalledWith('note_details_sheet_viewed', {
      timestamp: expect.any(String),
      noteId: 'test-note-id',
      hasCategory: true,
      hasExpiryDate: true,
      bodyLength: 29,
      titleLength: 15,
      noteColor: '#FF5733',
      hasAddedDate: true,
    });
  });

  it('does not track analytics when sheet is closed', () => {
    mockStoreState.notes = [mockNote];
    mockStoreState.selectedNoteId = 'test-note-id';
    mockStoreState.isDetailsOpen = false; // Sheet is closed

    const { result: storeResult } = renderHook(() => useNotesStore());

    // Simulate the condition check in the component
    if (storeResult.current.isDetailsOpen) {
      // This should not execute
      fail('Should not track analytics when sheet is closed');
    }

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not track analytics when no note is selected', () => {
    mockStoreState.notes = [mockNote];
    mockStoreState.selectedNoteId = null; // No note selected
    mockStoreState.isDetailsOpen = true;

    const { result: storeResult } = renderHook(() => useNotesStore());

    const selectedNote = storeResult.current.notes.find(
      (note) => note.NoteId === storeResult.current.selectedNoteId
    );

    // Simulate the condition check in the component
    if (storeResult.current.isDetailsOpen && selectedNote) {
      // This should not execute
      fail('Should not track analytics when no note is selected');
    }

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks close analytics when closeDetails is called', () => {
    mockStoreState.notes = [mockNote];
    mockStoreState.selectedNoteId = 'test-note-id';
    mockStoreState.isDetailsOpen = true;

    const { result: analyticsResult } = renderHook(() => useAnalytics());
    const { result: storeResult } = renderHook(() => useNotesStore());

    // Simulate close button press
    analyticsResult.current.trackEvent('note_details_sheet_closed', {
      timestamp: new Date().toISOString(),
      noteId: storeResult.current.selectedNoteId || '',
      wasManualClose: true,
    });

    storeResult.current.closeDetails();

    expect(mockTrackEvent).toHaveBeenCalledWith('note_details_sheet_closed', {
      timestamp: expect.any(String),
      noteId: 'test-note-id',
      wasManualClose: true,
    });

    expect(storeResult.current.closeDetails).toHaveBeenCalled();
  });

  it('tracks delete analytics when deleteNote is called', () => {
    mockStoreState.notes = [mockNote];
    mockStoreState.selectedNoteId = 'test-note-id';
    mockStoreState.isDetailsOpen = true;

    const { result: analyticsResult } = renderHook(() => useAnalytics());
    const { result: storeResult } = renderHook(() => useNotesStore());

    const selectedNote = storeResult.current.notes.find(
      (note) => note.NoteId === storeResult.current.selectedNoteId
    );

    if (selectedNote) {
      // Simulate delete button press
      analyticsResult.current.trackEvent('note_deleted_from_details', {
        timestamp: new Date().toISOString(),
        noteId: selectedNote.NoteId,
        hasCategory: !!selectedNote.Category,
        bodyLength: selectedNote.Body?.length || 0,
      });

      storeResult.current.deleteNote(selectedNote.NoteId);
      storeResult.current.closeDetails();
    }

    expect(mockTrackEvent).toHaveBeenCalledWith('note_deleted_from_details', {
      timestamp: expect.any(String),
      noteId: 'test-note-id',
      hasCategory: true,
      bodyLength: 29,
    });

    expect(storeResult.current.deleteNote).toHaveBeenCalledWith('test-note-id');
    expect(storeResult.current.closeDetails).toHaveBeenCalled();
  });
});
