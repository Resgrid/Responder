import { NgModule } from '@angular/core';
import {
	BrowserModule,
	BrowserTransferStateModule,
	HammerModule,
	HAMMER_GESTURE_CONFIG,
} from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { metaReducers, reducers } from './reducers';
import { StoreModule } from '@ngrx/store';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { IonicStorageModule } from '@ionic/storage-angular';
import { CommonModule } from '@angular/common';
import { Drivers, Storage } from '@ionic/storage';
import { UnitCardComponent } from './features/home/components/units-card/unit-card.component';
import { VoiceModule } from './features/voice/voice.module';
import { StatusesModule } from './features/statuses/statuses.module';
import { StatusCardComponent } from './features/home/components/status-card/status-card.component';
import { CallsModule } from './features/calls/calls.module';
import { ComponentsModule } from './components/components.module';
import { SettingsModule } from './features/settings/settings.module';
import { HomeModule } from './features/home/home.module';
import { ShellModule } from './shell/shell.module';
import { PersonnelModule } from './features/personnel/personnel.module';
import { UnitsModule } from './features/units/units.module';
import { MappingModule } from './features/mapping/mapping.module';
import { ProtocolsModule } from './features/protocols/protocols.module';
import { NotesModule } from './features/notes/notes.module';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { MessagesModule } from './features/messages/messages.module';
import { CacheProvider } from './providers/cache';
import { ScrollDirective } from './directives/scroll.directive';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

export function createTranslateLoader(http: HttpClient): any {
	return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

const getBaseUrl = (): string => {
	const storedValue = localStorage.getItem(`CapacitorStorage.serverAddress`);

	if (storedValue) {
		return storedValue.trim();
	}
	return environment.baseApiUrl;
};

@NgModule({
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	declarations: [AppComponent, UnitCardComponent, StatusCardComponent, ScrollDirective],
	imports: [
		BrowserModule.withServerTransition({ appId: 'resgridResponder' }),
		BrowserTransferStateModule,
		CommonModule,
		HttpClientModule,
		IonicStorageModule.forRoot(),
		NgxResgridLibModule.forRoot({
            baseApiUrl: getBaseUrl,
            apiVersion: 'v4',
            clientId: 'RgRespApp',
            googleApiKey: '',
            channelUrl: environment.channelUrl,
            channelHubName: environment.channelHubName,
            realtimeGeolocationHubName: environment.realtimeGeolocationHubName,
            logLevel: environment.logLevel,
            isMobileApp: true,
            cacheProvider: new CacheProvider()
        }),
		StoreModule.forRoot(reducers, { metaReducers }),
		EffectsModule.forRoot([]),
		StoreRouterConnectingModule.forRoot(),
		StoreDevtoolsModule.instrument({
			maxAge: 10,
			name: 'Resgrid Responder',
			logOnly: environment.production,
		}),
		IonicStorageModule.forRoot({
			name: '__RGResp',
			driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
		}),
		TranslateModule.forRoot({
			loader: {
				provide: TranslateLoader,
				useFactory: createTranslateLoader,
				deps: [HttpClient],
			},
		}),
		IonicModule.forRoot({
			mode: 'md',
		}),
		CalendarModule.forRoot({
			provide: DateAdapter,
			useFactory: adapterFactory,
		}),
		AppRoutingModule,
		SettingsModule,
		HomeModule,
		VoiceModule,
		StatusesModule,
		CallsModule,
		ComponentsModule,
		ShellModule,
		PersonnelModule,
		UnitsModule,
		MappingModule,
		ProtocolsModule,
		NotesModule,
		CalendarModule,
		MessagesModule,
		ScrollingModule
	],
	providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, ScrollDirective],
	bootstrap: [AppComponent],
})
export class AppModule {}
