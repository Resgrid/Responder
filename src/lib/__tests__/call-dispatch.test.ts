import { buildCallAssignmentContext, isCurrentUserOnCall, isDispatchAssignedToUser } from '@/lib/call-dispatch';
import { type CallExtraDataResultData } from '@/models/v4/calls/callExtraDataResultData';
import { type DispatchedEventResultData } from '@/models/v4/calls/dispatchedEventResultData';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { type UnitRoleResultData } from '@/models/v4/unitRoles/unitRoleResultData';

const user = (overrides: Partial<PersonnelInfoResultData> = {}): PersonnelInfoResultData =>
  ({
    UserId: 'user-1',
    GroupId: 'group-1',
    Roles: [],
    ...overrides,
  }) as PersonnelInfoResultData;

const seat = (overrides: Partial<UnitRoleResultData> = {}): UnitRoleResultData => ({
  UnitId: 'unit-1',
  UnitRoleId: 'seat-1',
  Name: 'Driver',
  UserId: '',
  ...overrides,
});

const dispatch = (overrides: Partial<DispatchedEventResultData>): DispatchedEventResultData => ({ Id: '', Type: '', Name: '', GroupId: '', ...overrides }) as DispatchedEventResultData;

const extras = (dispatches: DispatchedEventResultData[]): CallExtraDataResultData => ({ Dispatches: dispatches }) as CallExtraDataResultData;

describe('buildCallAssignmentContext', () => {
  it('collects the units the user holds an active seat on', () => {
    const context = buildCallAssignmentContext(user(), [
      seat({ UnitId: 'unit-1', UnitRoleId: 'seat-1', UserId: 'user-1' }),
      seat({ UnitId: 'unit-1', UnitRoleId: 'seat-2', UserId: 'USER-1' }),
      seat({ UnitId: 'unit-2', UnitRoleId: 'seat-3', UserId: 'user-2' }),
      seat({ UnitId: 'unit-3', UnitRoleId: 'seat-4', UserId: '' }),
    ]);

    expect(context.unitIds).toEqual(['unit-1']);
  });

  it('has no units when there is no current user', () => {
    const context = buildCallAssignmentContext(null, [seat({ UserId: '' })]);

    expect(context.unitIds).toEqual([]);
  });
});

describe('isDispatchAssignedToUser', () => {
  it('matches a unit dispatch to a unit the user is riding on', () => {
    const context = buildCallAssignmentContext(user(), [seat({ UnitId: 'unit-1', UserId: 'user-1' })]);

    expect(isDispatchAssignedToUser(dispatch({ Id: 'unit-1', Type: 'Unit', Name: 'Engine 1' }), context)).toBe(true);
  });

  it('does not match a unit dispatch for a unit the user is not riding on', () => {
    const context = buildCallAssignmentContext(user(), [seat({ UnitId: 'unit-1', UserId: 'user-1' }), seat({ UnitId: 'unit-2', UserId: 'user-2' })]);

    expect(isDispatchAssignedToUser(dispatch({ Id: 'unit-2', Type: 'Unit', Name: 'Engine 2' }), context)).toBe(false);
  });

  it('does not let a unit dispatch fall through to the user or group identifier match', () => {
    const context = buildCallAssignmentContext(user({ UserId: 'shared-id', GroupId: 'shared-id' }), []);

    expect(isDispatchAssignedToUser(dispatch({ Id: 'shared-id', Type: 'Unit', Name: 'Engine 1' }), context)).toBe(false);
  });

  it('still matches a personnel dispatch to the user', () => {
    const context = buildCallAssignmentContext(user(), []);

    expect(isDispatchAssignedToUser(dispatch({ Id: 'user-1', Type: 'User', Name: 'Me' }), context)).toBe(true);
  });
});

describe('isCurrentUserOnCall', () => {
  it('is true when only the user’s unit was dispatched', () => {
    const context = buildCallAssignmentContext(user(), [seat({ UnitId: 'unit-1', UserId: 'user-1' })]);

    expect(isCurrentUserOnCall(extras([dispatch({ Id: 'unit-1', Type: 'Unit', Name: 'Engine 1' })]), context)).toBe(true);
  });

  it('is false when no dispatch targets the user, their group, roles or unit', () => {
    const context = buildCallAssignmentContext(user(), [seat({ UnitId: 'unit-1', UserId: 'user-1' })]);

    expect(isCurrentUserOnCall(extras([dispatch({ Id: 'unit-9', Type: 'Unit', Name: 'Ladder 9' }), dispatch({ Id: 'user-9', Type: 'User', Name: 'Someone' })]), context)).toBe(false);
  });

  it('is false without call extra data', () => {
    const context = buildCallAssignmentContext(user(), [seat({ UnitId: 'unit-1', UserId: 'user-1' })]);

    expect(isCurrentUserOnCall(undefined, context)).toBe(false);
  });
});
