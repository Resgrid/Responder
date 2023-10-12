import { Action } from '@ngrx/store';
import { CallProtocolsResultData, MapDataAndMarkersData, NoteResultData } from '@resgrid/ngx-resgridlib';

export enum NotesActionTypes {
  LOAD_NOTES = '[NOTES] LOAD_NOTES',
  LOAD_NOTES_SUCCESS = '[NOTES] LOAD_NOTES_SUCCESS',
  LOAD_NOTES_FAIL = '[NOTES] LOAD_NOTES_FAIL',
  LOAD_NOTES_DONE = '[NOTES] LOAD_NOTES_DONE',
  VIEW_NOTE = '[NOTES] VIEW_NOTE',
  VIEW_NOTE_DONE = '[NOTES] VIEW_NOTE_DONE',
  DISMISS_MODAL = '[NOTES] DISMISS_MODAL',
}

export class LoadNotes implements Action {
  readonly type = NotesActionTypes.LOAD_NOTES;
  constructor() {}
}

export class LoadNotesSuccess implements Action {
  readonly type = NotesActionTypes.LOAD_NOTES_SUCCESS;
  constructor(public payload: NoteResultData[]) {}
}

export class LoadNotesFail implements Action {
  readonly type = NotesActionTypes.LOAD_NOTES_FAIL;
  constructor() {}
}

export class LoadNotesDone implements Action {
  readonly type = NotesActionTypes.LOAD_NOTES_DONE;
  constructor() {}
}

export class ViewNote implements Action {
  readonly type = NotesActionTypes.VIEW_NOTE;
  constructor(public note: NoteResultData) {}
}

export class ViewNoteDone implements Action {
  readonly type = NotesActionTypes.VIEW_NOTE_DONE;
  constructor() {}
}

export class DismissModal implements Action {
  readonly type = NotesActionTypes.DISMISS_MODAL;
  constructor() {}
}

export type NotesActionsUnion =
  | LoadNotes
  | LoadNotesSuccess
  | LoadNotesFail
  | LoadNotesDone
  | ViewNote
  | ViewNoteDone
  | DismissModal
  ;
