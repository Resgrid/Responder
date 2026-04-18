import { describe, expect, it, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useActiveCallStore } from '../active-call-store';

jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockCall = {
  CallId: '123',
  Priority: 1,
  Name: 'Structure Fire',
  Nature: 'Fire',
  Note: '',
  Address: '123 Main St',
  Geolocation: '',
  LoggedOn: '2026-04-12T10:00:00',
  State: 'Active',
  Number: 'C-001',
  NotesCount: 0,
  AudioCount: 0,
  ImgagesCount: 0,
  FileCount: 0,
  What3Words: '',
  ContactName: '',
  ContactInfo: '',
  ReferenceId: '',
  ExternalId: '',
  IncidentId: '',
  AudioFileId: '',
  Type: 'Fire',
  LoggedOnUtc: '2026-04-12T10:00:00Z',
  DispatchedOn: '',
  DispatchedOnUtc: '',
  Latitude: '40.7128',
  Longitude: '-74.006',
  CheckInTimersEnabled: true,
};

describe('useActiveCallStore', () => {
  beforeEach(() => {
    act(() => {
      useActiveCallStore.getState().clearActiveCall();
    });
  });

  describe('setActiveCall', () => {
    it('should set the active call and callId', () => {
      const { result } = renderHook(() => useActiveCallStore());

      act(() => {
        result.current.setActiveCall(mockCall as any);
      });

      expect(result.current.activeCallId).toBe('123');
      expect(result.current.activeCall?.Name).toBe('Structure Fire');
    });
  });

  describe('clearActiveCall', () => {
    it('should clear the active call', () => {
      const { result } = renderHook(() => useActiveCallStore());

      act(() => {
        result.current.setActiveCall(mockCall as any);
      });

      expect(result.current.activeCallId).toBe('123');

      act(() => {
        result.current.clearActiveCall();
      });

      expect(result.current.activeCallId).toBeNull();
      expect(result.current.activeCall).toBeNull();
    });
  });

  describe('isActiveCall', () => {
    it('should return true when callId matches', () => {
      const { result } = renderHook(() => useActiveCallStore());

      act(() => {
        result.current.setActiveCall(mockCall as any);
      });

      expect(result.current.isActiveCall('123')).toBe(true);
      expect(result.current.isActiveCall('456')).toBe(false);
    });

    it('should return false when no active call', () => {
      const { result } = renderHook(() => useActiveCallStore());
      expect(result.current.isActiveCall('123')).toBe(false);
    });
  });
});
