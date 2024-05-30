import * as settingsAction from '../actions/settings.actions';
import { Store } from '@ngrx/store';
import {
	Actions,
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
} from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { forkJoin, from, of } from 'rxjs';
import { SettingsState } from '../store/settings.store';
import { MenuController, ModalController, Platform } from '@ionic/angular';
import { ModalLoginPage } from '../modals/login/modal-login.page';
import { AuthProvider } from '../providers/auth';
import { AlertProvider } from 'src/app/providers/alert';
import { LoadingProvider } from 'src/app/providers/loading';
import { StorageProvider } from 'src/app/providers/storage';
import { Router } from '@angular/router';
import { ModalServerInfoPage } from '../modals/serverInfo/modal-serverInfo.page';
import { HomeState } from '../../home/store/home.store';
import * as homeActions from '../../../features/home/actions/home.actions';
import { PushProvider } from 'src/app/providers/push';
import { ModalConfirmLogoutPage } from '../modals/confirmLogout/modal-confirmLogout.page';
import { ModalAboutPage } from '../modals/about/modal-about.page';
import { BluetoothProvider } from 'src/app/providers/bluetooth';
import { CacheProvider } from 'src/app/providers/cache';
import { GeolocationProvider } from 'src/app/providers/geolocation';
import * as Sentry from "@sentry/angular";
import { EHOSTUNREACH } from 'constants';

@Injectable()
export class SettingsEffects {
	private _modalRef: HTMLIonModalElement;

	showLoginModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.SHOW_LOGIN_MODAL),
				exhaustMap((data) => this.runModal(ModalLoginPage, null, null))
			),
		{ dispatch: false }
	);

	login$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.Login>(settingsAction.SettingActionTypes.LOGIN),
			switchMap((action) =>
				this.authProvider
					.login(action.payload.username, action.payload.password)
					.pipe(
						mergeMap((data) =>
							from(this.storageProvider.setLoginData(data)).pipe(
								tap((data) => {
									this.authProvider.startTrackingRefreshToken();
								}),
								map((data) => {
									if (data && data.Rights) {
										Sentry.setUser({ 
											username: data.sub, 
											email: data.Rights.EmailAddress,
											name: data.Rights.FullName,
											departmentId: data.Rights.DepartmentId,
											departmentName: data.Rights.DepartmentName });

										return {
											type: settingsAction.SettingActionTypes
												.SET_LOGINDATA_NAV_HOME,
											user: {
												userId: data.sub,
												emailAddress: data.Rights.EmailAddress,
												fullName: data.Rights.FullName,
												departmentId: data.Rights.DepartmentId,
												departmentName: data.Rights.DepartmentName,
											},
										};
									} else {
										return {
											type: settingsAction.SettingActionTypes.NAV_SETTINGS,
										};
									}
								}),
								catchError(() =>
									of({ type: settingsAction.SettingActionTypes.LOGIN_FAIL })
								)
							)
						),
						catchError(() =>
							of({ type: settingsAction.SettingActionTypes.LOGIN_FAIL })
						)
					)
			)
		)
	);

	loginSuccess$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.LOGIN_SUCCESS),
				switchMap(() => this.loadingProvider.hide()),
				switchMap(() => this.navHomeOrWalkthough())
			),
		{ dispatch: false }
	);

	loginDone$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.LOGIN_DONE),
				switchMap(() => this.loadingProvider.hide())
			),
		{ dispatch: false }
	);

	loginFail$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.LOGIN_FAIL),
				switchMap(() => this.loadingProvider.hide()),
				switchMap((action) =>
					this.alertProvider.showErrorAlert(
						'Login Error',
						'',
						'There was an issue trying to log you in, please check your username and password and try again.'
					)
				)
			),
		{ dispatch: false }
	);

	loggingIn$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.IS_LOGIN),
				switchMap(() => this.loadingProvider.show())
			),
		{ dispatch: false }
	);

	primeSettings$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.PrimeSettings>(
				settingsAction.SettingActionTypes.PRIME_SETTINGS
			),
			switchMap((action) =>
				forkJoin([
					this.storageProvider.getStartupData(),
					this.authProvider.refreshTokens(),
				]).pipe(
					map(
						(data) => {
							try {
								if (
									data &&
									data[0] &&
									data[0].loginData &&
									data[0].loginData.Rights
								) {
									Sentry.setUser({ 
										username: data[0].loginData.sub, 
										email: data[0].loginData.Rights.EmailAddress,
										name: data[0].loginData.Rights.FullName,
										departmentId: data[0].loginData.Rights.DepartmentId,
										departmentName: data[0].loginData.Rights.DepartmentName });

									return {
										type: settingsAction.SettingActionTypes
											.SET_LOGINDATA_NAV_HOME,
										user: {
											userId: data[0].loginData.sub,
											emailAddress: data[0].loginData.Rights.EmailAddress,
											fullName: data[0].loginData.Rights.FullName,
											departmentId: data[0].loginData.Rights.DepartmentId,
											departmentName: data[0].loginData.Rights.DepartmentName,
										},
										enablePushNotifications: data[0].pushNotificationsEnabled,
										themePreference: data[0].themePreference,
										keepAlive: data[0].keepAlive,
										headsetType: data[0].headsetType,
										enableBackgroundGeolocation: data[0].backgroundGeolocation,
										enableRealtimeGeolocation: data[0].realtimeGeolocation
									};
								} else {
									return {
										type: settingsAction.SettingActionTypes.NAV_SETTINGS,
									};
								}
							} catch (error) {
								console.error(JSON.stringify(error));
								return {
									type: settingsAction.SettingActionTypes.NAV_SETTINGS,
								};
							}
						},
						catchError((err) => {
							console.log('Caught Error, ', err);
							
              return of({
                type: settingsAction.SettingActionTypes.LOGOUT,
              })
						})
					)
				)
			),
      catchError((err) => {
        console.log('Caught Error, ', err);
        
        return of({
          type: settingsAction.SettingActionTypes.LOGOUT,
        })
      })
		)
	);

	setLoginDataNavHome$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.SET_LOGINDATA_NAV_HOME),
				tap(() => {
					this.authProvider.startTrackingRefreshToken();
				}),
				tap((data) => {
					this.geoProvider.startTracking();
				}),
				switchMap(() => this.loadingProvider.hide()),
				switchMap(() => this.closeModal()),
				switchMap(() => this.navHomeOrWalkthough())
			),
		{ dispatch: false }
	);

	navToSettings$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.NAV_SETTINGS),
				switchMap(() => this.navSettingsOrWalkthough())
			),
		{ dispatch: false }
	);

	setServerAddress$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SetServerAddress>(
				settingsAction.SettingActionTypes.SET_SERVERADDRESS
			),
			switchMap((action) =>
				this.storageProvider.setServerAddress(action.serverAddress)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.SET_SERVERADDRESS_DONE,
				};
			})
		)
	);

	setServerAddressDone$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.SET_SERVERADDRESS_DONE),
				switchMap(() => this.closeModal()),
				switchMap((action) =>
					this.alertProvider.showOkAlert(
						'Resgrid Api',
						'Server Address Set',
						'The server address has been saved. You will need to quit the application completely and re-open for this to take effect.'
					)
				)
			),
		{ dispatch: false }
	);

	showSetServerAddressModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.SHOW_SETSERVER_MODAL),
				switchMap((data) => this.runModal(ModalServerInfoPage, null, null))
			),
		{ dispatch: false }
	);

	savePushNotificationSetting$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SavePushNotificationSetting>(
				settingsAction.SettingActionTypes.SAVE_PUSH_NOTIFICATION_SETTING
			),
			switchMap((action) =>
				this.storageProvider.setEnablePushNotifications(
					action.enablePushNotifications
				)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	savePerferDarkModeSetting$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SavePerferDarkModeSetting>(
				settingsAction.SettingActionTypes.SAVE_PERFER_DARKMODE_SETTING
			),
			switchMap((action) =>
				this.storageProvider.setThemePreference(action.themePreference)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	saveKeepAliveSetting$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SaveKeepAliveSetting>(
				settingsAction.SettingActionTypes.SAVE_KEEP_ALIVE_SETTING
			),
			switchMap(async (action) =>
				this.storageProvider.setKeepAlive(action.keepAlive)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	getApplicationSettings$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.GetApplicationSettings>(
				settingsAction.SettingActionTypes.GET_APP_SETTINGS
			),
			switchMap((action) =>
				forkJoin([
					from(this.storageProvider.getEnablePushNotifications()),
					from(this.storageProvider.getKeepAlive()),
					from(this.storageProvider.getThemePreference()),
					from(this.storageProvider.getHeadsetType()),
					from(this.storageProvider.getSelectedMic()),
					from(this.storageProvider.getEnableRealtimeGeolocation()),
					from(this.storageProvider.getEnableBackgroundGeolocation()),
				]).pipe(
					map((result) => ({
						type: settingsAction.SettingActionTypes.SET_APP_SETTINGS,
						enablePushNotifications: result[0],
						keepAlive: result[1],
						themePreference: result[2],
						headsetType: result[3],
						selectedMic: result[4],
						enableRealtimeGeolocation: result[5],
						enableBackgroundGeolocation: result[6],
					}))
				)
			)
		)
	);

	registerPush$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.REGISTER_PUSH),
				switchMap((action) => this.pushProvider.initPush())
			),
		{ dispatch: false }
	);

	showConfirmLogoff$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.SHOW_LOGOUTPROMPT),
				exhaustMap((data) =>
					this.runModal(ModalConfirmLogoutPage, null, null, {
						breakpoints: [0, 0.2, 0.5, 1],
						initialBreakpoint: 0.2,
					})
				)
			),
		{ dispatch: false }
	);

	logoff$ = createEffect(() =>
		this.actions$.pipe(
			ofType(settingsAction.SettingActionTypes.LOGOUT),
			switchMap(() => this.storageProvider.clear()),
			switchMap(() => this.cacheProvider.deleteAllCache()),
			tap(() => {
				this.authProvider.logout();
			}),
			switchMap(async () => this.closeModal()),
			map((data) => {
				return {
          type: settingsAction.SettingActionTypes.NAV_SETTINGS,
				};
			})
		)
	);

	showAboutModal$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(settingsAction.SettingActionTypes.SHOW_ABOUT_MODAL),
				exhaustMap((data) => this.runModal(ModalAboutPage, null, null))
			),
		{ dispatch: false }
	);

	saveHeadsetTypeSetting$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SaveHeadsetTypeSetting>(
				settingsAction.SettingActionTypes.SAVE_HEADSET_TYPE_SETTING
			),
			switchMap((action) =>
				this.storageProvider.setHeadsetType(action.headsetType)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	saveSelectMic$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SaveMicSetting>(
				settingsAction.SettingActionTypes.SAVE_MIC_SETTING
			),
			switchMap((action) => this.storageProvider.setSelectedMic(action.mic)),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	setIsAppActive$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SetIsAppActive>(
				settingsAction.SettingActionTypes.SET_IS_APP_ACTIVE
			),
			tap((action) => {
				if (!action.isActive) {
					this.homeStore.dispatch(new homeActions.GeolocationStopTracking());
					this.homeStore.dispatch(new homeActions.BackgroundGeolocationStart());
				} else {
					this.homeStore.dispatch(new homeActions.GeolocationStartTracking());
					this.homeStore.dispatch(new homeActions.BackgroundGeolocationStop());
				}
			}),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	clearCache$ = createEffect(() =>
		this.actions$.pipe(
			ofType(settingsAction.SettingActionTypes.CLEAR_CACHE),
			switchMap(() => this.cacheProvider.deleteAllCache()),
			switchMap(async () => this.alertProvider.showOkAlert(
				'Cache',
				'Cache Cleared',
				'The on-device cache has been cleared.'
			))
		),
		{ dispatch: false }
	);

	saveEnableBackgroundGeolocationSetting$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SaveEnableBackgroundGeolocationSetting>(
				settingsAction.SettingActionTypes.SAVE_BACKGROUND_GEOLOCATION_SETTING
			),
			switchMap((action) =>
				this.storageProvider.setenableBackgroundGeolocation(action.enableBackgroundGeolocationSetting)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	showBackgroundGeolocationMessage$ = createEffect(
		() =>
		  this.actions$.pipe(
			ofType(settingsAction.SettingActionTypes.SHOW_BACKGROUND_GEOLOCATION_MSG),
			switchMap((action) => this.alertProvider.showOkAlert(
			  'Background Geolocation',
			  '',
			  'If you enable background geolocation Resgrid Responder will continue to send your position to the server even if you are not in the app.',
			))
		  ),
		{ dispatch: false }
	  );

	saveRealtimeGeolocationSetting$ = createEffect(() =>
		this.actions$.pipe(
			ofType<settingsAction.SaveRealtimeLocationSetting>(
				settingsAction.SettingActionTypes.SAVE_REALTIME_LOCATION_SETTING
			),
			switchMap((action) =>
				this.storageProvider.setEnableRealtimeGeolocation(action.enableRealtimeLocationUpdates)
			),
			map((data) => {
				return {
					type: settingsAction.SettingActionTypes.DONE,
				};
			})
		)
	);

	done$ = createEffect(
		() => this.actions$.pipe(ofType(settingsAction.SettingActionTypes.DONE)),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<SettingsState>,
		private modalController: ModalController,
		private authProvider: AuthProvider,
		private alertProvider: AlertProvider,
		private loadingProvider: LoadingProvider,
		private storageProvider: StorageProvider,
		private router: Router,
		private pushProvider: PushProvider,
		private homeStore: Store<HomeState>,
		private menuCtrl: MenuController,
		private platform: Platform,
		private bluetoothProvider: BluetoothProvider,
		private cacheProvider: CacheProvider,
		private geoProvider: GeolocationProvider
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

		return this._modalRef.present();
	};

	closeModal = async () => {
		try {
			if (this._modalRef) {
				await this.modalController.dismiss();
				this._modalRef = null;
			}
		} catch (error) {
			this._modalRef = null;
		}
	};

	navHomeOrWalkthough = async () => {
		const hasSeenWalkthrough = await this.storageProvider.getHasSeenWalkthrough();
		if (hasSeenWalkthrough) {
			this.router.navigate(['/home']);
		} else {
			this.router.navigate(['/home/walkthrough']);
		}
	};

	navSettingsOrWalkthough = async () => {
		const hasSeenWalkthrough = await this.storageProvider.getHasSeenWalkthrough();
		if (hasSeenWalkthrough) {
			this.router.navigate(['/settings/settings']);
		} else {
			this.router.navigate(['/home/walkthrough']);
		}
	};
}
