import { Injectable } from '@angular/core';
import {
	PushNotifications,
	Token,
	ActionPerformed,
	PushNotificationSchema,
} from '@capacitor/push-notifications';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { StorageProvider } from './storage';
import { DeviceService } from '@resgrid/ngx-resgridlib';
import { HomeState } from '../features/home/store/home.store';
import { Store } from '@ngrx/store';
import { selectHomeState } from '../store';
import { take } from 'rxjs/operators';
import * as HomeActions from '../features/home/actions/home.actions';
import { PushData } from '../models/pushData';
import { from } from 'rxjs';
import { AudioProvider } from './audio';

@Injectable({
	providedIn: 'root',
})
export class PushProvider {
	isRegistering: boolean = false;

	constructor(
		private router: Router,
		private platform: Platform,
		private storageProvider: StorageProvider,
		private deviceService: DeviceService,
		private homeStore: Store<HomeState>,
		private audioProvider: AudioProvider
	) {}

	public async initPush(): Promise<void> {
		if (this.platform.is('mobile')) {
			let enablePushNotifications =
				await this.storageProvider.getEnablePushNotifications();
			if (enablePushNotifications) {
				
				PushNotifications.addListener('registrationError', (error: any) => {
					console.log('Error: ' + JSON.stringify(error));
				});
		
				PushNotifications.addListener(
					'pushNotificationReceived',
					async (notification: PushNotificationSchema) => {
						if (notification && notification.data) {
							console.log('Push received: ' + JSON.stringify(notification));
							const data = notification.data;
							if (data.eventCode) {
								if (data.eventCode && data.eventCode.trim().indexOf('C', 0) === 0) {
									//this.homeStore.dispatch(new HomeActions.LoadAppData());
									let callId = data.eventCode.trim().replace('C', '');
			
									this.playPushSound(data.type);

									let pushData: PushData = {
										type: 1,
										title: notification.title,
										body: notification.body,
										entityId: callId,
									};
									this.homeStore.dispatch(new HomeActions.PushCallReceived(pushData));
								} else if (
									data.eventCode &&
									data.eventCode.trim().indexOf('T', 0) === 0
								) {
								} else if (
									data.eventCode &&
									data.eventCode.trim().indexOf('G', 0) === 0
								) {
								}
							}
						}
					}
				);
		
				PushNotifications.addListener(
					'pushNotificationActionPerformed',
					async (notification: ActionPerformed) => {
						const data = notification.notification.data;
						console.log(
							'Action performed: ' + JSON.stringify(notification.notification)
						);
						if (data.eventCode && data.eventCode.trim().indexOf('C', 0) === 0) {
							let callId = data.eventCode.trim().replace('C', '');
		
							this.homeStore.dispatch(new HomeActions.LoadAppData());
							let pushData: PushData = {
								type: data.type,
								title: notification.notification.title,
								body: notification.notification.body,
								entityId: callId,
							};
							this.homeStore.dispatch(new HomeActions.PushCallReceived(pushData));
						}
					}
				);

				this.registerPush();
			}


		}
	}

	private registerPush() {
		PushNotifications.requestPermissions().then((permission) => {
			if (permission.receive === 'granted') {
				// Register with Apple / Google to receive push via APNS/FCM
				PushNotifications.register();
			} else {
				// No permission for push granted
			}
		});

		PushNotifications.addListener('registration', (token: Token) => {
			if (!this.isRegistering) {
				console.log('My token: ' + JSON.stringify(token));
				this.isRegistering = true;

				let platform = 0;
				if (this.platform.is('ios')) {
					platform = 1;
				} else if (this.platform.is('android')) {
					platform = 3;
				}

				from(this.storageProvider.getDeviceId())
					.pipe(take(1))
					.subscribe((deviceId) => {
						this.deviceService
							.RegisterPush(token.value, deviceId, platform)
							.subscribe((data) => {
								console.log('Registered push');
								this.isRegistering = false;
							});
					});
			}
		});

		

		if (this.platform.is('android')) {
			this.createChannels();
		}
	}

