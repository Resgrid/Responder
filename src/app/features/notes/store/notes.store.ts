import { NoteResultData } from "@resgrid/ngx-resgridlib";

export interface NotesState {
    notes: NoteResultData[];
    viewNote: NoteResultData;
}

export const initialState: NotesState = {
    notes: null,
    viewNote: null
};