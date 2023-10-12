import { Action } from '@ngrx/store';
import { CalendarItemResultData, CallProtocolsResultData } from '@resgrid/ngx-resgridlib';

export enum CalendarActionTypes {
  LOAD_CALENDAR_ITEMS = '[CALENDAR] LOAD_CALENDAR_ITEMS',
  LOAD_CALENDAR_ITEMS_SUCCESS = '[CALENDAR] LOAD_CALENDAR_ITEMS_SUCCESS',
  LOAD_CALENDAR_ITEMS_FAIL = '[CALENDAR] LOAD_CALENDAR_ITEMS_FAIL',
  LOAD_CALENDAR_ITEMS_DONE = '[CALENDAR] LOAD_CALENDAR_ITEMS_DONE',
  DISMISS_MODAL = '[CALENDAR] DISMISS_MODAL',
  LOAD_TODAY_CALENDAR_ITEMS = '[CALENDAR] LOAD_TODAY_CALENDAR_ITEMS',
  LOAD_TODAY_CALENDAR_ITEMS_SUCCESS = '[CALENDAR] LOAD_TODAY_CALENDAR_ITEMS_SUCCESS',
  LOAD_TODAY_CALENDAR_ITEMS_FAIL = '[CALENDAR] LOAD_TODAY_CALENDAR_ITEMS_FAIL',
  LOAD_UPCOMING_CALENDAR_ITEMS = '[CALENDAR] LOAD_UPCOMING_CALENDAR_ITEMS',
  LOAD_UPCOMING_CALENDAR_ITEMS_SUCCESS = '[CALENDAR] LOAD_UPCOMING_CALENDAR_ITEMS_SUCCESS',
  LOAD_UPCOMING_CALENDAR_ITEMS_FAIL = '[CALENDAR] LOAD_UPCOMING_CALENDAR_ITEMS_FAIL',
  VIEW_CALENDAR_ITEM = '[CALENDAR] VIEW_CALENDAR_ITEM',
  VIEW_CALENDAR_ITEM_DONE = '[CALENDAR] VIEW_CALENDAR_ITEM_DONE',
  SET_CALENDAR_ITEM_ATTENDING_STATUS = '[CALENDAR] SET_CALENDAR_ITEM_ATTENDING_STATUS',
  SET_CALENDAR_ITEM_ATTENDING_STATUS_SUCCESS = '[CALENDAR] SET_CALENDAR_ITEM_ATTENDING_STATUS_SUCCESS',
  SET_CALENDAR_ITEM_ATTENDING_STATUS_FAIL = '[CALENDAR] SET_CALENDAR_ITEM_ATTENDING_STATUS_FAIL',
  DONE = '[CALENDAR] DONE',
}

export class LoadCalendarItems implements Action {
  readonly type = CalendarActionTypes.LOAD_CALENDAR_ITEMS;
  constructor() {}
}

export class LoadCalendarItemsSuccess implements Action {
  readonly type = CalendarActionTypes.LOAD_CALENDAR_ITEMS_SUCCESS;
  constructor(public payload: CalendarItemResultData[]) {}
}

export class LoadCalendarItemsFail implements Action {
  readonly type = CalendarActionTypes.LOAD_CALENDAR_ITEMS_FAIL;
  constructor() {}
}

export class LoadCalendarItemsDone implements Action {
  readonly type = CalendarActionTypes.LOAD_CALENDAR_ITEMS_DONE;
  constructor() {}
}

export class DismissModal implements Action {
  readonly type = CalendarActionTypes.DISMISS_MODAL;
  constructor() {}
}

export class LoadTodaysCalendarItems implements Action {
  readonly type = CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS;
  constructor() {}
}

export class LoadTodaysCalendarItemsSuccess implements Action {
  readonly type = CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS_SUCCESS;
  constructor(public payload: CalendarItemResultData[]) {}
}

export class LoadTodaysCalendarItemsFail implements Action {
  readonly type = CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS_FAIL;
  constructor() {}
}

export class LoadUpcomingCalendarItems implements Action {
  readonly type = CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS;
  constructor() {}
}

export class LoadUpcomingCalendarItemsSuccess implements Action {
  readonly type = CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS_SUCCESS;
  constructor(public payload: CalendarItemResultData[]) {}
}

export class LoadUpcomingCalendarItemsFail implements Action {
  readonly type = CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS_FAIL;
  constructor() {}
}

export class ViewCalendarItem implements Action {
  readonly type = CalendarActionTypes.VIEW_CALENDAR_ITEM;
  constructor(public payload: CalendarItemResultData) {}
}

export class ViewCalendarItemDone implements Action {
  readonly type = CalendarActionTypes.VIEW_CALENDAR_ITEM_DONE;
  constructor() {}
}

export class SetCalendarItemAttendingStatus implements Action {
  readonly type = CalendarActionTypes.SET_CALENDAR_ITEM_ATTENDING_STATUS;
  constructor(public calendarItemId: string, public note: string, public status: number) {}
}

export class SetCalendarItemAttendingStatusSuccess implements Action {
  readonly type = CalendarActionTypes.SET_CALENDAR_ITEM_ATTENDING_STATUS_SUCCESS;
  constructor() {}
}

export class SetCalendarItemAttendingStatusFail implements Action {
  readonly type = CalendarActionTypes.SET_CALENDAR_ITEM_ATTENDING_STATUS_FAIL;
  constructor() {}
}

export class Done implements Action {
  readonly type = CalendarActionTypes.DONE;
  constructor() {}
}


export type CalendarActionsUnion =
  | LoadCalendarItems
  | LoadCalendarItemsSuccess
  | LoadCalendarItemsFail
  | LoadCalendarItemsDone
  | LoadTodaysCalendarItems
  | LoadTodaysCalendarItemsSuccess
  | LoadTodaysCalendarItemsFail
  | LoadUpcomingCalendarItems
  | LoadUpcomingCalendarItemsSuccess
  | LoadUpcomingCalendarItemsFail
  | ViewCalendarItem
  | DismissModal
  | ViewCalendarItemDone
  | SetCalendarItemAttendingStatus
  | SetCalendarItemAttendingStatusSuccess
  | SetCalendarItemAttendingStatusFail
  | Done
  ;
