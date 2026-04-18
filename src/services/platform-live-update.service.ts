import { Platform } from 'react-native';

import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';

import { startPersistentNotification, stopPersistentNotification, updateNotification } from './android-check-in-notification.service';
import { endLiveActivity, startLiveActivity, updateLiveActivity } from './live-activity.service';

export async function startLiveUpdate(call: CallResultData, timer: CheckInTimerStatusResultData): Promise<void> {
  if (Platform.OS === 'ios') {
    await startLiveActivity(call, timer);
  } else if (Platform.OS === 'android') {
    await startPersistentNotification(call, timer);
  }
}

export async function updateLiveUpdate(call: CallResultData, timer: CheckInTimerStatusResultData): Promise<void> {
  const remainingMinutes = Math.max(0, timer.DurationMinutes - timer.ElapsedMinutes);

  if (Platform.OS === 'ios') {
    await updateLiveActivity(timer);
  } else if (Platform.OS === 'android') {
    await updateNotification(call, remainingMinutes, timer.Status);
  }
}

export async function stopLiveUpdate(): Promise<void> {
  if (Platform.OS === 'ios') {
    await endLiveActivity();
  } else if (Platform.OS === 'android') {
    await stopPersistentNotification();
  }
}
