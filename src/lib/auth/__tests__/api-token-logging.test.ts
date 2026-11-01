const mockPost = jest.fn();

jest.mock('@/lib/storage/app', () => ({ getBaseApiUrl: () => 'https://api.test/api/v4' }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));
jest.mock('@env', () => ({ Env: { IS_MOBILE_APP: true } }));
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => ({ interceptors: { request: { use: jest.fn() } }, post: mockPost })) },
}));

// Required after the mocks exist: the module creates its axios instance at load.
const { externalTokenRequest, loginRequest, refreshTokenRequest } = require('../api') as typeof import('../api');
const { logger } = require('@/lib/logging') as typeof import('@/lib/logging');

// Error logs become Sentry breadcrumbs, so nothing a token request carried may appear in them.
const SECRETS = ['pw-secret', 'refresh-secret', 'idp-secret', 'Bearer'];
const loggedText = () => JSON.stringify((logger.error as jest.Mock).mock.calls);

// What axios rejects with: the request config, body and headers included.
const axiosFailure = (status: number | undefined, body: string, data: unknown = {}) =>
  Object.assign(new Error(status ? `Request failed with status code ${status}` : 'Network Error'), {
    isAxiosError: true,
    config: { url: '/connect/token?debug=refresh-secret', data: body, headers: { Authorization: 'Bearer abc' } },
    request: { _response: body },
    ...(status ? { response: { status, data, config: { data: body } } } : {}),
  });

describe('token request logging', () => {
  beforeEach(() => {
    mockPost.mockReset();
    (logger.error as jest.Mock).mockClear();
  });

  it('logs a failed refresh without the refresh token', async () => {
    const failure = axiosFailure(400, 'grant_type=refresh_token&refresh_token=refresh-secret', { error: 'invalid_grant', error_description: 'refresh-secret' });
    mockPost.mockRejectedValueOnce(failure);

    await expect(refreshTokenRequest('refresh-secret')).rejects.toBe(failure);

    expect(logger.error).toHaveBeenCalledWith({
      message: 'Token refresh failed',
      context: { message: 'Request failed with status code 400', status: 400, url: '/connect/token', oauthError: 'invalid_grant' },
    });
    SECRETS.forEach((secret) => expect(loggedText()).not.toContain(secret));
  });

  it('logs a refresh that never got an answer without the refresh token', async () => {
    mockPost.mockRejectedValueOnce(axiosFailure(undefined, 'refresh_token=refresh-secret'));

    await expect(refreshTokenRequest('refresh-secret')).rejects.toBeTruthy();

    SECRETS.forEach((secret) => expect(loggedText()).not.toContain(secret));
  });

  it('logs a failed SSO exchange without the IdP token', async () => {
    const failure = axiosFailure(401, 'provider=oidc&external_token=idp-secret', { error: 'invalid_grant' });
    mockPost.mockRejectedValueOnce(failure);

    await expect(externalTokenRequest({ provider: 'oidc', externalToken: 'idp-secret', departmentToken: 'dept' })).rejects.toBe(failure);

    expect(logger.error).toHaveBeenCalledWith({
      message: 'External token exchange error',
      context: { message: 'Request failed with status code 401', status: 401, url: '/connect/token', oauthError: 'invalid_grant', provider: 'oidc' },
    });
    SECRETS.forEach((secret) => expect(loggedText()).not.toContain(secret));
  });

  it('logs an unexpected SSO exchange status without the response', async () => {
    mockPost.mockResolvedValueOnce({ status: 204, data: null, config: { data: 'external_token=idp-secret' } });

    expect(await externalTokenRequest({ provider: 'saml2', externalToken: 'idp-secret', departmentToken: 'dept' })).toMatchObject({ successful: false });

    expect(logger.error).toHaveBeenCalledWith({ message: 'External token exchange failed', context: { status: 204, provider: 'saml2' } });
    SECRETS.forEach((secret) => expect(loggedText()).not.toContain(secret));
  });

  it('logs an unexpected sign-in status without the response', async () => {
    mockPost.mockResolvedValueOnce({ status: 204, data: null, config: { data: 'password=pw-secret' } });

    expect(await loginRequest({ username: 'user1', password: 'pw-secret' })).toMatchObject({ successful: false, failure: { code: 'login_failed' } });

    expect(logger.error).toHaveBeenCalledWith({ message: 'Login failed', context: { status: 204 } });
    expect(loggedText()).not.toContain('user1');
    SECRETS.forEach((secret) => expect(loggedText()).not.toContain(secret));
  });
});
