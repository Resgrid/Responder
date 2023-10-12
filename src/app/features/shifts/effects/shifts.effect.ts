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
	ShiftsService,
	UtilsService,
} from '@resgrid/ngx-resgridlib';
import {
	exhaustMap, mergeMap, catchError, map, switchMap
} from 'rxjs/operators';
import { from, of } from 'rxjs';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { ShiftsState } from '../store/shifts.store';
import { AlertProvider } from 'src/app/providers/alert';
import * as shiftsAction from '../actions/shifts.actions';
import { ShiftDetailPage } from '../pages/shift-detail/shift-detail.page';
import { ShiftDayPage } from '../pages/shift-day/shift-day.page';

@Injectable()
export class ShiftsEffects {
	private _modalRef: HTMLIonModalElement;

	getTodaysShifts$ = createEffect(() =>
		this.actions$.pipe(
			ofType<shiftsAction.LoadTodaysShifts>(shiftsAction.ShiftsActionTypes.LOAD_TODAY_SHIFTS),
			mergeMap((action) =>
				this.shiftsService.getTodaysShifts()
					.pipe(
						map((data) => ({
							type: shiftsAction.ShiftsActionTypes.LOAD_TODAY_SHIFTS_SUCCESS,
							payload: data.Data,
						})),
						catchError(() =>
							of({type: shiftsAction.ShiftsActionTypes.LOAD_TODAY_SHIFTS_FAIL})
						)
					)
			)
		)
	);

	getShifts$ = createEffect(() =>
		this.actions$.pipe(
			ofType<shiftsAction.LoadShifts>(shiftsAction.ShiftsActionTypes.LOAD_SHIFTS),
			mergeMap((action) =>
				this.shiftsService.getShifts()
					.pipe(
						map((data) => ({
							type: shiftsAction.ShiftsActionTypes.LOAD_SHIFTS_SUCCESS,
							payload: data.Data,
						})),
						catchError(() =>
							of({type: shiftsAction.ShiftsActionTypes.LOAD_SHIFTS_FAIL})
						)
					)
			)
		)
	);

	viewShift$ = createEffect(() =>
		this.actions$.pipe(
			ofType<shiftsAction.ViewShift>(
				shiftsAction.ShiftsActionTypes.VIEW_SHIFT
			),
			switchMap(() =>
				this.runModal(ShiftDetailPage, 'modal-container-full', null, null)
			),
			map((action) => ({
				type: shiftsAction.ShiftsActionTypes.VIEW_SHIFT_SUCCESS,
			}))
		)
	);

	viewShiftDay$ = createEffect(() =>
		this.actions$.pipe(
			ofType<shiftsAction.ViewShiftDay>(
				shiftsAction.ShiftsActionTypes.VIEW_SHIFT_DAY
			),
			switchMap(() =>
				this.runModal(ShiftDayPage, 'modal-container-full', null, null)
			),
			map((action) => ({
				type: shiftsAction.ShiftsActionTypes.VIEW_SHIFT_DAY_SUCCESS,
			}))
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(shiftsAction.ShiftsActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal(null))
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<ShiftsState>,
		private shiftsService: ShiftsService,
		private toastController: ToastController,
		private menuCtrl: MenuController,
		private modalController: ModalController,
		private storageProvider: StorageProvider,
		private utilsProvider: UtilsService,
		private alertProvider: AlertProvider,
	) {}

	showToast = async (message) => {
		const toast = await this.toastController.create({
			message: message,
			duration: 3000,
		});
		toast.present();
	};

	runModal = async (component, cssClass, properties, id, opts = {}) => {
		await this.menuCtrl.close();

		if (!cssClass) {
			cssClass = 'modal-container';
		}

		if (!id) {
			id = 'CallsFeatureModal';
		}

		this._modalRef = await this.modalController.create({
			component: component,
			cssClass: cssClass,
			componentProps: properties,
			id: id,
			...opts,
		});

		return from(this._modalRef.present());
	};

	closeModal = async (id) => {
		if (!id) {
			id = 'CallsFeatureModal';
		}

		try {
			var activeModal = await this.modalController.getTop();

			if (activeModal) {
				await this.modalController.dismiss(null, null, id);
			}
		} catch (error) {}
	};
}
