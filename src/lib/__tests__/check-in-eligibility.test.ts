import { CHECK_IN_TARGET_TYPE, getEligibleCheckInTypeValues, getPreferredQuickCheckInType, isCheckInTargetEligible, isClientCheckInTypeAllowed } from '@/lib/check-in-eligibility';

const context = {
  currentUnitTypeId: 10,
  hasCurrentUser: true,
};

describe('check-in eligibility', () => {
  it('only allows a UnitType target matching the current unit type', () => {
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.UNIT_TYPE, TargetEntityId: '10' }, context)).toBe(true);
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.UNIT_TYPE, UnitTypeId: 10 }, context)).toBe(true);
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.UNIT_TYPE, TargetEntityId: '11' }, context)).toBe(false);
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.UNIT_TYPE, TargetEntityId: '10' }, { ...context, currentUnitTypeId: null })).toBe(false);
  });

  it('requires a current user for Personnel targets', () => {
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.PERSONNEL }, context)).toBe(true);
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.PERSONNEL }, { ...context, hasCurrentUser: false })).toBe(false);
  });

  it('always excludes IC from eligible targets and direct submissions', () => {
    expect(isCheckInTargetEligible({ TargetType: CHECK_IN_TARGET_TYPE.IC }, context)).toBe(false);
    expect(isClientCheckInTypeAllowed(CHECK_IN_TARGET_TYPE.IC)).toBe(false);
  });

  it('returns unique eligible types and chooses the preferred identity target', () => {
    const targets = [
      { TargetType: CHECK_IN_TARGET_TYPE.PERSONNEL },
      { TargetType: CHECK_IN_TARGET_TYPE.UNIT_TYPE, TargetEntityId: '10' },
      { TargetType: CHECK_IN_TARGET_TYPE.UNIT_TYPE, TargetEntityId: '11' },
      { TargetType: CHECK_IN_TARGET_TYPE.IC },
      { TargetType: 3 },
      { TargetType: 3 },
    ];

    expect(getEligibleCheckInTypeValues(targets, context)).toEqual([CHECK_IN_TARGET_TYPE.PERSONNEL, CHECK_IN_TARGET_TYPE.UNIT_TYPE, 3]);
    expect(getPreferredQuickCheckInType(targets, context, true)).toBe(CHECK_IN_TARGET_TYPE.UNIT_TYPE);
    expect(getPreferredQuickCheckInType(targets, context, false)).toBe(CHECK_IN_TARGET_TYPE.PERSONNEL);
    expect(getPreferredQuickCheckInType([{ TargetType: 3 }], context, false)).toBeNull();
  });
});
