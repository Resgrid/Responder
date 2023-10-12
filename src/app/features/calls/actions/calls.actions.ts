import { Action } from '@ngrx/store';
import {
  CallExtraDataResultData,
  CallFileResultData,
  CallNoteResultData,
  CallPriorityResultData,
  CallResultData,
  DispatchedEventResultData,
  RecipientsResultData
} from '@resgrid/ngx-resgridlib';
import { GeoLocation } from 'src/app/models/geoLocation';

export enum CallsActionTypes {
  GET_CALLS = '[CALLS] GET_CALLS',
  GET_CALLS_DONE = '[CALLS] GET_CALLS_DONE',
  GET_CALLS_FAIL = '[CALLS] GET_CALLS_FAIL',
  GET_CALL_BYID = '[CALLS] GET_CALL_BYID',
  GET_CALL_BYID_SUCCESS = "[CALLS] GET_CALL_BYID_SUCCESS",
  GET_CALL_BYID_FAIL = "[CALLS] GET_CALL_BYID_FAIL",
  GET_CALL_BYID_DONE = "[CALLS] GET_CALL_BYID_DONE",
  SHOW_CALLNOTES = '[CALLS] SHOW_CALLNOTES',
  OPEN_CALLNOTES = '[CALLS] OPEN_CALLNOTES',
  SAVE_CALLNOTE = '[CALLS] SAVE_CALLNOTE',
  SAVE_CALLNOTE_SUCCESS = '[CALLS] SAVE_CALLNOTE_SUCCESS',
  SAVE_CALLNOTE_FAIL = '[CALLS] SAVE_CALLNOTE_FAIL',
  SET_VIEW_CALL_MODAL = '[CALLS] SET_VIEW_CALL_MODAL',
  DONE = '[CALLS] DONE',
  SHOW_CALLIMAGES = '[CALLS] SHOW_CALLIMAGES',
  OPEN_CALLIMAGES = '[CALLS] OPEN_CALLIMAGES',
  UPLOAD_CALLIMAGE = '[CALLS] UPLOAD_CALLIMAGE',
  UPLOAD_CALLIMAGE_SUCCESS = '[CALLS] UPLOAD_CALLIMAGE_SUCCESS',
  UPLOAD_CALLIMAGE_FAIL = '[CALLS] UPLOAD_CALLIMAGE_FAIL',
  SHOW_CALLFILESMODAL = '[CALLS] SHOW_CALLFILESMODAL',
  OPEN_CALLFILESMODAL = '[CALLS] OPEN_CALLFILESMODAL',
  UPLOAD_CALLFILE = '[CALLS] UPLOAD_CALLFILE',
  UPLOAD_CALLFILE_SUCCESS = '[CALLS] UPLOAD_CALLFILE_SUCCESS',
  UPLOAD_CALLFILE_FAIL = '[CALLS] UPLOAD_CALLFILE_FAIL',
  SHOW_NEW_CALL_MODAL = '[CALLS] SHOW_NEW_CALL_MODAL',
  CLOSE_NEW_CALL_MODAL = '[CALLS] CLOSE_NEW_CALL_MODAL',
  SHOW_SET_LOCATION_MODAL = '[CALLS] SHOW_SET_LOCATION_MODAL',
  CLOSE_SET_LOCATION_MODAL = '[CALLS] CLOSE_SET_LOCATION_MODAL',
  SET_NEW_CALL_LOCATION = '[CALLS] SET_NEW_CALL_LOCATION',
  DISPATCH_CALL = '[CALLS] DISPATCH_CALL',
  DISPATCH_CALL_SUCCESS = '[CALLS] DISPATCH_CALL_SUCCESS',
  DISPATCH_CALL_FAIL = '[CALLS] DISPATCH_CALL_FAIL',
  SHOW_SELECT_DISPATCHS = '[CALLS] SHOW_SELECT_DISPATCHS',
  SHOW_SELECT_DISPATCHS_SUCCESS = '[CALLS] SHOW_SELECT_DISPATCHS_SUCCESS',
  SHOW_SELECT_DISPATCHS_FAIL = '[CALLS] SHOW_SELECT_DISPATCHS_FAIL',
  CLOSE_SELECT_DISPATCHS_MODAL = '[CALLS] CLOSE_SELECT_DISPATCHS_MODAL',
  UPDATE_SELECTED_DISPTACHES = '[CALLS] UPDATE_SELECTED_DISPTACHES',
  SHOW_CLOSE_CALL_MODAL = '[CALLS] SHOW_CLOSE_CALL_MODAL',
  CLOSE_CLOSE_CALL_MODAL = '[CALLS] CLOSE_CLOSE_CALL_MODAL',
  CLOSE_CALL = '[CALLS] CLOSE_CALL',
  CLOSE_CALL_SUCCESS = '[CALLS] CLOSE_CALL_SUCCESS',
  CLOSE_CALL_FAIL = '[CALLS] CLOSE_CALL_FAIL',
  SET_EDIT_CALL_DISPATCHES = '[CALLS] SET_EDIT_CALL_DISPATCHES',
  SHOW_EDIT_CALL_SELECT_DISPATCHS = '[CALLS] SHOW_EDIT_CALL_SELECT_DISPATCHS',
  SHOW_EDIT_CALL_SELECT_DISPATCHS_SUCCESS = '[CALLS] SHOW_EDIT_CALL_SELECT_DISPATCHS_SUCCESS',
  SHOW_EDIT_CALL_SELECT_DISPATCHS_FAIL = '[CALLS] SHOW_EDIT_CALL_SELECT_DISPATCHS_FAIL',
  GET_EDIT_CALL_DISPATCHES = '[CALLS] GET_EDIT_CALL_DISPATCHES',
  GET_EDIT_CALL_DISPATCHES_SUCCESS = '[CALLS] GET_EDIT_CALL_DISPATCHES_SUCCESS',
  SHOW_EDIT_CALL_MODAL = '[CALLS] SHOW_EDIT_CALL_MODAL',
  CLOSE_EDIT_CALL_MODAL = '[CALLS] CLOSE_EDIT_CALL_MODAL',
  UPDATE_EDIT_CALL_SELECTED_DISPTACHES = '[CALLS] UPDATE_EDIT_CALL_SELECTED_DISPTACHES',
  UPDATE_CALL = '[CALLS] UPDATE_CALL',
  UPDATE_CALL_SUCCESS = '[CALLS] UPDATE_CALL_SUCCESS',
  UPDATE_CALL_FAIL = '[CALLS] UPDATE_CALL_FAIL',
  CLOSE_VIEW_CALL_MODAL = '[CALLS] CLOSE_VIEW_CALL_MODAL',
  CLEAR_CALLS = '[CALLS] CLEAR_CALLS',
  GET_COORDINATESFORADDRESS = '[CALLS] GET_COORDINATESFORADDRESS',
  GET_COORDINATESFORADDRESS_SUCCESS = '[CALLS] GET_COORDINATESFORADDRESS_SUCCESS',
  GET_COORDINATESFORADDRESS_FAIL = '[CALLS] GET_COORDINATESFORADDRESS_FAIL',
  GET_COORDINATES_FORW3W = '[CALLS] GET_COORDINATES_FORW3W',
  GET_COORDINATES_FORW3W_SUCCESS = '[CALLS] GET_COORDINATES_FORW3W_SUCCESS',
  GET_COORDINATES_FORW3W_FAIL = '[CALLS] GET_COORDINATES_FORW3W_FAIL',
  GET_COORDINATES_FOR_PLUS = '[CALLS] GET_COORDINATES_FOR_PLUS',
  GET_COORDINATES_FOR_PLUS_SUCCESS = '[CALLS] GET_COORDINATES_FOR_PLUS_SUCCESS',
  GET_COORDINATES_FOR_PLUS_FAIL = '[CALLS] GET_COORDINATES_FOR_PLUS_FAIL',
  EDIT_GET_COORDINATES_FOR_ADDRESS = '[CALLS] EDIT_GET_COORDINATES_FOR_ADDRESS',
  EDIT_GET_COORDINATES_FOR_ADDRESS_SUCCESS = '[CALLS] EDIT_GET_COORDINATES_FOR_ADDRESS_SUCCESS',
  EDIT_GET_COORDINATES_FOR_W3W = '[CALLS] EDIT_GET_COORDINATES_FOR_W3W',
  EDIT_GET_COORDINATES_FOR_W3W_SUCCESS = '[CALLS] EDIT_GET_COORDINATES_FOR_W3W_SUCCESS',
  EDIT_GET_COORDINATES_FOR_PLUS = '[CALLS] EDIT_GET_COORDINATES_FOR_PLUS',
  EDIT_GET_COORDINATES_FOR_PLUS_SUCCESS = '[CALLS] EDIT_GET_COORDINATES_FOR_PLUS_SUCCESS',
  SET_EDIT_CALL_LOCATION = '[CALLS] SET_EDIT_CALL_LOCATION',
}

