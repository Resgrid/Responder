import { ActionBaseTypes, StaffingBaseTypes } from '@/lib/base-types';
import { PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

import { useCallsStore } from '../../calls/store';
import { useRolesStore } from '../../roles/store';
import { useUnitsStore } from '../../units/store';
import { isPersonnelInService, useHomeStore } from '../home-store';

jest.mock('@/api/personnel/personnel');
jest.mock('@/api/personnel/personnelStaffing');
jest.mock('@/api/personnel/personnelStatuses');
jest.mock('@/api/satuses');
jest.mock('../../auth/store', () => ({ __esModule: true, default: { getState: () => ({ userId: 'user-1' }) } }));
jest.mock('../../calls/store', () => ({ useCallsStore: { getState: jest.fn() } }));
jest.mock('../../roles/store', () => ({ useRolesStore: { getState: jest.fn() } }));
jest.mock('../../units/store', () => ({ useUnitsStore: { getState: jest.fn() } }));

const person = (overrides: Partial<PersonnelInfoResultData>): PersonnelInfoResultData => Object.assign(new PersonnelInfoResultData(), overrides);

describe('isPersonnelInService', () => {
  describe('with base types (current servers)', () => {
    it('counts a member whose status means committed, whatever the department calls it', () => {
      expect(isPersonnelInService(person({ Status: 'Code 3', StatusBaseType: ActionBaseTypes.Responding, StaffingBaseType: StaffingBaseTypes.OnShift }))).toBe(true);
      expect(isPersonnelInService(person({ Status: 'At Pt', StatusBaseType: ActionBaseTypes.AtPatient }))).toBe(true);
    });

    it('does not count a member whose status means available, even when it is not named "Available"', () => {
      expect(isPersonnelInService(person({ Status: 'IN QUARTERS', StatusBaseType: ActionBaseTypes.InQuarters }))).toBe(false);
      expect(isPersonnelInService(person({ Status: 'Standing By', StatusBaseType: ActionBaseTypes.Available }))).toBe(false);
    });

    it('does not count a member whose status means out of service', () => {
      expect(isPersonnelInService(person({ Status: 'Not Coming', StatusBaseType: ActionBaseTypes.NotResponding }))).toBe(false);
    });

    it('decides by the status meaning, not the text, when a department names a status "Available"', () => {
      expect(isPersonnelInService(person({ Status: 'Available', StatusBaseType: ActionBaseTypes.Staging }))).toBe(true);
    });

    it('does not count a member whose staffing level means off duty or unavailable', () => {
      expect(isPersonnelInService(person({ Status: 'Responding', StatusBaseType: ActionBaseTypes.Responding, Staffing: 'Home', StaffingBaseType: StaffingBaseTypes.OffDuty }))).toBe(false);
      expect(isPersonnelInService(person({ Status: 'Responding', StatusBaseType: ActionBaseTypes.Responding, StaffingBaseType: StaffingBaseTypes.Unavailable }))).toBe(false);
    });
  });

  describe('without base types (older servers, statuses with no meaning)', () => {
    it('keeps the legacy name match', () => {
      expect(isPersonnelInService(person({ Status: 'Responding' }))).toBe(true);
      expect(isPersonnelInService(person({ Status: 'Available' }))).toBe(false);
      expect(isPersonnelInService(person({ Status: 'Off Duty' }))).toBe(false);
      expect(isPersonnelInService(person({ Status: '' }))).toBe(false);
    });

    it('treats -1 (no meaning) like a missing base type', () => {
      expect(isPersonnelInService(person({ Status: 'Available', StatusBaseType: ActionBaseTypes.None, StaffingBaseType: StaffingBaseTypes.None }))).toBe(false);
      expect(isPersonnelInService(person({ Status: 'Custom Thing', StatusBaseType: ActionBaseTypes.None, StaffingBaseType: StaffingBaseTypes.None }))).toBe(true);
    });
  });
});

describe('useHomeStore.fetchDepartmentStats', () => {
  beforeEach(() => {
    (useCallsStore.getState as unknown as jest.Mock).mockReturnValue({ calls: [{ State: 'Active' }, { State: 'Closed' }] });
    (useUnitsStore.getState as unknown as jest.Mock).mockReturnValue({ units: [{ Name: 'Engine 1' }] });
    (useRolesStore.getState as unknown as jest.Mock).mockReturnValue({
      users: [
        person({ Status: 'Enroute', StatusBaseType: ActionBaseTypes.Enroute, StaffingBaseType: StaffingBaseTypes.OnCall }),
        person({ Status: 'IN QUARTERS', StatusBaseType: ActionBaseTypes.InQuarters, StaffingBaseType: StaffingBaseTypes.OnShift }),
        person({ Status: 'On Scene' }),
        person({ Status: 'Available' }),
      ],
    });
  });

  it('counts personnel in service from status and staffing meanings, with the legacy fallback', async () => {
    await useHomeStore.getState().fetchDepartmentStats();

    expect(useHomeStore.getState().departmentStats).toEqual({ openCalls: 1, personnelInService: 2, unitsInService: 1 });
  });
});
