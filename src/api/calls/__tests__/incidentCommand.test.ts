import { createApiEndpoint } from '../../common/client';
import { getResourceIncidentView } from '../incidentCommand';

jest.mock('../../common/client', () => {
  const get = jest.fn();
  return {
    createApiEndpoint: jest.fn(() => ({ get })),
    __mockGet: get,
  };
});

const { __mockGet: mockGet } = jest.requireMock('../../common/client') as { __mockGet: jest.Mock };

describe('incidentCommand api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the response data', async () => {
    const payload = { Data: { IncidentCommandId: 'ic-1' } };
    mockGet.mockResolvedValueOnce({ data: payload });

    await expect(getResourceIncidentView(123)).resolves.toBe(payload);
    expect(createApiEndpoint).toHaveBeenCalledWith('/IncidentCommand/GetResourceIncidentView/123');
  });

  it('encodes reserved characters in a string call id', async () => {
    mockGet.mockResolvedValueOnce({ data: { Data: null } });

    await getResourceIncidentView('a/b?c#d');

    expect(createApiEndpoint).toHaveBeenCalledWith('/IncidentCommand/GetResourceIncidentView/a%2Fb%3Fc%23d');
  });
});
