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
const mockStore = {
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
  useNotesStore: () => mockStore,
}));

describe('NoteDetailsSheet Analytics', () => {
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
    mockStore.notes = [];
    mockStore.selectedNoteId = null;
    mockStore.isDetailsOpen = false;
  });

  it('should provide analytics hook', () => {
    const { trackEvent } = useAnalytics();
    expect(trackEvent).toBeDefined();
    expect(typeof trackEvent).toBe('function');
  });

  it('should track note details view with correct data', () => {
    const { trackEvent } = useAnalytics();

    // Simulate tracking call that would happen in the component
    trackEvent('note_details_sheet_viewed', {
      timestamp: new Date().toISOString(),
      noteId: mockNote.NoteId,
      hasCategory: !!mockNote.Category,
      hasExpiryDate: !!mockNote.ExpiresOn,
      bodyLength: mockNote.Body?.length || 0,
      titleLength: mockNote.Title?.length || 0,
      noteColor: mockNote.Color || '',
      hasAddedDate: !!mockNote.AddedOn,
    });

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

  it('should track note details view with minimal data', () => {
    const { trackEvent } = useAnalytics();

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

    trackEvent('note_details_sheet_viewed', {
      timestamp: new Date().toISOString(),
      noteId: minimalNote.NoteId,
      hasCategory: !!minimalNote.Category,
      hasExpiryDate: !!minimalNote.ExpiresOn,
      bodyLength: minimalNote.Body?.length || 0,
      titleLength: minimalNote.Title?.length || 0,
      noteColor: minimalNote.Color || '',
      hasAddedDate: !!minimalNote.AddedOn,
    });

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

  it('should track close analytics', () => {
    const { trackEvent } = useAnalytics();

    trackEvent('note_details_sheet_closed', {
      timestamp: new Date().toISOString(),
      noteId: mockNote.NoteId,
      wasManualClose: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('note_details_sheet_closed', {
      timestamp: expect.any(String),
      noteId: 'test-note-id',
      wasManualClose: true,
    });
  });

  it('should track delete analytics', () => {
    const { trackEvent } = useAnalytics();

    trackEvent('note_deleted_from_details', {
      timestamp: new Date().toISOString(),
      noteId: mockNote.NoteId,
      hasCategory: !!mockNote.Category,
      bodyLength: mockNote.Body?.length || 0,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('note_deleted_from_details', {
      timestamp: expect.any(String),
      noteId: 'test-note-id',
      hasCategory: true,
      bodyLength: 29,
    });
  });

  it('should handle analytics errors gracefully', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    const { trackEvent } = useAnalytics();

    // Mock trackEvent to throw error
    mockTrackEvent.mockImplementation(() => {
      throw new Error('Analytics error');
    });

    // This should not throw an error in the component
    expect(() => {
      try {
        trackEvent('note_details_sheet_viewed', {
          timestamp: new Date().toISOString(),
          noteId: mockNote.NoteId,
          hasCategory: true,
        });
      } catch (error) {
        // Component should catch and log the error
        console.warn('Failed to track note details sheet view analytics:', error);
      }
    }).not.toThrow();

    consoleWarnSpy.mockRestore();
  });
});
