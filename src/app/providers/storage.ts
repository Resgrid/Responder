import { Injectable } from '@angular/core';
import { UtilsService } from '@resgrid/ngx-resgridlib';
import { StartupData } from '../features/settings/models/startupData';
import { LoginResult } from '../models/loginResult';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class StorageProvider {
  constructor(private utilsService: UtilsService) {}

  async init() {
    //await Storage.create();
    await this.initDeviceId();
  }

  private async set(key: string, value: string): Promise<any> {
    return await Preferences?.set({
      key: key,
      value: value,
    });
  }

  private async get(key: string): Promise<any> {
    const { value } = await Preferences?.get({ key: key });

    return value;
  }

  public async clear(): Promise<any> {
    return await Preferences?.clear();
  }

  private async initDeviceId(): Promise<void> {
    const deviceId = await this.get('RGRespDeviceId');

    if (!deviceId) {
      const newDeviceId = this.utilsService.generateUUID();
      await this.set('RGRespDeviceId', newDeviceId);
    }
  }

  public async getServerAddress(): Promise<string> {
    return await this.get('serverAddress');
  }

  public async setServerAddress(serverAddress: string): Promise<any> {
    return await this.set('serverAddress', serverAddress);
  }

  public async getDeviceId(): Promise<string> {
    return await this.get('RGRespDeviceId');
  }

  public async setLoginData(loginData: LoginResult): Promise<any> {
    await this.set('RGRespLoginData', JSON.stringify(loginData));

    return loginData
  }

  public async getLoginData(): Promise<LoginResult> {
    return JSON.parse(await this.get('RGRespLoginData'));
  }


  public async setEnablePushNotifications(enablePush: boolean): Promise<any> {
    if (typeof(enablePush) !== 'undefined') {
      return await this.set('RGRespEnablePush', enablePush.toString());
    }
  }

  public async setActiveCall(callId: string): Promise<any> {
    return await this.set('activeCall', callId);
  }

  public async getActiveCall(): Promise<any> {
    return await this.get('activeCall');
  }

  public async getActiveUnit(): Promise<any> {
    return await this.get('activeUnit');
  }

  public async setActiveUnit(unitId: string): Promise<any> {
    return await this.set('activeUnit', unitId);
  }

  public async getEnablePushNotifications(): Promise<boolean> {
    let data = await this.get('RGRespEnablePush');
    if (data) {
      let isSet = (data === 'true');
      return isSet;
    }

    return true;
  }

  public setThemePreference(perferDark: number): Promise<any> {
    if (typeof(perferDark) === 'undefined') {
      perferDark = -1;
    }

    return this.set('RGRespThemePref', perferDark.toString());
  }

  public setKeepAlive(keepAlive: boolean): Promise<any> {
    if (typeof(keepAlive) === 'undefined') {
      keepAlive = false;
    }

    return this.set('RGRespKeepAlive', keepAlive.toString());
  }

  public setHeadsetType(headsetType: number): Promise<any> {
    if (typeof(headsetType) === 'undefined') {
      headsetType = -1;
    }

    return this.set('RGRespHeadsetType', headsetType.toString());
  }

  public setSelectedMic(mic: string): Promise<any> {
    if (typeof(mic) === 'undefined') {
      mic = '';
    }

    return this.set('RGRespSelectedMic', mic);
  }

  public async getSelectedMic(): Promise<string> {
    let data = await this.get('RGRespSelectedMic');
    if (data) {
      return data;
    }

    return '';
  }

  public async getThemePreference(): Promise<number> {
    let data = await this.get('RGRespThemePref');
    if (data) {
      return parseInt(data);
    }

    return -1;
  }

  public async getKeepAlive(): Promise<boolean> {
    let data = await this.get('RGRespKeepAlive');
    if (data) {
      let isSet = (data === 'true');
      return isSet;
    }

    return false;
  }

  public async getHeadsetType(): Promise<number> {
    let data = await this.get('RGRespHeadsetType');
    if (data) {
      return parseInt(data);
    }

    return -1;
  }

  public setPersonnelFilter(filter: string): Promise<any> {
    if (typeof(filter) === 'undefined') {
      filter = '';
    }

    return this.set('RGRespPersonFilter', filter);
  }

  public async getPersonnelFilter(): Promise<string> {
    let data = await this.get('RGRespPersonFilter');
    if (data) {
      return data;
    }

    return '';
  }

  public setUnitFilter(filter: string): Promise<any> {
    if (typeof(filter) === 'undefined') {
      filter = '';
    }

    return this.set('RGRespUnitFilter', filter);
  }

  public async getUnitFilter(): Promise<string> {
    let data = await this.get('RGRespUnitFilter');
    if (data) {
      return data;
    }

    return '';
  }

  public async setenableBackgroundGeolocation(enablePush: boolean): Promise<any> {
    if (typeof(enablePush) !== 'undefined') {
      return await this.set('RGRespEnableBGLocation', enablePush.toString());
    }
  }

  public async getEnableBackgroundGeolocation(): Promise<boolean> {
    let data = await this.get('RGRespEnableBGLocation');
    if (data) {
      let isSet = (data === 'true');
      return isSet;
    }

    return true;
  }

  public async setEnableRealtimeGeolocation(enableLocation: boolean): Promise<any> {
    if (typeof(enableLocation) !== 'undefined') {
      return await this.set('RGRespEnableLocation', enableLocation.toString());
    }
  }

  public async getEnableRealtimeGeolocation(): Promise<boolean> {
    let data = await this.get('RGRespEnableLocation');
    if (data) {
      let isSet = (data === 'true');
      return isSet;
    }

    return true;
  }

  public async getHasSeenWalkthrough(): Promise<boolean> {
    let data = await this.get('RGRespSeenWalkthrough');
    if (data) {
      let isSet = (data === 'true');
      return isSet;
    }

    return false;
  }

  public async setHasSeenWalkthrough(): Promise<any> {
    return await this.set('RGRespSeenWalkthrough', 'true');
  }

  public async getStartupData(): Promise<StartupData> {
    const loginData = await this.getLoginData();
    const activeUnit = await this.getActiveUnit();
    const activeCall = await this.getActiveCall();
    const pushNotifications = await this.getEnablePushNotifications();
    const themePreference = await this.getThemePreference();
    const keepAlive = await this.getKeepAlive();
    const headsetType = await this.getHeadsetType();
    const backgroundGeolocation = await this.getEnableBackgroundGeolocation();
    const realtimeGeolocation = await this.getEnableRealtimeGeolocation();

    return {
      loginData: loginData,
      activeUnitId: activeUnit,
      activeCallId: activeCall,
      pushNotificationsEnabled: pushNotifications,
      themePreference: themePreference,
      keepAlive: keepAlive,
      headsetType: headsetType,
      backgroundGeolocation: backgroundGeolocation,
      realtimeGeolocation: realtimeGeolocation,
    };
  }
}
