import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { DispatchSelectionModal } from '../dispatch-selection-modal';

// Mock analytics hook
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock the dispatch store with proper typing
const mockDispatchStore = {
  data: {
    users: [
      {
        Id: '1',
        Type: 'Personnel',
        Name: 'John Doe',
        Selected: false,
      },
    ],
    groups: [
      {
        Id: '1',
        Type: 'Groups',
        Name: 'Fire Department',
        Selected: false,
      },
    ],
    roles: [
      {
        Id: '1',
        Type: 'Roles',
        Name: 'Captain',
        Selected: false,
      },
    ],
    units: [
      {
        Id: '1',
        Type: 'Unit',
        Name: 'Engine 1',
        Selected: false,
      },
    ],
  },
  selection: {
    everyone: false,
    users: [] as string[],
    groups: [] as string[],
    roles: [] as string[],
    units: [] as string[],
  },
  isLoading: false,
  error: null,
  searchQuery: '',
  fetchDispatchData: jest.fn(),
  setSelection: jest.fn(),
  toggleEveryone: jest.fn(),
  toggleUser: jest.fn(),
  toggleGroup: jest.fn(),
  toggleRole: jest.fn(),
  toggleUnit: jest.fn(),
  setSearchQuery: jest.fn(),
  clearSelection: jest.fn(),
  getFilteredData: jest.fn().mockReturnValue({
    users: [
      {
        Id: '1',
        Type: 'Personnel',
        Name: 'John Doe',
        Selected: false,
      },
    ],
    groups: [
      {
        Id: '1',
        Type: 'Groups',
        Name: 'Fire Department',
        Selected: false,
      },
    ],
    roles: [
      {
        Id: '1',
        Type: 'Roles',
        Name: 'Captain',
        Selected: false,
      },
    ],
    units: [
      {
        Id: '1',
        Type: 'Unit',
        Name: 'Engine 1',
        Selected: false,
      },
    ],
  }),
};

jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: jest.fn(() => mockDispatchStore),
}));

