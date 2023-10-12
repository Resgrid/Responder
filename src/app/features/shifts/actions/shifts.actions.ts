import { Action } from '@ngrx/store';
import { ShiftDaysResultData, ShiftResultData } from '@resgrid/ngx-resgridlib';

export enum ShiftsActionTypes {
  LOAD_TODAY_SHIFTS = '[SHIFTS] LOAD_TODAY_SHIFTS',
  LOAD_TODAY_SHIFTS_SUCCESS = '[SHIFTS] LOAD_TODAY_SHIFTS_SUCCESS',
  LOAD_TODAY_SHIFTS_FAIL = '[SHIFTS] LOAD_TODAY_SHIFTS_FAIL',
  LOAD_SHIFTS = '[SHIFTS] LOAD_SHIFTS',
  LOAD_SHIFTS_SUCCESS = '[SHIFTS] LOAD_SHIFTS_SUCCESS',
  LOAD_SHIFTS_FAIL = '[SHIFTS] LOAD_SHIFTS_FAIL',
  VIEW_SHIFT = '[SHIFTS] VIEW_SHIFT',
  VIEW_SHIFT_SUCCESS = '[SHIFTS] VIEW_SHIFT_SUCCESS',
  VIEW_SHIFT_FAIL = '[SHIFTS] VIEW_SHIFT_FAIL',
  LOAD_SHIFT = '[SHIFTS] LOAD_SHIFT',
  LOAD_SHIFT_SUCCESS = '[SHIFTS] LOAD_SHIFT_SUCCESS',
  LOAD_SHIFT_FAIL = '[SHIFTS] LOAD_SHIFT_FAIL',
  DISMISS_MODAL = '[SHIFTS] DISMISS_MODAL',
  VIEW_SHIFT_DAY = '[SHIFTS] VIEW_SHIFT_DAY',
  VIEW_SHIFT_DAY_SUCCESS = '[SHIFTS] VIEW_SHIFT_DAY_SUCCESS',
  VIEW_SHIFT_DAY_FAIL = '[SHIFTS] VIEW_SHIFT_DAY_FAIL',
}

export class LoadTodaysShifts implements Action {
  readonly type = ShiftsActionTypes.LOAD_TODAY_SHIFTS;
  constructor() {}
}

export class LoadTodaysShiftsSuccess implements Action {
  readonly type = ShiftsActionTypes.LOAD_TODAY_SHIFTS_SUCCESS;
  constructor(public payload: ShiftDaysResultData[]) {}
}

export class LoadTodaysShiftsFail implements Action {
  readonly type = ShiftsActionTypes.LOAD_TODAY_SHIFTS_FAIL;
  constructor() {}
}

export class LoadShifts implements Action {
  readonly type = ShiftsActionTypes.LOAD_SHIFTS;
  constructor() {}
}

export class LoadShiftsSuccess implements Action {
  readonly type = ShiftsActionTypes.LOAD_SHIFTS_SUCCESS;
  constructor(public payload: ShiftResultData[]) {}
}

export class LoadShiftsFail implements Action {
  readonly type = ShiftsActionTypes.LOAD_SHIFTS_FAIL;
  constructor() {}
}

export class ViewShift implements Action {
  readonly type = ShiftsActionTypes.VIEW_SHIFT;
  constructor(public shift: ShiftResultData) {}
}

export class ViewShiftSuccess implements Action {
  readonly type = ShiftsActionTypes.VIEW_SHIFT_SUCCESS;
  constructor() {}
}

export class ViewShiftFail implements Action {
  readonly type = ShiftsActionTypes.VIEW_SHIFT_FAIL;
  constructor() {}
}

export class LoadShift implements Action {
  readonly type = ShiftsActionTypes.LOAD_SHIFT;
  constructor(public shiftId: string) {}
}

export class LoadShiftSuccess implements Action {
  readonly type = ShiftsActionTypes.LOAD_SHIFT_SUCCESS;
  constructor(public shift: ShiftResultData) {}
}

export class LoadShiftFail implements Action {
  readonly type = ShiftsActionTypes.LOAD_SHIFT_FAIL;
  constructor() {}
}

export class DismissModal implements Action {
  readonly type = ShiftsActionTypes.DISMISS_MODAL;
  constructor() {}
}

export class ViewShiftDay implements Action {
  readonly type = ShiftsActionTypes.VIEW_SHIFT_DAY;
  constructor(public shiftDay: ShiftDaysResultData) {}
}

export class ViewShiftDaySuccess implements Action {
  readonly type = ShiftsActionTypes.VIEW_SHIFT_DAY_SUCCESS;
  constructor() {}
}

export class ViewShiftDayFail implements Action {
  readonly type = ShiftsActionTypes.VIEW_SHIFT_DAY_FAIL;
  constructor() {}
}

export type ShiftsActionsUnion =
  LoadTodaysShifts
  | LoadTodaysShiftsSuccess
  | LoadTodaysShiftsFail
  | LoadShifts
  | LoadShiftsSuccess
  | LoadShiftsFail
  | ViewShift
  | ViewShiftSuccess
  | ViewShiftFail
  | DismissModal
  | LoadShift
  | LoadShiftSuccess
  | LoadShiftFail
  | ViewShiftDay
  | ViewShiftDaySuccess
  | ViewShiftDayFail
  ;
