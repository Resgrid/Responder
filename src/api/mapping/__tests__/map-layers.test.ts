jest.mock('../../common/client', () => {
  const endpoints: Record<string, { get: jest.Mock }> = {};
  return {
    __endpoints: endpoints,
    createApiEndpoint: (path: string) => {
      const api = { get: jest.fn().mockResolvedValue({ data: { Data: {} } }) };
      endpoints[path] = api;
      return api;
    },
  };
});

import { getMayLayers } from '../mapping';

const mockEndpoints: Record<string, { get: jest.Mock }> = jest.requireMock('../../common/client').__endpoints;

describe('getMayLayers', () => {
  it('targets the server route, which is spelled GetMayLayers', () => {
    expect(mockEndpoints['/Mapping/GetMayLayers']).toBeDefined();
    expect(mockEndpoints['/Mapping/GetMapLayers']).toBeUndefined();
  });

  it('sends the layer type as a query parameter', async () => {
    await getMayLayers(1);

    expect(mockEndpoints['/Mapping/GetMayLayers'].get).toHaveBeenCalledWith({ type: '1' });
  });
});
