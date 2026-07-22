import { BaseV4Request } from '../baseV4Request';
import { type ResourceIncidentView } from './resourceIncidentView';

export class ResourceIncidentViewResult extends BaseV4Request {
  public Data: ResourceIncidentView | null = null;
}
