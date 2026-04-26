import { BaseV4Request } from '../baseV4Request';
import { type PoiResultData } from './poiResultData';

export class PoisResult extends BaseV4Request {
  public Data: PoiResultData[] = [];
}
