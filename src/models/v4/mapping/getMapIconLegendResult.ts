import { BaseV4Request } from '../baseV4Request';
import { GetMapIconLegendResultData } from './getMapIconLegendResultData';

export class GetMapIconLegendResult extends BaseV4Request {
  public Data: GetMapIconLegendResultData = new GetMapIconLegendResultData();
}
