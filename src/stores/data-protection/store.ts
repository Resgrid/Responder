import { create } from 'zustand';

import {
  beginStepUpSso,
  cancelStepUpApproval,
  completeStepUpApproval,
  completeStepUpFederated,
  getDataProtectionCapabilities,
  getStepUpApprovalStatus,
  getStepUpMethods,
  getStepUpPasskeyOptions,
  requestProtectedGrant,
  requestStepUpApproval,
  type StepUpResult,
  verifyStepUp,
  verifyStepUpPasskey,
} from '@/api/data-protection/data-protection';
import { setProtectedGrantProvider } from '@/lib/data-protection/grant-provider';
import { logger } from '@/lib/logging';
import { type ApprovalWaitResult, waitForApproval } from '@/lib/mfa/approval-wait';
import { toMfaProblem } from '@/lib/mfa/errors';
import { getPasskeyAssertion, passkeysSupported } from '@/lib/mfa/passkey';
import { isPasskeyCeremonyError } from '@/lib/mfa/passkey-errors';
import { runSsoRoundTrip } from '@/lib/mfa/sso-browser';
import { registerStoreReset } from '@/lib/storage/clear-all-data';

// ---------------------------------------------------------------------------
// Advanced Data Protection (ADP) grant state.
//
// DELIBERATELY NOT PERSISTED: the grant is a security credential and lives in
// memory only (ADP plan 7.2). App restart, logout or department switch always
// starts locked. The window is ABSOLUTE — activity never extends it.
// ---------------------------------------------------------------------------

/**
 * Why the last step-up did not produce a grant. The first five are the TOTP path's own; the other methods report the
 * server's code (or `passkey_*` / `sso_*` for a prompt or browser round trip that did not finish), shown via mfaErrorKey.
 */
export type StepUpErrorCode = 'invalid_totp' | 'mfa_not_enrolled' | 'too_many_attempts' | 'grants_not_configured' | 'unknown' | (string & {});

/** What ensureGrant() concluded. The caller shows the OTP prompt only for 'step_up_required'. */
export type GrantOutcome = 'granted' | 'step_up_required' | 'unavailable';

interface DataProtectionCapabilities {
  isProtectionEnabled: boolean;
  stepUpWindowMinutes: number;
  isDepartmentLocked: boolean;
  lockReason: string | null;
}

export interface DataProtectionState {
  capabilities: DataProtectionCapabilities | null;
  isCapabilitiesLoaded: boolean;
  /** Epoch ms the current window expires, or null when no grant is held. */
  stepUpExpiresAt: number | null;
  /** The signed grant. Memory only; never written to storage or logs. */
  grantToken: string | null;
  isVerifying: boolean;
  isRequestingGrant: boolean;
  /**
   * Whether the OTP prompt is showing. Held here rather than in a screen because the prompt is
   * mounted ONCE at the app shell: a modal per screen means several can stack, and it drags the
   * whole modal import graph into every screen that shows a protected value.
   */
  isPromptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
  lastError: StepUpErrorCode | null;
  /** The step-up methods this member has and the department accepts for protected data; null until loaded. */
  stepUpMethods: string[] | null;
  preferredStepUpMethod: string | null;
  loadStepUpMethods: () => Promise<void>;
  /** A passkey for this app (plan section 8.1). */
  verifyPasskey: () => Promise<boolean>;
  /** Approve with Responder: returns the number to show on this screen only. */
  requestApproval: () => Promise<{ id: string; number: string } | null>;
  waitForApproval: (approvalRequestId: string, signal?: AbortSignal) => Promise<ApprovalWaitResult>;
  completeApproval: (approvalRequestId: string) => Promise<boolean>;
  cancelApproval: (approvalRequestId: string) => Promise<void>;
  /** The department's identity provider, where it accepts its provider's MFA for protected data (plan section 7.8). */
  verifyFederated: () => Promise<boolean>;
  fetchCapabilities: () => Promise<void>;
  /**
   * Tries to obtain a grant without prompting. Returns 'granted' when the department has exempted
   * this app, 'step_up_required' when the caller must enter a code, and 'unavailable' when grants
   * are not configured at all.
   *
   * Anything unexpected resolves to 'step_up_required'. Erring towards asking for a second factor
   * is the direction that cannot cause harm.
   */
  ensureGrant: () => Promise<GrantOutcome>;
  /** Sends the TOTP code; true on success. */
  verifyOtp: (code: string) => Promise<boolean>;
  /** True while an unexpired grant token is held. Evaluate at the moment of use. */
  isStepUpActive: () => boolean;
  /**
   * Headers for a request that needs to read protected values, or {} when no grant is held.
   * Spread into the request config: `{ headers: { ...getGrantHeaders() } }`.
   */
  getGrantHeaders: () => Record<string, string>;
  /** Drops the grant immediately (logout, department switch, manual conceal). */
  clearStepUp: () => void;
}

const GRANT_HEADER = 'X-Resgrid-Protected-Grant';

