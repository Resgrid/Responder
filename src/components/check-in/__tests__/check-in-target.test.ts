import { describe, expect, it } from '@jest/globals';

import { findNamedEntityName, findResolvedCheckInTargetName, getCheckInTitle, isGenericCheckInTargetName, shouldUseNamedCheckInTarget } from '../check-in-target';

const PERSONNEL_TYPE = 0;
const UNIT_TYPE = 1;

describe('isGenericCheckInTargetName', () => {
  it('returns true for empty string', () => {
    expect(isGenericCheckInTargetName({ TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'UnitType' }, '')).toBe(true);
  });

  it('returns true for "UnitType" on unit target', () => {
    expect(isGenericCheckInTargetName({ TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'UnitType' }, 'UnitType')).toBe(true);
  });

  it('returns true for "unit" on unit target', () => {
    expect(isGenericCheckInTargetName({ TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'Unit' }, 'unit')).toBe(true);
  });

  it('returns false for a real unit name', () => {
    expect(isGenericCheckInTargetName({ TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'UnitType' }, 'Engine 1')).toBe(false);
  });

  it('returns true for "Personnel" on personnel target', () => {
    expect(isGenericCheckInTargetName({ TargetType: PERSONNEL_TYPE, TargetTypeName: 'Personnel', TargetName: 'Personnel' }, 'Personnel')).toBe(true);
  });
});

describe('shouldUseNamedCheckInTarget', () => {
  it('returns true for personnel and unit types', () => {
    expect(shouldUseNamedCheckInTarget(PERSONNEL_TYPE)).toBe(true);
    expect(shouldUseNamedCheckInTarget(UNIT_TYPE)).toBe(true);
  });

  it('returns false for unknown types', () => {
    expect(shouldUseNamedCheckInTarget(99)).toBe(false);
  });
});

describe('findResolvedCheckInTargetName', () => {
  it('matches by TargetEntityId', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '42', TargetName: 'UnitType', UnitId: null };
    const resolved = [{ TargetType: UNIT_TYPE, TargetEntityId: '42', UnitTypeId: null, TargetName: 'Engine 1' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBe('Engine 1');
  });

  it('matches by UnitId when TargetEntityId does not match', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '', TargetName: 'UnitType', UnitId: 7 };
    const resolved = [{ TargetType: UNIT_TYPE, TargetEntityId: '7', UnitTypeId: null, TargetName: 'Ladder 3' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBe('Ladder 3');
  });

  it('matches UnitType assignment by UnitTypeId when TargetEntityId is empty in resolved timer', () => {
    // This is the bug scenario: timer assigned to a UnitType.
    // Status carries the UnitType ID in TargetEntityId.
    // Resolved timer stores the ID in UnitTypeId with an empty TargetEntityId.
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '5', TargetName: 'UnitType', UnitId: null };
    const resolved = [{ TargetType: UNIT_TYPE, TargetEntityId: '', UnitTypeId: 5, TargetName: 'Engine' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBe('Engine');
  });

  it('does not match different TargetType', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '5', TargetName: 'UnitType', UnitId: null };
    const resolved = [{ TargetType: PERSONNEL_TYPE, TargetEntityId: '5', UnitTypeId: null, TargetName: 'John Doe' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBeUndefined();
  });

  it('returns undefined when no match found', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '99', TargetName: 'UnitType', UnitId: null };
    const resolved = [{ TargetType: UNIT_TYPE, TargetEntityId: '1', UnitTypeId: 2, TargetName: 'Engine' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBeUndefined();
  });

  it('returns undefined when resolved target name is a generic placeholder', () => {
    // Resolved timer has TargetName "UnitType" which is a placeholder —
    // the cascade should continue to local entity stores instead.
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '1', TargetName: 'UnitType', UnitId: 42 };
    const resolved = [{ TargetType: UNIT_TYPE, TargetEntityId: '1', UnitTypeId: 1, TargetName: 'UnitType' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBeUndefined();
  });

  it('returns undefined when resolved target name is empty', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '1', TargetName: 'UnitType', UnitId: null };
    const resolved = [{ TargetType: UNIT_TYPE, TargetEntityId: '1', UnitTypeId: null, TargetName: '' }];
    expect(findResolvedCheckInTargetName(status, resolved)).toBeUndefined();
  });
});

describe('findNamedEntityName', () => {
  it('matches entity by id', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '10', TargetName: 'UnitType', UnitId: null };
    const entities = [{ id: '10', name: 'Squad 2' }];
    expect(findNamedEntityName(status, entities)).toBe('Squad 2');
  });

  it('matches entity by UnitId', () => {
    const status = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetEntityId: '', TargetName: 'UnitType', UnitId: 10 };
    const entities = [{ id: '10', name: 'Squad 2' }];
    expect(findNamedEntityName(status, entities)).toBe('Squad 2');
  });

  it('returns undefined when target type is unsupported', () => {
    const status = { TargetType: 99, TargetTypeName: 'Unknown', TargetEntityId: '10', TargetName: 'Thing', UnitId: null };
    const entities = [{ id: '10', name: 'Squad 2' }];
    expect(findNamedEntityName(status, entities)).toBeUndefined();
  });
});

describe('getCheckInTitle', () => {
  it('returns resolved name when provided and not generic', () => {
    const target = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'UnitType' };
    expect(getCheckInTitle(target, 'Engine 1')).toBe('Engine 1');
  });

  it('returns empty string when resolved name is generic placeholder', () => {
    const target = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'UnitType' };
    expect(getCheckInTitle(target, 'UnitType')).toBe('');
  });

  it('returns TargetName as fallback when not a placeholder', () => {
    const target = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'Rescue 1' };
    expect(getCheckInTitle(target)).toBe('Rescue 1');
  });

  it('returns empty string when TargetName is a placeholder and no resolved name', () => {
    const target = { TargetType: UNIT_TYPE, TargetTypeName: 'UnitType', TargetName: 'UnitType' };
    expect(getCheckInTitle(target)).toBe('');
  });

  it('returns TargetTypeName for unsupported target types', () => {
    const target = { TargetType: 99, TargetTypeName: 'SomeType', TargetName: 'SomeName' };
    expect(getCheckInTitle(target)).toBe('SomeType');
  });
});