export class GetCalls implements Action {
  readonly type = CallsActionTypes.GET_CALLS;
  constructor() {}
}

export class GetCallsDone implements Action {
  readonly type = CallsActionTypes.GET_CALLS_DONE;
  constructor(public calls: CallResultData[], public priorities: CallPriorityResultData[]) {}
}

export class GetCallFail implements Action {
  readonly type = CallsActionTypes.GET_CALLS_FAIL;
  constructor() {}
}

export class GetCallById implements Action {
  readonly type = CallsActionTypes.GET_CALL_BYID;
  constructor(public callId: string) {}
}

export class GetCallByIdSuccess implements Action {
  readonly type = CallsActionTypes.GET_CALL_BYID_SUCCESS;
  constructor(public call: CallResultData, public data: CallExtraDataResultData, public priorities: CallPriorityResultData[]) {}
}


export class GetCallByIdFailure implements Action {
  readonly type = CallsActionTypes.GET_CALL_BYID_FAIL;
  constructor(public payload: string) {}
}

export class GetCallByIdDone implements Action {
  readonly type = CallsActionTypes.GET_CALL_BYID_DONE;
  constructor() {}
}

export class ShowCallNotesModal implements Action {
  readonly type = CallsActionTypes.SHOW_CALLNOTES;
  constructor(public callId: string) {}
}

