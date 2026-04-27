import { BaseV4Request } from '../baseV4Request';
import { type PoiTypeResultData } from './poiTypeResultData';

export class PoiTypesResult extends BaseV4Request {
  public Data: PoiTypeResultData[] = [];
}
