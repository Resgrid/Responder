jest.mock('../../common/client', () => ({
  createApiEndpoint: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

import { createApiEndpoint } from '../../common/client';
import { toggleCallTimers } from '../check-in-timers';

const mockCreateApiEndpoint = createApiEndpoint as jest.MockedFunction<typeof createApiEndpoint>;

describe('toggleCallTimers', () => {
  it('sends callId and enabled in the query string with an empty body', async () => {
    const endpoint = { get: jest.fn(), post: jest.fn(), put: jest.fn().mockResolvedValue({ data: { Id: '' } }), delete: jest.fn() };
    mockCreateApiEndpoint.mockReturnValueOnce(endpoint as unknown as ReturnType<typeof createApiEndpoint>);

    await toggleCallTimers(101, true);

    expect(mockCreateApiEndpoint).toHaveBeenLastCalledWith('/CheckInTimers/ToggleCallTimers?callId=101&enabled=true');
    expect(endpoint.put).toHaveBeenCalledWith({});
  });
});
