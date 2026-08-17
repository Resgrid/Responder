import { create } from 'zustand';

import { logger } from '@/lib/logging';

export interface PushNotificationData {
  eventCode: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export type NotificationType = 'call' | 'message' | 'chat' | 'group-chat' | 'weather' | 'communication-test' | 'unknown';

export interface ParsedNotification {
  type: NotificationType;
  id: string;
  eventCode: string;
  title?: string | undefined;
  body?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

interface PushNotificationModalState {
  isOpen: boolean;
  notification: ParsedNotification | null;
  showNotificationModal: (notificationData: PushNotificationData) => void;
  hideNotificationModal: () => void;
  parseNotification: (notificationData: PushNotificationData) => ParsedNotification;
}

// Whole event code prefixes. Checked before EVENT_CODE_PREFIXES below so a multi-letter code is
// not collapsed to its first character — "CT:" (communication test) would otherwise read as "C"
// and be handled as a call.
const EVENT_CODE_TYPES: Record<string, NotificationType> = {
  ct: 'communication-test',
};

// First character of the event code prefix sent by the Resgrid backend, e.g.
// "C:1234" call, "M:5678" message, "T:9012" chat, "G:3456" group chat, "W:9012" weather alert.
const EVENT_CODE_PREFIXES: Record<string, NotificationType> = {
  c: 'call',
  m: 'message',
  t: 'chat',
  g: 'group-chat',
  w: 'weather',
};

export const parseNotificationData = (notificationData: PushNotificationData): ParsedNotification => {
  const eventCode = notificationData.eventCode || '';
  let type: NotificationType = 'unknown';
  let id = '';

  const separatorIndex = eventCode.indexOf(':');

  if (separatorIndex > 0) {
    const lowerPrefix = eventCode.slice(0, separatorIndex).toLowerCase();
    // Split on the FIRST colon only, so an id that itself contains one survives intact.
    const notificationId = eventCode.slice(separatorIndex + 1);

    type = EVENT_CODE_TYPES[lowerPrefix] ?? EVENT_CODE_PREFIXES[lowerPrefix.charAt(0)] ?? 'unknown';
    id = notificationId || '';
  }

  return {
    type,
    id,
    eventCode,
    title: notificationData.title,
    body: notificationData.body,
    data: notificationData.data,
  };
};

export const usePushNotificationModalStore = create<PushNotificationModalState>((set, get) => ({
  isOpen: false,
  notification: null,

  parseNotification: (notificationData: PushNotificationData): ParsedNotification => parseNotificationData(notificationData),

  showNotificationModal: (notificationData: PushNotificationData) => {
    const parsedNotification = get().parseNotification(notificationData);

    logger.info({
      message: 'Showing push notification modal',
      context: {
        type: parsedNotification.type,
        id: parsedNotification.id,
        eventCode: parsedNotification.eventCode,
      },
    });

    set({
      isOpen: true,
      notification: parsedNotification,
    });
  },

  hideNotificationModal: () => {
    logger.info({
      message: 'Hiding push notification modal',
    });

    set({
      isOpen: false,
      notification: null,
    });
  },
}));
