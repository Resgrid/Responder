import { Store } from '@ngrx/store';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import * as protocolsAction from '../actions/protocols.actions';
import { CallProtocolsService, MappingService, PersonnelService, UnitsService } from '@resgrid/ngx-resgridlib';
import {
	catchError,
	exhaustMap, map, mergeMap, switchMap, tap,
} from 'rxjs/operators';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { ProtocolsState } from '../store/protocols.store';
import { of } from 'rxjs';
import { ViewProtocolPage } from '../pages/view-protocol/view-protocol.page';

@Injectable()
export class ProtocolsEffects {
	private _modalRef: HTMLIonModalElement;

	getProtocolsList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<protocolsAction.LoadProtocols>(
				protocolsAction.ProtocolsActionTypes.LOAD_PROTOCOLS
			),
			mergeMap((action) =>
				this.protocolsProvider.getAllCallProtocols().pipe(
					map((data) => ({
						type: protocolsAction.ProtocolsActionTypes.LOAD_PROTOCOLS_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: protocolsAction.ProtocolsActionTypes.LOAD_PROTOCOLS_FAIL,
						})
					)
				)
			)
		)
	);

	viewPerson$ = createEffect(() =>
		this.actions$.pipe(
			ofType<protocolsAction.ViewProtocol>(
				protocolsAction.ProtocolsActionTypes.VIEW_PROTOCOL
			),
			switchMap(() =>
				this.runModal(ViewProtocolPage, 'modal-container-full', null)
			),
			map((action) => ({
				type: protocolsAction.ProtocolsActionTypes.VIEW_PROTOCOL_DONE,
			}))
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(protocolsAction.ProtocolsActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal())
			),
		{ dispatch: false }
	);
	
	constructor(
		private actions$: Actions,
		private store: Store<ProtocolsState>,
		private protocolsProvider: CallProtocolsService,
		private toastController: ToastController,
		private menuCtrl: MenuController,
		private modalController: ModalController,
		private storageProvider: StorageProvider
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
