import { Action } from '@ngrx/store';
import { CallProtocolsResultData, MapDataAndMarkersData, NoteCategoryResultData, NoteResultData } from '@resgrid/ngx-resgridlib';

export enum NotesActionTypes {
  LOAD_NOTES = '[NOTES] LOAD_NOTES',
  LOAD_NOTES_SUCCESS = '[NOTES] LOAD_NOTES_SUCCESS',
  LOAD_NOTES_FAIL = '[NOTES] LOAD_NOTES_FAIL',
  LOAD_NOTES_DONE = '[NOTES] LOAD_NOTES_DONE',
  VIEW_NOTE = '[NOTES] VIEW_NOTE',
  VIEW_NOTE_DONE = '[NOTES] VIEW_NOTE_DONE',
  DISMISS_MODAL = '[NOTES] DISMISS_MODAL',
  SAVE_NOTE = '[NOTES] SAVE_NOTE',
  SAVE_NOTE_SUCCESS = '[NOTES] SAVE_NOTE_SUCCESS',
  SAVE_NOTE_FAIL = '[NOTES] SAVE_NOTE_FAIL',
  SAVE_NOTE_DONE = '[NOTES] SAVE_NOTE_DONE',
  SHOW_NEW_NOTE_MODAL = '[NOTES] SHOW_NEW_NOTE_MODAL',
  SHOW_NEW_NOTE_MODAL_SUCCESS = '[NOTES] SHOW_NEW_NOTE_MODAL_SUCCESS',
  SHOW_NEW_NOTE_MODAL_DONE = '[NOTES] SHOW_NEW_NOTE_MODAL_DONE',
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

export class SaveNote implements Action {
  readonly type = NotesActionTypes.SAVE_NOTE;
  constructor(public title: string, public body: string, public category: string, public isAdminOnly: boolean, public expiresOn: string) {}
}

export class SaveNoteSuccess implements Action {
  readonly type = NotesActionTypes.SAVE_NOTE_SUCCESS;
  constructor(public payload: NoteResultData[]) {}
}

export class SaveNoteFail implements Action {
  readonly type = NotesActionTypes.SAVE_NOTE_FAIL;
  constructor() {}
}

export class SaveNoteDone implements Action {
  readonly type = NotesActionTypes.SAVE_NOTE_DONE;
  constructor() {}
}

export class ShowNewNoteModal implements Action {
  readonly type = NotesActionTypes.SHOW_NEW_NOTE_MODAL;
  constructor() {}
}

export class ShowNewNoteModalSuccess implements Action {
  readonly type = NotesActionTypes.SHOW_NEW_NOTE_MODAL_SUCCESS;
  constructor(public categories: NoteCategoryResultData[]) {}
}

export class ShowNewNoteModalDone implements Action {
  readonly type = NotesActionTypes.SHOW_NEW_NOTE_MODAL_DONE;
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
  | SaveNote
  | SaveNoteSuccess
  | SaveNoteFail
  | ShowNewNoteModal
  | ShowNewNoteModalSuccess
  | ShowNewNoteModalDone
  | SaveNoteDone
  | DismissModal
  ;
