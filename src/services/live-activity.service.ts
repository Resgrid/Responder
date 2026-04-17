import { Platform } from 'react-native';

import { logger } from '@/lib/logging';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';

interface LiveActivityCallData {
  callName: string;
  callNumber: string;
  callAddress: string;
  durationMinutes: number;
}

interface LiveActivityContentState {
  remainingMinutes: number;
  timerStatus: string;
  lastCheckInTime: string;
}

function callToActivityData(call: CallResultData, timer: CheckInTimerStatusResultData): LiveActivityCallData {
  return {
    callName: call.Name,
    callNumber: call.Number,
    callAddress: call.Address,
    durationMinutes: timer.DurationMinutes,
  };
}

function timerToContentState(timer: CheckInTimerStatusResultData): LiveActivityContentState {
  return {
    remainingMinutes: Math.max(0, timer.DurationMinutes - timer.ElapsedMinutes),
    timerStatus: timer.Status,
    lastCheckInTime: timer.LastCheckIn ?? '',
  };
}

let nativeModule: {
  startActivity: (callData: LiveActivityCallData, timerData: LiveActivityContentState) => Promise<void>;
  updateActivity: (contentState: LiveActivityContentState) => Promise<void>;
  endActivity: () => Promise<void>;
} | null = null;

async function getNativeModule() {
  if (Platform.OS !== 'ios') return null;
  if (nativeModule) return nativeModule;

  try {
    const { NativeModules } = require('react-native');
    if (NativeModules.LiveActivityModule) {
      nativeModule = NativeModules.LiveActivityModule;
      return nativeModule;
    }
  } catch (error) {
    logger.warn({
      message: 'LiveActivityModule not available',
      context: { error },
    });
  }
  return null;
}

export async function startLiveActivity(call: CallResultData, timer: CheckInTimerStatusResultData): Promise<void> {
  const module = await getNativeModule();
  if (!module) return;

  try {
    await module.startActivity(callToActivityData(call, timer), timerToContentState(timer));
  } catch (error) {
    logger.error({
      message: 'Failed to start live activity',
      context: { error },
    });
  }
}

export async function updateLiveActivity(timer: CheckInTimerStatusResultData): Promise<void> {
  const module = await getNativeModule();
  if (!module) return;

  try {
    await module.updateActivity(timerToContentState(timer));
  } catch (error) {
    logger.error({
      message: 'Failed to update live activity',
      context: { error },
    });
  }
}

export async function endLiveActivity(): Promise<void> {
  const module = await getNativeModule();
  if (!module) return;

  try {
    await module.endActivity();
  } catch (error) {
    logger.error({
      message: 'Failed to end live activity',
      context: { error },
    });
  }
}
