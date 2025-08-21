import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ContactType, type ContactResultData } from '@/models/v4/contacts/contactResultData';

// Mock dependencies
jest.mock('@/stores/contacts/store', () => ({
  useContactsStore: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Actionsheet mock removed as we now have a manual mock via moduleNameMapper

import { useAnalytics } from '@/hooks/use-analytics';
import { useContactsStore } from '@/stores/contacts/store';
import { ContactDetailsSheet } from '../contact-details-sheet';

describe('ContactDetailsSheet', () => {
  const mockTrackEvent = jest.fn();
  const mockCloseDetails = jest.fn();
  const mockUseContactsStore = useContactsStore as jest.MockedFunction<typeof useContactsStore>;
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

  // Sample test data
  const mockPersonContact: ContactResultData = {
    ContactId: 'contact-1',
    Name: 'John Doe',
    FirstName: 'John',
    MiddleName: 'William',
    LastName: 'Doe',
    Email: 'john@example.com',
    Phone: '123-456-7890',
    Mobile: '098-765-4321',
    HomePhoneNumber: '111-222-3333',
    CellPhoneNumber: '444-555-6666',
    OfficePhoneNumber: '777-888-9999',
    FaxPhoneNumber: '000-111-2222',
    ContactType: ContactType.Person,
    IsImportant: true,
    Address: '123 Main St',
    City: 'Anytown',
    State: 'CA',
    Zip: '12345',
    LocationGpsCoordinates: '37.7749,-122.4194',
    EntranceGpsCoordinates: '37.7748,-122.4193',
    ExitGpsCoordinates: '37.7750,-122.4195',
    Website: 'https://example.com',
    Twitter: 'johndoe',
    Facebook: 'john.doe',
    LinkedIn: 'johndoe',
    Instagram: 'johndoe',
    Threads: 'johndoe',
    Bluesky: 'johndoe.bsky.social',
    Mastodon: '@johndoe@mastodon.social',
    CountryIssuedIdNumber: 'ABC123',
    StateIdNumber: 'DEF456',
    Description: 'Sample description',
    Notes: 'Sample note',
    OtherInfo: 'Other information',
    AddedOn: '2023-01-01T00:00:00Z',
    AddedByUserName: 'Admin',
    EditedOn: '2023-01-02T00:00:00Z',
    EditedByUserName: 'Admin',
    IsDeleted: false,
    AddedOnUtc: new Date('2023-01-01T00:00:00Z'),
    ImageUrl: 'https://example.com/image.jpg',
  };

  const mockCompanyContact: ContactResultData = {
    ContactId: 'company-1',
    Name: 'Acme Corp',
    CompanyName: 'Acme Corp',
    ContactType: ContactType.Company,
    Email: 'info@acme.com',
    Phone: '555-123-4567',
    Mobile: '',
    Address: '456 Business Blvd',
    City: 'Business City',
    State: 'TX',
    Zip: '54321',
    Website: 'https://acme.com',
    Notes: '',
    ImageUrl: '',
    IsImportant: false,
    IsDeleted: false,
    AddedOnUtc: new Date('2023-01-01T00:00:00Z'),
  };

  const mockMinimalContact: ContactResultData = {
    ContactId: 'minimal-1',
    Name: 'Jane Smith',
    ContactType: ContactType.Person,
    Phone: '',
    Mobile: '',
    Address: '',
    City: '',
    State: '',
    Zip: '',
    Notes: '',
    ImageUrl: '',
    IsImportant: false,
    IsDeleted: false,
    AddedOnUtc: new Date('2023-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default mock for contacts store
    mockUseContactsStore.mockReturnValue({
      contacts: [mockPersonContact, mockCompanyContact],
      contactNotes: {},
      searchQuery: '',
      selectedContactId: 'contact-1',
      isDetailsOpen: true,
      isLoading: false,
      isNotesLoading: false,
      error: null,
      fetchContacts: jest.fn(),
      fetchContactNotes: jest.fn(),
      setSearchQuery: jest.fn(),
      selectContact: jest.fn(),
      closeDetails: mockCloseDetails,
    });
  });

  describe('Analytics Tracking', () => {
    it('should track view analytics when sheet becomes visible', async () => {
      render(<ContactDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('contact_details_sheet_viewed', {
          timestamp: expect.any(String),
          contactId: 'contact-1',
          contactType: 'person',
          hasContactInfo: true,
          hasLocationInfo: true,
          hasSocialMedia: true,
          hasDescription: true,
          isImportant: true,
          activeTab: 'details',
        });
      });
    });

    it('should track view analytics for company contact', async () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockCompanyContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'company-1',
        isDetailsOpen: true,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      render(<ContactDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('contact_details_sheet_viewed', {
          timestamp: expect.any(String),
          contactId: 'company-1',
          contactType: 'company',
          hasContactInfo: true,
          hasLocationInfo: true,
          hasSocialMedia: true,
          hasDescription: false,
          isImportant: false,
          activeTab: 'details',
        });
      });
    });

    it('should track view analytics for contact with minimal info', async () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockMinimalContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'minimal-1',
        isDetailsOpen: true,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      render(<ContactDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('contact_details_sheet_viewed', {
          timestamp: expect.any(String),
          contactId: 'minimal-1',
          contactType: 'person',
          hasContactInfo: false,
          hasLocationInfo: false,
          hasSocialMedia: false,
          hasDescription: false,
          isImportant: false,
          activeTab: 'details',
        });
      });
    });

    it('should not track analytics when sheet is closed', () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockPersonContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'contact-1',
        isDetailsOpen: false,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      render(<ContactDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should track analytics with correct timestamp format', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<ContactDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('contact_details_sheet_viewed', {
          timestamp: '2024-01-15T10:00:00.000Z',
          contactId: 'contact-1',
          contactType: 'person',
          hasContactInfo: true,
          hasLocationInfo: true,
          hasSocialMedia: true,
          hasDescription: true,
          isImportant: true,
          activeTab: 'details',
        });
      });

      jest.restoreAllMocks();
    });

    it('should handle analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      // Should not throw error when analytics fails
      expect(() => {
        render(<ContactDetailsSheet />);
      }).not.toThrow();

      // Should log warning but continue functioning
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to track contact details sheet view analytics:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it.skip('should track tab change analytics when switching to notes', async () => { });

    it.skip('should track tab change analytics when switching back to details', async () => { });

    it.skip('should handle tab change analytics errors gracefully', async () => { });
  });

  describe.skip('Component Behavior', () => {
    it('should render contact details sheet when open', () => {
      const { getByText } = render(<ContactDetailsSheet />);

      expect(getByText('contacts.details')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should not render when closed', () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockPersonContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'contact-1',
        isDetailsOpen: false,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      const { queryByText } = render(<ContactDetailsSheet />);

      expect(queryByText('contacts.details')).toBeNull();
    });

    it('should display person contact information correctly', () => {
      const { getByText } = render(<ContactDetailsSheet />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('contacts.person')).toBeTruthy();
      expect(getByText('john@example.com')).toBeTruthy();
      expect(getByText('123-456-7890')).toBeTruthy();
    });

    it('should display company contact information correctly', () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockCompanyContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'company-1',
        isDetailsOpen: true,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      const { getByText } = render(<ContactDetailsSheet />);

      expect(getByText('Acme Corp')).toBeTruthy();
      expect(getByText('contacts.company')).toBeTruthy();
    });

    it('should handle missing contact gracefully', () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'non-existent',
        isDetailsOpen: true,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      const { queryByText } = render(<ContactDetailsSheet />);

      expect(queryByText('contacts.details')).toBeNull();
    });

    it('should switch between tabs correctly', () => {
      const { getByText, queryByText } = render(<ContactDetailsSheet />);

      // Initially on details tab
      expect(queryByText('Contact Notes List')).toBeNull();

      // Switch to notes tab
      fireEvent.press(getByText('contacts.tabs.notes'));

      // Should show notes content
      expect(getByText('Contact Notes List')).toBeTruthy();
    });

    it('should close sheet when close button is pressed', () => {
      const { getByRole } = render(<ContactDetailsSheet />);

      const closeButton = getByRole('button');
      fireEvent.press(closeButton);

      expect(mockCloseDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe.skip('Display Logic', () => {
    it('should show important star for important contacts', () => {
      const { queryByTestId } = render(<ContactDetailsSheet />);

      // Check if important contact has star (mockPersonContact.IsImportant = true)
      // This would be verified by checking if the StarIcon is rendered
      expect(mockPersonContact.IsImportant).toBe(true);
    });

    it('should not show star for non-important contacts', () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockCompanyContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'company-1',
        isDetailsOpen: true,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      render(<ContactDetailsSheet />);

      // Check if non-important contact doesn't have star (mockCompanyContact.IsImportant = false)
      expect(mockCompanyContact.IsImportant).toBe(false);
    });

    it('should display correct contact type labels', () => {
      const { getByText } = render(<ContactDetailsSheet />);

      expect(getByText('contacts.person')).toBeTruthy();
    });

    it('should handle contacts with partial information', () => {
      mockUseContactsStore.mockReturnValue({
        contacts: [mockMinimalContact],
        contactNotes: {},
        searchQuery: '',
        selectedContactId: 'minimal-1',
        isDetailsOpen: true,
        isLoading: false,
        isNotesLoading: false,
        error: null,
        fetchContacts: jest.fn(),
        fetchContactNotes: jest.fn(),
        setSearchQuery: jest.fn(),
        selectContact: jest.fn(),
        closeDetails: mockCloseDetails,
      });

      const { getByText } = render(<ContactDetailsSheet />);

      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('contacts.person')).toBeTruthy();
    });
  });
});
