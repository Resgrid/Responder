export const CHECK_IN_TARGET_TYPE = {
  IC: 2,
  PERSONNEL: 0,
  UNIT_TYPE: 1,
} as const;

interface CheckInTarget {
  TargetEntityId?: string | number | null;
  TargetType: number;
  UnitTypeId?: string | number | null;
}

export interface CheckInEligibilityContext {
  currentUnitTypeId: number | null | undefined;
  hasCurrentUser: boolean;
}

const normalizeId = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const isUnitTypeMatch = (target: CheckInTarget, currentUnitTypeId: number | null | undefined): boolean => {
  const requiredUnitTypeId = normalizeId(target.UnitTypeId ?? target.TargetEntityId);
  const normalizedCurrentUnitTypeId = normalizeId(currentUnitTypeId);
  return requiredUnitTypeId.length > 0 && normalizedCurrentUnitTypeId.length > 0 && requiredUnitTypeId === normalizedCurrentUnitTypeId;
};

export const isCheckInTargetEligible = (target: CheckInTarget, context: CheckInEligibilityContext): boolean => {
  if (target.TargetType === CHECK_IN_TARGET_TYPE.IC) {
    return false;
  }

  if (target.TargetType === CHECK_IN_TARGET_TYPE.PERSONNEL) {
    return context.hasCurrentUser;
  }

  if (target.TargetType === CHECK_IN_TARGET_TYPE.UNIT_TYPE) {
    return isUnitTypeMatch(target, context.currentUnitTypeId);
  }

  return true;
};

export const getEligibleCheckInTypeValues = (targets: CheckInTarget[], context: CheckInEligibilityContext): number[] => {
  const eligibleTargetTypes = targets.reduce<Set<number>>((targetTypes, target) => {
    if (isCheckInTargetEligible(target, context)) {
      targetTypes.add(target.TargetType);
    }

    return targetTypes;
  }, new Set<number>());

  return [...eligibleTargetTypes];
};

export const getPreferredQuickCheckInType = (targets: CheckInTarget[], context: CheckInEligibilityContext, preferUnitType: boolean): number | null => {
  const eligibleTargetTypes = new Set(getEligibleCheckInTypeValues(targets, context));
  const preferredTypes = preferUnitType ? [CHECK_IN_TARGET_TYPE.UNIT_TYPE, CHECK_IN_TARGET_TYPE.PERSONNEL] : [CHECK_IN_TARGET_TYPE.PERSONNEL, CHECK_IN_TARGET_TYPE.UNIT_TYPE];
  return preferredTypes.find((targetType) => eligibleTargetTypes.has(targetType)) ?? null;
};

export const isClientCheckInTypeAllowed = (checkInType: number): boolean => checkInType !== CHECK_IN_TARGET_TYPE.IC;