const parseErrorCode = (error: unknown): StepUpErrorCode => {
  const type = (error as { response?: { data?: { type?: string } } })?.response?.data?.type;
  if (type === 'invalid_totp' || type === 'mfa_not_enrolled' || type === 'too_many_attempts' || type === 'grants_not_configured') {
    return type;
  }
  return 'unknown';
};

const problemType = (error: unknown): string | undefined => (error as { response?: { data?: { type?: string } } })?.response?.data?.type;

/** The grant a step-up returned, when it is a usable one; a token-less or already-expired answer is a failure. */
const grantFrom = (result: StepUpResult | undefined): { grantToken: string; stepUpExpiresAt: number } | null => {
  const expiresAt = result?.StepUpExpiresOnUtc ? Date.parse(result.StepUpExpiresOnUtc) : NaN;
  return result?.GrantToken && Number.isFinite(expiresAt) && expiresAt > Date.now() ? { grantToken: result.GrantToken, stepUpExpiresAt: expiresAt } : null;
};

/** Runs one step-up method; the grant it returns (memory only) becomes the window, and any refusal its code. */
const stepUp = async (method: string, run: () => Promise<StepUpResult | null>): Promise<boolean> => {
  dataProtectionStore.setState({ isVerifying: true, lastError: null });
  try {
    const result = await run();
    if (!result) {
      dataProtectionStore.setState({ isVerifying: false });
      return false;
    }
    const grant = grantFrom(result);
    dataProtectionStore.setState(grant ? { ...grant, isVerifying: false, lastError: null } : { isVerifying: false, lastError: 'unknown' });
    return !!grant;
  } catch (error) {
    const code = isPasskeyCeremonyError(error) ? `passkey_${error.reason}` : toMfaProblem(error).code;
    logger.warn({ message: 'ADP step-up failed', context: { method, errorType: code } });
    dataProtectionStore.setState({ isVerifying: false, lastError: code });
    return false;
  }
};

export const dataProtectionStore = create<DataProtectionState>()((set, get) => ({
  capabilities: null,
  isCapabilitiesLoaded: false,
  stepUpExpiresAt: null,
  grantToken: null,
  isVerifying: false,
  isRequestingGrant: false,
  isPromptOpen: false,
  lastError: null,
  stepUpMethods: null,
  preferredStepUpMethod: null,
  loadStepUpMethods: async () => {
    try {
      const methods = await getStepUpMethods();
      const usable = (methods?.Methods ?? []).filter((m) => m !== 'passkey' || passkeysSupported());
      set({ stepUpMethods: usable, preferredStepUpMethod: methods?.Preferred ?? null });
    } catch {
      // An older server has no methods list: the authenticator code is the step-up it has always offered.
      set({ stepUpMethods: ['totp'], preferredStepUpMethod: 'totp' });
    }
  },
  verifyPasskey: () =>
    stepUp('passkey', async () => {
      const ceremony = await getStepUpPasskeyOptions();
      const credential = await getPasskeyAssertion(ceremony.Options);
      return verifyStepUpPasskey(ceremony.RequestId, credential);
    }),
  requestApproval: async () => {
    set({ lastError: null });
    try {
      const started = await requestStepUpApproval();
      return { id: started.ApprovalRequestId, number: started.MatchNumber };
    } catch (error) {
      set({ lastError: toMfaProblem(error).code });
      return null;
    }
  },
  waitForApproval: (approvalRequestId: string, signal?: AbortSignal) => waitForApproval(() => getStepUpApprovalStatus(approvalRequestId), signal),
  completeApproval: (approvalRequestId: string) => stepUp('passkey_approval', () => completeStepUpApproval(approvalRequestId)),
  cancelApproval: async (approvalRequestId: string) => {
    await cancelStepUpApproval(approvalRequestId).catch(() => undefined);
  },
  verifyFederated: () =>
    stepUp('federated', async () => {
      const trip = await runSsoRoundTrip((secrets) => beginStepUpSso(secrets));
      if (!trip.ok) {
        set({ lastError: trip.code ?? `sso_${trip.reason}` });
        return null;
      }
      return completeStepUpFederated(trip.trip.ssoTransactionId, trip.trip.ssoCode, trip.trip.codeVerifier);
    }),
  openPrompt: () => set({ isPromptOpen: true, lastError: null }),
  closePrompt: () => set({ isPromptOpen: false }),
  fetchCapabilities: async () => {
    try {
      const response = await getDataProtectionCapabilities();
      const data = response?.Data;
      set({
        capabilities: data
          ? {
              isProtectionEnabled: !!data.IsProtectionEnabled,
              stepUpWindowMinutes: data.StepUpWindowMinutes ?? 15,
              isDepartmentLocked: !!data.IsDepartmentLocked,
              lockReason: data.LockReason ?? null,
            }
          : null,
        isCapabilitiesLoaded: true,
      });
    } catch (error) {
      // Unknown capability state fails closed: consumers treat "no capabilities" as protected
      // when the server later marks fields redacted, and as unprotected for legacy departments.
      logger.error({
        message: 'Failed to fetch data protection capabilities',
        context: { error },
      });
      set({ isCapabilitiesLoaded: true });
    }
  },
  ensureGrant: async () => {
    if (get().isStepUpActive()) {
      return 'granted';
    }

    set({ isRequestingGrant: true, lastError: null });
    try {
      const result = await requestProtectedGrant();
      const expiresAt = result?.StepUpExpiresOnUtc ? Date.parse(result.StepUpExpiresOnUtc) : NaN;

      if (!result?.GrantToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        set({ isRequestingGrant: false });
        return 'step_up_required';
      }

      set({ grantToken: result.GrantToken, stepUpExpiresAt: expiresAt, isRequestingGrant: false, lastError: null });
      return 'granted';
    } catch (error) {
      set({ isRequestingGrant: false });

      const type = problemType(error);
      if (type === 'grants_not_configured') {
        return 'unavailable';
      }

      // Everything else — including a network failure — means prompt. The server refuses with
      // step_up_required whenever this app is not exempt, which is the normal case.
      return 'step_up_required';
    }
  },
  verifyOtp: async (code: string) => {
    set({ isVerifying: true, lastError: null });
    try {
      const result = await verifyStepUp(code.trim());
      const expiresAt = result?.StepUpExpiresOnUtc ? Date.parse(result.StepUpExpiresOnUtc) : NaN;
      // A token-less response is a failure, not a grant. Accepting one would flip the UI to
      // "revealed" while getGrantHeaders() still sends nothing, so every value stays REDACTED
      // with no error to explain it — the same invariant ensureGrant() already enforces.
      if (!result?.GrantToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        set({ isVerifying: false, lastError: 'unknown' });
        return false;
      }
      set({
        grantToken: result.GrantToken,
        stepUpExpiresAt: expiresAt,
        isVerifying: false,
        lastError: null,
      });
      return true;
    } catch (error) {
      // Never log the code; the error object carries only the HTTP problem envelope.
      logger.warn({
        message: 'ADP step-up verification failed',
        context: { errorType: parseErrorCode(error) },
      });
      set({ isVerifying: false, lastError: parseErrorCode(error) });
      return false;
    }
  },
  isStepUpActive: () => {
    const { grantToken, stepUpExpiresAt } = get();
    // Both halves are required. A future expiry with no token buys nothing: getGrantHeaders()
    // would send no header, so the record comes back redacted while the UI claims otherwise.
    return !!grantToken && stepUpExpiresAt != null && Date.now() < stepUpExpiresAt;
  },
  getGrantHeaders: () => {
    const state = get();
    // Expiry is checked here rather than trusted from state: a grant that lapsed while a screen
    // sat open must not be attached to the next request.
    const headers: Record<string, string> = {};
    if (!state.grantToken || !state.isStepUpActive()) {
      return headers;
    }

    headers[GRANT_HEADER] = state.grantToken;
    return headers;
  },
  clearStepUp: () => set({ stepUpExpiresAt: null, grantToken: null, lastError: null }),
}));

