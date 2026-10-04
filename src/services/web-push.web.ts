/**
 * Browser push for the Responder web edition.
 *
 * The browser mints an FCM web token with the Firebase JS SDK against /service-worker.js (which shows each push and
 * hands clicks back here) and registers it on the person's user subscriber as Platform 3. Core keeps those on a web
 * channel beside their other browsers, never replacing their phones. The Firebase web app comes from Core's config
 * (WebPush* fields); without it there is no push here.
 *
 * Like the phone apps there is no setting for it: a browser with notification permission (asked for once,
 * on the first click after sign-in, the way the phone asks at sign-in) is registered.
 * Which pushes reach it is decided by the push preferences on the server, as for any device.
 *
 * Nothing registered may outlive its session: signing out takes the token off the server and kills it in this
 * browser (a sign-out hook, run while the session's token still works), and a different person or department in
 * this browser rotates the token before registering.
 */
import { getApps, initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useEffect } from 'react';

import { registerDevice, unRegisterWebPush } from '@/api/devices/push';
import { registerSignOutHook } from '@/lib/auth/sign-out-hooks';
import { logger } from '@/lib/logging';
import { CLIENT_HEADER, RESGRID_CLIENT } from '@/lib/mfa/client-app';
import { getBaseApiUrl, getDeviceUuid } from '@/lib/storage/app';
import { pushNotificationService } from '@/services/push-notification';
import { useCoreStore } from '@/stores/app/core-store';
import useAuthStore from '@/stores/auth/store';
import { usePushNotificationModalStore } from '@/stores/push-notification/store';
import { securityStore } from '@/stores/security/store';

/** One push as the service worker hands it over. */
export interface WebPushPayload {
  title: string;
  body: string;
  eventCode: string;
  type?: string;
  category?: string;
}

export interface WebPushFirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

interface UserIdentity {
  userId: string;
  prefix: string;
}

interface StoredRegistration extends UserIdentity {
  key: string;
  token: string;
  registeredAt: number;
}

/** Platforms.Web on the server. */
const WEB_PLATFORM = 3;
const SERVICE_WORKER_URL = '/service-worker.js';
const REGISTRATION_KEY = 'rg.webPush.registration';
/** When the permission prompt was last dismissed without an answer. */
const ASKED_KEY = 'rg.webPush.asked';
/** A dismissed prompt waits a week: browsers stop a site's prompts for a while after a few dismissals. */
const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** FCM rotates web tokens; re-registering daily keeps the server's copy current. */
const REREGISTER_AFTER_MS = 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Calls back whenever this device's push status may have changed. Returns the unsubscribe. */
export function subscribeWebPush(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // storage unavailable: the registration just isn't remembered across reloads
  }
}

const readRegistration = (): StoredRegistration | null => readJson<StoredRegistration>(REGISTRATION_KEY);
const writeRegistration = (registration: StoredRegistration | null): void => writeJson(REGISTRATION_KEY, registration);

export function getWebPushConfig(): WebPushFirebaseConfig | null {
  const config = useCoreStore.getState().config;
  if (!config?.WebPushApiKey || !config.WebPushProjectId || !config.WebPushMessagingSenderId || !config.WebPushAppId || !config.WebPushVapidKey) {
    return null;
  }

  return {
    apiKey: config.WebPushApiKey,
    authDomain: config.WebPushAuthDomain || undefined,
    projectId: config.WebPushProjectId,
    messagingSenderId: config.WebPushMessagingSenderId,
    appId: config.WebPushAppId,
    vapidKey: config.WebPushVapidKey,
  };
}

function browserCanPush(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function currentIdentity(): UserIdentity | null {
  const auth = useAuthStore.getState();
  if (auth.status !== 'signedIn') {
    return null;
  }

  const prefix = securityStore.getState().rights?.DepartmentCode;
  return auth.userId && prefix ? { userId: auth.userId, prefix } : null;
}

const keyOf = (identity: UserIdentity): string => `user:${identity.userId}:${identity.prefix}`;

// --- Browser (Firebase JS SDK) ---

async function loadMessaging(config: WebPushFirebaseConfig) {
  if (!(await isSupported())) {
    return null;
  }

  const appName = 'rg-web-push';
  const app =
    getApps().find((candidate) => candidate.name === appName) ??
    initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, messagingSenderId: config.messagingSenderId, appId: config.appId }, appName);

  return getMessaging(app);
}