export class OpenCallNotesModal implements Action {
  readonly type = CallsActionTypes.OPEN_CALLNOTES;
  constructor(public payload: CallNoteResultData[]) {}
}

export class SaveCallNote implements Action {
  readonly type = CallsActionTypes.SAVE_CALLNOTE;
  constructor(public callId: string, public callNote: string, public userId: string) {}
}

export class SaveCallNoteSuccess implements Action {
  readonly type = CallsActionTypes.SAVE_CALLNOTE_SUCCESS;
  constructor() {}
}

export class SaveCallNoteFail implements Action {
  readonly type = CallsActionTypes.SAVE_CALLNOTE_FAIL;
  constructor() {}
}

export class SetViewCallModal implements Action {
  readonly type = CallsActionTypes.SET_VIEW_CALL_MODAL;
  constructor() {}
}

export class Done implements Action {
  readonly type = CallsActionTypes.DONE;
  constructor() {}
}

export class ShowCallImagesModal implements Action {
  readonly type = CallsActionTypes.SHOW_CALLIMAGES;
  constructor(public callId: string) {}
}

export class OpenCallImagesModal implements Action {
  readonly type = CallsActionTypes.OPEN_CALLIMAGES;
  constructor(public payload: CallFileResultData[]) {}
}

export class UploadCallImage implements Action {
  readonly type = CallsActionTypes.UPLOAD_CALLIMAGE;
  constructor(public callId: string, public userId: string, public name: string, public image: string) {}
}

export class UploadCallImageSuccess implements Action {
  readonly type = CallsActionTypes.UPLOAD_CALLIMAGE_SUCCESS;
  constructor() {}
}

export class UploadCallImageFail implements Action {
  readonly type = CallsActionTypes.UPLOAD_CALLIMAGE_FAIL;
  constructor() {}
}

export class ShowCallFilesModal implements Action {
  readonly type = CallsActionTypes.SHOW_CALLFILESMODAL;
  constructor(public callId: string) {}
}

export class OpenCallFilesModal implements Action {
  readonly type = CallsActionTypes.OPEN_CALLFILESMODAL;
  constructor(public payload: CallFileResultData[]) {}
}

