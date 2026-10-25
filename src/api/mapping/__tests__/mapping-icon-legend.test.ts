import { createApiEndpoint } from '../../common/client';
import { getMapIconLegend } from '../mapping';

jest.mock('../../common/client', () => {
  const get = jest.fn();
  return {
    createApiEndpoint: jest.fn(() => ({ get })),
    __mockGet: get,
  };
});

const { __mockGet: mockGet } = jest.requireMock('../../common/client') as { __mockGet: jest.Mock };

// Endpoints are created at module load; capture them before beforeEach clears the mock.
const registeredPaths = (createApiEndpoint as jest.Mock).mock.calls.map((c) => c[0]);

describe('getMapIconLegend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('targets Mapping/GetMapIconLegend', () => {
    expect(registeredPaths).toContain('/Mapping/GetMapIconLegend');
  });

  it('sends no query parameters and returns the whole v4 envelope', async () => {
    const envelope = {
      PageSize: 3,
      Status: 'success',
      Environment: 'Dev',
      RequestId: 'abc',
      Version: 'v4',
      Timestamp: '2026-10-25T00:00:00Z',
      Node: 'api-1',
      Data: {
        StatusStyles: [
          {
            Key: 'available',
            Color: '#22C55E',
            Meanings: [0],
            UnitStatuses: ['In Quarters'],
            PersonnelStatuses: ['Standing By'],
            Priorities: [],
            UnitPinIconUrl: 'https://api.resgrid.dev/p/unit',
            PersonPinIconUrl: 'https://api.resgrid.dev/p/person',
            CallPinIconUrl: null,
          },
        ],
        PriorityStyles: [],
        Calls: [{ Id: null, Name: 'No type', StatusSetName: null, IconUrl: null, PinIconUrl: null, ImagePath: 'Call', States: [] }],
        Units: [],
        Personnel: [],
        PoiTypes: [],
      },
    };
    mockGet.mockResolvedValueOnce({ data: envelope });

    await expect(getMapIconLegend()).resolves.toBe(envelope);
    expect(mockGet).toHaveBeenCalledWith(undefined, undefined);
  });

  it('forwards the abort signal', async () => {
    const controller = new AbortController();
    mockGet.mockResolvedValueOnce({ data: { Data: null } });

    await getMapIconLegend(controller.signal);

    expect(mockGet).toHaveBeenCalledWith(undefined, controller.signal);
  });

  it('asks the server again on every call (no caching)', async () => {
    mockGet.mockResolvedValue({ data: { Data: null } });

    await getMapIconLegend();
    await getMapIconLegend();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('propagates transport errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('Request failed with status code 401'));

    await expect(getMapIconLegend()).rejects.toThrow('401');
  });
});
