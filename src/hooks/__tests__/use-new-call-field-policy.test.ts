import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

import { getNewCallFieldPolicy } from '@/api/calls/newCallFieldPolicy';
import { NewCallFieldKeys, type NewCallFieldPolicyResultData } from '@/models/v4/calls/newCallFieldPolicyResultData';

import { useNewCallFieldPolicy } from '../use-new-call-field-policy';

jest.mock('@/api/calls/newCallFieldPolicy', () => ({
  getNewCallFieldPolicy: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockedGetNewCallFieldPolicy = getNewCallFieldPolicy as jest.MockedFunction<typeof getNewCallFieldPolicy>;

const policy = (rules: NewCallFieldPolicyResultData['Rules']): NewCallFieldPolicyResultData => ({ Rules: rules });

describe('useNewCallFieldPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isLoaded', () => {
    // The new-call screen gates submission on this flag: before the policy lands the hook reports
    // nothing required, so a call created in that window would skip the department's rules.
    it('should report not loaded until the lookup resolves', async () => {
      let resolvePolicy: (value: NewCallFieldPolicyResultData) => void = () => undefined;
      mockedGetNewCallFieldPolicy.mockReturnValue(
        new Promise<NewCallFieldPolicyResultData>((resolve) => {
          resolvePolicy = resolve;
        })
      );

      const { result } = renderHook(() => useNewCallFieldPolicy());

      expect(result.current.isLoaded).toBe(false);
      // Nothing is reported missing while the rules are still in flight — which is exactly why the
      // caller must not submit yet.
      expect(result.current.missingRequired({ [NewCallFieldKeys.Address]: '' })).toEqual([]);

      resolvePolicy(policy([{ Key: 'address', Visible: true, Required: true }]));

      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      expect(result.current.missingRequired({ [NewCallFieldKeys.Address]: '' })).toEqual([NewCallFieldKeys.Address]);
    });

    it('should report loaded after a failed lookup so the stock form still submits', async () => {
      mockedGetNewCallFieldPolicy.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useNewCallFieldPolicy());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      expect(result.current.isVisible(NewCallFieldKeys.Note)).toBe(true);
      expect(result.current.isRequired(NewCallFieldKeys.Note)).toBe(false);
      expect(result.current.missingRequired({ [NewCallFieldKeys.Address]: '' })).toEqual([]);
    });
  });

  describe('rule evaluation', () => {
    it('should flag required fields left blank', async () => {
      mockedGetNewCallFieldPolicy.mockResolvedValue(
        policy([
          { Key: 'address', Visible: true, Required: true },
          { Key: 'contactName', Visible: true, Required: true },
          { Key: 'note', Visible: true, Required: false },
        ])
      );

      const { result } = renderHook(() => useNewCallFieldPolicy());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      expect(
        result.current.missingRequired({
          [NewCallFieldKeys.Address]: '123 Main St',
          [NewCallFieldKeys.ContactName]: '   ',
          [NewCallFieldKeys.Note]: '',
        })
      ).toEqual([NewCallFieldKeys.ContactName]);
    });

    // The new-call screen normalizes a few values before handing them over. These pin the contract
    // it relies on, since getting either wrong silently blocks or silently waves through a call.
    it('should treat a zero coordinate pair as a real location', async () => {
      mockedGetNewCallFieldPolicy.mockResolvedValue(policy([{ Key: 'geolocation', Visible: true, Required: true }]));

      const { result } = renderHook(() => useNewCallFieldPolicy());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      // Null Island, the equator and the prime meridian are all places a call can happen.
      expect(result.current.missingRequired({ [NewCallFieldKeys.Geolocation]: '0,0' })).toEqual([]);
      expect(result.current.missingRequired({ [NewCallFieldKeys.Geolocation]: '51.4779,0' })).toEqual([]);
      expect(result.current.missingRequired({ [NewCallFieldKeys.Geolocation]: '' })).toEqual([NewCallFieldKeys.Geolocation]);
    });

    it('should flag a required destination when the picker resolved to no destination', async () => {
      mockedGetNewCallFieldPolicy.mockResolvedValue(policy([{ Key: 'destinationPoi', Visible: true, Required: true }]));

      const { result } = renderHook(() => useNewCallFieldPolicy());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      // The screen resolves the 'none' sentinel to null and passes '' — the sentinel string itself
      // would read as a filled-in destination.
      expect(result.current.missingRequired({ [NewCallFieldKeys.DestinationPoi]: '' })).toEqual([NewCallFieldKeys.DestinationPoi]);
      expect(result.current.missingRequired({ [NewCallFieldKeys.DestinationPoi]: '42' })).toEqual([]);
    });

    it('should treat an unselected dispatch list as missing', async () => {
      mockedGetNewCallFieldPolicy.mockResolvedValue(policy([{ Key: 'dispatchList', Visible: true, Required: true }]));

      const { result } = renderHook(() => useNewCallFieldPolicy());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      // The screen collapses "anyone selected?" to a boolean, so false has to mean blank.
      expect(result.current.missingRequired({ [NewCallFieldKeys.DispatchList]: false })).toEqual([NewCallFieldKeys.DispatchList]);
      expect(result.current.missingRequired({ [NewCallFieldKeys.DispatchList]: true })).toEqual([]);
    });

    it('should never require a hidden field', async () => {
      mockedGetNewCallFieldPolicy.mockResolvedValue(policy([{ Key: 'what3words', Visible: false, Required: true }]));

      const { result } = renderHook(() => useNewCallFieldPolicy());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      expect(result.current.isVisible(NewCallFieldKeys.What3Words)).toBe(false);
      expect(result.current.isRequired(NewCallFieldKeys.What3Words)).toBe(false);
      expect(result.current.missingRequired({ [NewCallFieldKeys.What3Words]: '' })).toEqual([]);
    });
  });
});