export class UploadCallFile implements Action {
  readonly type = CallsActionTypes.UPLOAD_CALLFILE;
  constructor(public callId: string, public userId: string, public name: string, public image: string) {}
}

export class UploadCallFileSuccess implements Action {
  readonly type = CallsActionTypes.UPLOAD_CALLFILE_SUCCESS;
  constructor() {}
}

export class UploadCallFileFail implements Action {
  readonly type = CallsActionTypes.UPLOAD_CALLFILE_FAIL;
  constructor() {}
}

export class ShowNewCallModal implements Action {
  readonly type = CallsActionTypes.SHOW_NEW_CALL_MODAL;
  constructor() {}
}

export class ShowSetLocationModal implements Action {
  readonly type = CallsActionTypes.SHOW_SET_LOCATION_MODAL;
  constructor(public forNewCall: boolean, public latitude: number, public longitude: number) {}
}

export class CloseSetLocationModal implements Action {
  readonly type = CallsActionTypes.CLOSE_SET_LOCATION_MODAL;
  constructor() {}
}

export class CloseNewCallModal implements Action {
  readonly type = CallsActionTypes.CLOSE_NEW_CALL_MODAL;
  constructor() {}
}

export class SetNewCallLocation implements Action {
  readonly type = CallsActionTypes.SET_NEW_CALL_LOCATION;
  constructor(public latitude: number, public longitude: number) {}
}

export class DispatchCall implements Action {
  readonly type = CallsActionTypes.DISPATCH_CALL;
  constructor(public name: string, public priority: number, public callType: string,
    public contactName: string, public contactInfo: string, public externalId: string,
    public incidentId: string, public referenceId: string, public nature: string,
    public notes: string, public address: string, public w3w: string,
    public latitude: number, public longitude: number, public dispatchList: string,
    public dispatchOn: string, public callFormData: string) {}
}

export class DispatchCallSuccess implements Action {
  readonly type = CallsActionTypes.DISPATCH_CALL_SUCCESS;
  constructor() {}
}

export class DispatchCallFail implements Action {
  readonly type = CallsActionTypes.DISPATCH_CALL_FAIL;
  constructor() {}
}

export class ShowSelectDispatches implements Action {
  readonly type = CallsActionTypes.SHOW_SELECT_DISPATCHS;
  constructor() {}
}

export class ShowSelectDispatchesSuccess implements Action {
  readonly type = CallsActionTypes.SHOW_SELECT_DISPATCHS_SUCCESS;
  constructor(public dispatches: RecipientsResultData[]) {}
}

export class ShowSelectDispatchesFail implements Action {
  readonly type = CallsActionTypes.SHOW_SELECT_DISPATCHS_FAIL;
  constructor() {}
}

export class CloseSelectDispatchesModal implements Action {
  readonly type = CallsActionTypes.CLOSE_SELECT_DISPATCHS_MODAL;
  constructor() {}
}

export class UpdatedSelectedDispatches implements Action {
  readonly type = CallsActionTypes.UPDATE_SELECTED_DISPTACHES;
  constructor(public id: string, public checked: boolean) {}
}

export class ShowCloseCallModal implements Action {
  readonly type = CallsActionTypes.SHOW_CLOSE_CALL_MODAL;
  constructor(public callId: string) {}
}

export class CloseCloseCallModal implements Action {
  readonly type = CallsActionTypes.CLOSE_CLOSE_CALL_MODAL;
  constructor() {}
}

export class CloseCall implements Action {
  readonly type = CallsActionTypes.CLOSE_CALL;
  constructor(public callId: string, public closeType: number, public closeNote: string) {}
}

export class CloseCallSuccess implements Action {
  readonly type = CallsActionTypes.CLOSE_CALL_SUCCESS;
  constructor() {}
}

export class CloseCallFail implements Action {
  readonly type = CallsActionTypes.CLOSE_CALL_FAIL;
  constructor() {}
}

export class SetEditCallDispatches implements Action {
  readonly type = CallsActionTypes.SET_EDIT_CALL_DISPATCHES;
  constructor(public dispatchEvents: DispatchedEventResultData[]) {}
}

