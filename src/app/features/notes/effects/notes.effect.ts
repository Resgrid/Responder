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
import { from, of } from 'rxjs';
import { ViewNotePage } from '../pages/view-note/view-notepage';
import { LoadingProvider } from 'src/app/providers/loading';
import { NewNotePage } from '../pages/new-note/new-note.page';

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

	viewNote$ = createEffect(() =>
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

	saveNote$ = createEffect(() =>
		this.actions$.pipe(
			ofType<notesAction.SaveNote>(
				notesAction.NotesActionTypes.SAVE_NOTE
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.notesProvider.saveNote(action.title, action.body, action.category, action.isAdminOnly, action.expiresOn).pipe(
					map((data) => ({
						type: notesAction.NotesActionTypes.SAVE_NOTE_SUCCESS,
					})),
					catchError(() =>
						of({
							type: notesAction.NotesActionTypes.SAVE_NOTE_FAIL,
						})
					)
				)
			)
		)
	);

	saveNoteSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType(notesAction.NotesActionTypes.SAVE_NOTE_SUCCESS),
			switchMap(async (action) => this.closeModal()),
      		switchMap(async (action) => this.loadingProvider.hide()),
			map((data) => ({
				type: notesAction.NotesActionTypes.LOAD_NOTES,
			}))
		)
	);

	saveNoteFail$ = createEffect(() =>
		this.actions$.pipe(
			ofType(notesAction.NotesActionTypes.SAVE_NOTE_FAIL),
      		switchMap(async (action) => this.loadingProvider.hide()),
			map((data) => ({
				type: notesAction.NotesActionTypes.SAVE_NOTE_DONE,
			}))
		)
	);

	showNewNoteModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<notesAction.ShowNewNoteModal>(
				notesAction.NotesActionTypes.SHOW_NEW_NOTE_MODAL
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.notesProvider.getNoteCategories().pipe(
					map((data) => ({
						type: notesAction.NotesActionTypes.SHOW_NEW_NOTE_MODAL_SUCCESS,
						categories: data.Data,
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

	showNewNoteModalSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType(notesAction.NotesActionTypes.SHOW_NEW_NOTE_MODAL_SUCCESS),
			exhaustMap((data) => this.runModal(NewNotePage, null, null, {
				breakpoints: [0, 0.8],
				initialBreakpoint: 0.8,
			  })),
      		switchMap(async (action) => this.loadingProvider.hide()),
			map((data) => ({
				type: notesAction.NotesActionTypes.SHOW_NEW_NOTE_MODAL_DONE,
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

	runModal = async (component, cssClass, properties, opts = {}) => {
		await this.closeModal();
		await this.menuCtrl.close();
	
		if (!cssClass) {
		  cssClass = 'modal-container';
		}
	
		this._modalRef = await this.modalController.create({
		  component: component,
		  cssClass: cssClass,
		  componentProps: properties,
		  ...opts,
		});
	
		return from(this._modalRef.present());
	  };
	
	  closeModal = async () => {
		try {
		  //if (this._modalRef) {
			await this.modalController.dismiss();
			this._modalRef = null;
		  //}
		} catch (error) { }
	  };
}
