import * as homeAction from '../actions/home.actions';
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
  filter,
  map,
  mergeMap,
  switchMap,
  tap,
} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { forkJoin, from, Observable, of } from 'rxjs';
import { MenuController, ModalController } from '@ionic/angular';
import { AlertProvider } from 'src/app/providers/alert';
import { LoadingProvider } from 'src/app/providers/loading';
import { StorageProvider } from 'src/app/providers/storage';
import { Router } from '@angular/router';
import {
  MappingService,
  UnitStatusService,
  UnitLocationService,
  SaveUnitLocationInput,
  PersonnelStatusesService,
  PersonnelStaffingService,
  PersonnelLocationService,
  SavePersonnelLocationInput,
} from '@resgrid/ngx-resgridlib';
import { HomeState } from '../store/home.store';
import { HomeProvider } from '../providers/home';
import { VoiceState } from '../../voice/store/voice.store';
import * as VoiceActions from '../../voice/actions/voice.actions';
import { selectHomeState, selectSettingsState } from 'src/app/store';
import { PushProvider } from 'src/app/providers/push';
import { ModalCallPush } from '../modals/callPush/modal-callPush.page';
import { GeolocationProvider } from 'src/app/providers/geolocation';

@Injectable()
export class HomeEffects {
  private _modalRef: HTMLIonModalElement;

  loadAppData$ = createEffect(() =>
    this.actions$.pipe(
      ofType<homeAction.LoadAppData>(homeAction.HomeActionTypes.LOADING_APP_DATA),
      mergeMap((action) =>
      this.homeProvider.getAppData().pipe(
        // If successful, dispatch success action with result
        map((data) => ({
          type: homeAction.HomeActionTypes.LOADING_APP_DATA_SUCCESS,
          payload: data,
        })),
        // If request fails, dispatch failed action
        catchError(() =>
          of({ type: homeAction.HomeActionTypes.LOADING_APP_DATA_FAIL })
        )
      )
    )
    )
  );

  loadAppDataSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType<homeAction.LoadAppDataSuccess>(homeAction.HomeActionTypes.LOADING_APP_DATA_SUCCESS),
      switchMap((action) => this.loadingProvider.hide()),
      tap((action) => {
        this.voiceStore.dispatch(new VoiceActions.GetVoipInfo());
      }),
      tap((action) => {
        this.pushProvider.initPush();
      }),
      map((action) => ({
        type: homeAction.HomeActionTypes.LOADING_APP_DATA_DONE,
      }))
    )
  );

  loadAppDataFail$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.LOADING_APP_DATA_FAIL),
        switchMap((action) => this.loadingProvider.hide()),
        switchMap((action) => this.alertProvider.showErrorAlert(
          'Unable to load data',
          '',
          'There was an issue trying to fetch the app data, please try again.'
        ))
      ),
    { dispatch: false }
  );

  closeModal$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.CLOSE_MODAL),
        switchMap((action) => this.closeModal(null))
      ),
    { dispatch: false }
  );

  getCurrentStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType<homeAction.GetCurrentStatus>(
        homeAction.HomeActionTypes.GET_CURRENT_STATUS
      ),
      switchMap((action) =>
        forkJoin([
          this.personnelStatusProvider.getCurrentStatus(''),
          this.personnelStaffingProvider.getCurrentStatffing(''),
        ]).pipe(
          map((result) => ({
            type: homeAction.HomeActionTypes.GET_CURRENT_STATUS_SET,
            status: result[0].Data,
            staffing: result[1].Data,
          }))
        )
      )
    )
  );

  getCurrentStatusSet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(homeAction.HomeActionTypes.GET_CURRENT_STATUS_SET),
      map((data) => {
        return {
          type: homeAction.HomeActionTypes.GET_CURRENT_STATUS_DONE,
        };
      })
    )
  );

  getCurrentStatusDone$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.GET_CURRENT_STATUS_DONE),
        tap((action) => {})
      ),
    { dispatch: false }
  );

  startSignalR$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.START_SIGNALR),
        tap((action) => {
          this.homeProvider.startSignalR();
        })
      ),
    { dispatch: false }
  );

  stopSignalR$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.STOP_SIGNALR),
        tap((action) => {
          this.homeProvider.stopSignalR();
        })
      ),
    { dispatch: false }
  );

  pushNewCallReceived$ = createEffect(() =>
    this.actions$.pipe(
      ofType<homeAction.PushCallReceived>(
        homeAction.HomeActionTypes.PUSH_CALLRECEIVED
      ),
      map((data) => {
        return {
          type: homeAction.HomeActionTypes.PUSH_CALLRECEIVED_SHOWMODAL,
        };
      })
    )
  );

  showPushNewCallReceivedModal$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.PUSH_CALLRECEIVED_SHOWMODAL),
        exhaustMap((data) => this.runModal(ModalCallPush, null, null, null))
      ),
    { dispatch: false }
  );

  geolocationStartTracking$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.GEOLOCATION_START_TRACKING),
        switchMap((action) => this.geoProvider.startTracking())
      ),
    { dispatch: false }
  );

  geolocationStopTracking$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.GEOLOCATION_STOP_TRACKING),
        switchMap((action) => this.geoProvider.stopTracking())
      ),
    { dispatch: false }
  );

  backgroundGeolocationStartTracking$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.BACKGROUND_GEOLOCATION_START),
        switchMap((action) => this.geoProvider.initBackgroundGeolocation())
      ),
    { dispatch: false }
  );

  backgroundGeolocationStopTracking$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(homeAction.HomeActionTypes.BACKGROUND_GEOLOCATION_STOP),
        switchMap((action) => this.geoProvider.stopBackgroundGeolocation())
      ),
    { dispatch: false }
  );

  geoPositionUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType<homeAction.GeolocationLocationUpdate>(
        homeAction.HomeActionTypes.GEOLOCATION_LOCATION_UPDATE
      ),
      concatLatestFrom(() => [this.store.select(selectHomeState), this.store.select(selectSettingsState)]),
      switchMap(([action, homeState, settingsState], index) => {
        if (homeState && settingsState && settingsState.user) {
          let date = new Date();
          let doSend = true;

          let location: SavePersonnelLocationInput = {
            UserId: settingsState.user.userId,
            Timestamp: date.toUTCString().replace('UTC', 'GMT'),
            Latitude: action.payload.Latitude?.toString(),
            Longitude: action.payload.Longitude?.toString(),
            Accuracy: action.payload.Accuracy?.toString(),
            Altitude: action.payload.Altitude?.toString(),
            AltitudeAccuracy: action.payload.AltitudeAccuracy?.toString(),
            Speed: action.payload.Speed?.toString(),
            Heading: action.payload.Heading?.toString(),
          };

          if (!homeState.currentPositionTimestamp) {
            console.log('does not have current position timestamp');
            doSend = true;
          } else {
            let diff =
              (date.getTime() - homeState.currentPositionTimestamp.getTime()) /
              30000;
            console.log('geolocation timestamp diff: ' + diff);

            if (diff >= 2) {
              doSend = true;
            } else {
              doSend = false;
            }
          }

          if (doSend) {
            return this.personnelLocationService.savePersonnelLocation(location).pipe(
              map((data) => {
                return {
                  type: homeAction.HomeActionTypes.GEOLOCATION_LOCATION_UPDATE_SENT,
                };
              })
            );
          } else {
            return of({
              type: homeAction.HomeActionTypes.GEOLOCATION_LOCATION_UPDATE_DONE,
            });
          }
        } else {
          return of({
            type: homeAction.HomeActionTypes.GEOLOCATION_LOCATION_UPDATE_DONE,
          });
        }
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<HomeState>,
    private modalController: ModalController,
    private alertProvider: AlertProvider,
    private loadingProvider: LoadingProvider,
    private storageProvider: StorageProvider,
    private mapProvider: MappingService,
    private router: Router,
    private geoProvider: GeolocationProvider,
    private homeProvider: HomeProvider,
    private voiceStore: Store<VoiceState>,
    private unitStatusService: UnitStatusService,
    private personnelLocationService: PersonnelLocationService,
    private pushProvider: PushProvider,
    private menuCtrl: MenuController,
    private personnelStatusProvider: PersonnelStatusesService,
		private personnelStaffingProvider: PersonnelStaffingService,
  ) {}

  runModal = async (component, cssClass, properties, id, opts = {}) => {
		await this.menuCtrl.close();

		if (!cssClass) {
			cssClass = 'modal-container';
		}

		if (!id) {
			id = 'HomeFeatureModal';
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
			id = 'HomeFeatureModal';
		}

		try {
			var activeModal = await this.modalController.getTop();

			if (activeModal) {
				await this.modalController.dismiss(null, null, id);
			}
		} catch (error) {}
	};
}
