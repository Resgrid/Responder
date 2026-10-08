import { createCall, updateCall } from '../calls';

jest.mock('../../common/client', () => {
  const post = jest.fn();
  const put = jest.fn();
  return {
    createApiEndpoint: jest.fn(() => ({ get: jest.fn(), post, put, delete: jest.fn() })),
    __mockPost: post,
    __mockPut: put,
  };
});

const { __mockPost: mockPost, __mockPut: mockPut } = jest.requireMock('../../common/client') as { __mockPost: jest.Mock; __mockPut: jest.Mock };

const baseCall = { name: 'Structure Fire', nature: 'Smoke showing', priority: 1 };

describe('call save payloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ data: { Id: '42' } });
    mockPut.mockResolvedValue({ data: { Id: '42' } });
  });

  describe('createCall (SaveCall)', () => {
    it('sends the call identifiers', async () => {
      await createCall({ ...baseCall, externalId: 'CAD-9', incidentId: 'INC-1', referenceId: 'REF-2' });

      expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({ ExternalId: 'CAD-9', IncidentId: 'INC-1', ReferenceId: 'REF-2' }));
    });

    it('sends blank identifiers when none were entered', async () => {
      await createCall(baseCall);

      expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({ ExternalId: '', IncidentId: '', ReferenceId: '' }));
    });

    it('sends DispatchOnUtc only when a dispatch time is set', async () => {
      await createCall({ ...baseCall, dispatchOnUtc: '2026-10-09T14:30:00.000Z' });
      expect(mockPost).toHaveBeenLastCalledWith(expect.objectContaining({ DispatchOnUtc: '2026-10-09T14:30:00.000Z' }));

      await createCall(baseCall);
      expect(mockPost.mock.calls[1][0]).not.toHaveProperty('DispatchOnUtc');
    });

    it('never sends the picker-only properties this app has no input for', async () => {
      await createCall({ ...baseCall, dispatchOnUtc: '2026-10-09T14:30:00.000Z' });

      for (const property of ['ProtocolIds', 'LinkedCallId', 'IndoorMapZoneId', 'IndoorMapFloorId']) {
        expect(mockPost.mock.calls[0][0]).not.toHaveProperty(property);
      }
    });
  });

  describe('updateCall (EditCall)', () => {
    it('sends the call identifiers, blank meaning "keep what is stored"', async () => {
      await updateCall({ ...baseCall, callId: '42', externalId: 'CAD-9', incidentId: '', referenceId: 'REF-2' });

      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ Id: '42', ExternalId: 'CAD-9', IncidentId: '', ReferenceId: 'REF-2' }));
    });

    it('sends DispatchOnUtc only when a dispatch time is set, leaving the stored schedule alone otherwise', async () => {
      await updateCall({ ...baseCall, callId: '42', dispatchOnUtc: '2026-10-09T14:30:00.000Z' });
      expect(mockPut).toHaveBeenLastCalledWith(expect.objectContaining({ DispatchOnUtc: '2026-10-09T14:30:00.000Z' }));

      await updateCall({ ...baseCall, callId: '42' });
      expect(mockPut.mock.calls[1][0]).not.toHaveProperty('DispatchOnUtc');
    });
  });
});
