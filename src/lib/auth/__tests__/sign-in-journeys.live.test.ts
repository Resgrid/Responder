/**
 * The sign-in journeys, through this app's own sign-in and approval code, against the real Resgrid sign-in server over
 * real HTTP: Core's LiveSignInServer (the real token endpoint, bearer validation, session middleware and sign-in
 * services), served by the LiveSignInHost fixture. Skipped unless RESGRID_LIVE_API names that server, for example:
 *
 *   (Core) RESGRID_LIVE_PORT=5098 dotnet test Tests/Resgrid.Tests --filter FullyQualifiedName~LiveSignInHost
 *   (here) RESGRID_LIVE_API=http://127.0.0.1:5098 npx jest sign-in-journeys.live
 *
 * The server's /__live endpoints seed members and switch the deployment's gates, and play what is outside this app: the
 * identity provider's sign-in page, this phone's passkey (the native module is the only stand-in here), and another
 * app's sign-in on another device that asks this Responder to approve it.
 */
import { act, renderHook } from '@testing-library/react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Passkey } from 'react-native-passkey';

import { approveRequest, denyRequest, getApprovalOptions, getPasskeyRegistrationOptions, getPendingApproval, getStepUpOptions, verifyStepUp } from '@/api/mfa/account-security';
import { getStepUpMethods, getStepUpPasskeyOptions, requestProtectedGrant, verifyStepUpPasskey } from '@/api/data-protection/data-protection';
import { useSamlLogin } from '@/hooks/use-saml-login';
import { getPasskeyAssertion } from '@/lib/mfa/passkey';
import { setBaseApiUrl } from '@/lib/storage/app';
import { fetchUserSsoConfig } from '@/services/sso-discovery';
import { forgetLoginSecrets } from '@/stores/auth/login-mfa';
import useAuthStore from '@/stores/auth/store';

// Responder has no shared mock of the browser module: the system browser is played below.
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), openBrowserAsync: jest.fn(), maybeCompleteAuthSession: jest.fn(), dismissBrowser: jest.fn() }));

/** expo-linking's parse needs expo-constants, which Jest lacks: read the link as a device does (scheme, host, path, query). */
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  parse: (url: string) => {
    const link = new URL(url);
    return { scheme: link.protocol.replace(/:$/, ''), hostname: link.hostname || null, path: link.pathname.replace(/^\//, '') || null, queryParams: Object.fromEntries(link.searchParams) };
  },
}));

const LIVE = process.env.RESGRID_LIVE_API;
const describeLive = LIVE ? describe : describe.skip;
const CLIENT = 'responder';
const FAKE_IDP_AUTHORIZE = 'https://idp.example.test/authorize';
const FAKE_SAML_IDP = 'https://idp.example.test/saml2/sso';
const SAML_CALLBACK = 'resgrid://auth/callback';

interface LiveUser {
  userId: string;
  username: string;
  password: string;
  departmentToken: string;
  externalSubject: string | null;
}

interface LiveSession {
  client: string;
  authentication: string;
  loginMfa: string | null;
}

const control = async <T = unknown>(path: string, body: Record<string, unknown> = {}): Promise<T> => (await axios.post<T>(`${LIVE}/__live/${path}`, body)).data;
const gates = (on: boolean) => control('gates', { transaction: on, brokeredSso: on, passkeys: on, approval: on, providerStepUp: on, sharedDevice: on });
const newUser = (spec: Record<string, unknown>) => control<LiveUser>('users', spec);
const totp = async (user: LiveUser) => (await control<{ code: string }>('totp', { userId: user.userId })).code;
const thisAppsSessions = async (user: LiveUser) => (await control<LiveSession[]>('sessions', { userId: user.userId })).filter((s) => s.client === CLIENT);

/** The system browser: the provider's sign-in page (the server's fake IdP), then the broker's callback, back to this app. */
const browser = async (url: string, returnTarget: string): Promise<WebBrowser.WebBrowserAuthSessionResult> => {
  // The providers' pages are the server's stand-ins: its OIDC authorize page and its SAML IdP.
  const toLive = (link: string) =>
    link.startsWith(FAKE_IDP_AUTHORIZE)
      ? `${LIVE}/__live/idp/authorize${link.substring(FAKE_IDP_AUTHORIZE.length)}`
      : link.startsWith(FAKE_SAML_IDP)
        ? `${LIVE}/__live/idp/saml${link.substring(FAKE_SAML_IDP.length)}`
        : link;
  let next = toLive(url);
  const dismissed = { type: 'dismiss' } as WebBrowser.WebBrowserAuthSessionResult;
  for (let hop = 0; hop < 5; hop++) {
    if (next.startsWith(returnTarget)) {
      return { type: 'success', url: next };
    }
    // Each redirect by hand, reading the Location header as sent: the last one is this app's own scheme.
    const response = await fetch(next, { redirect: 'manual' });
    next = toLive(response.headers.get('location') ?? '');
    if (!next) {
      return dismissed;
    }
  }
  return dismissed;
};

