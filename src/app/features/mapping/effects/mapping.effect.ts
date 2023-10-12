import { Store } from '@ngrx/store';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import * as mappingAction from '../actions/mapping.actions';
import { MappingService, PersonnelService, UnitsService } from '@resgrid/ngx-resgridlib';
import {
	catchError,
	exhaustMap, map, mergeMap, switchMap, tap,
} from 'rxjs/operators';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { MappingState } from '../store/mapping.store';
import { of } from 'rxjs';

@Injectable()
export class MappingEffects {
	private _modalRef: HTMLIonModalElement;

	loadMapData$ = createEffect(() =>
		this.actions$.pipe(
			ofType<mappingAction.LoadMapData>(
				mappingAction.MappingActionTypes.LOADING_MAP_DATA
			),
			mergeMap((action) =>
				this.mapProvider.getMapDataAndMarkers().pipe(
					map((data) => ({
						type: mappingAction.MappingActionTypes.LOADING_MAP_DATA_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: mappingAction.MappingActionTypes.LOADING_MAP_DATA_FAIL,
						})
					)
				)
			)
		)
	);
	
	constructor(
		private actions$: Actions,
		private store: Store<MappingState>,
		private mapProvider: MappingService,
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
