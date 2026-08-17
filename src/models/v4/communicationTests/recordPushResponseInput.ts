/**
 * Body for CommunicationTests/RecordPushResponse. The token arrives on the push notification's
 * event code as "CT:{ResponseToken}" and identifies the single result row being confirmed.
 */
export class RecordPushResponseInput {
  public ResponseToken: string = '';
}