/** The claims of a protected-data grant (a signed JWT): which second factor stands behind it. */
const grantClaims = (grant: string): Record<string, unknown> => JSON.parse(Buffer.from(grant.split('.')[1], 'base64url').toString('utf8'));

/** Responder keeps the pending SAML state in the secure store: an in-memory one here. */
const secureStore = new Map<string, string>();

/** A legacy SAML sign-in through this app's own hook: the server's start page, the IdP, and the relay's link back, which it exchanges. */
const samlRoundTrip = async (user: LiveUser, signInUrl: string, departmentToken: string) => {
  await control('idp/next', { subject: user.externalSubject });
  let returned = '';
  (WebBrowser.openBrowserAsync as jest.Mock).mockImplementation(async (url: string) => {
    returned = ((await browser(url, SAML_CALLBACK)) as { url?: string }).url ?? '';
    return { type: 'opened' };
  });
  const { result, unmount } = renderHook(() => useSamlLogin({ signInUrl, departmentToken }));
  await act(async () => result.current.startSamlLogin());
  let handled = false;
  await act(async () => {
    handled = await result.current.handleDeepLink(returned);
  });
  unmount();
  if (!handled) {
    throw new Error('the app refused its own SAML callback: ' + returned);
  }
};

const signedIn = () => {
  const state = useAuthStore.getState();
  return state.status === 'signedIn' && !!state.accessToken;
};

