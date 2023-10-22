import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { selectNotesState, selectSettingsState } from 'src/app/store';
import { MessageRecipientInput, MessageResultData, NoteCategoryResultData, RecipientsResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { environment } from 'src/environments/environment';
import { SettingsState } from 'src/app/features/settings/store/settings.store';
import { take } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { AlertProvider } from 'src/app/providers/alert';
import { NotesState } from '../../store/notes.store';
import * as NotesActions from '../../actions/notes.actions';

@Component({
	selector: 'app-notes-new-note',
	templateUrl: './new-note.page.html',
	styleUrls: ['./new-note.page.scss'],
})
export class NewNotePage {
	public notesState$: Observable<NotesState | null>;
	private subs = new SubSink();

	public title: string = '';
	public body: string = '';
	public isAdminOnly: boolean = false;
	public doesNoteExpire: boolean = false;
	public expiresOn: string = '';
	public category: NoteCategoryResultData;

	constructor(
		private notesStore: Store<NotesState>,
		private settingsStore: Store<SettingsState>,
		private utilsProvider: UtilsService,
		private alertProvider: AlertProvider
	) {
		this.notesState$ = this.notesStore.select(selectNotesState);
	}

	ionViewDidEnter() {
		this.title = '';
		this.body = '';
	}

	ionViewDidLeave() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	compareWith(o1: NoteCategoryResultData, o2: NoteCategoryResultData) {
		return o1 && o2 ? o1.Category === o2.Category : o1 === o2;
	  }

	public closeModal() {
		this.notesStore.dispatch(new NotesActions.DismissModal());
	}

	public save() {
		let categoryName = null;
		let noteExpiresOn = null;

		if (this.category && this.category.Category) {
			categoryName = this.category.Category;
		}

		if (this.doesNoteExpire && this.expiresOn) {
			noteExpiresOn = this.expiresOn;
		}

		this.notesStore.dispatch(new NotesActions.SaveNote(this.title, this.body, categoryName, this.isAdminOnly, noteExpiresOn));
	}
}
