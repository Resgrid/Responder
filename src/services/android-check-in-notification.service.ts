import type * as ExpoNotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { logger } from '@/lib/logging';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';

type ExpoNotifications = typeof ExpoNotificationsModule;
let notificationsModule: ExpoNotifications | null = null;

async function getNotificationsModule() {
  if (Platform.OS !== 'android') return null;
  if (notificationsModule) return notificationsModule;

  try {
    notificationsModule = require('expo-notifications');
    return notificationsModule;
  } catch (error) {
    logger.warn({
      message: 'expo-notifications not available',
      context: { error },
    });
    return null;
  }
}

const NOTIFICATION_ID = 'check-in-timer';
const CHANNEL_ID = 'check-in-timer-channel';

let channelCreated = false;

async function ensureChannel(): Promise<void> {
  if (channelCreated) return;
  const notifications = await getNotificationsModule();
  if (!notifications) return;

  await notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Check-In Timer',
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
  });
  channelCreated = true;
}

export async function startPersistentNotification(call: CallResultData, timer: CheckInTimerStatusResultData): Promise<void> {
  if (Platform.OS !== 'android') return;

  const notifications = await getNotificationsModule();
  if (!notifications) return;

  await ensureChannel();

  const remainingMinutes = Math.max(0, timer.DurationMinutes - timer.ElapsedMinutes);

  await notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${call.Name} (#${call.Number})`,
      body: `Check-in timer: ${remainingMinutes} min remaining - ${timer.Status}`,
      data: { callId: call.CallId, type: 'check-in-timer' },
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  });
}

export async function updateNotification(call: CallResultData, remainingMinutes: number, status: string): Promise<void> {
  if (Platform.OS !== 'android') return;

  const notifications = await getNotificationsModule();
  if (!notifications) return;

  await notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${call.Name} (#${call.Number})`,
      body: `Check-in timer: ${remainingMinutes} min remaining - ${status}`,
      data: { callId: call.CallId, type: 'check-in-timer' },
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  });
}

export async function stopPersistentNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const notifications = await getNotificationsModule();
  if (!notifications) return;

  await notifications.dismissNotificationAsync(NOTIFICATION_ID);
}
