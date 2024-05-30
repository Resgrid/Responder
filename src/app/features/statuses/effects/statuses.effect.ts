import * as statusesAction from '../actions/statuses.actions';
import { Action, Store } from '@ngrx/store';
import {
	Actions,
	concatLatestFrom,
	createEffect,
	Effect,
	ofType,
} from '@ngrx/effects';
import {
	catchError,
	exhaustMap,
	map,
	mergeMap,
	switchMap,
	tap,
	withLatestFrom,
} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import {
	PersonnelStaffingService,
	PersonnelStatusesService,
	SavePersonsStatusesInput,
	SavePersonStaffingInput,
	SavePersonStatusInput,
	SaveUnitStatusInput,
	UnitStatusService,
	VoiceService,
} from '@resgrid/ngx-resgridlib';
import { StatusDestination } from '../models/statusDestination';
import { ModalSetStatusDestinationPage } from '../modals/setStatusDestination/modal-setStatusDestination.page';
import { MenuController, ModalController } from '@ionic/angular';
import { ModalSetStatusNotePage } from '../modals/setStatusNote/modal-setStatusNote.page';
import { HomeState } from '../../home/store/home.store';
import { StatusesState } from '../store/statuses.store';
import {
	selectHomeState,
	selectSettingsState,
	selectStatusesState,
} from 'src/app/store';
import { LoadingProvider } from 'src/app/providers/loading';
import * as HomeActions from '../../../features/home/actions/home.actions';
import { SettingsState } from '../../settings/store/settings.store';
import { ModalSetStaffingNotePage } from '../modals/setStaffingNote/modal-setStaffingNote.page';

@Injectable()
export class StatusesEffects {
	private _modalRef: HTMLIonModalElement;

