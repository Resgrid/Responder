import { Store } from '@ngrx/store';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import * as notesAction from '../actions/notes.actions';
import { CallProtocolsService, MappingService, NotesService, PersonnelService, UnitsService } from '@resgrid/ngx-resgridlib';
import {
	catchError,
	exhaustMap, map, mergeMap, switchMap, tap,
} from 'rxjs/operators';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { NotesState } from '../store/notes.store';
import { of } from 'rxjs';
import { ViewNotePage } from '../pages/view-note/view-notepage';
import { LoadingProvider } from 'src/app/providers/loading';

@Injectable()
export class NotesEffects {
	private _modalRef: HTMLIonModalElement;

	getNotesList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<notesAction.LoadNotes>(
				notesAction.NotesActionTypes.LOAD_NOTES
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.notesProvider.getAllNotes().pipe(
					map((data) => ({
						type: notesAction.NotesActionTypes.LOAD_NOTES_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: notesAction.NotesActionTypes.LOAD_NOTES_FAIL,
						})
					)
				)
			)
		)
	);

	getNotesListSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType(notesAction.NotesActionTypes.LOAD_NOTES_SUCCESS),
			switchMap(() => this.loadingProvider.hide()),
			map((data) => ({
				type: notesAction.NotesActionTypes.LOAD_NOTES_DONE,
			}))
		)
	);

	viewPerson$ = createEffect(() =>
		this.actions$.pipe(
			ofType<notesAction.ViewNote>(
				notesAction.NotesActionTypes.VIEW_NOTE
			),
			switchMap(() =>
				this.runModal(ViewNotePage, 'modal-container-full', null)
			),
			map((action) => ({
				type: notesAction.NotesActionTypes.VIEW_NOTE_DONE,
			}))
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(notesAction.NotesActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal())
			),
		{ dispatch: false }
	);
	
	constructor(
		private actions$: Actions,
		private store: Store<NotesState>,
		private notesProvider: NotesService,
		private toastController: ToastController,
		private menuCtrl: MenuController,
		private modalController: ModalController,
		private storageProvider: StorageProvider,
		private loadingProvider: LoadingProvider
	) {}

	showToast = async (message) => {
		const toast = await this.toastController.create({
			message: message,
			duration: 3000,
		});
		toast.present();
	};

	runModal = async (component, cssClass, properties) => {
		await this.closeModal();
		await this.menuCtrl.close();

		if (!cssClass) {
			cssClass = 'modal-container';
		}

		this._modalRef = await this.modalController.create({
			component: component,
			cssClass: cssClass,
			componentProps: {
				info: properties,
			},
		});

		return this._modalRef.present();
	};

	closeModal = async () => {
		if (this._modalRef) {
			await this.modalController.dismiss();
			this._modalRef = null;
		}
	};
}