export class ShowEditCallSelectDispatches implements Action {
  readonly type = CallsActionTypes.SHOW_EDIT_CALL_SELECT_DISPATCHS;
  constructor() {}
}

export class ShowEditCallSelectDispatchesSuccess implements Action {
  readonly type = CallsActionTypes.SHOW_EDIT_CALL_SELECT_DISPATCHS_SUCCESS;
  constructor(public dispatches: RecipientsResultData[]) {}
}

export class ShowEditCallSelectDispatchesFail implements Action {
  readonly type = CallsActionTypes.SHOW_EDIT_CALL_SELECT_DISPATCHS_FAIL;
  constructor() {}
}

export class GetEditCallDispatches implements Action {
  readonly type = CallsActionTypes.GET_EDIT_CALL_DISPATCHES;
  constructor() {}
}

export class GetEditCallDispatchesSuccess implements Action {
  readonly type = CallsActionTypes.GET_EDIT_CALL_DISPATCHES_SUCCESS;
  constructor(public dispatches: RecipientsResultData[]) {}
}

export class ShowEditCallModal implements Action {
  readonly type = CallsActionTypes.SHOW_EDIT_CALL_MODAL;
  constructor(public callId: string) {}
}

export class CloseEditCallModal implements Action {
  readonly type = CallsActionTypes.CLOSE_EDIT_CALL_MODAL;
  constructor() {}
}

export class UpdatedEditCallSelectedDispatches implements Action {
  readonly type = CallsActionTypes.UPDATE_EDIT_CALL_SELECTED_DISPTACHES;
  constructor(public id: string, public checked: boolean) {}
}

export class UpdateCall implements Action {
  readonly type = CallsActionTypes.UPDATE_CALL;
  constructor(public callId: string, public name: string, public priority: number, public callType: string,
    public contactName: string, public contactInfo: string, public externalId: string,
    public incidentId: string, public referenceId: string, public nature: string,
    public notes: string, public address: string, public w3w: string,
    public latitude: number, public longitude: number, public dispatchList: string,
    public dispatchOn: string, public callFormData: string, public redispatch: boolean) {}
}

export class UpdateCallSuccess implements Action {
  readonly type = CallsActionTypes.UPDATE_CALL_SUCCESS;
  constructor() {}
}

export class UpdateCallFail implements Action {
  readonly type = CallsActionTypes.UPDATE_CALL_FAIL;
  constructor() {}
}

export class CloseViewCallModal implements Action {
  readonly type = CallsActionTypes.CLOSE_VIEW_CALL_MODAL;
  constructor() {}
}

export class ClearCalls implements Action {
  readonly type = CallsActionTypes.CLEAR_CALLS;
  constructor() {}
}

export class GetCoordinatesForAddress implements Action {
  readonly type = CallsActionTypes.GET_COORDINATESFORADDRESS;
  constructor(public address: string) {}
}

export class GetCoordinatesForAddressSuccess implements Action {
  readonly type = CallsActionTypes.GET_COORDINATESFORADDRESS_SUCCESS;
  constructor(public payload: GeoLocation) {}
}

export class GetCoordinatesForAddressFail implements Action {
  readonly type = CallsActionTypes.GET_COORDINATESFORADDRESS_FAIL;
  constructor(public payload: string) {}
}

export class GetCoordinatesForW3W implements Action {
  readonly type = CallsActionTypes.GET_COORDINATES_FORW3W;
  constructor(public w3w: string) {}
}

export class GetCoordinatesForW3WSuccess implements Action {
  readonly type = CallsActionTypes.GET_COORDINATES_FORW3W_SUCCESS;
  constructor(public payload: GeoLocation) {}
}

export class GetCoordinatesForW3WFail implements Action {
  readonly type = CallsActionTypes.GET_COORDINATES_FORW3W_FAIL;
  constructor(public payload: string) {}
}

export class GetCoordinatesForPlus implements Action {
  readonly type = CallsActionTypes.GET_COORDINATES_FOR_PLUS;
  constructor(public plusCode: string) {}
}

export class GetCoordinatesForPlusSuccess implements Action {
  readonly type = CallsActionTypes.GET_COORDINATES_FOR_PLUS_SUCCESS;
  constructor(public payload: GeoLocation) {}
}

