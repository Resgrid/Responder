jest.mock('@/lib/storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const { cacheManager } = require('@/lib/cache/cache-manager');
const { storage } = require('@/lib/storage');

describe('CacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null and delete the key on corrupt cache entry', () => {
    storage.getString.mockReturnValue('{not-valid-json');

    const result = cacheManager.get('/endpoint');

    expect(result).toBeNull();
    expect(storage.delete).toHaveBeenCalledWith('api_cache_/endpoint');
  });

  it('should return cached data for a valid unexpired entry', () => {
    storage.getString.mockReturnValue(
      JSON.stringify({
        data: { foo: 'bar' },
        timestamp: Date.now(),
        expiresIn: 60000,
      })
    );

    const result = cacheManager.get('/endpoint');

    expect(result).toEqual({ foo: 'bar' });
  });

  it('should return null and delete the key on expired entry', () => {
    storage.getString.mockReturnValue(
      JSON.stringify({
        data: { foo: 'bar' },
        timestamp: Date.now() - 120000,
        expiresIn: 60000,
      })
    );

    const result = cacheManager.get('/endpoint');

    expect(result).toBeNull();
    expect(storage.delete).toHaveBeenCalledWith('api_cache_/endpoint');
  });

  it('should return null when no cache entry exists', () => {
    storage.getString.mockReturnValue(undefined);

    expect(cacheManager.get('/endpoint')).toBeNull();
  });
});
