import { BaseV4Request } from '../baseV4Request';
import { type ShiftPersonOptionResultData } from './shiftPersonOptionResultData';

export class ShiftPersonOptionsResult extends BaseV4Request {
  public Data: ShiftPersonOptionResultData[] = [];
}
