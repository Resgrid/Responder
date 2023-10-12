import { Action } from '@ngrx/store';
import { UnitInfoResultData } from '@resgrid/ngx-resgridlib';
import { UnitFilterOption } from '../models/unitFilterOption';

export enum UnitsActionTypes {
  GET_UNITS_LIST = '[UNITS] GET_UNITS_LIST',
  GET_UNITS_LIST_SUCCESS = '[UNITS] GET_UNITS_LIST_SUCCESS',
  GET_UNITS_LIST_DONE = '[UNITS] GET_UNITS_LIST_DONE',
  GET_UNITS_LIST_FAIL = '[UNITS] GET_UNITS_LIST_FAIL',
  GET_UNITS_FILTERS = '[UNITS] GET_UNITS_FILTERS',
  GET_UNITS_FILTERS_DONE = '[UNITS] GET_UNITS_FILTERS_DONE',
  GET_UNITS_FILTERS_FAIL = '[UNITS] GET_UNITS_FILTERS_FAIL',
  SHOW_UNITS_FILTER_MODAL = '[UNITS] SHOW_UNITS_FILTER_MODAL',
  SHOW_UNITS_FILTER_MODAL_DONE = '[UNITS] SHOW_UNITS_FILTER_MODAL_DONE',
  GET_SAVED_UNITS_FILTER = '[UNITS] GET_SAVED_UNITS_FILTER',
  GET_SAVED_UNITS_FILTER_DONE = '[UNITS] GET_SAVED_UNITS_FILTER_DONE',
  UPDATE_SAVED_UNITS_FILTER = '[UNITS] UPDATE_SAVED_UNITS_FILTER',
  UPDATE_SAVED_UNITS_FILTER_DONE = '[UNITS] UPDATE_SAVED_UNITS_FILTER_DONE',
  DISMISS_MODAL = '[UNITS] DISMISS_MODAL',
  UPDATE_SELECTED_FILTER_OPTION = '[UNITS] UPDATE_SELECTED_FILTER_OPTION',
  VIEW_UNIT = '[UNITS] VIEW_UNIT',
  VIEW_UNIT_DONE = '[UNITS] VIEW_UNIT_DONE',
  CLEAR_UNITS = '[UNITS] CLEAR_UNITS',
}

export class GetUnitsList implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_LIST;
  constructor(public filter: string) {}
}

export class GetUnitsListSuccess implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_LIST_SUCCESS;
  constructor(public payload: UnitInfoResultData[]) {}
}

export class GetUnitsListDone implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_LIST_DONE;
  constructor() {}
}

export class GetUnitsListFail implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_LIST_FAIL;
  constructor() {}
}

export class GetUnitsFilters implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_FILTERS;
  constructor() {}
}

export class GetUnitsFiltersDone implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_FILTERS_DONE;
  constructor(public payload: UnitInfoResultData[]) {}
}

export class GetUnitsFiltersFail implements Action {
  readonly type = UnitsActionTypes.GET_UNITS_FILTERS_FAIL;
  constructor() {}
}

export class ShowUnitsFilterModal implements Action {
  readonly type = UnitsActionTypes.SHOW_UNITS_FILTER_MODAL;
  constructor() {}
}

export class ShowUnitsFilterModalDone implements Action {
  readonly type = UnitsActionTypes.SHOW_UNITS_FILTER_MODAL_DONE;
  constructor() {}
}


export class UpdateSavedUnitsFilter implements Action {
  readonly type = UnitsActionTypes.UPDATE_SAVED_UNITS_FILTER;
  constructor() {}
}

export class GetSavedUnitsFilter implements Action {
  readonly type = UnitsActionTypes.GET_SAVED_UNITS_FILTER;
  constructor() {}
}

export class GetSavedUnitsFilterDone implements Action {
  readonly type = UnitsActionTypes.GET_SAVED_UNITS_FILTER_DONE;
  constructor(public filter: string) {}
}

export class DismissModal implements Action {
  readonly type = UnitsActionTypes.DISMISS_MODAL;
  constructor() {}
}

export class UpdateSelectedFilterOption implements Action {
  readonly type = UnitsActionTypes.UPDATE_SELECTED_FILTER_OPTION;
  constructor(public id: string, public selected: boolean) {}
}

export class UpdateSavedUnitsFilterDone implements Action {
  readonly type = UnitsActionTypes.UPDATE_SAVED_UNITS_FILTER_DONE;
  constructor(public payload: UnitFilterOption[]) {}
}

export class ViewUnit implements Action {
  readonly type = UnitsActionTypes.VIEW_UNIT;
  constructor(public unit: UnitInfoResultData) {}
}

export class ViewUnitDone implements Action {
  readonly type = UnitsActionTypes.VIEW_UNIT_DONE;
  constructor() {}
}

export class ClearUnits implements Action {
  readonly type = UnitsActionTypes.CLEAR_UNITS;
  constructor() {}
}

export type UnitsActionsUnion =
  | GetUnitsList
  | GetUnitsListDone
  | GetUnitsListFail
  | GetUnitsFilters
  | GetUnitsFiltersDone
  | GetUnitsFiltersFail
  | ShowUnitsFilterModal
  | ShowUnitsFilterModalDone
  | UpdateSavedUnitsFilter
  | UpdateSavedUnitsFilterDone
  | GetSavedUnitsFilter
  | GetSavedUnitsFilterDone
  | DismissModal
  | UpdateSelectedFilterOption
  | ViewUnit
  | ViewUnitDone
  | GetUnitsListSuccess
  | ClearUnits
  ;