// Mock the color scheme and cssInterop
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('DispatchSelectionModal', () => {
  const mockProps = {
    isVisible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    initialSelection: {
      everyone: false,
      users: [] as string[],
      groups: [] as string[],
      roles: [] as string[],
      units: [] as string[],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store state
    mockDispatchStore.selection = {
      everyone: false,
      users: [],
      groups: [],
      roles: [],
      units: [],
    };
    mockDispatchStore.isLoading = false;
    mockDispatchStore.error = null;
    mockDispatchStore.searchQuery = '';
  });

  it('should render when visible', () => {
    const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

    expect(getByText('calls.select_dispatch_recipients')).toBeTruthy();
    expect(getByText('calls.everyone')).toBeTruthy();
    expect(getByText('calls.users (1)')).toBeTruthy();
    expect(getByText('calls.groups (1)')).toBeTruthy();
    expect(getByText('calls.roles (1)')).toBeTruthy();
    expect(getByText('calls.units (1)')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <DispatchSelectionModal {...mockProps} isVisible={false} />
    );

    expect(queryByText('calls.select_dispatch_recipients')).toBeNull();
  });

  it('should call toggleEveryone when everyone option is pressed', async () => {
    const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

    const everyoneOption = getByText('calls.everyone');
    fireEvent.press(everyoneOption);

    await waitFor(() => {
      expect(mockDispatchStore.toggleEveryone).toHaveBeenCalled();
    });
  });

  it('should call toggleUser when user is pressed', async () => {
    const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

    const userOption = getByText('John Doe');
    fireEvent.press(userOption);

    await waitFor(() => {
      expect(mockDispatchStore.toggleUser).toHaveBeenCalledWith('1');
    });
  });

  it('should call setSearchQuery when search input changes', async () => {
    const { getByPlaceholderText } = render(<DispatchSelectionModal {...mockProps} />);

    const searchInput = getByPlaceholderText('common.search');
    fireEvent.changeText(searchInput, 'test');

    await waitFor(() => {
      expect(mockDispatchStore.setSearchQuery).toHaveBeenCalledWith('test');
    });
  });

  it('should call clearSelection and onClose when cancel button is pressed', async () => {
    const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

    const cancelButton = getByText('common.cancel');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(mockDispatchStore.clearSelection).toHaveBeenCalled();
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  it('should show selection count', () => {
    const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

    // Should show 0 selected by default
    expect(getByText('0 calls.selected')).toBeTruthy();
  });

  describe('Analytics', () => {
    it('should track view analytics when modal becomes visible', async () => {
      render(<DispatchSelectionModal {...mockProps} isVisible={true} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_modal_viewed', {
          timestamp: expect.any(String),
          userCount: 1,
          groupCount: 1,
          roleCount: 1,
          unitCount: 1,
          isLoading: false,
          hasInitialSelection: true,
        });
      });
    });

    it('should not track view analytics when modal is not visible', () => {
      render(<DispatchSelectionModal {...mockProps} isVisible={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'dispatch_selection_modal_viewed',
        expect.any(Object)
      );
    });

    it('should track view analytics with loading state', async () => {
      mockDispatchStore.isLoading = true;

      render(<DispatchSelectionModal {...mockProps} isVisible={true} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_modal_viewed', {
          timestamp: expect.any(String),
          userCount: 1,
          groupCount: 1,
          roleCount: 1,
          unitCount: 1,
          isLoading: true,
          hasInitialSelection: true,
        });
      });
    });

    it('should track analytics when everyone toggle is pressed', async () => {
      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const everyoneOption = getByText('calls.everyone');
      fireEvent.press(everyoneOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_everyone_toggled', {
          timestamp: expect.any(String),
          wasSelected: false,
          newState: true,
        });
      });
    });

    it('should track analytics when user is toggled', async () => {
      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const userOption = getByText('John Doe');
      fireEvent.press(userOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_user_toggled', {
          timestamp: expect.any(String),
          userId: '1',
          wasSelected: false,
          newState: true,
          currentSelectionCount: 0,
        });
      });
    });

    it('should track analytics when group is toggled', async () => {
      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const groupOption = getByText('Fire Department');
      fireEvent.press(groupOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_group_toggled', {
          timestamp: expect.any(String),
          groupId: '1',
          wasSelected: false,
          newState: true,
          currentSelectionCount: 0,
        });
      });
    });

    it('should track analytics when role is toggled', async () => {
      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const roleOption = getByText('Captain');
      fireEvent.press(roleOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_role_toggled', {
          timestamp: expect.any(String),
          roleId: '1',
          wasSelected: false,
          newState: true,
          currentSelectionCount: 0,
        });
      });
    });

    it('should track analytics when unit is toggled', async () => {
      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const unitOption = getByText('Engine 1');
      fireEvent.press(unitOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_unit_toggled', {
          timestamp: expect.any(String),
          unitId: '1',
          wasSelected: false,
          newState: true,
          currentSelectionCount: 0,
        });
      });
    });

    it('should track analytics for search', async () => {
      const { getByPlaceholderText } = render(<DispatchSelectionModal {...mockProps} />);

      const searchInput = getByPlaceholderText('common.search');
      fireEvent.changeText(searchInput, 'test search');

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_search', {
          timestamp: expect.any(String),
          searchQuery: 'test search',
          searchLength: 11,
        });
      });
    });

    it('should track analytics when confirm is pressed', async () => {
      // Mock selection with some users selected
      mockDispatchStore.selection = {
        everyone: false,
        users: ['1'],
        groups: ['1'],
        roles: [],
        units: [],
      };

      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const confirmButton = getByText('common.confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_confirmed', {
          timestamp: expect.any(String),
          selectionCount: 2, // 1 user + 1 group
          everyoneSelected: false,
          usersSelected: 1,
          groupsSelected: 1,
          rolesSelected: 0,
          unitsSelected: 0,
          hasSearchQuery: false,
        });
      });
    });

    it('should track analytics when cancel is pressed', async () => {
      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const cancelButton = getByText('common.cancel');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_cancelled', {
          timestamp: expect.any(String),
          selectionCount: 0,
          wasModalOpen: true,
        });
      });
    });

    it('should handle analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      const { getByText } = render(<DispatchSelectionModal {...mockProps} isVisible={true} />);

      // Should not throw error when analytics fails
      const everyoneOption = getByText('calls.everyone');
      fireEvent.press(everyoneOption);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to track everyone toggle analytics:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should track analytics with everyone selected state', async () => {
      mockDispatchStore.selection = {
        everyone: true,
        users: [],
        groups: [],
        roles: [],
        units: [],
      };

      const { getByText } = render(<DispatchSelectionModal {...mockProps} />);

      const confirmButton = getByText('common.confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_confirmed', {
          timestamp: expect.any(String),
          selectionCount: 1, // everyone = 1
          everyoneSelected: true,
          usersSelected: 0,
          groupsSelected: 0,
          rolesSelected: 0,
          unitsSelected: 0,
          hasSearchQuery: false,
        });
      });
    });

    it('should track view analytics only once when modal opens', async () => {
      const { rerender } = render(<DispatchSelectionModal {...mockProps} isVisible={false} />);

      // Clear any previous calls
      mockTrackEvent.mockClear();

      // Open modal
      rerender(<DispatchSelectionModal {...mockProps} isVisible={true} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('dispatch_selection_modal_viewed', expect.any(Object));
      });

      const callCount = mockTrackEvent.mock.calls.filter(
        call => call[0] === 'dispatch_selection_modal_viewed'
      ).length;

      // Re-render with same visibility should not track again
      rerender(<DispatchSelectionModal {...mockProps} isVisible={true} />);

      await waitFor(() => {
        const newCallCount = mockTrackEvent.mock.calls.filter(
          call => call[0] === 'dispatch_selection_modal_viewed'
        ).length;
        expect(newCallCount).toBe(callCount); // Should not increase
      });
    });
  });
}); 