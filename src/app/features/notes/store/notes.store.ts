import { NoteCategoryResultData, NoteResultData } from "@resgrid/ngx-resgridlib";

export interface NotesState {
    notes: NoteResultData[];
    viewNote: NoteResultData;
    noteCategories: NoteCategoryResultData[];
}

export const initialState: NotesState = {
    notes: null,
    viewNote: null,
    noteCategories: null
};