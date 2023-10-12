import { Store } from '@ngrx/store';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import { PersonnelState } from '../store/personnel.store';
import {
	MenuController,
	ModalController,
	ToastController,
} from '@ionic/angular';
import { forkJoin, from, of } from 'rxjs';
import * as personnelAction from '../actions/personnel.actions';
import { DispatchService, PersonnelService } from '@resgrid/ngx-resgridlib';
import {
	mergeMap,
	map,
	catchError,
	switchMap,
	exhaustMap,
	tap,
} from 'rxjs/operators';
import { FilterPersonnelPage } from '../pages/filter-personnel/filter-personnel.page';
import { StorageProvider } from 'src/app/providers/storage';
import { selectPersonnelState } from 'src/app/store';
import * as _ from 'lodash';
import { PersonnelFilterOption } from '../models/personnelFilterOption';
import { Router } from '@angular/router';
import { ViewPersonPage } from '../pages/view-person/view-person.page';
import { LoadingProvider } from 'src/app/providers/loading';

@Injectable()
export class PersonnelEffects {
	private _modalRef: HTMLIonModalElement;

	getPersonnelList$ = createEffect(() =>
		this.actions$.pipe(
			ofType<personnelAction.GetPersonnelList>(
				personnelAction.PersonnelActionTypes.GET_PERSONNEL_LIST
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.personnelService.getAllPersonnelInfos(action.filter).pipe(
					map((data) => ({
						type: personnelAction.PersonnelActionTypes.GET_PERSONNEL_LIST_SUCCESS,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: personnelAction.PersonnelActionTypes.GET_PERSONNEL_LIST_FAIL,
						})
					)
				)
			)
		)
	);

	getPersonnelListSuccess$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(personnelAction.PersonnelActionTypes.GET_PERSONNEL_LIST_SUCCESS),
				switchMap(() => this.loadingProvider.hide()),
				map((data) => ({
					type: personnelAction.PersonnelActionTypes.GET_PERSONNEL_LIST_DONE
				})),
			)
	);

	getPersonnelFilter$ = createEffect(() =>
		this.actions$.pipe(
			ofType<personnelAction.GetPersonnelFilters>(
				personnelAction.PersonnelActionTypes.GET_PERSONNEL_FILTERS
			),
			mergeMap((action) =>
				this.personnelService.getPersonnelFilterOptions().pipe(
					map((data) => ({
						type: personnelAction.PersonnelActionTypes
							.GET_PERSONNEL_FILTERS_DONE,
						payload: data.Data,
					})),
					catchError(() =>
						of({
							type: personnelAction.PersonnelActionTypes
								.GET_PERSONNEL_FILTERS_FAIL,
						})
					)
				)
			)
		)
	);

	showPersonnelFilterModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType(personnelAction.PersonnelActionTypes.SHOW_PERSONNEL_FILTER_MODAL),
			switchMap(() =>
				this.runModal(FilterPersonnelPage, 'modal-container-full', null)
			),
			map(() => {
				return {
					type: personnelAction.PersonnelActionTypes
						.SHOW_PERSONNEL_FILTER_MODAL_DONE,
				};
			})
		)
	);

	getSavedPersonnelFilter$ = createEffect(() =>
		this.actions$.pipe(
			ofType<personnelAction.GetSavedPersonnelFilter>(
				personnelAction.PersonnelActionTypes.GET_SAVED_PERSONNEL_FILTER
			),
			mergeMap((action) =>
				from(this.storageProvider.getPersonnelFilter()).pipe(
					map((data) => ({
						type: personnelAction.PersonnelActionTypes
							.GET_SAVED_PERSONNEL_FILTER_DONE,
						filter: data,
					}))
				)
			)
		)
	);

	viewPerson$ = createEffect(() =>
		this.actions$.pipe(
			ofType<personnelAction.ViewPerson>(
				personnelAction.PersonnelActionTypes.VIEW_PERSON
			),
			switchMap(() =>
				this.runModal(ViewPersonPage, 'modal-container-full', null)
			),
			map((action) => ({
				type: personnelAction.PersonnelActionTypes.VIEW_PERSON_DONE,
			}))
		)
	);

	updatePersonnelFilterOption$ = createEffect(() =>
		this.actions$.pipe(
			ofType<personnelAction.UpdateSelectedFilterOption>(
				personnelAction.PersonnelActionTypes.UPDATE_SELECTED_FILTER_OPTION
			),
			concatLatestFrom(() => [this.store.select(selectPersonnelState)]),
			switchMap(([action, personnelState], index) =>
				of(action).pipe(
					map(() => {
						let peopleFilterSelect = _.cloneDeep(
							personnelState.personnelFilterOptions
						) as PersonnelFilterOption[];

						if (action.id === '0') {
							peopleFilterSelect.forEach((option) => {
								option.Selected = false;
							});
						} else {
							peopleFilterSelect.forEach((option) => {
								if (option.Id == action.id) {
									option.Selected = action.selected;
								}
							});
						}

						return peopleFilterSelect;
					}),
					tap(async (data) => {
						let filteredPersonnel = '';

						data.forEach((option) => {
							if (option.Selected === true && option.Id !== '0') {
								if (filteredPersonnel.length === 0)
									filteredPersonnel = option.Id;
								else filteredPersonnel = filteredPersonnel + '|' + option.Id;
							}
						});

						await this.storageProvider.setPersonnelFilter(filteredPersonnel);
					}),
					map((data) => ({
						type: personnelAction.PersonnelActionTypes
							.UPDATE_SAVED_PERSONNEL_FILTER_DONE,
						payload: data,
					}))
				)
			)
		)
	);

	dismissModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(personnelAction.PersonnelActionTypes.DISMISS_MODAL),
				exhaustMap((data) => this.closeModal())
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<PersonnelState>,
		private personnelService: PersonnelService,
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
