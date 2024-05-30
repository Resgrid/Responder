import { createFeatureSelector, createSelector } from '@ngrx/store';
import { HomeState } from '../features/home/store/home.store';
import { SettingsState } from '../features/settings/store/settings.store';
import * as fromRoot from '../reducers/index';
import * as homeReducers from '../features/home/reducers/home.reducer';
import * as settingsReducers from '../features/settings/reducers/settings.reducer';
import * as voiceReducers from '../features/voice/reducers/voice.reducer';
import * as callsReducers from '../features/calls/reducers/calls.reducer';
import * as calendarReducers from '../features/calendar/reducers/calendar.reducer';
import * as messagesReducers from '../features/messages/reducers/messages.reducer';
import { VoiceState } from '../features/voice/store/voice.store';
import { StatusesState } from '../features/statuses/store/statuses.store';
import { CallsState } from '../features/calls/store/calls.store';
import { PersonnelState } from '../features/personnel/store/personnel.store';
import { UnitsState } from '../features/units/store/units.store';
import { MappingState } from '../features/mapping/store/mapping.store';
import { ProtocolsState } from '../features/protocols/store/protocols.store';
import { NotesState } from '../features/notes/store/notes.store';
import { CalendarState } from '../features/calendar/store/calendar.store';
import { ShiftsState } from '../features/shifts/store/shifts.store';
import { MessagesState } from '../features/messages/store/messages.store';

export interface State extends fromRoot.State {
    settings: SettingsState;
    home: HomeState;
}

export const selectSettingsState = createFeatureSelector<SettingsState>('settingsModule');

export const selectIsLoggedInState = createSelector(
  selectSettingsState,
  settingsReducers.getIsLoggedInState
);

export const selectPushNotificationState = createSelector(
  selectSettingsState,
  settingsReducers.getPushNotificationState
);

export const selectThemePreferenceState = createSelector(
  selectSettingsState,
  settingsReducers.getThemePreferenceState
);

export const selectKeepAliveState = createSelector(
  selectSettingsState,
  settingsReducers.getKeepAliveState
);

export const selectHeadsetType = createSelector(
  selectSettingsState,
  settingsReducers.getHeadsetTypeState
);

export const selectSelectedMic = createSelector(
  selectSettingsState,
  settingsReducers.getSelectedMicState
);

export const selectIsAppActive = createSelector(
  selectSettingsState,
  settingsReducers.getIsAppActiveState
);

export const selectBackgroundGeolocationState = createSelector(
  selectSettingsState,
  settingsReducers.getBackgroundGeolocationState
);

export const selectRealtimeGeolocationState = createSelector(
  selectSettingsState,
  settingsReducers.getRealtimeGeolocationState
);

export const selectHomeState = createFeatureSelector<HomeState>('homeModule');

export const selectCurrentUnitStatus = createSelector(
  selectHomeState,
  homeReducers.getCurrentUnitStatus
);

export const selectPushData = createSelector(
  selectHomeState,
  homeReducers.getPushData
);

export const selectConfigData = createSelector(
  selectHomeState,
  homeReducers.getConfigData
);

export const selectVoiceState = createFeatureSelector<VoiceState>('voiceModule');

export const selectAvailableChannelsState = createSelector(
  selectVoiceState,
  voiceReducers.getAvailableChannels
);

export const selectActiveStreamState = createSelector(
  selectVoiceState,
  voiceReducers.getActiveStream
);

export const selectStatusesState = createFeatureSelector<StatusesState>('statusesModule');

export const selectCallsState = createFeatureSelector<CallsState>('callsModule');

export const selectCallImagesState = createSelector(
  selectCallsState,
  callsReducers.getCallImages
);

export const selectNewCallLocationState = createSelector(
  selectCallsState,
  callsReducers.getNewCallLocation
);

export const selectNewCallDispatchesState = createSelector(
  selectCallsState,
  callsReducers.getNewCallDispatches
);

export const selectEditCallLocationState = createSelector(
  selectCallsState,
  callsReducers.getEditCallLocation
);

export const selectEditCallDispatchesState = createSelector(
  selectCallsState,
  callsReducers.getEditCallDispatches
);

export const selectPersonnelState = createFeatureSelector<PersonnelState>('personnelModule');

export const selectUnitsState = createFeatureSelector<UnitsState>('unitsModule');

export const selectMappingState = createFeatureSelector<MappingState>('mappingModule');

export const selectProtocolsState = createFeatureSelector<ProtocolsState>('protocolsModule');

export const selectNotesState = createFeatureSelector<NotesState>('notesModule');

export const selectCalendarState = createFeatureSelector<CalendarState>('calendarModule');

export const selectCalendarItemsState = createSelector(
  selectCalendarState,
  calendarReducers.getCalendarItems
);

export const selectGetUpdateCalendarItemsState = createSelector(
  selectCalendarState,
  calendarReducers.getUpdateCalendarItems
);

export const selectShiftsState = createFeatureSelector<ShiftsState>('shiftsModule');

export const selectMessagesState = createFeatureSelector<MessagesState>('messagesModule');

export const selectRecipientsState = createSelector(
  selectMessagesState,
  messagesReducers.getRecipients
);