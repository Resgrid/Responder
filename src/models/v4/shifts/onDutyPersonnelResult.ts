import { BaseV4Request } from '../baseV4Request';
import { type OnDutyPersonResultData } from './onDutyPersonResultData';

export class OnDutyPersonnelResult extends BaseV4Request {
  public Data: OnDutyPersonResultData[] = [];
}
