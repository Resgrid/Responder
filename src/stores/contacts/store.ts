import { create } from 'zustand';

import { getContactNotes } from '@/api/contacts/contactNotes';
import { getAllContacts, getContact } from '@/api/contacts/contacts';
import { type ContactNoteResultData } from '@/models/v4/contacts/contactNoteResultData';
import { type ContactResultData } from '@/models/v4/contacts/contactResultData';
import type { ApiResponse } from '@/types/api';

interface ContactsState {
  contacts: ContactResultData[];
  contactNotes: Record<string, ContactNoteResultData[]>;
  searchQuery: string;
  selectedContactId: string | null;
  // Full record from GetContactById — the GetAllContacts list payload is slim,
  // so the details sheet needs this to show all fields
  selectedContactDetails: ContactResultData | null;
  isDetailsOpen: boolean;
  isLoading: boolean;
  isDetailsLoading: boolean;
  isNotesLoading: boolean;
  error: string | null;
  // Actions
  fetchContacts: () => Promise<void>;
  fetchContactDetails: (contactId: string) => Promise<void>;
  fetchContactNotes: (contactId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  selectContact: (id: string) => void;
  closeDetails: () => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  contactNotes: {},
  searchQuery: '',
  selectedContactId: null,
  selectedContactDetails: null,
  isDetailsOpen: false,
  isLoading: false,
  isDetailsLoading: false,
  isNotesLoading: false,
  error: null,

  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAllContacts();
      set({ contacts: response.Data, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
  },

  fetchContactNotes: async (contactId: string) => {
    const { contactNotes } = get();

    // Don't fetch if we already have notes for this contact
    if (contactNotes[contactId]) {
      return;
    }

    set({ isNotesLoading: true, error: null });
    try {
      const response = (await getContactNotes(contactId)) as ApiResponse<ContactNoteResultData[]>;
      set({
        contactNotes: {
          ...contactNotes,
          [contactId]: response.Data || [],
        },
        isNotesLoading: false,
      });
    } catch (error) {
      set({
        isNotesLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contact notes',
      });
    }
  },

  fetchContactDetails: async (contactId: string) => {
    set({ isDetailsLoading: true, selectedContactDetails: null });
    try {
      const response = await getContact(contactId);
      set({ selectedContactDetails: response.Data || null, isDetailsLoading: false });
    } catch {
      // The sheet falls back to the slim list record already in the store
      set({ isDetailsLoading: false, selectedContactDetails: null });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  selectContact: (id) => {
    set({ selectedContactId: id, isDetailsOpen: true });
    get().fetchContactDetails(id);
  },

  closeDetails: () => set({ isDetailsOpen: false, selectedContactDetails: null }),
}));
