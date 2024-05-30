import { Component, OnInit, Output } from '@angular/core';
import { MenuController, Platform } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { SettingsState } from '../../../../features/settings/store/settings.store';
import * as SettingsActions from '../../../../features/settings/actions/settings.actions';
import * as HomeActions from '../../../../features/home/actions/home.actions';
import { Observable, Subscription } from 'rxjs';
import { HomeState } from '../../../home/store/home.store';
import { selectHeadsetType, selectHomeState, selectKeepAliveState, selectThemePreferenceState,
   selectPushNotificationState, selectSelectedMic, selectSettingsState, selectBackgroundGeolocationState, 
   selectRealtimeGeolocationState} from 'src/app/store';
import { BluetoothProvider } from 'src/app/providers/bluetooth';
import { SubSink } from 'subsink';
import { SleepProvider } from 'src/app/providers/sleep';
import { IDevice } from 'src/app/models/deviceType';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-home-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  public homeState$: Observable<HomeState | null>;
  public settingsState$: Observable<SettingsState | null>;

  public pushNotificationEnabled$: Observable<boolean | null>;
  public themePreference$: Observable<number | null>;
  public keepAlive$: Observable<boolean | null>;
  public backgroundGeolocationEnabled$: Observable<boolean | null>;
  public realtimeGeolocationEnabled$: Observable<boolean | null>;
  public pushNotificationEnabled: boolean = false;
  public themePreference: string = '-1';
  public keepAliveEnabled: boolean = false;
  public headSetType: string = "-1";

  private subs = new SubSink();

  public microphones: IDevice[] = [];
  public selectedMicrophone: string;

  public speakers: IDevice[] = [];
  public selectedSpeaker: IDevice;

  constructor(
    public menuCtrl: MenuController,
    private store: Store<SettingsState>,
    private homeStore: Store<HomeState>,
    private bluetoothProvider: BluetoothProvider,
    private sleepProvider: SleepProvider,
    private platform: Platform
  ) {
    this.homeState$ = this.homeStore.select(selectHomeState);
    this.settingsState$ = this.store.select(selectSettingsState);
    this.themePreference$ = this.store.select(selectThemePreferenceState);
    this.pushNotificationEnabled$ = this.store.select(selectPushNotificationState);
    this.keepAlive$ = this.store.select(selectKeepAliveState);
    this.backgroundGeolocationEnabled$ = this.store.select(selectBackgroundGeolocationState);
    this.realtimeGeolocationEnabled$ = this.store.select(selectRealtimeGeolocationState);
  }

  ngOnInit() {

  }

  ionViewWillEnter() {

     //this.subs.sink = this.store.select(selectPushNotificationState).subscribe(data =>
    //  this.pushNotificationEnabled = data
    //  );
    //this.subs.sink = this.store.select(selectPerferDarkModeState).subscribe(data =>
    //  this.perferDarkMode = data
    //  );
    //this.subs.sink = this.store.select(selectKeepAliveState).subscribe(data =>
    //  this.keepAliveEnabled = data
    //  );

    this.subs.sink = this.store.select(selectHeadsetType).subscribe(data => {
      if (typeof(data) !== 'undefined') {
        this.headSetType = data.toString();
      }
    });

    this.subs.sink = this.store.select(selectSelectedMic).subscribe(data => {
      if (typeof(data) !== 'undefined') {
        this.selectedMicrophone = data.toString();
      }
    });

    this.subs.sink = this.store.select(selectThemePreferenceState).subscribe(data => {
      if (typeof(data) !== 'undefined') {
        this.themePreference = data.toString();
      }
    });
  }

  async ionViewDidEnter() {

  }

  ionViewWillLeave() {
    if (this.subs) {
      this.subs.unsubscribe();
    }
  }

  public showLoginModal() {
    this.store.dispatch(new SettingsActions.ShowLoginModal());
  }

  public showSetServerAddressModal() {
    this.store.dispatch(new SettingsActions.ShowSetServerModal());
  }

  public showsAboutModal() {
    this.store.dispatch(new SettingsActions.ShowAboutModal());
  }

  public clearCache() {
    this.store.dispatch(new SettingsActions.ClearCache());
  }

  public reloadData() {
    this.store.dispatch(new HomeActions.LoadAppData());
  }

  //async selectAudioDevice() {
  //  await this.bluetoothProvider.init();
 // }

  public setPushNotification(event) {
    if (event && event.detail) {
      this.store.dispatch(
        new SettingsActions.SavePushNotificationSetting(event.detail.checked)
      );

      if (event.detail.checked) {
        this.settingsState$.pipe(take(1)).subscribe((settingsState) => {
          if (settingsState && settingsState.loggedIn) {
            this.store.dispatch(new SettingsActions.RegisterPush());
          }
        });
      }
    }
  }

  public setPerferDarkMode(event) {
    this.store.dispatch(
      new SettingsActions.SavePerferDarkModeSetting(parseInt(event))
    );
  }

  public setKeepAlive(event) {
    this.store.dispatch(
      new SettingsActions.SaveKeepAliveSetting(event.detail.checked)
    );

    if (event.detail.checked) {
      this.sleepProvider.enable();
    } else {
      this.sleepProvider.disable();
    }
  }

  public setHeadsetType(event) {
    this.headSetType = event;
    this.store.dispatch(
      new SettingsActions.SaveHeadsetTypeSetting(parseInt(event))
    );
  }

  public setBackgroundGeolocation(event) {

    if (event.detail.checked) {
      this.store.dispatch(
        new SettingsActions.ShowBackgroundGeolocationMessage()
      );
    }

    this.store.dispatch(
      new SettingsActions.SaveEnableBackgroundGeolocationSetting(event.detail.checked)
    );
  }

  public setSendLocationUpdates(event) {
    this.store.dispatch(
      new SettingsActions.SaveRealtimeLocationSetting(event.detail.checked)
    );
  }

  public logOut() {
    this.store.dispatch(
      new SettingsActions.ShowPromptForLogout()
    );
  }

  public isAndroid() {
    return this.platform.is('android');
  }

  public isIos() {
    return this.platform.is('ios');
  }

  public async connectBle(): Promise<void> {
    await this.bluetoothProvider.init(parseInt(this.headSetType));
    await this.bluetoothProvider.start();
  }

  public setMic(event) {
    this.selectedMicrophone = event;
    this.store.dispatch(
      new SettingsActions.SaveMicSetting(event)
    );
  }
}
