import { BaseV4Request } from '../baseV4Request';
import { type CheckInRecordResultData } from './checkInRecordResultData';

export class CheckInRecordResult extends BaseV4Request {
  public Data: CheckInRecordResultData[] = [];
}
