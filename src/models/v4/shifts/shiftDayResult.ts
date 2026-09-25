import { BaseV4Request } from '../baseV4Request';
import { ShiftDayResultData } from './shiftDayResultData';

export class ShiftDayResult extends BaseV4Request {
  public Data: ShiftDayResultData = new ShiftDayResultData();
}
