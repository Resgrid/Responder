import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getResourceIncidentView } from '@/api/calls/incidentCommand';
import { type ResourceIncidentView } from '@/models/v4/incidentCommand/resourceIncidentView';

import { useIncidentCommandStore } from '../incident-command-store';

// Mock the API calls
jest.mock('@/api/calls/incidentCommand');

const mockGetResourceIncidentView = getResourceIncidentView as jest.MockedFunction<typeof getResourceIncidentView>;

const mockView: ResourceIncidentView = {
  IncidentCommandId: 'ic-1',
  CallId: 123,
  Status: 1,
  EstablishedOn: '2025-01-01T10:00:00Z',
  EstimatedEndOn: '2025-01-01T18:00:00Z',
  ClosedOn: null,
  ImportantInformation: 'Watch for downed power lines',
  IncidentActionPlan: 'Contain and control',
  Commander: {
    UserId: 'user-1',
    Name: 'John Commander',
    Phone: '555-1234',
    Email: 'commander@example.com',
  },
  Objectives: [
    {
      TacticalObjectiveId: 'obj-1',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Name: 'Primary Search',
      ObjectiveType: 1,
      Status: 2,
      AutoPopulated: false,
      CompletedByUserId: null,
      CompletedOn: null,
      Description: 'Search the first floor',
      ProgressPercent: 50,
      Priority: 1,
      TargetCompleteOn: null,
      SortOrder: 0,
      ModifiedOn: null,
    },
  ],
  Needs: [
    {
      IncidentNeedId: 'need-1',
      IncidentCommandId: 'ic-1',
      DepartmentId: 1,
      CallId: 123,
      Name: 'Water Supply',
      Description: null,
      Category: 1,
      Status: 0,
      QuantityRequested: 2,
      QuantityFulfilled: 1,
      Priority: 1,
      CreatedByUserId: 'user-1',
      CreatedOn: '2025-01-01T10:05:00Z',
      MetByUserId: null,
      MetOn: null,
      SortOrder: 0,
      ModifiedOn: null,
    },
  ],
  Notes: [],
  Attachments: [],
  MyAssignment: {
    ResourceAssignmentId: 'ra-1',
    CommandStructureNodeId: 'node-1',
    LaneName: 'Fire Attack',
    NodeType: 0,
    Color: '#ff0000',
    AssignedOn: '2025-01-01T10:10:00Z',
    PrimaryLead: { UserId: 'user-2', Name: 'Jane Lead', Phone: '555-5678', Email: 'lead@example.com' },
    SecondaryLead: null,
    PrimaryObjective: null,
    SecondaryObjective: null,
    LinkedNeed: null,
  },
};

describe('useIncidentCommandStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useIncidentCommandStore.setState({
      view: null,
      isLoading: false,
      error: null,
    });
  });

  describe('fetchIncidentView', () => {
    it('should fetch the incident view successfully', async () => {
      mockGetResourceIncidentView.mockResolvedValue({
        Data: mockView,
        Status: 'Success',
      } as any);

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      // Verify initial state
      expect(result.current.view).toBeNull();
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.fetchIncidentView(123);
      });

      await waitFor(() => {
        expect(result.current.view).toEqual(mockView);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockGetResourceIncidentView).toHaveBeenCalledWith(123);
      unmount();
    });

    it('should handle loading state correctly', async () => {
      mockGetResourceIncidentView.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)) as any);

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      act(() => {
        result.current.fetchIncidentView(123);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.view).toBeNull();
      unmount();
    });

    it('should treat a NotFound response with null Data as an empty state', async () => {
      mockGetResourceIncidentView.mockResolvedValue({
        Data: null,
        Status: 'NotFound',
      } as any);

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      await act(async () => {
        await result.current.fetchIncidentView(123);
      });

      await waitFor(() => {
        expect(result.current.view).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
      unmount();
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Network error';
      mockGetResourceIncidentView.mockRejectedValue(new Error(errorMessage));

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      await act(async () => {
        await result.current.fetchIncidentView(123);
      });

      await waitFor(() => {
        expect(result.current.view).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(errorMessage);
      });
      unmount();
    });

    it('should handle non-Error rejections with a generic message', async () => {
      mockGetResourceIncidentView.mockRejectedValue('some failure');

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      await act(async () => {
        await result.current.fetchIncidentView(123);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('An unknown error occurred');
        expect(result.current.isLoading).toBe(false);
      });
      unmount();
    });

    it('should clear a previous error when fetching again', async () => {
      useIncidentCommandStore.setState({ error: 'Previous error' });
      mockGetResourceIncidentView.mockResolvedValue({
        Data: mockView,
        Status: 'Success',
      } as any);

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      await act(async () => {
        await result.current.fetchIncidentView('123');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.view).toEqual(mockView);
      });

      expect(mockGetResourceIncidentView).toHaveBeenCalledWith('123');
      unmount();
    });
  });

  describe('reset', () => {
    it('should reset the store to its initial state', () => {
      useIncidentCommandStore.setState({
        view: mockView,
        isLoading: true,
        error: 'Some error',
      });

      const { result, unmount } = renderHook(() => useIncidentCommandStore());

      act(() => {
        result.current.reset();
      });

      expect(result.current.view).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      unmount();
    });
  });
});
