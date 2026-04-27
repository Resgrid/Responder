import { BaseV4Request } from '../baseV4Request';
import { PoiResultData } from './poiResultData';

export class PoiResult extends BaseV4Request {
  public Data: PoiResultData = new PoiResultData();
}
