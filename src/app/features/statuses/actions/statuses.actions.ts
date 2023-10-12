import { Action } from '@ngrx/store';
import {
  CallResultData,
  GroupResultData,
  StatusesResultData,
} from '@resgrid/ngx-resgridlib';
import { SetPersonStaffingPayload } from '../models/setPersonStaffingPayload';
import { SetPersonStatusPayload } from '../models/setPersonStatusPayload';
import { StatusDestination } from '../models/statusDestination';

export enum StatusesActionTypes {
  SUBMIT_PERSON_STATUS_START = '[STATUSES] SUBMIT_PERSON_STATUS_START',
  SUBMIT_PERSON_STATUS_SET = '[STATUSES] SUBMIT_PERSON_STATUS_SET',
  SUBMIT_PERSON_STATUS_NOTE = '[STATUSES] SUBMIT_PERSON_STATUS_NOTE',
  SUBMIT_PERSON_STATUS_DESTINATION = '[STATUSES] SUBMIT_PERSON_STATUS_DESTINATION',
  SUBMIT_PERSON_STATUS_DESTINATION_MODAL = '[STATUSES] SUBMIT_PERSON_STATUS_DESTINATION_MODAL',
  SUBMIT_PERSON_STATUS_DESTINATION_SET = '[STATUSES] SUBMIT_PERSON_STATUS_DESTINATION_SET',
  SUBMIT_PERSON_STATUS_NOTE_SET = '[STATUSES] SUBMIT_PERSON_STATUS_NOTE_SET',
  SUBMIT_PERSON_STATUS_NOTE_MODAL = '[STATUSES] SUBMIT_PERSON_STATUS_NOTE_MODAL',
  SUBMIT_PERSON_STATUS_SET_DONE = '[STATUSES] SUBMIT_PERSON_STATUS_SET_DONE',
  SUBMIT_PERSON_STATUS_SET_ERROR = '[STATUSES] SUBMIT_PERSON_STATUS_SET_ERROR',
  SUBMIT_PERSON_STATUS_SET_FINISH = '[STATUSES] SUBMIT_PERSON_STATUS_SET_FINISH',

  SUBMIT_PERSON_STAFFING_START = '[STATUSES] SUBMIT_PERSON_STAFFING_START',
  SUBMIT_PERSON_STAFFING_SET = '[STATUSES] SUBMIT_PERSON_STAFFING_SET',
  SUBMIT_PERSON_STAFFING_NOTE = '[STATUSES] SUBMIT_PERSON_STAFFING_NOTE',
  SUBMIT_PERSON_STAFFING_NOTE_SET = '[STATUSES] SUBMIT_PERSON_STAFFING_NOTE_SET',
  SUBMIT_PERSON_STAFFING_NOTE_MODAL = '[STATUSES] SUBMIT_PERSON_STAFFING_NOTE_MODAL',
  SUBMIT_PERSON_STAFFING_SET_DONE = '[STATUSES] SUBMIT_PERSON_STAFFING_SET_DONE',
  SUBMIT_PERSON_STAFFING_SET_ERROR = '[STATUSES] SUBMIT_PERSON_STAFFING_SET_ERROR',
  SUBMIT_PERSON_STAFFING_SET_FINISH = '[STATUSES] SUBMIT_PERSON_STAFFING_SET_FINISH',
}

export class SubmitPersonStatus implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_START;
  constructor(public userId: string, public status: StatusesResultData, public groups: GroupResultData[], public calls: CallResultData[]) {}
}

export class SubmitPersonStatusSet implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_SET;
  constructor(public payload: SetPersonStatusPayload) {}
}

export class SubmitPersonStatusNote implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE;
  constructor(public payload: SetPersonStatusPayload, public status: StatusesResultData) {}
}

export class SubmitPersonStatusNoteModal implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE_MODAL;
  constructor(public payload: SetPersonStatusPayload, public status: StatusesResultData) {}
}

export class SubmitPersonStatusDesination implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION;
  constructor(public payload: SetPersonStatusPayload, public status: StatusesResultData, public destinations: StatusDestination[]) {}
}

export class SubmitPersonStatusDesinationModal implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION_MODAL;
  constructor(public payload: SetPersonStatusPayload) {}
}

export class SubmitPersonStatusDesinationSet implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION_SET;
  constructor(public payload: SetPersonStatusPayload, public status: StatusesResultData, public destination: StatusDestination) {}
}

export class SubmitPersonStatusNoteSet implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE_SET;
  constructor(public payload: SetPersonStatusPayload, public note: string) {}
}

export class SubmitPersonStatusSetDone implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_SET_DONE;
  constructor() {}
}

export class SubmitPersonStatusSetError implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_SET_ERROR;
  constructor(public payload: string) {}
}

export class SubmitPersonStatusSetFinish implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STATUS_SET_FINISH;
  constructor() {}
}




export class SubmitPersonStaffing implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_START;
  constructor(public userId: string, public status: StatusesResultData) {}
}

export class SubmitPersonStaffingSet implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET;
  constructor(public payload: SetPersonStaffingPayload) {}
}

export class SubmitPersonStaffingNote implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE;
  constructor(public payload: SetPersonStaffingPayload, public status: StatusesResultData) {}
}

export class SubmitPersonStaffingNoteModal implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE_MODAL;
  constructor(public payload: SetPersonStaffingPayload, public status: StatusesResultData) {}
}

export class SubmitPersonStaffingNoteSet implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE_SET;
  constructor(public payload: SetPersonStaffingPayload, public note: string) {}
}

export class SubmitPersonStaffingSetDone implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET_DONE;
  constructor() {}
}

export class SubmitPersonStaffingSetError implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET_ERROR;
  constructor(public payload: string) {}
}

export class SubmitPersonStaffingSetFinish implements Action {
  readonly type = StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET_FINISH;
  constructor() {}
}

export type StatusesActionsUnion =
  | SubmitPersonStatus
  | SubmitPersonStatusSet
  | SubmitPersonStatusNote
  | SubmitPersonStatusDesination
  | SubmitPersonStatusDesinationModal
  | SubmitPersonStatusDesinationSet
  | SubmitPersonStatusNoteSet
  | SubmitPersonStatusNoteModal
  | SubmitPersonStatusSetDone
  | SubmitPersonStatusSetError
  | SubmitPersonStatusSetFinish
  | SubmitPersonStaffing
  | SubmitPersonStaffingSet
  | SubmitPersonStaffingNote
  | SubmitPersonStaffingNoteModal
  | SubmitPersonStaffingNoteSet
  | SubmitPersonStaffingSetDone
  | SubmitPersonStaffingSetError
  | SubmitPersonStaffingSetFinish;
