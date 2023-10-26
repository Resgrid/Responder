import * as voiceAction from '../actions/voice.actions';
import { Action, Store } from '@ngrx/store';
import {
  Actions,
  concatLatestFrom,
  createEffect,
  Effect,
  ofType,
} from '@ngrx/effects';
import { catchError, concatMap, exhaustMap, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { VoiceState } from '../store/voice.store';
import {
  KazooVoiceService,
  VoiceService,
} from '@resgrid/ngx-resgridlib';
import { HomeState } from '../../home/store/home.store';
import { selectHomeState, selectSettingsState, selectVoiceState } from 'src/app/store';
import { SettingsState } from '../../settings/store/settings.store';
import { AudioProvider } from 'src/app/providers/audio';
import { MenuController, ModalController, ToastController } from '@ionic/angular';
import { Resgrid, ResgridPluginStartOptions } from 'capacitor-plugin-resgrid';
import { ModalAudioStreams } from '../modal/audio-streams/modal-audioStreams.page';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';

@Injectable()
export class VoiceEffects {
  private _modalRef: HTMLIonModalElement;

  getVoipInfo$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.GetVoipInfo>(
        voiceAction.VoiceActionTypes.GET_VOIPINFO
      ),
      concatLatestFrom(() => [this.store.select(selectVoiceState), this.homeStore.select(selectHomeState), this.settingsStore.select(selectSettingsState)]),
      exhaustMap(([action, voiceState, homeState, settingsState], index) =>
        this.voiceService.getDepartmentVoiceSettings().pipe(
          map((data) => {
            if (data && data.Data && data.Data.VoiceEnabled && homeState.isMobileApp) {
                if (settingsState && settingsState.user) {
                  let name = settingsState.user.fullName;

                  let options = {
                    token: '',
                    url: data.Data.VoipServerWebsocketSslAddress,
                    type: 0,
                    title: 'test',
                    defaultMic: '',
                    defaultSpeaker: '',
                    apiUrl: environment.baseApiUrl + '/',
                    canConnectToVoiceApiToken: data.Data.CanConnectApiToken,
                    rooms: []
                  };

                  if (data.Data.Channels && data.Data.Channels.length > 0) {
                    data.Data.Channels.forEach(channel => {
                      options.rooms.push({name: channel.Name, id: channel.Id, token: channel.Token});
                    });
                  }

                  if ((Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') && Capacitor.isPluginAvailable('Resgrid')) {
                    Resgrid.start(options).then(function after_resgrid_plugin_start(data) {
                      
                    });
                  }

                  // Disabling this for now. Need to figure out how to get the permissions to work.
                  //Resgrid.requestPermissions();
                }
            }

            if (!homeState.isMobileApp && data.Data.VoiceEnabled) {
              data.Data.VoiceEnabled = false;
            }

            return {
              type: voiceAction.VoiceActionTypes.GET_VOIPINFO_SUCCESS,
              payload: data.Data,
            }
          }),
          tap((data) => {}),
          // If request fails, dispatch failed action
          catchError(() =>
            of({ type: voiceAction.VoiceActionTypes.GET_VOIPINFO_FAIL })
          )
        )
      )
    )
  );

  getVoipInfoSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType<voiceAction.GetVoipInfoSuccess>(
          voiceAction.VoiceActionTypes.GET_VOIPINFO_SUCCESS
        ),
        map((data) => ({
          type: voiceAction.VoiceActionTypes.START_VOIP_SERVICES,
          payload: data.payload,
        }))
      )
  );

  startVoipServices$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType<voiceAction.StartVoipServices>(
          voiceAction.VoiceActionTypes.START_VOIP_SERVICES
        ),
        tap((action) => {
          //this.voiceProvider.startVoipServices(action.payload);
        })
      ),
    { dispatch: false }
  );

  showPttPlugin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType<voiceAction.StartVoipServices>(
          voiceAction.VoiceActionTypes.SHOW_PTT_PLUGIN
        ),
        tap((action) => {
          Resgrid.showModal();
        })
      ),
    { dispatch: false }
  );

  setNoChannel$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.SetNoChannel>(
        voiceAction.VoiceActionTypes.SET_NOCHANNEL
      ),
      tap((data) => {
        //this.openViduService.leaveSession();
      })
    ),
    { dispatch: false }
  );

  @Effect({ dispatch: false })
  setActiveChannel$: Observable<Action> = this.actions$.pipe(
    ofType<voiceAction.SetActiveChannel>(
      voiceAction.VoiceActionTypes.SET_ACTIVECHANNEL
    ),
    concatLatestFrom(() => [
      this.homeStore.select(selectHomeState),
      this.settingsStore.select(selectSettingsState),
    ]),
    exhaustMap(([action, homeState, settingsState], index) =>
      of(action).pipe(
        concatMap((data) => {
            Resgrid.showModal();
            return of(data);
        })
      )
    )
  );

  voipCallStartTransmitting$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.StartTransmitting>(
        voiceAction.VoiceActionTypes.START_TRANSMITTING
      ),
      tap((data) => {
        //this.openViduService.unmute();
      })
    ),
    { dispatch: false }
  );

  voipCallStopTransmitting$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.StopTransmitting>(
        voiceAction.VoiceActionTypes.STOP_TRANSMITTING
      ),
      tap((data) => {
        //this.openViduService.mute();
      })
    ),
    { dispatch: false }
  );

  addOpenViduStream$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.AddOpenViduStream>(
        voiceAction.VoiceActionTypes.ADD_OPENVIDU_STREAM
      ),
      map((data) => ({
        type: voiceAction.VoiceActionTypes.DONE,
      }))
    )
  );

  removeOpenViduStream$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.RemoveOpenViduStream>(
        voiceAction.VoiceActionTypes.REMOVE_OPENVIDU_STREAM
      ),
      map((data) => ({
        type: voiceAction.VoiceActionTypes.DONE,
      }))
    )
  );

  getAudioStreams$ = createEffect(() =>
    this.actions$.pipe(
      ofType<voiceAction.GetAudioStreams>(voiceAction.VoiceActionTypes.GET_AUDIOSTREAMS),
      mergeMap((action) =>
        this.voiceService.getDepartmentAudioStreams().pipe(
          // If successful, dispatch success action with result
          map((data) => ({
            type: voiceAction.VoiceActionTypes.GET_AUDIOSTREAMS_SUCCESS,
            payload: data.Data,
          })),
          // If request fails, dispatch failed action
          catchError(() =>
            of({ type: voiceAction.VoiceActionTypes.GET_AUDIOSTREAMS_FAIL })
          )
        )
      )
    )
  );

  getAudioStreamsSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType<voiceAction.GetVoipInfoSuccess>(
          voiceAction.VoiceActionTypes.GET_AUDIOSTREAMS_SUCCESS
        ),
        map((data) => ({
          type: voiceAction.VoiceActionTypes.START_VOIP_SERVICES,
          payload: data.payload,
        }))
      )
  );

  submitUnitStatusDestination$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          voiceAction.VoiceActionTypes.SHOW_SELECT_AUDIO_MODAL
        ),
        concatLatestFrom(() => [
          this.homeStore.select(selectHomeState),
        ]),
        exhaustMap(([action, homeState], index) => {
          return this.runModal(ModalAudioStreams, null, null, {
            breakpoints: [0, 0.3, 0.5],
            initialBreakpoint: 0.3,
          });
        })
      ),
    { dispatch: false }
  );

  done$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType<voiceAction.Done>(voiceAction.VoiceActionTypes.DONE)
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private store: Store<VoiceState>,
    //private voiceProvider: KazooVoiceService,
    private voiceService: VoiceService,
    //private openViduService: OpenViduService,
    private homeStore: Store<HomeState>,
    private settingsStore: Store<SettingsState>,
    //private handsetProvider: HandsetProvider,
    private audioProvider: AudioProvider,
    private toastController: ToastController,
    private menuCtrl: MenuController,
    private modalController: ModalController,
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
    } catch (error) { }
  };

  showToast = async (message) => {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
    });
    toast.present();
  };
}
