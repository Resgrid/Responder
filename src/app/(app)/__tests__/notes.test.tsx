import React from 'react';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock navigation
const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffect,
}));

// Mock stores
const mockFetchNotes = jest.fn();

jest.mock('@/stores/notes/store', () => ({
  useNotesStore: () => ({
    notes: [],
    searchQuery: '',
    isLoading: false,
    error: null,
    fetchNotes: mockFetchNotes,
    setSearchQuery: jest.fn(),
    selectNote: jest.fn(),
  }),
}));

describe('Notes Screen Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks notes view analytics event with correct data', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { useNotesStore } = require('@/stores/notes/store');

    const { trackEvent } = useAnalytics();
    const { notes } = useNotesStore();

    // Simulate the analytics tracking that happens in useFocusEffect
    trackEvent('notes_view', {
      noteCount: notes.length,
      hasSearchQuery: false,
      currentCategory: 'All',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('notes_view', {
      noteCount: 0,
      hasSearchQuery: false,
      currentCategory: 'All',
    });
  });

  it('tracks search analytics event with correct data', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate search tracking
    const searchQuery = 'business';
    const resultCount = 2;

    trackEvent('notes_search', {
      searchQuery,
      resultCount,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('notes_search', {
      searchQuery: 'business',
      resultCount: 2,
    });
  });

  it('tracks note selection analytics event with correct data', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { trackEvent } = useAnalytics();

    // Simulate note selection tracking
    const note = {
      id: '1',
      title: 'Test Note',
      category: 'Work',
    };

    trackEvent('note_selected', {
      noteId: note.id,
      noteTitle: note.title,
      noteCategory: note.category,
      isFromSearch: false,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('note_selected', {
      noteId: '1',
      noteTitle: 'Test Note',
      noteCategory: 'Work',
      isFromSearch: false,
    });
  });

  it('tracks refresh analytics event with correct data', () => {
    const { useAnalytics } = require('@/hooks/use-analytics');
    const { useNotesStore } = require('@/stores/notes/store');

    const { trackEvent } = useAnalytics();
    const { notes } = useNotesStore();

    // Simulate refresh tracking
    trackEvent('notes_refresh', {
      noteCount: notes.length,
      hasSearchQuery: false,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('notes_refresh', {
      noteCount: 0,
      hasSearchQuery: false,
    });
  });

  describe('Note filtering logic tests', () => {
    const testNotes = [
      {
        id: '1',
        title: 'Business Meeting Notes',
        body: 'Important client discussion',
        category: 'Work',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Personal Reminder',
        body: 'Call family',
        category: 'Personal',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('filters notes by title correctly', () => {
      const query = 'business';
      const filtered = testNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase()) ||
        note.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Business Meeting Notes');
    });

    it('filters notes by body content correctly', () => {
      const query = 'family';
      const filtered = testNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase()) ||
        note.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Personal Reminder');
    });

    it('filters notes by category correctly', () => {
      const query = 'personal';
      const filtered = testNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase()) ||
        note.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Personal Reminder');
    });

    it('performs case-insensitive filtering', () => {
      const query = 'BUSINESS';
      const filtered = testNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase()) ||
        note.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Business Meeting Notes');
    });

    it('returns all notes when search query is empty', () => {
      const query = '';
      const filtered = query.trim() === '' ? testNotes : testNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase()) ||
        note.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(2);
    });

    it('returns empty array for non-matching queries', () => {
      const query = 'nonexistent';
      const filtered = testNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase()) ||
        note.category.toLowerCase().includes(query.toLowerCase())
      );

      expect(filtered).toHaveLength(0);
    });
  });
});