describeLive('sign-in journeys against the live Resgrid sign-in server (Responder)', () => {
  jest.setTimeout(60000);

  beforeAll(() => {
    jest.useRealTimers();
    setBaseApiUrl(`${LIVE}/api/v4`);
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockImplementation((url: string, returnTarget: string) => browser(url, returnTarget));
    (Passkey.isSupported as jest.Mock).mockReturnValue(true);
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => secureStore.get(key) ?? null);
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => void secureStore.set(key, value));
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => void secureStore.delete(key));
    // This phone's passkey: the server's soft authenticator answers the options this app hands the native module.
    (Passkey.get as jest.Mock).mockImplementation(async (request: unknown) => control('authenticator/assert', { options: request, client: CLIENT }));
  });

  beforeEach(() => {
    jest.useRealTimers();
    forgetLoginSecrets();
    useAuthStore.setState({ status: 'signedOut', accessToken: null, refreshToken: null, mfaChallenge: null, isSsoMfaPending: false, error: null });
  });

  describe("with every new switch off (today's deployments)", () => {
    beforeEach(() => gates(false));

    it('1. signs in with a password alone', async () => {
      const user = await newUser({});
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      expect(signedIn()).toBe(true);
      expect(await thisAppsSessions(user)).toEqual([expect.objectContaining({ authentication: 'LocalPassword', loginMfa: null })]);
    });

    it('2. signs in with a password and an authenticator code, resent with the password', async () => {
      const user = await newUser({ totp: true });
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      expect(useAuthStore.getState().status).toBe('mfaRequired');
      expect(useAuthStore.getState().mfaChallenge?.kind).toBe('legacy');

      await useAuthStore.getState().login({ username: user.username, password: user.password, otpCode: await totp(user) });
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0].loginMfa).toBe('totp');
    });

    it("3. signs in through the department's provider with discovery's department token", async () => {
      const user = await newUser({ sso: true });
      const discovery = await fetchUserSsoConfig(user.username);
      expect(discovery?.brokeredSsoAvailable).toBe(false);
      expect(discovery?.oidcRedirectUri).toBe('resgrid://auth/callback');
      const { id_token } = await control<{ id_token: string }>('idp/legacy-token', { subject: user.externalSubject });

      await useAuthStore.getState().loginWithSso({ provider: 'oidc', externalToken: id_token, departmentToken: discovery!.departmentToken! });
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0].authentication).toBe('OidcSso');
    });

    it('4. a member whose provider does the MFA and who has no authenticator signs straight in', async () => {
      const user = await newUser({ sso: true, providerMfa: true });
      const { id_token } = await control<{ id_token: string }>('idp/legacy-token', { subject: user.externalSubject });
      await useAuthStore.getState().loginWithSso({ provider: 'oidc', externalToken: id_token, departmentToken: user.departmentToken });
      expect(signedIn()).toBe(true);
    });

    it("5. signs in through the provider, then resends the same exchange with the member's code", async () => {
      const user = await newUser({ sso: true, totp: true });
      const { id_token } = await control<{ id_token: string }>('idp/legacy-token', { subject: user.externalSubject });

      await useAuthStore.getState().loginWithSso({ provider: 'oidc', externalToken: id_token, departmentToken: user.departmentToken });
      expect(useAuthStore.getState().status).toBe('mfaRequired');
      expect(useAuthStore.getState().isSsoMfaPending).toBe(true);

      await useAuthStore.getState().retrySsoWithOtp(await totp(user));
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0]).toEqual(expect.objectContaining({ authentication: 'OidcSso', loginMfa: 'totp' }));
    });

    it("3. signs in through a SAML provider: the server's start page, the relay back to this app, and the exchange", async () => {
      const user = await newUser({ sso: true, saml: true });
      const discovery = await fetchUserSsoConfig(user.username);
      expect(discovery).toEqual(expect.objectContaining({ providerType: 'saml2', brokeredSsoAvailable: false, samlLoginUrl: expect.stringContaining('/connect/saml-mobile-login?departmentToken=') }));

      await samlRoundTrip(user, discovery!.samlLoginUrl!, discovery!.departmentToken!);
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0].authentication).toBe('SamlSso');
    });

    it("5. signs in through a SAML provider, then resends the same relay token with the member's code", async () => {
      const user = await newUser({ sso: true, saml: true, totp: true });
      const discovery = await fetchUserSsoConfig(user.username);

      await samlRoundTrip(user, discovery!.samlLoginUrl!, discovery!.departmentToken!);
      expect(useAuthStore.getState().status).toBe('mfaRequired');
      expect(useAuthStore.getState().isSsoMfaPending).toBe(true);
      await useAuthStore.getState().retrySsoWithOtp(await totp(user));
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0]).toEqual(expect.objectContaining({ authentication: 'SamlSso', loginMfa: 'totp' }));
    });
  });

  describe("with the plan's switches on", () => {
    beforeEach(() => gates(true));

    it('1. signs in with a password alone', async () => {
      const user = await newUser({});
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      expect(signedIn()).toBe(true);
    });

    it('2. signs in with a password and an authenticator code on the login transaction', async () => {
      const user = await newUser({ totp: true });
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      expect(useAuthStore.getState().mfaChallenge).toEqual(expect.objectContaining({ kind: 'verify', source: 'password', enrolled: ['totp'] }));

      expect(await useAuthStore.getState().verifyLoginMfa({ method: 'totp', code: await totp(user) })).toEqual(expect.objectContaining({ ok: true }));
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0].loginMfa).toBe('totp');
    });

    it('3. signs in through the broker, with no MFA', async () => {
      const user = await newUser({ sso: true });
      const discovery = await fetchUserSsoConfig(user.username);
      expect(discovery?.brokeredSsoAvailable).toBe(true);
      await control('idp/next', { subject: user.externalSubject });

      await useAuthStore.getState().loginWithBrokeredSso({ departmentToken: discovery!.departmentToken! });
      expect(signedIn()).toBe(true);
      expect(await thisAppsSessions(user)).toEqual([expect.objectContaining({ authentication: 'OidcSso', loginMfa: null })]);
    });

    it("4. signs in through the broker on the provider's MFA, with no Resgrid prompt though the member has an authenticator", async () => {
      const user = await newUser({ sso: true, providerMfa: true, totp: true, requireMfa: true });
      await control('idp/next', { subject: user.externalSubject, amr: ['pwd', 'mfa'] });

      await useAuthStore.getState().loginWithBrokeredSso({ departmentToken: user.departmentToken });
      expect(useAuthStore.getState().mfaChallenge).toBeNull();
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0].loginMfa).toBe('federated');
    });

    it('5. signs in through the broker, then with an authenticator code', async () => {
      const user = await newUser({ sso: true, totp: true });
      await control('idp/next', { subject: user.externalSubject });

      await useAuthStore.getState().loginWithBrokeredSso({ departmentToken: user.departmentToken });
      expect(useAuthStore.getState().mfaChallenge).toEqual(expect.objectContaining({ kind: 'verify', source: 'sso' }));

      expect(await useAuthStore.getState().verifyLoginMfa({ method: 'totp', code: await totp(user) })).toEqual(expect.objectContaining({ ok: true }));
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0]).toEqual(expect.objectContaining({ authentication: 'OidcSso', loginMfa: 'totp' }));
    });

    it("6. finishes a password sign-in with this app's passkey, which then counts as the session's recent MFA", async () => {
      const user = await newUser({ totp: true, passkeyFor: [CLIENT] });
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      expect(useAuthStore.getState().mfaChallenge?.enrolled).toContain('passkey');

      expect(await useAuthStore.getState().verifyLoginMfa({ method: 'passkey' })).toEqual(expect.objectContaining({ ok: true }));
      expect(signedIn()).toBe(true);
      expect((await thisAppsSessions(user))[0].loginMfa).toBe('passkey');

      // An account change right after sign-in takes the sign-in's own MFA: no password again, no step-up.
      await expect(getPasskeyRegistrationOptions()).resolves.toEqual(expect.objectContaining({ RequestId: expect.any(String) }));
      // So does protected data: the grant stands on the sign-in's passkey, and no prompt comes.
      const grant = await requestProtectedGrant();
      expect(grantClaims(grant.GrantToken as string)).toEqual(expect.objectContaining({ mfa_method: 'passkey', grant_ver: 2 }));
    });

    it('7. steps up for protected data with the passkey, where the department does not reuse the sign-in', async () => {
      const user = await newUser({ totp: true, passkeyFor: [CLIENT], acceptRecentLoginMfaForAdp: false });
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      await useAuthStore.getState().verifyLoginMfa({ method: 'totp', code: await totp(user) });
      await expect(requestProtectedGrant()).rejects.toMatchObject({ response: expect.objectContaining({ status: 401 }) });

      expect((await getStepUpMethods()).Methods).toContain('passkey');
      const ceremony = await getStepUpPasskeyOptions();
      const credential = await getPasskeyAssertion(ceremony.Options);
      const grant = await verifyStepUpPasskey(ceremony.RequestId, credential);
      expect(grantClaims(grant.GrantToken as string)).toEqual(expect.objectContaining({ mfa_method: 'passkey' }));
    });

    it('7. steps up inside a session with the passkey', async () => {
      const user = await newUser({ totp: true, passkeyFor: [CLIENT] });
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      await useAuthStore.getState().verifyLoginMfa({ method: 'totp', code: await totp(user) });
      expect(signedIn()).toBe(true);

      const options = await getStepUpOptions('account_security');
      expect(options.Methods).toContain('passkey');
      const credential = await getPasskeyAssertion(options.Passkey!.Options);
      await expect(verifyStepUp({ Operation: 'account_security', Method: 'passkey', RequestId: options.Passkey!.RequestId, Credential: credential })).resolves.toEqual(
        expect.objectContaining({ VerifiedAt: expect.any(String) })
      );
    });

    it.each(['unit', 'dispatch', 'ic'])('8. approves a sign-in on a shared %s workstation from this phone, shown as shared and by its label, and that sign-in finishes', async (requestingApp) => {
      const user = await newUser({ totp: true, responderApprover: true });
      // This phone signs in to Responder with its passkey, as a member who approves does.
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      await useAuthStore.getState().verifyLoginMfa({ method: 'passkey' });
      expect(signedIn()).toBe(true);

      // The workstation starts its sign-in and shows the number; this phone sees the request.
      const label = `${requestingApp} workstation 1`;
      const started = await control<{ transaction: string; approvalRequestId: string; matchNumber: string }>('requester/start', {
        userId: user.userId,
        client: requestingApp,
        shared: true,
        deviceName: label,
      });
      const pending = await getPendingApproval();
      expect(pending).toEqual(expect.objectContaining({ ApprovalRequestId: started.approvalRequestId, RequestingApp: requestingApp, Shared: true, InstallationLabel: label }));

      // The member types the number and approves with this phone's passkey.
      const ceremony = await getApprovalOptions(started.approvalRequestId);
      const credential = await getPasskeyAssertion(ceremony.Options);
      await expect(approveRequest(started.approvalRequestId, started.matchNumber, ceremony.RequestId, credential)).resolves.toEqual(expect.objectContaining({ State: 'approved' }));

      const finished = await control<{ access_token?: string }>('requester/finish', { transaction: started.transaction, approvalRequestId: started.approvalRequestId, client: requestingApp });
      expect(finished.access_token).toEqual(expect.any(String));
    });

    it('8. denying a sign-in the member did not start ends it on the other device', async () => {
      const user = await newUser({ totp: true, responderApprover: true });
      await useAuthStore.getState().login({ username: user.username, password: user.password });
      await useAuthStore.getState().verifyLoginMfa({ method: 'passkey' });

      const started = await control<{ transaction: string; approvalRequestId: string }>('requester/start', { userId: user.userId, client: 'unit' });
      await expect(denyRequest(started.approvalRequestId, 'not_me')).resolves.toEqual(expect.objectContaining({ State: 'denied' }));

      const finished = await control<{ access_token?: string; type?: string; error?: string }>('requester/finish', {
        transaction: started.transaction,
        approvalRequestId: started.approvalRequestId,
        client: 'unit',
      });
      expect(finished.access_token).toBeUndefined();
    });
  });
});