// The grant is memory-only and must never survive the session. This app clears stores through the
// central reset registry rather than by watching the auth store, so it registers there — the ADP
// grant must go out with everything else on logout, token revocation or forced deauth.
registerStoreReset('dataProtection', () => {
  dataProtectionStore.setState({
    capabilities: null,
    isCapabilitiesLoaded: false,
    stepUpExpiresAt: null,
    grantToken: null,
    isVerifying: false,
    isRequestingGrant: false,
    isPromptOpen: false,
    lastError: null,
    stepUpMethods: null,
    preferredStepUpMethod: null,
  });
});

// Every read through the shared API client carries the grant while one is held — see
// setProtectedGrantProvider. Registered here rather than imported there, because the client is
// what this store's own API layer is built on.
setProtectedGrantProvider(() => dataProtectionStore.getState().getGrantHeaders());

/** Reactive: true while protection is enabled for the department (unknown reads as false). */
export const useIsProtectionEnabled = () => dataProtectionStore((state) => !!state.capabilities?.isProtectionEnabled);

/**
 * Reactive step-up flag. Re-renders on verify/clear; expiry itself is time-based, so callers
 * gating a reveal must ALSO call isStepUpActive() at the moment of use.
 */
export const useStepUpExpiresAt = () => dataProtectionStore((state) => state.stepUpExpiresAt);

/**
 * Reactive: whether a grant token is held at all. Paired with useStepUpExpiresAt by callers that
 * render a reveal state, because an expiry alone does not make a grant usable.
 */
export const useHasGrantToken = () => dataProtectionStore((state) => !!state.grantToken);

/** Headers helper for one-off calls outside a component. */
export const getProtectedGrantHeaders = () => dataProtectionStore.getState().getGrantHeaders();

/** Reactive: whether the single app-level OTP prompt should be showing. */
export const useIsStepUpPromptOpen = () => dataProtectionStore((state) => state.isPromptOpen);
