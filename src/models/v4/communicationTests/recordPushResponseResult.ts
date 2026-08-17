import { BaseV4Request } from '../baseV4Request';

/**
 * Result of confirming receipt of a communication test push notification. Success is carried by
 * the inherited Status field; a token that is unknown or already used comes back as not found.
 */
export class RecordPushResponseResult extends BaseV4Request {}
