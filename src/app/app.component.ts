import { Component, Renderer2, ViewChild } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { MenuController, ModalController, Platform } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { CacheService, CallResultData, UnitResultData } from '@resgrid/ngx-resgridlib';
import { Observable } from 'rxjs';
import { CallsState } from './features/calls/store/calls.store';
import { HomeState } from './features/home/store/home.store';
import { SettingsState } from './features/settings/store/settings.store';
import { SleepProvider } from './providers/sleep';
import { StorageProvider } from './providers/storage';
import {
	selectHomeState,
	selectSettingsState,
	selectThemePreferenceState,
} from './store';
import { HistoryHelperService } from './utils/history-helper.service';
import { App as CapacitorApp } from '@capacitor/app';
import * as SettingsActions from './features/settings/actions/settings.actions';
import {
	Router,
	NavigationStart,
	Event as NavigationEvent,
} from '@angular/router';
import { environment } from '../environments/environment';
import { take } from 'rxjs/operators';

declare var cordova: any;

@Component({
	selector: 'app-root',
	templateUrl: 'app.component.html',
	styleUrls: [
		'../theme/side-menu/styles/side-menu.scss',
		'../theme/side-menu/styles/side-menu.shell.scss',
		'../theme/side-menu/styles/side-menu.responsive.scss',
	],
})
export class AppComponent {
	@ViewChild('header') header: HTMLElement;
	public homeState$: Observable<HomeState | null>;
	public settingsState$: Observable<SettingsState | null>;
	public themePreference$: Observable<number | null>;

	textDir = 'ltr';

	constructor(
		public translate: TranslateService,
		public historyHelper: HistoryHelperService,
		private platform: Platform,
		private storage: StorageProvider,
		public menu: MenuController,
		private store: Store<SettingsState>,
		private homeStore: Store<HomeState>,
		private callsStore: Store<CallsState>,
		private modalController: ModalController,
		private translateService: TranslateService,
		private sleepProvider: SleepProvider,
		private router: Router,
		public renderer: Renderer2,
		private cacheService: CacheService
	) {
		this.homeState$ = this.homeStore.select(selectHomeState);
		this.settingsState$ = this.homeStore.select(selectSettingsState);

		this.themePreference$ = this.store.select(selectThemePreferenceState);

		this.initializeApp();
		this.setLanguage();
	}

	async initializeApp() {
		//this.router.events.subscribe(
		//(event: NavigationEvent) => {
		//  if(event instanceof NavigationStart) {
		//    if (event.url === '/' || event.url === '/home/splash') {
		//      this.renderer.setAttribute(this.header['el'], 'hidden', 'true');
		//    } else {
		//      this.renderer.removeAttribute(this.header['el'], 'hidden');
		//    }
		//  }
		//});

		this.platform.ready().then(async () => {
			await this.storage.init();
			await this.cacheService.initalize();

			//if (this.platform.is('ios')) {
			//	//HeadsetPlugin.setAudioMode({audioMode: 'speaker'});
			//	try {
			//		if (window['cordova'] && cordova.plugins && cordova.plugins.iosrtc) {
			//			cordova.plugins.iosrtc.turnOnSpeaker(true);
			//			cordova.plugins.iosrtc.selectAudioOutput('speaker');
			//		}
			//	} catch (err) {
			//		console.error(JSON.stringify(err));
			//	}
			//}

			//StatusBar.styleDefault();
			//this.splashScreen.hide();

			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
			this.toggleDarkTheme(prefersDark.matches);
			prefersDark.addListener((mediaQuery) =>
				this.toggleDarkTheme(mediaQuery.matches)
			);

			this.wireupAppEvents();
			await this.sleepProvider.init();
			await SplashScreen.hide();

			const that = this;
			setTimeout(function () {
				that.store.dispatch(new SettingsActions.PrimeSettings());
			}, 1000);
		});
	}

	private setLanguage() {
		this.translateService.setDefaultLang('en');
		this.translateService.use('en');
	}

	private toggleDarkTheme(shouldAdd) {
		this.themePreference$.pipe(take(1)).subscribe((enableDarkMode) => {
			if (enableDarkMode === -1) {
				document.body.classList.toggle('dark', shouldAdd);
			} else if (enableDarkMode === 0) {
				document.body.classList.toggle('dark', false);
			} else if (enableDarkMode === 1) {
				document.body.classList.toggle('dark', true);
			}
		});
	}

	private wireupAppEvents() {
		CapacitorApp.addListener('backButton', ({ canGoBack }) => {
			this.modalController.getTop().then((popover) => {
				if (popover) {
					this.modalController.dismiss();
				} else {
					if (!canGoBack) {
						CapacitorApp.exitApp();
					} else {
						if (
							window.location.href.endsWith('/home/tabs/map') ||
							window.location.href.endsWith('/home/tabs')
						) {
							return;
						} else {
							window.history.back();
						}
					}
				}
			});
		});

		CapacitorApp.addListener('appStateChange', ({ isActive }) => {
			console.log('App state changed. Is active?', isActive);

			this.store.dispatch(new SettingsActions.SetIsAppActive(isActive));
		});

		CapacitorApp.addListener('appUrlOpen', (data) => {
			console.log('App opened with URL:', data);
		});

		CapacitorApp.addListener('appRestoredResult', (data) => {
			console.log('Restored state:', data);
		});
	}

	public async menuOpened() {
		let modal = await this.modalController.getTop();

		if (modal) {
			this.modalController.dismiss();
		}
	}

	public getAvatarUrl(userId: string) {
		return (
			environment.baseApiUrl +
			environment.resgridApiUrl +
			'/Avatars/Get?id=' +
			userId
		);
	}
}