export class GetCoordinatesForPlusFail implements Action {
  readonly type = CallsActionTypes.GET_COORDINATES_FOR_PLUS_FAIL;
  constructor(public payload: string) {}
}

export class EditGetCoordinatesForAddress implements Action {
  readonly type = CallsActionTypes.EDIT_GET_COORDINATES_FOR_ADDRESS;
  constructor(public address: string) {}
}

export class EditGetCoordinatesForAddressSuccess implements Action {
  readonly type = CallsActionTypes.EDIT_GET_COORDINATES_FOR_ADDRESS_SUCCESS;
  constructor(public payload: GeoLocation) {}
}

export class EditGetCoordinatesForW3W implements Action {
  readonly type = CallsActionTypes.EDIT_GET_COORDINATES_FOR_W3W;
  constructor(public w3w: string) {}
}

export class EditGetCoordinatesForW3WSuccess implements Action {
  readonly type = CallsActionTypes.EDIT_GET_COORDINATES_FOR_W3W_SUCCESS;
  constructor(public payload: GeoLocation) {}
}

export class EditGetCoordinatesForPlus implements Action {
  readonly type = CallsActionTypes.EDIT_GET_COORDINATES_FOR_PLUS;
  constructor(public plusCode: string) {}
}

export class EditGetCoordinatesForPlusSuccess implements Action {
  readonly type = CallsActionTypes.EDIT_GET_COORDINATES_FOR_PLUS_SUCCESS;
  constructor(public payload: GeoLocation) {}
}

export class SetEditCallLocation implements Action {
  readonly type = CallsActionTypes.SET_EDIT_CALL_LOCATION;
  constructor(public latitude: number, public longitude: number) {}
}

export type CallActionsUnion =
  | GetCalls
  | GetCallsDone
  | GetCallFail
  | GetCallById
  | GetCallByIdSuccess
  | GetCallByIdFailure
  | GetCallByIdDone
  | ShowCallNotesModal
  | OpenCallNotesModal
  | SaveCallNote
  | SaveCallNoteSuccess
  | SaveCallNoteFail
  | SetViewCallModal
  | ShowCallImagesModal
  | OpenCallImagesModal
  | UploadCallImage
  | UploadCallImageSuccess
  | UploadCallImageFail
  | ShowCallFilesModal
  | OpenCallFilesModal
  | UploadCallFile
  | UploadCallFileSuccess
  | UploadCallFileFail
  | ShowNewCallModal
  | ShowSetLocationModal
  | CloseSetLocationModal
  | SetNewCallLocation
  | ShowSelectDispatches
  | ShowSelectDispatchesSuccess
  | CloseSelectDispatchesModal
  | DispatchCall
  | DispatchCallSuccess
  | DispatchCallFail
  | UpdatedSelectedDispatches
  | ShowSelectDispatchesFail
  | CloseNewCallModal
  | ShowCloseCallModal
  | CloseCloseCallModal
  | CloseCall
  | CloseCallSuccess
  | CloseCallFail
  | SetEditCallDispatches
  | ShowEditCallSelectDispatches
  | ShowEditCallSelectDispatchesSuccess
  | ShowEditCallSelectDispatchesFail
  | GetEditCallDispatches
  | GetEditCallDispatchesSuccess
  | ShowEditCallModal
  | UpdatedEditCallSelectedDispatches
  | CloseEditCallModal
  | UpdateCall
  | UpdateCallSuccess
  | UpdateCallFail
  | CloseViewCallModal
  | ClearCalls
  | GetCoordinatesForAddress
  | GetCoordinatesForAddressSuccess
  | GetCoordinatesForAddressFail
  | GetCoordinatesForW3W
  | GetCoordinatesForW3WSuccess
  | GetCoordinatesForW3WFail
  | GetCoordinatesForPlus
  | GetCoordinatesForPlusSuccess
  | GetCoordinatesForPlusFail
  | EditGetCoordinatesForAddress
  | EditGetCoordinatesForAddressSuccess
  | EditGetCoordinatesForW3W
  | EditGetCoordinatesForW3WSuccess
  | EditGetCoordinatesForPlus
  | EditGetCoordinatesForPlusSuccess
  | SetEditCallLocation
  ;