	submitPersonStatus$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStatus>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_START
			),
			tap((action) => {}),
			map((data) => {
				if (data && data.status) {
					if (data.status.Detail === 0) {
						// No detail
						return {
							type: statusesAction.StatusesActionTypes
								.SUBMIT_PERSON_STATUS_NOTE,
							payload: {
								userId: data.userId,
								stateType: data.status.Id,
								destination: '',
								destinationType: -1,
								note: '',
								date: new Date(),
							},
							status: data.status,
						};
					}

					let destinations: StatusDestination[] = [];

					destinations.push({
						id: '-1',
						name: data.status.Text,
						type: 0,
					});

					if (data.status.Detail === 1) {
						//Stations
						data.groups.forEach((group) => {
							if (group.TypeId == 2) {
								destinations.push({
									id: group.GroupId,
									name: group.Name,
									type: 1, // Station type
								});
							}
						});
					} else if (data.status.Detail === 2) {
						// Calls
						data.calls.forEach((call) => {
							destinations.push({
								id: call.CallId,
								name: call.Name,
								type: 2, // Call type
							});
						});
					} else if (data.status.Detail === 3) {
						// Calls and Stations
						data.groups.forEach((group) => {
							if (group.TypeId == 2) {
								destinations.push({
									id: group.GroupId,
									name: group.Name,
									type: 1, // Station type
								});
							}
						});

						data.calls.forEach((call) => {
							destinations.push({
								id: call.CallId,
								name: call.Name,
								type: 2, // Call type
							});
						});
					}

					return {
						type: statusesAction.StatusesActionTypes
							.SUBMIT_PERSON_STATUS_DESTINATION,
						payload: {
							userId: data.userId,
							stateType: data.status.Id,
							destination: '',
							destinationType: -1,
							note: '',
							date: new Date(),
						},
						status: data.status,
						destinations: destinations,
					};
				} else {
					return {
						type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET,
						data: {
							userId: data.userId,
							stateType: data.status.Id,
							destination: '',
							destinationType: -1,
							note: '',
							date: new Date(),
						},
					};
				}
			})
		)
	);

	submitUnitStatusDestinationSet$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStatusDesinationSet>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION_SET
			),
			tap((action) => {}),
			map((data) => {
				if (data && data.status) {
					if (data.status.Note === 0) {
						//None = 0,
						//Optional = 1,
						//Required = 2

						// No Note
						return {
							type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET,
							payload: data.payload,
						};
					}

					return {
						type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE,
						payload: data.payload,
						status: data.status,
					};
				} else {
					return {
						type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET,
						payload: data.payload,
					};
				}
			})
		)
	);

	submitPersonStatusSet$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStatusSet>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET
			),
			concatLatestFrom(() => [
				this.homeStore.select(selectHomeState),
				this.statusesStore.select(selectStatusesState),
				this.settingsStore.select(selectSettingsState),
			]),
			switchMap(([action, homeState, statusesState, settingsState], index) => {
				let status: SavePersonStatusInput = new SavePersonStatusInput();
				status.Type = action.payload.stateType;

				if (
					action.payload.stateType === '2' &&
					action.payload.destinationType === 1
				) {
					status.Type = '5'; // Responding with a station destination type so "Responding Station"
				} else if (
					action.payload.stateType === '2' &&
					action.payload.destinationType === 2
				) {
					status.Type = '6'; // Responding with a call destination type so "Responding Call"
				} else if (
					action.payload.stateType === '0' &&
					action.payload.destinationType === 1
				) {
					status.Type = '4'; // Available with a station destination type so "Available Station"
				}

				status.UserId = settingsState.user.userId;
				status.RespondingTo = action.payload.destination;
				status.TimestampUtc = action.payload.date
					.toUTCString()
					.replace('UTC', 'GMT');
				status.Timestamp = action.payload.date.toISOString();
				status.Note = action.payload.note;
				status.Latitude = '';
				status.Longitude = '';
				status.Accuracy = '';
				status.Altitude = '';
				status.AltitudeAccuracy = '';
				status.Speed = '';
				status.Heading = '';
				status.EventId = '';

				// TODO: Add support for geolocation

				//unitStatus.EventId
				//unitStatus.Roles: SaveUnitStatusRoleInput[];

				// if (statusesState.submitStatusDestination) {
				//    unitStatus.RespondingTo =
				//      statusesState.submitStatusDestination.id.toString();
				//  }

				return this.personnelStatusesProvider.savePersonStatus(status).pipe(
					map((data) => {
						return {
							type: statusesAction.StatusesActionTypes
								.SUBMIT_PERSON_STATUS_SET_DONE,
						};
					}),
					catchError(() =>
						of({
							type: statusesAction.StatusesActionTypes
								.SUBMIT_PERSON_STATUS_SET_ERROR,
						})
					)
				);
			})
		)
	);

	submitUnitStatusNote$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStatusNote>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE
			),
			tap((action) => {}),
			map((data) => {
				if (data && data.status) {
					if (data.status.Note === 0) {
						//None = 0,
						//Optional = 1,
						//Required = 2

						// No Note
						return {
							type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET,
							payload: data.payload,
							status: data.status,
						};
					}

					return {
						type: statusesAction.StatusesActionTypes
							.SUBMIT_PERSON_STATUS_NOTE_MODAL,
					};
				} else {
					return {
						type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET,
						payload: data.payload,
					};
				}
			})
		)
	);

	submitUnitStatusNoteSet$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStatusNoteSet>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE_SET
			),
			//switchMap((action) => this.closeModal()),
			//switchMap((action) => this.loadingProvider.hide()),
			map((action) => {
				return {
					type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET,
					payload: action.payload,
				};
			})
		)
	);

	submitUnitStatusNoteModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE_MODAL
				),
				exhaustMap((data) =>
					this.runModal(ModalSetStatusNotePage, null, null, {
						breakpoints: [0, 0.2, 0.5],
						initialBreakpoint: 0.5,
					})
				)
			),
		{ dispatch: false }
	);

	submitUnitStatusDestination$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION
				),
				concatLatestFrom(() => [this.homeStore.select(selectHomeState)]),
				switchMap(([action, homeState], index) => {
					if (homeState) {
						let componentProps = {
							//'activeCallId': homeState.activeCall.CallId,
						};

						return this.runModal(
							ModalSetStatusDestinationPage,
							null,
							componentProps,
							{
								breakpoints: [0, 0.3, 0.5],
								initialBreakpoint: 0.3,
							}
						);
					}

					return this.runModal(ModalSetStatusDestinationPage, null, null, {
						breakpoints: [0, 0.3, 0.5],
						initialBreakpoint: 0.3,
					});
				})
			),
		{ dispatch: false }
	);

	submitUnitStatusSetDone$ = createEffect(() =>
		this.actions$.pipe(
			ofType(statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET_DONE),
			switchMap(() => this.closeModal()),
			switchMap(() => this.loadingProvider.hide()),
			tap(() => {
				this.homeStore.dispatch(new HomeActions.GetCurrentStatus());
			}),
			map((data) => {
				return {
					type: statusesAction.StatusesActionTypes
						.SUBMIT_PERSON_STATUS_SET_FINISH,
				};
			})
		)
	);

	submitUnitStatusSetError$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					statusesAction.StatusesActionTypes.SUBMIT_PERSON_STATUS_SET_ERROR
				),
				switchMap(() => this.closeModal()),
				switchMap(() => this.loadingProvider.hide())
			),
		{ dispatch: false }
	);



	submitPersonStaffing$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStaffing>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_START
			),
			tap((action) => {}),
			map((data) => {
				if (data && data.status) {
					return {
						type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE,
						payload: {
							userId: data.userId,
							staffingType: data.status.Id,
							note: '',
							date: new Date(),
						},
						status: data.status,
					};
				}
			})
		)
	);

	submitPersonStaffingNote$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStaffingNote>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE
			),
			tap((action) => {}),
			map((data) => {
				if (data && data.status) {
					return {
						type: statusesAction.StatusesActionTypes
							.SUBMIT_PERSON_STAFFING_NOTE_MODAL,
					};
				}
			})
		)
	);

	submitPersonSTaffingNoteModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE_MODAL
				),
				exhaustMap((data) =>
					this.runModal(ModalSetStaffingNotePage, null, null, {
						breakpoints: [0, 0.2, 0.5],
						initialBreakpoint: 0.5,
					})
				)
			),
		{ dispatch: false }
	);

	submitPersonStaffingNoteSet$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStatusNoteSet>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE_SET
			),
			//switchMap((action) => this.closeModal()),
			//switchMap((action) => this.loadingProvider.hide()),
			map((action) => {
				return {
					type: statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET,
					payload: action.payload,
				};
			})
		)
	);

	submitPersonStaffingSet$ = createEffect(() =>
		this.actions$.pipe(
			ofType<statusesAction.SubmitPersonStaffingSet>(
				statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET
			),
			concatLatestFrom(() => [
				this.homeStore.select(selectHomeState),
				this.statusesStore.select(selectStatusesState),
				this.settingsStore.select(selectSettingsState),
			]),
			switchMap(([action, homeState, statusesState, settingsState], index) => {
				let staffing: SavePersonStaffingInput = new SavePersonStaffingInput();
				staffing.Type = action.payload.staffingType;
				staffing.UserId = settingsState.user.userId;
				staffing.TimestampUtc = action.payload.date.toUTCString().replace('UTC', 'GMT');
				staffing.Timestamp = action.payload.date.toISOString();
				staffing.Note = action.payload.note;

				return this.personnelStaffingProvider.savePersonStaffing(staffing).pipe(
					map((data) => {
						return {
							type: statusesAction.StatusesActionTypes
								.SUBMIT_PERSON_STAFFING_SET_DONE,
						};
					}),
					catchError(() =>
						of({
							type: statusesAction.StatusesActionTypes
								.SUBMIT_PERSON_STAFFING_SET_ERROR,
						})
					)
				);
			})
		)
	);

	submitPersonStaffingSetDone$ = createEffect(() =>
		this.actions$.pipe(
			ofType(statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET_DONE),
			switchMap(() => this.closeModal()),
			switchMap(() => this.loadingProvider.hide()),
			tap(() => {
				this.homeStore.dispatch(new HomeActions.GetCurrentStatus());
			}),
			map((data) => {
				return {
					type: statusesAction.StatusesActionTypes
						.SUBMIT_PERSON_STATUS_SET_FINISH,
				};
			})
		)
	);

	submitPersonStaffingSetError$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(
					statusesAction.StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET_ERROR
				),
				switchMap(() => this.closeModal()),
				switchMap(() => this.loadingProvider.hide())
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private modalController: ModalController,
		private unitStatusService: UnitStatusService,
		private homeStore: Store<HomeState>,
		private statusesStore: Store<StatusesState>,
		private loadingProvider: LoadingProvider,
		private menuCtrl: MenuController,
		private personnelStatusesProvider: PersonnelStatusesService,
		private personnelStaffingProvider: PersonnelStaffingService,
		private settingsStore: Store<SettingsState>
	) {}

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
		} catch (error) {}
	};
}
