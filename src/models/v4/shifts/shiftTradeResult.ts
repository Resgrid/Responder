import { BaseV4Request } from '../baseV4Request';
import { type ShiftTradeResultData } from './shiftTradeResultData';

export class ShiftTradeResult extends BaseV4Request {
  public Data: ShiftTradeResultData | null = null;
}