async function findServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  return (
    registrations.find((registration) => {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      return !!worker && new URL(worker.scriptURL).pathname === SERVICE_WORKER_URL;
    }) ?? null
  );
}

async function mintBrowserToken(config: WebPushFirebaseConfig): Promise<string | null> {
  const messaging = await loadMessaging(config);
  if (!messaging) {
    return null;
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
  if (!serviceWorkerRegistration.active) {
    await navigator.serviceWorker.ready;
  }

  return (await getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration })) || null;
}

/** Kills the browser's token at FCM, so every channel still holding it stops delivering here. */
async function deleteBrowserToken(config: WebPushFirebaseConfig | null): Promise<void> {
  const registration = await findServiceWorker().catch(() => null);
  if (!registration) {
    return;
  }

  try {
    const messaging = config ? await loadMessaging(config) : null;
    if (messaging && config && Notification.permission === 'granted') {
      // deleteToken acts on the worker getToken last named; with a token stored this getToken is a local read.
      await getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: registration });
      await deleteToken(messaging);
      return;
    }
  } catch (error) {
    logger.warn({ message: 'Web push: the FCM token could not be deleted', context: { error } });
  }

  // Without Firebase, dropping the push subscription still leaves FCM nowhere to deliver.
  try {
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // nothing more can be done from here
  }
}

async function deleteLocalToken(config: WebPushFirebaseConfig | null): Promise<void> {
  if (browserCanPush()) {
    await deleteBrowserToken(config);
  }
}

// --- Registration ---

async function unregisterQuietly(registration: StoredRegistration): Promise<void> {
  try {
    await unRegisterWebPush({ Token: registration.token, Prefix: registration.prefix });
  } catch (error) {
    logger.warn({ message: 'Web push: the previous registration could not be removed', context: { error } });
  }
}

async function runSync(): Promise<void> {
  const identity = currentIdentity();
  const config = getWebPushConfig();
  if (!identity || !config) {
    return;
  }

  const stored = readRegistration();
  if (stored && stored.key !== keyOf(identity)) {
    // Another person or department on this device: take the device off the old one (when this session may),
    // then rotate the token so the old channel holds a dead one even if that call failed.
    if (stored.userId === identity.userId) {
      await unregisterQuietly(stored);
    }
    writeRegistration(null);
    await deleteLocalToken(config);
  }

  if (Notification.permission !== 'granted') {
    notify();
    return;
  }

  const token = await mintBrowserToken(config);
  if (!token) {
    notify();
    return;
  }

  const current = readRegistration();
  if (current && current.key === keyOf(identity) && current.token === token && Date.now() - current.registeredAt < REREGISTER_AFTER_MS) {
    return;
  }

  if (current && current.token !== token) {
    await unregisterQuietly(current);
  }

  await registerDevice({ UserId: identity.userId, Token: token, Platform: WEB_PLATFORM, DeviceUuid: getDeviceUuid() || '', Prefix: identity.prefix });
  writeRegistration({ key: keyOf(identity), userId: identity.userId, prefix: identity.prefix, token, registeredAt: Date.now() });
  notify();
}

let syncQueue: Promise<void> = Promise.resolve();
let askArmed = false;

/** Brings this device's registration in line with whoever is signed in. Calls run one at a time. */
export function syncWebPush(): Promise<void> {
  const run = syncQueue.then(runSync, runSync);
  syncQueue = run.catch(() => undefined);
  return run;
}

/**
 * Asks for notification permission the way the phone app does after sign-in, once. Browsers only show the prompt
 * from a click, so it waits for the first one. A granted permission registers this browser straight away.
 */
