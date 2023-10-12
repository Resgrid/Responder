import { Store } from '@ngrx/store';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import * as unitsAction from '../actions/units.actions';
import { PersonnelService, UnitsService } from '@resgrid/ngx-resgridlib';
import {
	catchError,
	exhaustMap, map, mergeMap, switchMap, tap,
} from 'rxjs/operators';
import { StorageProvider } from 'src/app/providers/storage';
import * as _ from 'lodash';
import { UnitsState } from '../store/units.store';
import { from, of } from 'rxjs';
import { FilterUnitsPage } from '../pages/filter-units/filter-units.page';
import { UnitFilterOption } from '../models/unitFilterOption';
import { selectUnitsState } from 'src/app/store';
import { ViewUnitPage } from '../pages/view-unit/view-unit.page';
import { LoadingProvider } from 'src/app/providers/loading';

@Injectable()
export class UnitsEffects {
	private _modalRef: HTMLIonModalElement;

	getUnitsList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<unitsAction.GetUnitsList>(
				unitsAction.UnitsActionTypes.GET_UNITS_LIST
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.unitsService.getAllUnitsInfos(action.filter).pipe(
					map((data) => ({
						type: unitsAction.UnitsActionTypes.GET_UNITS_LIST_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: unitsAction.UnitsActionTypes.GET_UNITS_LIST_FAIL,
						})
					)
				)
			)
		)
	);

	getUnitsListSuccess$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(unitsAction.UnitsActionTypes.GET_UNITS_LIST_SUCCESS),
				switchMap(() => this.loadingProvider.hide()),
				map((data) => ({
					type: unitsAction.UnitsActionTypes.GET_UNITS_LIST_DONE
				})),
			)
	);

	getUnitsFilter$ = createEffect(() =>
		this.actions$.pipe(
			ofType<unitsAction.GetUnitsFilters>(
				unitsAction.UnitsActionTypes.GET_UNITS_FILTERS
			),
			mergeMap((action) =>
				this.unitsService.getUnitsFilterOptions().pipe(
					map((data) => ({
						type: unitsAction.UnitsActionTypes
							.GET_UNITS_FILTERS_DONE,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: unitsAction.UnitsActionTypes
								.GET_UNITS_FILTERS_FAIL,
						})
					)
				)
			)
		)
	);

	showUnitsFilterModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType(unitsAction.UnitsActionTypes.SHOW_UNITS_FILTER_MODAL),
			switchMap(() =>
				this.runModal(FilterUnitsPage, 'modal-container-full', null)
			),
			map(() => {
				return {
					type: unitsAction.UnitsActionTypes
						.SHOW_UNITS_FILTER_MODAL_DONE,
				};
			})
		)
	);

	getSavedUnitsFilter$ = createEffect(() =>
		this.actions$.pipe(
			ofType<unitsAction.GetSavedUnitsFilter>(
				unitsAction.UnitsActionTypes.GET_SAVED_UNITS_FILTER
			),
			mergeMap((action) =>
				from(this.storageProvider.getUnitFilter()).pipe(
					map((data) => ({
						type: unitsAction.UnitsActionTypes.GET_SAVED_UNITS_FILTER_DONE,
						filter: data,
					}))
				)
			)
		)
	);

	updatePersonnelFilterOption$ = createEffect(() =>
		this.actions$.pipe(
			ofType<unitsAction.UpdateSelectedFilterOption>(
				unitsAction.UnitsActionTypes.UPDATE_SELECTED_FILTER_OPTION
			),
			concatLatestFrom(() => [this.store.select(selectUnitsState)]),
			switchMap(([action, personnelState], index) =>
				of(action).pipe(
					map(() => {
						let unitFilterSelect = _.cloneDeep(
							personnelState.unitFilterOptions
						) as UnitFilterOption[];

						if (action.id === '0') {
							unitFilterSelect.forEach((option) => {
								option.Selected = false;
							});
						} else {
							unitFilterSelect.forEach((option) => {
								if (option.Id == action.id) {
									option.Selected = action.selected;
								}
							});
						}

						return unitFilterSelect;
					}),
					tap(async (data) => {
						let filteredUnits = '';

						data.forEach((option) => {
							if (option.Selected === true && option.Id !== '0') {
								if (filteredUnits.length === 0)
								filteredUnits = option.Id;
								else filteredUnits = filteredUnits + '|' + option.Id;
							}
						});

						await this.storageProvider.setUnitFilter(filteredUnits);
					}),
					map((data) => ({
						type: unitsAction.UnitsActionTypes.UPDATE_SAVED_UNITS_FILTER_DONE,
						payload: data,
					}))
				)
			)
		)
	);

	viewUnit$ = createEffect(() =>
		this.actions$.pipe(
			ofType<unitsAction.ViewUnit>(
				unitsAction.UnitsActionTypes.VIEW_UNIT
			),
			switchMap(() =>
				this.runModal(ViewUnitPage, 'modal-container-full', null)
			),
			map((action) => ({
				type: unitsAction.UnitsActionTypes.VIEW_UNIT_DONE,
			}))
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(unitsAction.UnitsActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal())
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<UnitsState>,
		private unitsService: UnitsService,
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
