// Jest stand-in for expo-calendar's native module. Tests that check calendar calls mock it themselves.
export const EntityTypes = { EVENT: 'event', REMINDER: 'reminder' } as const;
export const SourceType = { LOCAL: 'local', EXCHANGE: 'exchange', CALDAV: 'caldav', MOBILEME: 'mobileme', SUBSCRIBED: 'subscribed', BIRTHDAYS: 'birthdays' } as const;
export const CalendarAccessLevel = { CONTRIBUTOR: 'contributor', EDITOR: 'editor', FREEBUSY: 'freebusy', OVERRIDE: 'override', OWNER: 'owner', READ: 'read', RESPOND: 'respond', ROOT: 'root', NONE: 'none' } as const;

const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };

export const getCalendarPermissionsAsync = jest.fn(async () => granted);
export const requestCalendarPermissionsAsync = jest.fn(async () => granted);
export const getCalendarsAsync = jest.fn(async () => []);
export const getDefaultCalendarAsync = jest.fn(async () => ({ id: 'default', title: 'Calendar', allowsModifications: true, source: { id: 'source', name: 'iCloud', type: 'caldav' } }));
export const createCalendarAsync = jest.fn(async () => 'shift-calendar');
export const getEventAsync = jest.fn(async (id: string) => ({ id }));
export const createEventAsync = jest.fn(async () => 'event-id');
export const updateEventAsync = jest.fn(async (id: string) => id);
export const deleteEventAsync = jest.fn(async () => undefined);