	private createChannels() {
		PushNotifications.createChannel({
			id: 'calls',
			name: 'Generic Call',
			description: 'Generic Call',
			importance: 5,
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: '0',
			name: 'Emergency Call',
			description: 'Emergency Call',
			importance: 5,
			sound: 'callemergency',
			vibration: true,
			lights: true,
			visibility: 1
		}).then(() => {});

		PushNotifications.createChannel({
			id: '1',
			name: 'High Call',
			description: 'High Call',
			importance: 5,
			sound: 'callhigh',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: '2',
			name: 'Medium Call',
			description: 'Medium Call',
			importance: 5,
			sound: 'callmedium',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: '3',
			name: 'Low Call',
			description: 'Low Call',
			importance: 5,
			sound: 'calllow',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'notif',
			name: 'Notification',
			description: 'Notifications',
			importance: 5,
			vibration: false,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'message',
			name: 'Message',
			description: 'Messages',
			importance: 5,
			vibration: false,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c1',
			name: 'Custom Call 1',
			description: 'Custom Call Tone 1',
			importance: 5,
			sound: 'c1',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c2',
			name: 'Custom Call 2',
			description: 'Custom Call Tone 2',
			importance: 5,
			sound: 'c2',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c3',
			name: 'Custom Call 3',
			description: 'Custom Call Tone 3',
			importance: 5,
			sound: 'c3',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c4',
			name: 'Custom Call 4',
			description: 'Custom Call Tone 4',
			importance: 5,
			sound: 'c4',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c5',
			name: 'Custom Call 5',
			description: 'Custom Call Tone 5',
			importance: 5,
			sound: 'c5',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c6',
			name: 'Custom Call 6',
			description: 'Custom Call Tone 6',
			importance: 5,
			sound: 'c6',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c7',
			name: 'Custom Call 7',
			description: 'Custom Call Tone 7',
			importance: 5,
			sound: 'c7',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c8',
			name: 'Custom Call 8',
			description: 'Custom Call Tone 8',
			importance: 5,
			sound: 'c8',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c9',
			name: 'Custom Call 9',
			description: 'Custom Call Tone 9',
			importance: 5,
			sound: 'c9',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c10',
			name: 'Custom Call 10',
			description: 'Custom Call Tone 10',
			importance: 5,
			sound: 'c10',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c11',
			name: 'Custom Call 11',
			description: 'Custom Call Tone 11',
			importance: 5,
			sound: 'c11',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c12',
			name: 'Custom Call 12',
			description: 'Custom Call Tone 12',
			importance: 5,
			sound: 'c12',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c13',
			name: 'Custom Call 13',
			description: 'Custom Call Tone 13',
			importance: 5,
			sound: 'c13',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c14',
			name: 'Custom Call 14',
			description: 'Custom Call Tone 14',
			importance: 5,
			sound: 'c14',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c15',
			name: 'Custom Call 15',
			description: 'Custom Call Tone 15',
			importance: 5,
			sound: 'c15',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c16',
			name: 'Custom Call 16',
			description: 'Custom Call Tone 16',
			importance: 5,
			sound: 'c16',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c17',
			name: 'Custom Call 17',
			description: 'Custom Call Tone 17',
			importance: 5,
			sound: 'c17',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c18',
			name: 'Custom Call 18',
			description: 'Custom Call Tone 18',
			importance: 5,
			sound: 'c18',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c19',
			name: 'Custom Call 19',
			description: 'Custom Call Tone 19',
			importance: 5,
			sound: 'c19',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c20',
			name: 'Custom Call 20',
			description: 'Custom Call Tone 20',
			importance: 5,
			sound: 'c20',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c21',
			name: 'Custom Call 21',
			description: 'Custom Call Tone 21',
			importance: 5,
			sound: 'c21',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c22',
			name: 'Custom Call 22',
			description: 'Custom Call Tone 22',
			importance: 5,
			sound: 'c22',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c23',
			name: 'Custom Call 23',
			description: 'Custom Call Tone 23',
			importance: 5,
			sound: 'c23',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c24',
			name: 'Custom Call 24',
			description: 'Custom Call Tone 24',
			importance: 5,
			sound: 'c24',
			vibration: true,
			visibility: 1,
		}).then(() => {});

		PushNotifications.createChannel({
			id: 'c25',
			name: 'Custom Call 25',
			description: 'Custom Call Tone 25',
			importance: 5,
			sound: 'c25',
			vibration: true,
			visibility: 1,
		}).then(() => {});
	}

	public playPushSound(type: string) {

		if (type.startsWith('c')) { // custom call tone
			this.audioProvider.playCallCustom(type);
		} else {
			if (type === '0') {
				this.audioProvider.playCallEmergency();
			} else if (type === '1') {
				this.audioProvider.playCallHigh();
			} else if (type === '2') {
				this.audioProvider.playCallMedium();
			} else if (type === '3') {
				this.audioProvider.playCallLow();
			}
		}
	}
}
