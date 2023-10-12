import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectNotesState } from 'src/app/store';
import { NotesState } from '../../store/notes.store';
import * as NotesActions from "../../actions/notes.actions";

@Component({
	selector: 'app-notes-view-note',
	templateUrl: './view-note.page.html',
	styleUrls: ['./view-note.page.scss'],
})
export class ViewNotePage {
	public tabType: string = 'text';
	public notesState$: Observable<NotesState | null>;

	constructor(private notesStore: Store<NotesState>) {
		this.notesState$ = this.notesStore.select(selectNotesState);
	}

	ionViewDidEnter() {
		
	}

	ionViewDidLeave() {
		
	}

	public closeModal() {
		this.notesStore.dispatch(
		  new NotesActions.DismissModal()
		);
	  }
}
