import { logger } from '@/lib/logging';
import type { RecordPushResponseResult } from '@/models/v4/communicationTests/recordPushResponseResult';

import { createApiEndpoint } from '../common/client';

const recordPushResponseApi = createApiEndpoint('/CommunicationTests/RecordPushResponse');

/**
 * Confirms receipt of a communication test push notification. The token comes from the push
 * event code ("CT:{token}") and is single use — a second confirmation for the same token comes
 * back as not found, which is not an error worth surfacing to the user.
 */
export const recordCommunicationTestPushResponse = async (responseToken: string) => {
  try {
    const response = await recordPushResponseApi.post<RecordPushResponseResult>({
      ResponseToken: responseToken,
    });
    return response.data;
  } catch (error) {
    logger.error({
      message: 'Failed to record communication test push response',
      context: { error },
    });
    throw new Error('Failed to record communication test push response', { cause: error });
  }
};
