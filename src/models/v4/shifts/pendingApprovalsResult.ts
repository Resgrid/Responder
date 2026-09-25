import { BaseV4Request } from '../baseV4Request';
import { type PendingShiftSignupResultData } from './pendingShiftSignupResultData';
import { type ShiftTradeResultData } from './shiftTradeResultData';

export class PendingApprovalsResultData {
  /** The caller supervises at least one shift group. */
  public IsSupervisor: boolean = false;
  public Signups: PendingShiftSignupResultData[] = [];
  public Trades: ShiftTradeResultData[] = [];
}

export class PendingApprovalsResult extends BaseV4Request {
  public Data: PendingApprovalsResultData = new PendingApprovalsResultData();
}
