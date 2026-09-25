import { BaseV4Request } from '../baseV4Request';

/** Result of every Shifts POST. `ErrorCode` is set (with `Status: "failure"`) when the server refused it. */
export class ShiftActionResult extends BaseV4Request {
  public Id: string = '';
  public ApprovalPending: boolean = false;
  public ErrorCode: string = '';
}
