import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import * as calendarAction from '../actions/calendar.actions';
import {
	CalendarService,
	CallProtocolsService,
	UtilsService,
} from '@resgrid/ngx-resgridlib';
import {
	exhaustMap,
	catchError,
	map,
	mergeMap,
	switchMap,
	tap,
} from 'rxjs/operators';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { CalendarState } from '../store/calendar.store';
import { of } from 'rxjs';
import { addDays, subDays } from 'date-fns';
import { CalendarDetailPage } from '../pages/calendar-detail/calendar-detail.page';
import { AlertProvider } from 'src/app/providers/alert';
import { LoadingProvider } from 'src/app/providers/loading';

@Injectable()
export class CalendarEffects {
	private _modalRef: HTMLIonModalElement;

	getTodaysCalendarItemsList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadTodaysCalendarItems>(
				calendarAction.CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.calendarService
					.getDepartmentCalendarItemsInRange(
						encodeURIComponent(this.utilsProvider.formatDateString(new Date())),
						encodeURIComponent(this.utilsProvider.formatDateString(new Date()))
					)
					.pipe(
						map((data) => ({
							type: calendarAction.CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS_SUCCESS,
							payload: data.Data,
						})),
						catchError(() =>
							of({
								type: calendarAction.CalendarActionTypes
									.LOAD_TODAY_CALENDAR_ITEMS_FAIL,
							})
						)
					)
			)
		)
	);

	getUpcomingCalendarItemsList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadUpcomingCalendarItems>(
				calendarAction.CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.calendarService
					.getDepartmentCalendarItemsInRange(
						encodeURIComponent(this.utilsProvider.formatDateString(new Date())),
						encodeURIComponent(
							this.utilsProvider.formatDateString(addDays(new Date(), 60))
						)
					)
					.pipe(
						map((data) => ({
							type: calendarAction.CalendarActionTypes
								.LOAD_UPCOMING_CALENDAR_ITEMS_SUCCESS,
							payload: data.Data,
						})),
						catchError(() =>
							of({
								type: calendarAction.CalendarActionTypes
									.LOAD_UPCOMING_CALENDAR_ITEMS_FAIL,
							})
						)
					)
			)
		)
	);

	loadCalendarItemsList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadCalendarItems>(
				calendarAction.CalendarActionTypes.LOAD_CALENDAR_ITEMS
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.calendarService
					.getDepartmentCalendarItemsInRange(
						encodeURIComponent(
							this.utilsProvider.formatDateString(subDays(new Date(), 90))
						),
						encodeURIComponent(
							this.utilsProvider.formatDateString(addDays(new Date(), 120))
						)
					)
					.pipe(
						map((data) => ({
							type: calendarAction.CalendarActionTypes
								.LOAD_CALENDAR_ITEMS_SUCCESS,
							payload: data.Data,
						})),
						catchError(() =>
							of({
								type: calendarAction.CalendarActionTypes
									.LOAD_CALENDAR_ITEMS_FAIL,
							})
						)
					)
			)
		)
	);

	viewCalendarItem$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.ViewCalendarItem>(
				calendarAction.CalendarActionTypes.VIEW_CALENDAR_ITEM
			),
			switchMap(() =>
				this.runModal(CalendarDetailPage, 'modal-container-full', null)
			),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.VIEW_CALENDAR_ITEM_DONE,
			}))
		)
	);

	setCalendarItemAttendingStatus$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.SetCalendarItemAttendingStatus>(
				calendarAction.CalendarActionTypes.SET_CALENDAR_ITEM_ATTENDING_STATUS
			),
			mergeMap((action) =>
				this.calendarService
					.setCalendarAttendingStatus(
						action.calendarItemId,
						action.note,
						action.status
					)
					.pipe(
						map((data) => ({
							type: calendarAction.CalendarActionTypes
								.SET_CALENDAR_ITEM_ATTENDING_STATUS_SUCCESS,
						})),
						catchError(() =>
							of({
								type: calendarAction.CalendarActionTypes
									.SET_CALENDAR_ITEM_ATTENDING_STATUS_FAIL,
							})
						)
					)
			)
		)
	);

	setCalendarItemAttendingStatusStatus$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					calendarAction.CalendarActionTypes
						.SET_CALENDAR_ITEM_ATTENDING_STATUS_SUCCESS
				),
				exhaustMap((data) => this.closeModal()),
				switchMap((action) =>
					this.alertProvider.showOkAlert(
						'Set Attendance Status',
						'',
						'Your attendance status has been updated successfully.'
					)
				)
			),
		{ dispatch: false }
	);

	setCalendarItemAttendingStatusFail$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					calendarAction.CalendarActionTypes
						.SET_CALENDAR_ITEM_ATTENDING_STATUS_FAIL
				),
				exhaustMap((action) =>
					this.alertProvider.showErrorAlert(
						'Set Attendance Status',
						'',
						'There was an error trying to save your status, please try again.'
					)
				)
			),
		{ dispatch: false }
	);

	loadTodayCalendarItemsSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadTodaysCalendarItemsSuccess>(
				calendarAction.CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS_SUCCESS
			),
			exhaustMap(() => this.loadingProvider.hide()),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.DONE,
			}))
		)
	);

	loadTodayCalendarItemsFail$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadTodaysCalendarItemsFail>(
				calendarAction.CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS_FAIL
			),
			exhaustMap(() => this.loadingProvider.hide()),
			exhaustMap((action) =>
				this.alertProvider.showErrorAlert(
					'Load Calendar Items',
					'',
					'There was an error trying to load the calendar items, please try again.'
				)
			),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.DONE,
			}))
		)
	);

	loadUpcomingCalendarItemsSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadUpcomingCalendarItemsSuccess>(
				calendarAction.CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS_SUCCESS
			),
			exhaustMap(() => this.loadingProvider.hide()),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.DONE,
			}))
		)
	);

	loadUpcomingCalendarItemsFail$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadUpcomingCalendarItemsFail>(
				calendarAction.CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS_FAIL
			),
			exhaustMap(() => this.loadingProvider.hide()),
			exhaustMap((action) =>
				this.alertProvider.showErrorAlert(
					'Load Calendar Items',
					'',
					'There was an error trying to load the calendar items, please try again.'
				)
			),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.DONE,
			}))
		)
	);

	loadCalendarItemsSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadCalendarItemsSuccess>(
				calendarAction.CalendarActionTypes.LOAD_CALENDAR_ITEMS_SUCCESS
			),
			exhaustMap(() => this.loadingProvider.hide()),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.DONE,
			}))
		)
	);

	loadCalendarItemsFail$ = createEffect(() =>
		this.actions$.pipe(
			ofType<calendarAction.LoadCalendarItemsFail>(
				calendarAction.CalendarActionTypes.LOAD_CALENDAR_ITEMS_FAIL
			),
			exhaustMap(() => this.loadingProvider.hide()),
			exhaustMap((action) =>
				this.alertProvider.showErrorAlert(
					'Load Calendar Items',
					'',
					'There was an error trying to load the calendar items, please try again.'
				)
			),
			map((action) => ({
				type: calendarAction.CalendarActionTypes.DONE,
			}))
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(calendarAction.CalendarActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal())
			),
		{ dispatch: false }
	);

	done$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType<calendarAction.Done>(calendarAction.CalendarActionTypes.DONE)
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<CalendarState>,
		private calendarService: CalendarService,
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
