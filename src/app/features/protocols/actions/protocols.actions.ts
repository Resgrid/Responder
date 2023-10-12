import { Action } from '@ngrx/store';
import { CallProtocolsResultData, MapDataAndMarkersData } from '@resgrid/ngx-resgridlib';

export enum ProtocolsActionTypes {
  LOAD_PROTOCOLS = '[PROTOCOLS] LOAD_PROTOCOLS',
  LOAD_PROTOCOLS_SUCCESS = '[PROTOCOLS] LOAD_PROTOCOLS_SUCCESS',
  LOAD_PROTOCOLS_FAIL = '[PROTOCOLS] LOAD_PROTOCOLS_FAIL',
  LOAD_PROTOCOLS_DONE = '[PROTOCOLS] LOAD_PROTOCOLS_DONE',
  VIEW_PROTOCOL = '[PROTOCOLS] VIEW_PROTOCOL',
  VIEW_PROTOCOL_DONE = '[PROTOCOLS] VIEW_PROTOCOL_DONE',
  DISMISS_MODAL = '[PROTOCOLS] DISMISS_MODAL',
}

export class LoadProtocols implements Action {
  readonly type = ProtocolsActionTypes.LOAD_PROTOCOLS;
  constructor() {}
}

export class LoadProtocolsSuccess implements Action {
  readonly type = ProtocolsActionTypes.LOAD_PROTOCOLS_SUCCESS;
  constructor(public payload: CallProtocolsResultData[]) {}
}

export class LoadProtocolsFail implements Action {
  readonly type = ProtocolsActionTypes.LOAD_PROTOCOLS_FAIL;
  constructor() {}
}

export class LoadProtocolsDone implements Action {
  readonly type = ProtocolsActionTypes.LOAD_PROTOCOLS_DONE;
  constructor() {}
}

export class ViewProtocol implements Action {
  readonly type = ProtocolsActionTypes.VIEW_PROTOCOL;
  constructor(public protocol: CallProtocolsResultData) {}
}

export class ViewProtocolDone implements Action {
  readonly type = ProtocolsActionTypes.VIEW_PROTOCOL_DONE;
  constructor() {}
}

export class DismissModal implements Action {
  readonly type = ProtocolsActionTypes.DISMISS_MODAL;
  constructor() {}
}

export type ProtocolsActionsUnion =
  | LoadProtocols
  | LoadProtocolsSuccess
  | LoadProtocolsFail
  | LoadProtocolsDone
  | ViewProtocol
  | ViewProtocolDone
  | DismissModal
  ;
