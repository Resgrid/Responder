import * as _ from 'lodash';
import { initialState, SettingsState } from '../store/settings.store';
import {
  SettingActionTypes,
  SettingsActionsUnion,
} from '../actions/settings.actions';

export function reducer(
  state: SettingsState = initialState,
  action: SettingsActionsUnion
): SettingsState {
  switch (action.type) {
    case SettingActionTypes.IS_LOGIN:
      return {
        ...state,
        isLogging: true,
      };
    case SettingActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        loggedIn: true,
        user: action.user,
      };
    case SettingActionTypes.SET_LOGINDATA_NAV_HOME:
      return {
        ...state,
        loggedIn: true,
        user: action.user,
        enablePushNotifications: action.enablePushNotifications,
        themePreference: action.themePreference,
        keepAlive: action.keepAlive,
        headsetType: action.headsetType,
        enableBackgroundGeolocation: action.enableBackgroundGeolocation
      };
    case SettingActionTypes.LOGIN_FAIL:
      return {
        ...state,
        errorMsg: 'Invalid user credentials',
        isLogging: false,
      };
    case SettingActionTypes.IS_LOGIN:
      return {
        ...state,
        isLogging: true,
      };
    case SettingActionTypes.LOGIN_DONE:
      return {
        ...state,
        isLogging: false,
      };
    case SettingActionTypes.SAVE_PUSH_NOTIFICATION_SETTING:
      return {
        ...state,
        enablePushNotifications: action.enablePushNotifications,
      };
    case SettingActionTypes.SAVE_PERFER_DARKMODE_SETTING:
      return {
        ...state,
        themePreference: action.themePreference,
      };
    case SettingActionTypes.SAVE_KEEP_ALIVE_SETTING:
      return {
        ...state,
        keepAlive: action.keepAlive,
      };
    case SettingActionTypes.SAVE_HEADSET_TYPE_SETTING:
      return {
        ...state,
        headsetType: action.headsetType,
      };
    case SettingActionTypes.SET_APP_SETTINGS:
      return {
        ...state,
        enablePushNotifications: action.enablePushNotifications,
        keepAlive: action.keepAlive,
        themePreference: action.themePreference,
        headsetType: action.headsetType,
        enableBackgroundGeolocation: action.enableBackgroundGeolocation
      };
    case SettingActionTypes.LOGOUT:
      return {
        ...state,
        loggedIn: false,
        errorMsg: null,
        isLogging: false,
        user: null,
        enablePushNotifications: true,
        enableBackgroundGeolocation: false,
        themePreference: -1,
        keepAlive: false,
        headsetType: -1,
      };
    case SettingActionTypes.SAVE_MIC_SETTING:
      return {
        ...state,
        selectedMic: action.mic,
      };
    case SettingActionTypes.SET_IS_APP_ACTIVE:
      return {
        ...state,
        isAppActive: action.isActive,
      };
    default:
      return state;
  }
}

export const getIsLoggedInState = (state: SettingsState) => state.loggedIn;
export const getPushNotificationState = (state: SettingsState) =>
  state.enablePushNotifications;
export const getThemePreferenceState = (state: SettingsState) =>
  state.themePreference;
export const getKeepAliveState = (state: SettingsState) => state.keepAlive;
export const getHeadsetTypeState = (state: SettingsState) => state.headsetType;
export const getSelectedMicState = (state: SettingsState) => state.selectedMic;
export const getIsAppActiveState = (state: SettingsState) => state.isAppActive;
export const getBackgroundGeolocationState = (state: SettingsState) => state.enableBackgroundGeolocation;