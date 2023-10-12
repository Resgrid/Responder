import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import {
	CalendarService,
	MessagesService,
	ShiftsService,
	UtilsService,
} from '@resgrid/ngx-resgridlib';
import {
	exhaustMap,
	mergeMap,
	catchError,
	map,
	switchMap,
	tap,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { MessagesState } from '../store/messages.store';
import { AlertProvider } from 'src/app/providers/alert';
import * as messagesAction from '../actions/messages.actions';
import { ViewMessagePage } from '../pages/view-message/view-message.page';
import { NewMessagePage } from '../pages/new-message/new-message.page';
import { SelectRecipientsPage } from '../pages/select-recipients/select-recipients.page';
import { LoadingProvider } from 'src/app/providers/loading';

@Injectable()
export class MessagesEffects {
	private _modalRef: HTMLIonModalElement;

	getInboxMessages$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.LoadInboxMessages>(
				messagesAction.MessagesActionTypes.LOAD_INBOX_MESSAGES
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.messagesService.getInboxMessages().pipe(
					map((data) => ({
						type: messagesAction.MessagesActionTypes
							.LOAD_INBOX_MESSAGES_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: messagesAction.MessagesActionTypes.LOAD_INBOX_MESSAGES_FAIL,
						})
					)
				)
			)
		)
	);

	getInboxMessagesSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType(messagesAction.MessagesActionTypes.LOAD_INBOX_MESSAGES_SUCCESS),
			switchMap(() => this.loadingProvider.hide()),
			map((data) => ({
				type: messagesAction.MessagesActionTypes.LOAD_INBOX_MESSAGES_DONE,
			}))
		)
	);

	getOutboxMessages$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.LoadOutboxMessages>(
				messagesAction.MessagesActionTypes.LOAD_OUTBOX_MESSAGES
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.messagesService.getOutboxMessages().pipe(
					map((data) => ({
						type: messagesAction.MessagesActionTypes
							.LOAD_OUTBOX_MESSAGES_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: messagesAction.MessagesActionTypes
								.LOAD_OUTBOX_MESSAGES_FAIL,
						})
					)
				)
			)
		)
	);

	getOutboxMessagesSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType(messagesAction.MessagesActionTypes.LOAD_OUTBOX_MESSAGES_SUCCESS),
			switchMap(() => this.loadingProvider.hide()),
			map((data) => ({
				type: messagesAction.MessagesActionTypes.LOAD_OUTBOX_MESSAGES_DONE,
			}))
		)
	);

	viewMessage$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.ViewMessage>(
				messagesAction.MessagesActionTypes.VIEW_MESSAGE
			),
			switchMap(() =>
				this.runModal(ViewMessagePage, 'modal-container-full', null, null)
			),
			map((action) => ({
				type: messagesAction.MessagesActionTypes.VIEW_MESSAGE_SUCCESS,
			}))
		)
	);

	respondToMessage$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.RespondToMessage>(
				messagesAction.MessagesActionTypes.RESPOND_TO_MESSAGE
			),
			switchMap((action) => {
				return this.messagesService
					.respondToMessage(action.messageId, action.responseType, action.note)
					.pipe(
						map((data) => {
							return {
								type: messagesAction.MessagesActionTypes
									.RESPOND_TO_MESSAGE_SUCCESS,
							};
						}),
						catchError(() =>
							of({
								type: messagesAction.MessagesActionTypes
									.RESPOND_TO_MESSAGE_FAIL,
							})
						)
					);
			})
		)
	);

	respondToMessageSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.ViewMessage>(
				messagesAction.MessagesActionTypes.RESPOND_TO_MESSAGE_SUCCESS
			),
			exhaustMap((data) => this.closeModal(null)),
			mergeMap((action) =>
				this.messagesService.getInboxMessages().pipe(
					map((data) => ({
						type: messagesAction.MessagesActionTypes.RESPOND_TO_MESSAGE_DONE,
						payload: data.Data,
					})),
					catchError(() =>
						of({ type: messagesAction.MessagesActionTypes.DISMISS_MODAL })
					)
				)
			)
		)
	);

	deleteMessage$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.RespondToMessage>(
				messagesAction.MessagesActionTypes.DELETE_MESSAGE
			),
			switchMap((action) => {
				return this.messagesService.deleteMessage(action.messageId).pipe(
					map((data) => {
						return {
							type: messagesAction.MessagesActionTypes.DELETE_MESSAGE_SUCCESS,
						};
					}),
					catchError(() =>
						of({
							type: messagesAction.MessagesActionTypes.DELETE_MESSAGE_FAIL,
						})
					)
				);
			})
		)
	);

	deleteMessageSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.ViewMessage>(
				messagesAction.MessagesActionTypes.DELETE_MESSAGE_SUCCESS
			),
			exhaustMap((data) => this.closeModal(null)),
			mergeMap((action) =>
				this.messagesService.getInboxMessages().pipe(
					map((data) => ({
						type: messagesAction.MessagesActionTypes.DELETE_MESSAGE_DONE,
						payload: data.Data,
					})),
					catchError(() =>
						of({ type: messagesAction.MessagesActionTypes.DISMISS_MODAL })
					)
				)
			)
		)
	);

	newMessage$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.ViewMessage>(
				messagesAction.MessagesActionTypes.NEW_MESSAGE
			),
			switchMap(() =>
				this.runModal(NewMessagePage, 'modal-container-full', null, null)
			),
			map((action) => ({
				type: messagesAction.MessagesActionTypes.NEW_MESSAGE_SUCCESS,
			}))
		)
	);

	showSelectRecipients$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.RespondToMessage>(
				messagesAction.MessagesActionTypes.SHOW_SELECT_RECIPIENTS
			),
			switchMap((action) => {
				return this.messagesService.getRecipients(true, false).pipe(
					map((data) => {
						return {
							type: messagesAction.MessagesActionTypes
								.SHOW_SELECT_RECIPIENTS_SUCCESS,
							recipients: data.Data,
						};
					}),
					catchError(() =>
						of({
							type: messagesAction.MessagesActionTypes.DELETE_MESSAGE_FAIL,
						})
					)
				);
			})
		)
	);

	showSelectRecipientsSuccess$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					messagesAction.MessagesActionTypes.SHOW_SELECT_RECIPIENTS_SUCCESS
				),
				exhaustMap((data) =>
					this.runModal(
						SelectRecipientsPage,
						'modal-container-full',
						null,
						'SelectRecipientsModal'
					)
				)
			),
		{ dispatch: false }
	);

	dismissSelectRecipientsModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					messagesAction.MessagesActionTypes.CLOSE_SELECT_RECIPIENTS_MODAL
				),
				exhaustMap((data) => this.closeModal('SelectRecipientsModal'))
			),
		{ dispatch: false }
	);

	closeNewMessageModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.ViewMessage>(
				messagesAction.MessagesActionTypes.CLOSE_NEW_MESSAGE_MODAL
			),
			map((action) => ({
				type: messagesAction.MessagesActionTypes.DISMISS_MODAL,
			}))
		)
	);

	sendMessage$ = createEffect(() =>
		this.actions$.pipe(
			ofType<messagesAction.SendMessage>(
				messagesAction.MessagesActionTypes.SEND_MESSAGE
			),
			switchMap((action) => {
				return this.messagesService
					.sendMessage(
						action.title,
						action.body,
						action.messageType,
						action.recipients
					)
					.pipe(
						map((data) => {
							return {
								type: messagesAction.MessagesActionTypes
									.CLOSE_NEW_MESSAGE_MODAL,
							};
						}),
						catchError(() =>
							of({
								type: messagesAction.MessagesActionTypes.SEND_MESSAGE_FAIL,
							})
						)
					);
			})
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(messagesAction.MessagesActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal(null))
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<MessagesState>,
		private messagesService: MessagesService,
		private toastController: ToastController,
		private menuCtrl: MenuController,
		private modalController: ModalController,
		private storageProvider: StorageProvider,
		private utilsProvider: UtilsService,
		private alertProvider: AlertProvider,
		private loadingProvider: LoadingProvider
	) {}

	showToast = async (message) => {
		const toast = await this.toastController.create({
			message: message,
			duration: 3000,
		});
		toast.present();
	};

	runModal = async (component, cssClass, properties, id) => {
		//await this.menuCtrl.close();

		if (!cssClass) {
			cssClass = 'modal-container';
		}

		if (!id) {
			id = 'MessagesFeatureModal';
		}

		//await this.closeModal(id);

		this._modalRef = await this.modalController.create({
			component: component,
			cssClass: cssClass,
			componentProps: {
				info: properties,
			},
			id: id,
		});

		return this._modalRef.present();
	};

	closeModal = async (id) => {
		if (!id) {
			id = 'MessagesFeatureModal';
		}

		this.modalController.getTop().then(async (modal) => {
			if (modal) {
				await this.modalController.dismiss(null, null, id);
			}
		});

		//if (this._modalRef) {
		//	await this.modalController.dismiss(null, null, id);
		//	this._modalRef = null;
		//}
	};
}
