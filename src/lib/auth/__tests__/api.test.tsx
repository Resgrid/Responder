const mockStorageGetBaseApiUrl = jest.fn(() => 'https://api.initial.test/api/v4');
const mockPost = jest.fn();
const mockUseRequestInterceptor = jest.fn();

jest.mock('@/lib/storage/app', () => ({
  getBaseApiUrl: () => mockStorageGetBaseApiUrl(),
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@env', () => ({
  Env: {
    IS_MOBILE_APP: true,
  },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: mockUseRequestInterceptor,
        },
      },
      post: mockPost,
    })),
  },
}));

describe('auth api base url', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockStorageGetBaseApiUrl.mockReturnValue('https://api.initial.test/api/v4');
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access_token: 'token',
        refresh_token: 'refresh',
        id_token: 'id',
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  });

  it('uses the latest stored base url for login requests', async () => {
    const { loginRequest } = require('../api');
    const interceptor = mockUseRequestInterceptor.mock.calls[0]?.[0];

    mockStorageGetBaseApiUrl.mockReturnValue('https://api.changed.test/api/v4');

    const config = interceptor({ headers: {} });

    expect(config.baseURL).toBe('https://api.changed.test/api/v4');

    await loginRequest({ username: 'demo', password: 'secret' });

    expect(mockPost).toHaveBeenCalledWith('/connect/token', expect.any(String));
  });
});
