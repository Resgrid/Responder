import { ChangeDetectorRef, Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectNotesState } from 'src/app/store';
import { NotesState } from '../../store/notes.store';
import * as NotesActions from '../../actions/notes.actions';
import { NoteResultData } from '@resgrid/ngx-resgridlib';

@Component({
	selector: 'app-notes-list',
	templateUrl: './notes-list.page.html',
	styleUrls: ['./notes-list.page.scss'],
})
export class NotesListPage {
	private searchTerm: string = '';
	public notesState$: Observable<NotesState | null>;

	constructor(private notesStore: Store<NotesState>, private cdr: ChangeDetectorRef) {
		this.notesState$ = this.notesStore.select(selectNotesState);
	}

	ionViewDidEnter() {
		this.load();
	}

	ionViewDidLeave() {}

	public viewNote(note: NoteResultData) {
		if (note) {
			this.notesStore.dispatch(new NotesActions.ViewNote(note));
		}
	}

	public refresh(event) {
		this.load();

		setTimeout(() => {
			event.target.complete();
		}, 1000);
	}

	public hideSearch() {
		this.searchTerm = '';
	}

	public search(event) {
		this.searchTerm = event.target.value;
		this.cdr.detectChanges();
	}

	public filterNotes(notes: NoteResultData[]) {
		if (this.searchTerm) {
		  if (notes) {
			let filteredNotes = new Array<NoteResultData>();
	
			notes.forEach(note => {
			  if (note.Title && note.Title.toLowerCase().includes(this.searchTerm.toLowerCase())) {
				filteredNotes.push(note);
			  } else if (note.Body && note.Body.toLowerCase().includes(this.searchTerm.toLowerCase())) {
				filteredNotes.push(note);
			  } else if (note.Category && note.Category.toLowerCase().includes(this.searchTerm.toLowerCase())) {
				filteredNotes.push(note);
			  } 
			});
	
			return filteredNotes;
		  }
		} else {
		  return notes;
		}
	  }

	private load() {
		this.notesStore.dispatch(new NotesActions.LoadNotes());
	}
}
