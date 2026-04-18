import { BaseV4Request } from '../baseV4Request';
import { type ResolvedCheckInTimerResultData } from './resolvedCheckInTimerResultData';

export class ResolvedCheckInTimerResult extends BaseV4Request {
  public Data: ResolvedCheckInTimerResultData[] = [];
}
