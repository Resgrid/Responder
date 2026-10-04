import queryString from 'query-string';

const mockPost = jest.fn();

jest.mock('@/lib/storage/app', () => ({ getBaseApiUrl: () => 'https://api.test/api/v4' }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));
jest.mock('@env', () => ({ Env: { IS_MOBILE_APP: true } }));
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => ({ interceptors: { request: { use: jest.fn() } }, post: mockPost })) },
}));

// Required after the mocks exist: the module creates its axios instance at load.
const { externalTokenRequest } = require('../api') as typeof import('../api');

const sentBody = () => queryString.parse(mockPost.mock.calls[0][1] as string);

describe('the legacy SSO exchange (connect/external-token)', () => {
  beforeEach(() => mockPost.mockReset());

  it('names the department by the token discovery returned, never by a username or code', async () => {
    mockPost.mockResolvedValue({ status: 200, data: { access_token: 'a', refresh_token: 'r', id_token: 'i', expires_in: 60 } });

    const response = await externalTokenRequest({ provider: 'oidc', externalToken: 'id.token', departmentToken: 'dept-token' });

    expect(response.successful).toBe(true);
    expect(mockPost.mock.calls[0][0]).toBe('/connect/external-token');
    expect(sentBody()).toMatchObject({ provider: 'oidc', external_token: 'id.token', department_token: 'dept-token' });
    expect(sentBody().department_code).toBeUndefined();
    expect(sentBody().totp_code).toBeUndefined();
  });

  it('resends the same exchange with the authenticator code when the account has one', async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error('401'), { response: { status: 401, data: { error: 'mfa_required' } } }));

    const first = await externalTokenRequest({ provider: 'oidc', externalToken: 'id.token', departmentToken: 'dept-token' });
    expect(first).toMatchObject({ successful: false, mfaRequired: true, invalidOtp: false });

    mockPost.mockReset();
    mockPost.mockResolvedValue({ status: 200, data: { access_token: 'a', refresh_token: 'r', id_token: 'i', expires_in: 60 } });
    await externalTokenRequest({ provider: 'oidc', externalToken: 'id.token', departmentToken: 'dept-token', otpCode: ' 123456 ' });
    expect(sentBody()).toMatchObject({ department_token: 'dept-token', totp_code: '123456' });
  });
});
