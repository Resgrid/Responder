import { Action } from '@ngrx/store';
import { FilterResultData, PersonnelInfoResultData } from '@resgrid/ngx-resgridlib';
import { PersonnelFilterOption } from '../models/personnelFilterOption';

export enum PersonnelActionTypes {
  GET_PERSONNEL_LIST = '[PERSONNEL] GET_PERSONNEL_LIST',
  GET_PERSONNEL_LIST_SUCCESS = '[PERSONNEL] GET_PERSONNEL_LIST_SUCCESS',
  GET_PERSONNEL_LIST_DONE = '[PERSONNEL] GET_PERSONNEL_LIST_DONE',
  GET_PERSONNEL_LIST_FAIL = '[PERSONNEL] GET_PERSONNEL_LIST_FAIL',
  GET_PERSONNEL_FILTERS = '[PERSONNEL] GET_PERSONNEL_FILTERS',
  GET_PERSONNEL_FILTERS_DONE = '[PERSONNEL] GET_PERSONNEL_FILTERS_DONE',
  GET_PERSONNEL_FILTERS_FAIL = '[PERSONNEL] GET_PERSONNEL_FILTERS_FAIL',
  SHOW_PERSONNEL_FILTER_MODAL = '[PERSONNEL] SHOW_PERSONNEL_FILTER_MODAL',
  SHOW_PERSONNEL_FILTER_MODAL_DONE = '[PERSONNEL] SHOW_PERSONNEL_FILTER_MODAL_DONE',
  GET_SAVED_PERSONNEL_FILTER = '[PERSONNEL] GET_SAVED_PERSONNEL_FILTER',
  GET_SAVED_PERSONNEL_FILTER_DONE = '[PERSONNEL] GET_SAVED_PERSONNEL_FILTER_DONE',
  UPDATE_SAVED_PERSONNEL_FILTER = '[PERSONNEL] UPDATE_SAVED_PERSONNEL_FILTER',
  UPDATE_SAVED_PERSONNEL_FILTER_DONE = '[PERSONNEL] UPDATE_SAVED_PERSONNEL_FILTER_DONE',
  DISMISS_MODAL = '[PERSONNEL] DISMISS_MODAL',
  UPDATE_SELECTED_FILTER_OPTION = '[PERSONNEL] UPDATE_SELECTED_FILTER_OPTION',
  VIEW_PERSON = '[PERSONNEL] VIEW_PERSON',
  VIEW_PERSON_DONE = '[PERSONNEL] VIEW_PERSON_DONE',
  CLEAR_PERSONNEL = '[PERSONNEL] CLEAR_PERSONNEL',
}

export class GetPersonnelList implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_LIST;
  constructor(public filter: string) {}
}

export class GetPersonnelListSuccess implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_LIST_SUCCESS;
  constructor(public payload: PersonnelInfoResultData[]) {}
}

export class GetPersonnelListDone implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_LIST_DONE;
  constructor() {}
}

export class GetPersonnelFail implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_LIST_FAIL;
  constructor() {}
}

export class GetPersonnelFilters implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_FILTERS;
  constructor() {}
}

export class GetPersonnelFiltersDone implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_FILTERS_DONE;
  constructor(public payload: PersonnelFilterOption[]) {}
}

export class GetPersonnelFiltersFail implements Action {
  readonly type = PersonnelActionTypes.GET_PERSONNEL_FILTERS_FAIL;
  constructor() {}
}

export class ShowPersonnelFilterModal implements Action {
  readonly type = PersonnelActionTypes.SHOW_PERSONNEL_FILTER_MODAL;
  constructor() {}
}

export class ShowPersonnelFilterModalDone implements Action {
  readonly type = PersonnelActionTypes.SHOW_PERSONNEL_FILTER_MODAL_DONE;
  constructor() {}
}


export class UpdateSavedPersonnelFilter implements Action {
  readonly type = PersonnelActionTypes.UPDATE_SAVED_PERSONNEL_FILTER;
  constructor() {}
}

export class GetSavedPersonnelFilter implements Action {
  readonly type = PersonnelActionTypes.GET_SAVED_PERSONNEL_FILTER;
  constructor() {}
}

export class GetSavedPersonnelFilterDone implements Action {
  readonly type = PersonnelActionTypes.GET_SAVED_PERSONNEL_FILTER_DONE;
  constructor(public filter: string) {}
}

export class DismissModal implements Action {
  readonly type = PersonnelActionTypes.DISMISS_MODAL;
  constructor() {}
}

export class UpdateSelectedFilterOption implements Action {
  readonly type = PersonnelActionTypes.UPDATE_SELECTED_FILTER_OPTION;
  constructor(public id: string, public selected: boolean) {}
}

export class UpdateSavedPersonnelFilterDone implements Action {
  readonly type = PersonnelActionTypes.UPDATE_SAVED_PERSONNEL_FILTER_DONE;
  constructor(public payload: PersonnelFilterOption[]) {}
}

export class ViewPerson implements Action {
  readonly type = PersonnelActionTypes.VIEW_PERSON;
  constructor(public person: PersonnelInfoResultData) {}
}

export class ViewPersonDone implements Action {
  readonly type = PersonnelActionTypes.VIEW_PERSON_DONE;
  constructor() {}
}

export class ClearPersonnel implements Action {
  readonly type = PersonnelActionTypes.CLEAR_PERSONNEL;
  constructor() {}
}

export type PersonnelActionsUnion =
  | GetPersonnelList
  | GetPersonnelListDone
  | GetPersonnelFail
  | GetPersonnelFilters
  | GetPersonnelFiltersDone
  | GetPersonnelFiltersFail
  | ShowPersonnelFilterModal
  | ShowPersonnelFilterModalDone
  | UpdateSavedPersonnelFilter
  | UpdateSavedPersonnelFilterDone
  | GetSavedPersonnelFilter
  | GetSavedPersonnelFilterDone
  | DismissModal
  | UpdateSelectedFilterOption
  | ViewPerson
  | ViewPersonDone
  | GetPersonnelListSuccess
  | ClearPersonnel
  ;
