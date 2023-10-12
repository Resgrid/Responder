import { Injectable } from '@angular/core';
import {
  BleClient,
  BleDevice,
  numbersToDataView,
  numberToUUID,
} from '@capacitor-community/bluetooth-le';
import { ToastController } from '@ionic/angular';
import { isTabSwitch } from '@ionic/angular/directives/navigation/stack-utils';
import { Store } from '@ngrx/store';
import { DepartmentVoiceChannelResultData } from '@resgrid/ngx-resgridlib';
import { Observable, Subscription } from 'rxjs';
import { VoiceState } from '../features/voice/store/voice.store';
import { selectVoiceState } from '../store';
import { AudioProvider } from './audio';
import * as VoiceActions from '../features/voice/actions/voice.actions';

@Injectable({
  providedIn: 'root',
})
export class BluetoothProvider {
  //private HEADSET_SERVICE = numberToUUID(0x1108);
  //private CORDLESSPHONE_SERVICE = numberToUUID(0x1109);
  //private AUDIOSOURCE_SERVICE = numberToUUID(0x110a);
  //private AUDIOSINK_SERVICE = numberToUUID(0x110b);
  //private INTERCOM_SERVICE = numberToUUID(0x1110);
  //private HEADSETGW_SERVICE = numberToUUID(0x1112);
  //private HANDSFREE_SERVICE = numberToUUID(0x111e);
  //private HANDSFREEGW_SERVICE = numberToUUID(0x111f);
  //private HEADSETHS_SERVICE = numberToUUID(0x1131);
  //private HID_SERVICE = numberToUUID(0x1124);
  //private AVRC_SERVICE = numberToUUID(0x110e);
  //private AVRCC_SERVICE = numberToUUID(0x110f);
  //private AVRCT_SERVICE = numberToUUID(0x110c);
  //private BATTERY_SERVICE = numberToUUID(0x180f);
  //private BATTERY_CHARACTERISTIC = numberToUUID(0x2a19);

  private AINA_HEADSET = 'D11C8116-A913-434D-A79D-97AE94A529B3';
  private AINA_HEADSET_SERVICE = '127FACE1-CB21-11E5-93D0-0002A5D5C51B';
  private AINA_HEADSET_SVC_PROP = '127FBEEF-CB21-11E5-93D0-0002A5D5C51B';

  private B01INRICO_HEADSET = '2BD21C44-0198-4B92-9110-D622D53D8E37';
  private B01INRICO_HEADSET_SERVICE = '6666';
  private B01INRICO_HEADSET_SERVICE_CHAR = '8888';

  //private GENERIC_SERVICE = numberToUUID(0x1800);

  //private INRICOHANDHELD_SERVICE = numberToUUID(26214); // 26214 30583
  //private HYSHANDHELD_SERVICE = numberToUUID(65504);

  //private DEVICE_NAME_CHARACTERISTIC = numberToUUID(0x2a00);
  //private APPEARANCE_CHARACTERISTIC = numberToUUID(0x2a01);
  //private PPCP_CHARACTERISTIC = numberToUUID(0x2a04); //Peripheral Preferred Connection Parameters.
  //private SERVICECHANGED_CHARACTERISTIC = numberToUUID(0x2a05);

  private selectedChannel: DepartmentVoiceChannelResultData;
  private voiceState$: Observable<VoiceState | null>;
  private voiceStateSubscription: Subscription
  private device: BleDevice = null;
  private type: number = 0;
  private isListening: boolean = false;
  private isTransmitting = false;

  constructor(private store: Store<VoiceState>,
    //public openViduService: OpenViduService,
    private audioProvider: AudioProvider,
    private toastController: ToastController,
    //private openViduDevicesService: OpenViduDevicesService
    ) {
    this.voiceState$ = this.store.select(selectVoiceState);
  }

  public async init(headsetType: number): Promise<void> {
    try {
      this.type = headsetType;
      await BleClient.initialize();

      if (!this.voiceStateSubscription) {
        this.voiceStateSubscription = this.voiceState$.subscribe(async (state) => {
          if (state) {
            if (state.currentActiveVoipChannel) {
              this.selectedChannel = state.currentActiveVoipChannel;

              //if (state.currentActiveVoipChannel.Id === '') {
              //  await this.stop();
              //} else {
              //  await this.start();
             // }
            } //else if (state.channels) {
              //this.selectedChannel = state.channels[0];
              //await this.stop();
            //} else {
            //  await this.stop();
           // }
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async start(): Promise<void> {
    try {
      await this.stop();

      this.device = await BleClient.requestDevice({
        services: [this.getServiceForType()],
        optionalServices: [],
      });

      await BleClient.connect(this.device.deviceId, () => console.log('device disconnected event'));
      console.log('connected to device', this.device);

      //await this.openViduDevicesService.initDevices();

      const services = await BleClient.getServices(this.device.deviceId);
      console.log('services ', JSON.stringify(services));

      if (!this.isListening) {
        await BleClient.startNotifications(
          this.device.deviceId,
          this.AINA_HEADSET_SERVICE,
          this.AINA_HEADSET_SVC_PROP,
          (value: DataView) => {
            let intValue = this.parseBleData(value);
            console.log('reading: ', intValue);
            this.triggerHeadsetEvents(intValue);
          }
        );
        this.isListening = true;
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.stopListening();
      await this.disconnect();
      console.log('disconnected from device');
    } catch (error) {
      console.error(error);
    }
  }

  private async stopListening(): Promise<void> {
    if (this.device && this.isListening) {
      await BleClient.stopNotifications(this.device.deviceId, this.getServiceForType(), this.getCharacteristicForType());
      this.isListening = false;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.device) {
      await BleClient.disconnect(this.device.deviceId);
      this.device = null;
    }
  }

  private parseBleData(value: DataView): number {
    //const flags = value.getUint8(0);
    //const rate16Bits = flags & 0x1;
    let data: number;
    //if (rate16Bits > 0) {
    //  data = value.getUint16(1, true);
    //} else {
    data = value.getUint8(0);
    //}
    return data;
  }

  private getServiceForType() {
    switch (this.type) {
      case 0:
        return this.AINA_HEADSET_SERVICE;
      case 1:
        return this.B01INRICO_HEADSET_SERVICE;
    }
  }

  private getCharacteristicForType() {
    switch (this.type) {
      case 0:
        return this.AINA_HEADSET_SVC_PROP;
      case 1:
        return this.B01INRICO_HEADSET_SERVICE_CHAR;
    }
  }

  private triggerHeadsetEvents(event: number) {
    switch (this.type) {
      case 0: // Aina
        if (event === 0) {
          this.stopTransmitting();
        } else if (event === 1) {
          this.startTransmitting();
        }
        break;
      case 1: // B01 Inrico

        break;
    }
  }

  private startTransmitting(): void {
    if (!this.isTransmitting) {
      if (this.selectedChannel?.Id !== '') {
        this.isTransmitting = true;
        this.audioProvider.playTransmitStart();
        this.store.dispatch(new VoiceActions.StartTransmitting());
      }
    }
  }

  private stopTransmitting(): void {
    if (this.isTransmitting) {
      if (this.selectedChannel?.Id !== '') {
        this.isTransmitting = false;
        this.store.dispatch(new VoiceActions.StopTransmitting());
        this.audioProvider.playTransmitEnd();
      }
    }
  }
}
