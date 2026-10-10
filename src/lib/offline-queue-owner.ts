import { getBaseApiUrl } from '@/lib/storage/app';
import { type QueueOwner } from '@/models/offline-queue/queued-event';
import useAuthStore from '@/stores/auth/store';

/**
 * Who an offline action belongs to.
 *
 * Queued actions outlive sign-out (the queue has its own storage, which sign-out does not clear) and are replayed
 * through the api client, which sends to whichever server and account are signed in at that moment. Without an owner,
 * a status or check-in queued on one server went to the next server signed in to, under the next account's token, and
 * one replayed while signed out drew a 401 that dropped it for good.
 *
 * The department is not part of the owner: it cannot be changed from the app, and checklist actions carry their own
 * department scope.
 */

/** An action held for someone else (another user, or this user on another server) is dropped once this old. */
export const FOREIGN_QUEUE_ITEM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sameOwner = (a: QueueOwner, b: QueueOwner): boolean => a.serverUrl === b.serverUrl && a.userId === b.userId;

/** The signed-in session, or null while nobody is signed in. Stamped on every action as it is queued. */
export const currentQueueOwner = (): QueueOwner | null => {
  const { status, userId } = useAuthStore.getState();
  return status === 'signedIn' && userId ? { serverUrl: getBaseApiUrl(), userId } : null;
};

/**
 * Whether an action may be sent now: only by its own session. Held back while signed out and while anyone else is
 * signed in, it goes out when its owner signs in to its server again. An action queued before owners were recorded has
 * none and is taken to be the signed-in session's, which is who queued it in all but a rare case.
 */
export const isOwnedByCurrentSession = (owner: QueueOwner | null | undefined): boolean => {
  const current = currentQueueOwner();
  if (!current) {
    return false;
  }

  return owner === undefined || (owner !== null && sameOwner(owner, current));
};

/**
 * An action someone else owns that has waited too long for them to come back. Decided only while signed in: a device
 * nobody is signed in to keeps everything for whoever signs in next.
 */
export const isAbandonedQueueItem = (owner: QueueOwner | null | undefined, queuedAt: number | undefined, now = Date.now()): boolean => {
  if (owner === undefined || queuedAt === undefined || now - queuedAt <= FOREIGN_QUEUE_ITEM_TTL_MS) {
    return false;
  }

  const current = currentQueueOwner();
  return current !== null && (owner === null || !sameOwner(owner, current));
};
