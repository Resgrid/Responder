import { type PushRegistrationInput } from '@/models/v4/device/pushRegistrationInput';
import { type PushRegistrationResult } from '@/models/v4/device/pushRegistrationResult';
import { type PushRegistrationUnitInput } from '@/models/v4/device/pushRegistrationUnitInput';
import { type WebPushUnRegistrationInput } from '@/models/v4/device/webPushUnRegistrationInput';

import { createApiEndpoint } from '../common/client';

const registerUnitDeviceApi = createApiEndpoint('/Devices/RegisterUnitDevice');
const registerDeviceApi = createApiEndpoint('/Devices/RegisterDevice');
const unRegisterWebPushApi = createApiEndpoint('/Devices/UnRegisterWebPush');

export const registerUnitDevice = async (data: PushRegistrationUnitInput) => {
  const response = await registerUnitDeviceApi.post<PushRegistrationResult>({
    ...data,
  });
  return response.data;
};

export const registerDevice = async (data: PushRegistrationInput) => {
  const response = await registerDeviceApi.post<PushRegistrationResult>({
    ...data,
  });
  return response.data;
};

export const unRegisterWebPush = async (data: WebPushUnRegistrationInput) => {
  const response = await unRegisterWebPushApi.post<PushRegistrationResult>({
    ...data,
  });
  return response.data;
};