export function askForPermissionOnce(): void {
  if (!getWebPushConfig() || !browserCanPush() || Notification.permission !== 'default' || askArmed) {
    return;
  }

  const lastAsked = readJson<number>(ASKED_KEY);
  if (lastAsked && Date.now() - lastAsked < ASK_AGAIN_AFTER_MS) {
    return;
  }

  askArmed = true;
  const ask = () => {
    document.removeEventListener('click', ask, true);
    // Asked inside the click, while the browser still counts it as the person's.
    void Notification.requestPermission()
      .then((permission) => {
        // Denied is remembered by the browser; a dismissed prompt waits a week before asking again.
        writeJson(ASKED_KEY, permission === 'default' ? Date.now() : null);
        notify();
        return permission === 'granted' ? syncWebPush() : undefined;
      })
      .catch((error) => logger.warn({ message: 'Web push: the permission request failed', context: { error } }))
      .finally(() => {
        askArmed = false;
      });
  };

  document.addEventListener('click', ask, true);
}

registerSignOutHook(async (accessToken) => {
  const stored = readRegistration();
  writeRegistration(null);

  if (stored && accessToken) {
    // Straight to the server, not through the api client: its 401 handling would re-enter logout. Awaited (sign-out
    // waits on it), so no keepalive: some browsers refuse keepalive on a cross-origin call that needs a preflight.
    try {
      await fetch(`${getBaseApiUrl()}/Devices/UnRegisterWebPush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, [CLIENT_HEADER]: RESGRID_CLIENT },
        body: JSON.stringify({ Token: stored.token, Prefix: stored.prefix }),
      });
    } catch (error) {
      logger.warn({ message: 'Web push: the token could not be unregistered at sign-out', context: { error } });
    }
  }

  if (stored) {
    await deleteLocalToken(getWebPushConfig());
  }

  notify();
});

// --- Incoming pushes ---

/** A clicked notification goes wherever a tapped one does on the phone (push-notification.ts). */
export async function openWebPush(payload: WebPushPayload): Promise<void> {
  if (!payload?.eventCode) {
    return;
  }

  await pushNotificationService.openNotification({ eventCode: payload.eventCode, title: payload.title, body: payload.body, data: { ...payload } });
}

/** A push arriving while the person is looking at the app gets the in-app alert, as on the phone. */
function onPushReceived(payload: WebPushPayload): void {
  if (payload?.eventCode && typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
    usePushNotificationModalStore.getState().showNotificationModal({ eventCode: payload.eventCode, title: payload.title, body: payload.body, data: { ...payload } });
  }
}

let detachListeners: (() => void) | null = null;

/** Wires clicks and foreground pushes to the app. Safe to call repeatedly. */
export function attachWebPushListeners(): void {
  if (detachListeners || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const onMessage = (event: MessageEvent) => {
    const message = event.data as { type?: string; data?: WebPushPayload } | undefined;
    if (message?.type === 'NOTIFICATION_CLICK' && message.data) {
      void openWebPush(message.data);
    } else if (message?.type === 'PUSH_RECEIVED' && message.data) {
      onPushReceived(message.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  detachListeners = () => navigator.serviceWorker.removeEventListener('message', onMessage);

  // If the worker opened this window for a click, it hands the click over once told the page is ready.
  void findServiceWorker()
    .then((registration) => (navigator.serviceWorker.controller ?? registration?.active)?.postMessage({ type: 'CLIENT_READY' }))
    .catch(() => undefined);
}

/** Test hook. */
export function _resetWebPushForTests(): void {
  detachListeners?.();
  detachListeners = null;
  syncQueue = Promise.resolve();
  askArmed = false;
  listeners.clear();
}

/** Keeps this browser registered for whoever is signed in. Called from the signed-in layout. */
export const useWebPushRegistration = (): void => {
  const authStatus = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.userId);
  const hasConfig = useCoreStore((state) => !!state.config?.WebPushProjectId);
  const departmentCode = securityStore((state) => state.rights?.DepartmentCode);

  useEffect(() => {
    attachWebPushListeners();
  }, []);

  useEffect(() => {
    // Registering before auth settles would send a token the server is about to refuse.
    if (authStatus !== 'signedIn' || !useAuthStore.getState().accessToken || !userId || !departmentCode || !hasConfig) {
      return;
    }

    syncWebPush().catch((error) => logger.error({ message: 'Web push registration failed', context: { error } }));
    askForPermissionOnce();
  }, [authStatus, userId, departmentCode, hasConfig]);
};
