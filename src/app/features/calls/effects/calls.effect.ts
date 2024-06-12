import { Action, Store } from '@ngrx/store';
import {
	Actions,
	concatLatestFrom,
	createEffect,
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
import { from, Observable, of, forkJoin } from 'rxjs';
import {
	CallFilesService,
	CallNotesService,
	CallsService,
	MessagesService,
	SaveUnitStatusInput,
	UnitStatusService,
	VoiceService,
} from '@resgrid/ngx-resgridlib';
import { MenuController, ModalController } from '@ionic/angular';
import { HomeState } from '../../home/store/home.store';
import { selectHomeState, selectStatusesState } from 'src/app/store';
import { LoadingProvider } from 'src/app/providers/loading';
import { CallsState } from '../store/calls.store';
import * as callActions from '../actions/calls.actions';
import { ModalViewCallPage } from '../pages/view-call/view-call.page';
import { NewCallPage } from '../pages/new-call/new-call.page';
import { SelectLocationPage } from '../pages/select-location/select-location.page';
import { SelectDispatchesPage } from '../pages/select-dispatches/select-dispatches.page';
import { CloseCallPage } from '../pages/close-call/close-call.page';
import { AlertProvider } from 'src/app/providers/alert';
import { EditCallPage } from '../pages/edit-call/edit-call.page';
import { SelectDispatchesEditPage } from '../pages/select-dispatches-edit/select-dispatches-edit.page';
import { GeolocationProvider } from 'src/app/providers/geolocation';
import { ModalCallNotesPage } from '../modals/notes-modal/modal-notes.page';

@Injectable()
export class CallsEffects {
	private _modalRef: HTMLIonModalElement;

	getCalls$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.GetCalls>(callActions.CallsActionTypes.GET_CALLS),
			tap(() => this.loadingProvider.show()),
			concatLatestFrom(() => [this.homeStore.select(selectHomeState)]),
			switchMap(([action, homeState], index) => {
				return this.callsProvider.getActiveCalls().pipe(
					map((data) => ({
						type: callActions.CallsActionTypes.GET_CALLS_DONE,
						calls: data.Data,
						priorities: homeState.callPriorties,
					})),
					catchError(() =>
						of({ type: callActions.CallsActionTypes.GET_CALLS_FAIL })
					)
				);
			})
		)
	);

	getCallById$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.GetCallById>(
				callActions.CallsActionTypes.GET_CALL_BYID
			),
			tap(() => this.loadingProvider.show()),
			concatLatestFrom(() => [this.homeStore.select(selectHomeState)]),
			switchMap(([action, homeState], index) =>
				forkJoin([
					this.callsProvider.getCall(action.callId),
					this.callsProvider.getCallExtraData(action.callId),
				]).pipe(
					map((result) => ({
						type: callActions.CallsActionTypes.GET_CALL_BYID_SUCCESS,
						call: result[0].Data,
						data: result[1].Data,
						priorities: homeState.callPriorties,
					})),
					catchError(() =>
						of({ type: callActions.CallsActionTypes.GET_CALL_BYID_FAIL })
					)
				)
			)
		)
	);

	getCallByIdSuccess$ = createEffect(() =>
		this.actions$.pipe(
			ofType(callActions.CallsActionTypes.GET_CALL_BYID_SUCCESS),
			switchMap(() =>
				this.runModal(ModalViewCallPage, 'modal-container-full', null, null)
			),
			switchMap(() => this.loadingProvider.hide()),
			map(() => ({ type: callActions.CallsActionTypes.GET_CALL_BYID_DONE }))
		)
	);

	getCallByIdFail$ = createEffect(
		() => this.actions$.pipe(switchMap(() => this.loadingProvider.hide())),
		{ dispatch: false }
	);

	getCallsDone$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.GET_CALLS_DONE),
				exhaustMap(() => this.loadingProvider.hide()),
				map((data) => ({
					type: callActions.CallsActionTypes.DONE,
				}))
			)
	);

	getCallsFail$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.GET_CALLS_FAIL),
				switchMap(() => this.loadingProvider.hide()),
				map((data) => ({
					type: callActions.CallsActionTypes.DONE,
				}))
			)
	);

	showCallNotes$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.ShowCallNotesModal>(
				callActions.CallsActionTypes.SHOW_CALLNOTES
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.callNotesProvider.getCallNotes(action.callId).pipe(
					map((data) => ({
						type: callActions.CallsActionTypes.OPEN_CALLNOTES,
						payload: data.Data,
					}))
				)
			)
		)
	);

	showCallNotesModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType(callActions.CallsActionTypes.OPEN_CALLNOTES),
			switchMap(() =>
				this.runModal(
					ModalCallNotesPage,
					'modal-container-full',
					null,
					'CallsFeatureCallNotesModal'
				)
			),
			switchMap(() => this.loadingProvider.hide()),
			map((data) => ({
				type: callActions.CallsActionTypes.DONE,
			}))
		)
	);

	dismissCallNotesModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.CLOSE_CALLNOTES),
				exhaustMap((data) => this.closeModal('CallsFeatureCallNotesModal'))
			),
		{ dispatch: false }
	);

	saveCallNote$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.SaveCallNote>(
				callActions.CallsActionTypes.SAVE_CALLNOTE
			),
			mergeMap((action) =>
				this.callNotesProvider
					.saveCallNote(action.callId, action.userId, action.callNote, null)
					.pipe(
						// If successful, dispatch success action with result
						map((data) => ({
							type: callActions.CallsActionTypes.SHOW_CALLNOTES,
							callId: action.callId,
						})),
						// If request fails, dispatch failed action
						catchError(() =>
							of({ type: callActions.CallsActionTypes.SAVE_CALLNOTE_FAIL })
						)
					)
			)
		)
	);

	setVewCallBackToDefault$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.SetViewCallModal>(
				callActions.CallsActionTypes.SET_VIEW_CALL_MODAL
			),
			map((data) => ({
				type: callActions.CallsActionTypes.DONE,
			}))
		)
	);

	openCallImagesModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.ShowCallImagesModal>(
				callActions.CallsActionTypes.SHOW_CALLIMAGES
			),
			tap(() => this.loadingProvider.hide()),
			mergeMap((action) =>
				this.callFilesProvider.getCallImages(action.callId, true).pipe(
					map((data) => ({
						type: callActions.CallsActionTypes.OPEN_CALLIMAGES,
						payload: data.Data,
					}))
				)
			)
		)
	);

	openCallFilesModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.ShowCallFilesModal>(
				callActions.CallsActionTypes.SHOW_CALLFILESMODAL
			),
			tap(() => this.loadingProvider.hide()),
			mergeMap((action) =>
				this.callFilesProvider.getCallFiles(action.callId, true).pipe(
					map((data) => ({
						type: callActions.CallsActionTypes.OPEN_CALLFILESMODAL,
						payload: data.Data,
					}))
				)
			)
		)
	);

	uploadCallImage$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.UploadCallImage>(
				callActions.CallsActionTypes.UPLOAD_CALLIMAGE
			),
			mergeMap((action) =>
				this.callFilesProvider
					.saveCallImage(
						action.callId,
						action.userId,
						'',
						action.name,
						null,
						action.image
					)
					.pipe(
						// If successful, dispatch success action with result
						map((data) => ({
							type: callActions.CallsActionTypes.SHOW_CALLIMAGES,
							callId: action.callId,
						})),
						// If request fails, dispatch failed action
						catchError(() =>
							of({ type: callActions.CallsActionTypes.UPLOAD_CALLIMAGE_FAIL })
						)
					)
			)
		)
	);

	showNewCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType(callActions.CallsActionTypes.SHOW_NEW_CALL_MODAL),
			switchMap(() =>
				this.runModal(
					NewCallPage,
					'modal-container-full',
					null,
					'CallsFeatureModal'
				)
			),
			switchMap(() => this.loadingProvider.hide())
		),
		{ dispatch: false }
	);

	showSetLocationModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.SHOW_SET_LOCATION_MODAL),
				exhaustMap((data) =>
					this.runModal(
						SelectLocationPage,
						'modal-container-full',
						null,
						'SelectLocationModal'
					)
				)
			),
		{ dispatch: false }
	);

	dismissSetLocationModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.CLOSE_SET_LOCATION_MODAL),
				exhaustMap((data) => this.closeModal('SelectLocationModal'))
			),
		{ dispatch: false }
	);

	closeNewCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.CloseNewCallModal>(
				callActions.CallsActionTypes.CLOSE_NEW_CALL_MODAL
			),
			exhaustMap((data) => this.closeModal('CallsFeatureModal')),
			map((action) => ({
				type: callActions.CallsActionTypes.DONE,
			}))
		)
	);

	showCloseCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType(callActions.CallsActionTypes.SHOW_CLOSE_CALL_MODAL),
			switchMap(() =>
				this.runModal(
					CloseCallPage,
					'modal-container-full',
					null,
					'CallsFeatureCloseCallModal'
				)
			),
			switchMap(() => this.loadingProvider.hide())
		),
		{ dispatch: false }
	);

	closeCloseCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.CloseCloseCallModal>(
				callActions.CallsActionTypes.CLOSE_CLOSE_CALL_MODAL
			),
			exhaustMap((data) => this.closeModal('CallsFeatureCloseCallModal')),
			map((action) => ({
				type: callActions.CallsActionTypes.DONE,
			}))
		)
	);

	dispatchCall$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.DispatchCall>(
				callActions.CallsActionTypes.DISPATCH_CALL
			),
			mergeMap((action) =>
				this.callsProvider
					.saveCall(
						action.name,
						action.priority,
						action.callType,
						action.contactName,
						action.contactInfo,
						action.externalId,
						action.incidentId,
						action.referenceId,
						action.nature,
						action.notes,
						action.address,
						action.w3w,
						action.latitude,
						action.longitude,
						action.dispatchList,
						action.dispatchOn,
						action.callFormData
					)
					.pipe(
						// If successful, dispatch success action with result
						map((data) => ({
							type: callActions.CallsActionTypes.DISPATCH_CALL_SUCCESS,
						})),
						// If request fails, dispatch failed action
						catchError(() =>
							of({ type: callActions.CallsActionTypes.DISPATCH_CALL_FAIL })
						)
					)
			)
		)
	);

	showSelectDispatches$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.ShowSelectDispatches>(
				callActions.CallsActionTypes.SHOW_SELECT_DISPATCHS
			),
			switchMap((action) => this.messagesService.getRecipients(true, true).pipe(
					map((data) => ({
							type: callActions.CallsActionTypes.SHOW_SELECT_DISPATCHS_SUCCESS,
							dispatches: data.Data,
						})),
					catchError(() =>
						of({
							type: callActions.CallsActionTypes.SHOW_SELECT_DISPATCHS_FAIL,
						})
					)
				))
		)
	);

	showSelectDispatchesSuccess$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.SHOW_SELECT_DISPATCHS_SUCCESS),
				exhaustMap((data) =>
					this.runModal(
						SelectDispatchesPage,
						'modal-container-full',
						null,
						'SelectDispatchesModal'
					)
				)
			),
		{ dispatch: false }
	);

	dismissSelectDispatchesModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.CLOSE_SELECT_DISPATCHS_MODAL),
				exhaustMap((data) => this.closeModal('SelectDispatchesModal'))
			),
		{ dispatch: false }
	);

	createCallSuccessful$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.ShowSelectDispatches>(
				callActions.CallsActionTypes.DISPATCH_CALL_SUCCESS
			),
			exhaustMap((data) => this.closeModal(null)),
			exhaustMap((data) => this.closeModal('CallsFeatureModal')),
			map((data) => ({
					type: callActions.CallsActionTypes.GET_CALLS,
				}))
		)
	);

	closeCall$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.CloseCall>(
				callActions.CallsActionTypes.CLOSE_CALL
			),
			tap(() => this.loadingProvider.show()),
			mergeMap((action) =>
				this.callsProvider.closeCall(action.callId, action.closeNote, action.closeType)
					.pipe(
						// If successful, dispatch success action with result
						map((data) => ({
							type: callActions.CallsActionTypes.CLOSE_CALL_SUCCESS
						})),
						// If request fails, dispatch failed action
						catchError(() =>
							of({ type: callActions.CallsActionTypes.CLOSE_CALL_FAIL })
						)
					)
			)
		)
	);

	closeCallSuccessful$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.CloseCallSuccess>(
				callActions.CallsActionTypes.CLOSE_CALL_SUCCESS
			),
			switchMap((data) => this.closeModal('CallsFeatureModal')),
			switchMap((data) => this.closeModal('CallsFeatureCloseCallModal')),
			switchMap(() => this.loadingProvider.hide()),
			map((data) => ({
					type: callActions.CallsActionTypes.GET_CALLS,
				}))
		)
	);

	closeCallFail$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.CLOSE_CALL_FAIL),
				switchMap(() => this.loadingProvider.hide()),
				switchMap((action) => this.alertProvider.showErrorAlert(
					'Unable to Close Call',
					'',
					'There was an issue trying to close the call, please try again.'
				  )),
			),
		{ dispatch: false }
	);

	dismissEditCallSelectDispatchesModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(callActions.CallsActionTypes.CLOSE_SELECT_DISPATCHS_MODAL),
				exhaustMap((data) => this.closeModal('SelectDispatchesModal'))
			),
		{ dispatch: false }
	);

	getEditCallDispatches$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.GetEditCallDispatches>(
				callActions.CallsActionTypes.GET_EDIT_CALL_DISPATCHES
			),
			switchMap((action) => this.messagesService.getRecipients(true, true).pipe(
					map((data) => ({
							type: callActions.CallsActionTypes.GET_EDIT_CALL_DISPATCHES_SUCCESS,
							dispatches: data.Data,
						})),
					catchError(() =>
						of({
							type: callActions.CallsActionTypes.DONE,
						})
					)
				))
		)
	);

	showEditCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType(callActions.CallsActionTypes.SHOW_EDIT_CALL_MODAL),
			switchMap(() =>
				this.runModal(
					EditCallPage,
					'modal-container-full',
					null,
					'CallsFeatureEditCallModal'
				)
			),
			switchMap(() => this.loadingProvider.hide())
		),
		{ dispatch: false }
	);

	closeEditCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.CloseEditCallModal>(
				callActions.CallsActionTypes.CLOSE_EDIT_CALL_MODAL
			),
			switchMap((data) => this.closeModal('CallsFeatureEditCallModal'))
		),
		{ dispatch: false }
	);

	closeViewCallModal$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.CloseViewCallModal>(
				callActions.CallsActionTypes.CLOSE_VIEW_CALL_MODAL
			),
			switchMap((data) => this.closeModal(null)),
			map((data) => ({
				type: callActions.CallsActionTypes.DONE,
			}))
		)
	);

	showSelectEditCallDispatches$ = createEffect(() =>
		this.actions$.pipe(
			ofType(callActions.CallsActionTypes.SHOW_EDIT_CALL_SELECT_DISPATCHS),
			switchMap(() =>
				this.runModal(
					SelectDispatchesEditPage,
					'modal-container-full',
					null,
					'SelectDispatchesModal'
				)
			),
			switchMap(() => this.loadingProvider.hide())
		),
		{ dispatch: false }
	);

	updateCall$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.UpdateCall>(
				callActions.CallsActionTypes.UPDATE_CALL
			),
			mergeMap((action) =>
				this.callsProvider
					.updateCall(
						action.callId,
						action.name,
						action.priority,
						action.callType,
						action.contactName,
						action.contactInfo,
						action.externalId,
						action.incidentId,
						action.referenceId,
						action.nature,
						action.notes,
						action.address,
						action.w3w,
						action.latitude,
						action.longitude,
						action.dispatchList,
						action.dispatchOn,
						action.callFormData,
						action.redispatch
					)
					.pipe(
						// If successful, dispatch success action with result
						map((data) => ({
							type: callActions.CallsActionTypes.UPDATE_CALL_SUCCESS,
						})),
						// If request fails, dispatch failed action
						catchError(() =>
							of({ type: callActions.CallsActionTypes.UPDATE_CALL_FAIL })
						)
					)
			)
		)
	);

	updateCallSuccessful$ = createEffect(() =>
		this.actions$.pipe(
			ofType<callActions.UpdateCallSuccess>(
				callActions.CallsActionTypes.UPDATE_CALL_SUCCESS
			),
			exhaustMap((data) => this.closeModal('CallsFeatureEditCallModal')),
			map((data) => ({
					type: callActions.CallsActionTypes.GET_CALLS,
				}))
		)
	);

	getCoordinatesForAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType<callActions.GetCoordinatesForAddress>(
        callActions.CallsActionTypes.GET_COORDINATESFORADDRESS
      ),
      mergeMap((action) =>
        //this.locationProvider.getCoordinatesForAddressFromGoogle(action.address).pipe(
        this.geocodingProvider.getLocationFromAddress(action.address).pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: callActions.CallsActionTypes.GET_COORDINATESFORADDRESS_SUCCESS,
            payload: data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({
              type: callActions.CallsActionTypes.GET_COORDINATESFORADDRESS_FAIL,
            })
          )
        )
      )
    )
  );

  getCoordinatesForW3W$ = createEffect(() =>
    this.actions$.pipe(
      ofType<callActions.GetCoordinatesForW3W>(
        callActions.CallsActionTypes.GET_COORDINATES_FORW3W
      ),
      mergeMap((action) =>
        //this.locationProvider.getCoordinatesForAddressFromGoogle(action.address).pipe(
        this.geocodingProvider.getCoordinatesFromW3W(action.w3w).pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: callActions.CallsActionTypes.GET_COORDINATES_FORW3W_SUCCESS,
            payload: data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({
              type: callActions.CallsActionTypes.GET_COORDINATES_FORW3W_FAIL,
            })
          )
        )
      )
    )
  );

  getCoordinatesForPlus$ = createEffect(() =>
    this.actions$.pipe(
      ofType<callActions.GetCoordinatesForPlus>(
        callActions.CallsActionTypes.GET_COORDINATES_FOR_PLUS
      ),
      mergeMap((action) =>
        //this.locationProvider.getCoordinatesForAddressFromGoogle(action.address).pipe(
        this.geocodingProvider.getCoordinatesFromPlusCode(action.plusCode).pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: callActions.CallsActionTypes.GET_COORDINATES_FOR_PLUS_SUCCESS,
            payload: data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({
              type: callActions.CallsActionTypes.GET_COORDINATES_FOR_PLUS_FAIL,
            })
          )
        )
      )
    )
  );

  getCoordinatesForPlusFail$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(callActions.CallsActionTypes.GET_COORDINATES_FOR_PLUS_FAIL),
        switchMap(() => this.loadingProvider.hide()),
        switchMap((action) =>
          this.alertProvider.showErrorAlert(
            'Plus Code Error',
            '',
            'Unable to get coordinates from the plus code. Make sure its full and in the correct format and try again.'
          )
        )
      ),
    { dispatch: false }
  );

  editGetCoordinatesForAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType<callActions.EditGetCoordinatesForAddress>(
        callActions.CallsActionTypes.EDIT_GET_COORDINATES_FOR_ADDRESS
      ),
      mergeMap((action) =>
        //this.locationProvider.getCoordinatesForAddressFromGoogle(action.address).pipe(
        this.geocodingProvider.getLocationFromAddress(action.address).pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: callActions.CallsActionTypes.EDIT_GET_COORDINATES_FOR_ADDRESS_SUCCESS,
            payload: data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({
              type: callActions.CallsActionTypes.GET_COORDINATESFORADDRESS_FAIL,
            })
          )
        )
      )
    )
  );

  editGetCoordinatesForW3W$ = createEffect(() =>
    this.actions$.pipe(
      ofType<callActions.EditGetCoordinatesForW3W>(
        callActions.CallsActionTypes.EDIT_GET_COORDINATES_FOR_W3W
      ),
      mergeMap((action) =>
        //this.locationProvider.getCoordinatesForAddressFromGoogle(action.address).pipe(
        this.geocodingProvider.getCoordinatesFromW3W(action.w3w).pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: callActions.CallsActionTypes.EDIT_GET_COORDINATES_FOR_W3W_SUCCESS,
            payload: data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({
              type: callActions.CallsActionTypes.GET_COORDINATES_FORW3W_FAIL,
            })
          )
        )
      )
    )
  );

  editGetCoordinatesForPlus$ = createEffect(() =>
    this.actions$.pipe(
      ofType<callActions.EditGetCoordinatesForPlus>(
        callActions.CallsActionTypes.EDIT_GET_COORDINATES_FOR_PLUS
      ),
      mergeMap((action) =>
        //this.locationProvider.getCoordinatesForAddressFromGoogle(action.address).pipe(
        this.geocodingProvider.getCoordinatesFromPlusCode(action.plusCode).pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: callActions.CallsActionTypes.EDIT_GET_COORDINATES_FOR_PLUS_SUCCESS,
            payload: data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({
              type: callActions.CallsActionTypes.GET_COORDINATES_FOR_PLUS_FAIL,
            })
          )
        )
      )
    )
  );

	done$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType<callActions.SetViewCallModal>(callActions.CallsActionTypes.DONE)
			),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private modalController: ModalController,
		private unitStatusService: UnitStatusService,
		private homeStore: Store<HomeState>,
		private callsStore: Store<CallsState>,
		private loadingProvider: LoadingProvider,
		private callsProvider: CallsService,
		private callNotesProvider: CallNotesService,
		private callFilesProvider: CallFilesService,
		private menuCtrl: MenuController,
		private messagesService: MessagesService,
		private alertProvider: AlertProvider,
		private geocodingProvider: GeolocationProvider
	) {}

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
