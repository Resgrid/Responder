interface CheckInTargetLike {
  TargetType: number;
  TargetTypeName: string;
  TargetName: string;
  TargetEntityId?: string;
  UnitId?: number | null;
}

interface ResolvedCheckInTargetLike {
  TargetType: number;
  TargetEntityId: string;
  UnitTypeId?: number | null;
  TargetName: string;
}

interface NamedEntityLike {
  id: string;
  name: string;
}

const PERSONNEL_CHECK_IN_TYPE = 0;
const UNIT_CHECK_IN_TYPE = 1;

export function isGenericCheckInTargetName(target: CheckInTargetLike, value: string): boolean {
  const normalizedValue = normalizeCheckInValue(value);
  if (normalizedValue.length === 0) {
    return true;
  }

  const normalizedTypeName = normalizeCheckInValue(target.TargetTypeName);
  const normalizedTargetName = normalizeCheckInValue(target.TargetName);

  if (normalizedValue === normalizedTypeName || normalizedValue === normalizedTargetName) {
    return true;
  }

  if (target.TargetType === UNIT_CHECK_IN_TYPE) {
    return normalizedValue === 'unit' || normalizedValue === 'unittype';
  }

  if (target.TargetType === PERSONNEL_CHECK_IN_TYPE) {
    return normalizedValue === 'personnel' || normalizedValue === 'user' || normalizedValue === 'person' || normalizedValue === 'personneltype';
  }

  return false;
}

export function shouldUseNamedCheckInTarget(targetType: number): boolean {
  return targetType === PERSONNEL_CHECK_IN_TYPE || targetType === UNIT_CHECK_IN_TYPE;
}

export function getResolvedCheckInTargetName(target: CheckInTargetLike, resolvedName?: string): string | undefined {
  if (!shouldUseNamedCheckInTarget(target.TargetType)) {
    return undefined;
  }

  const candidateName = (resolvedName ?? target.TargetName).trim();

  if (isGenericCheckInTargetName(target, candidateName)) {
    return undefined;
  }

  return candidateName;
}

/**
 * Returns true when `name` is a known type-level API placeholder for the given target
 * (e.g. "UnitType" or "Personnel") and therefore should NOT be displayed as the entity name.
 *
 * Unlike `isGenericCheckInTargetName` this function is safe to call with `target.TargetName`
 * itself because it deliberately omits the self-reference check that `isGenericCheckInTargetName`
 * uses (which was designed for comparing an *external* resolved name against the raw target name).
 */
function isTypeLevelPlaceholder(target: CheckInTargetLike, name: string): boolean {
  const normalized = normalizeCheckInValue(name);
  if (normalized.length === 0) return true;

  // Reject if the name is identical to the API type label (e.g. TargetName === TargetTypeName)
  if (normalized === normalizeCheckInValue(target.TargetTypeName)) return true;

  // Reject known hard-coded API placeholder strings per entity type
  if (target.TargetType === UNIT_CHECK_IN_TYPE) {
    return normalized === 'unit' || normalized === 'unittype';
  }
  if (target.TargetType === PERSONNEL_CHECK_IN_TYPE) {
    return normalized === 'personnel' || normalized === 'user' || normalized === 'person' || normalized === 'personneltype';
  }
  return false;
}

export function getCheckInTitle(target: CheckInTargetLike, resolvedName?: string): string {
  const namedTarget = getResolvedCheckInTargetName(target, resolvedName);

  if (namedTarget) {
    return namedTarget;
  }

  if (shouldUseNamedCheckInTarget(target.TargetType)) {
    const fallbackTargetName = target.TargetName.trim();
    if (fallbackTargetName.length > 0 && !isTypeLevelPlaceholder(target, fallbackTargetName)) {
      return fallbackTargetName;
    }
    // No real name available — return empty string so the UI can show a translated placeholder.
    return '';
  }

  return target.TargetTypeName.trim() || target.TargetName.trim();
}

function normalizeCheckInValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value).trim();
  if (str === '') return '';
  // Canonicalize integer-like values so "042", "42.0", and 42 all normalize to "42".
  // This ensures string-vs-number comparisons work for unit/personnel IDs.
  const n = Number(str);
  if (Number.isInteger(n)) {
    return String(n);
  }
  return str.toLowerCase();
}

export function findResolvedCheckInTargetName(target: CheckInTargetLike, resolvedTargets: ResolvedCheckInTargetLike[]): string | undefined {
  if (!shouldUseNamedCheckInTarget(target.TargetType)) {
    return undefined;
  }

  const normalizedEntityId = normalizeCheckInValue(target.TargetEntityId);
  const normalizedUnitId = normalizeCheckInValue(target.UnitId);
  const normalizedTargetName = normalizeCheckInValue(target.TargetName);

  const matchingTarget = resolvedTargets.find((resolvedTarget) => {
    if (resolvedTarget.TargetType !== target.TargetType) {
      return false;
    }

    const normalizedResolvedEntityId = normalizeCheckInValue(resolvedTarget.TargetEntityId);
    const normalizedResolvedUnitTypeId = normalizeCheckInValue(resolvedTarget.UnitTypeId);
    const normalizedResolvedName = normalizeCheckInValue(resolvedTarget.TargetName);

    if (normalizedEntityId.length > 0 && normalizedResolvedEntityId === normalizedEntityId) {
      return true;
    }

    // UnitType assignments store the type ID in UnitTypeId, not TargetEntityId
    if (normalizedEntityId.length > 0 && normalizedResolvedUnitTypeId.length > 0 && normalizedResolvedUnitTypeId === normalizedEntityId) {
      return true;
    }

    if (normalizedUnitId.length > 0 && normalizedResolvedEntityId === normalizedUnitId) {
      return true;
    }

    if (normalizedTargetName.length > 0 && normalizedResolvedName === normalizedTargetName) {
      return true;
    }

    return false;
  });

  if (!matchingTarget) {
    return undefined;
  }

  // Don't return generic placeholder names (e.g. "UnitType", "Personnel") –
  // let the resolution cascade continue to local entity stores instead.
  const resolvedName = matchingTarget.TargetName;
  if (!resolvedName || isGenericCheckInTargetName(target, resolvedName)) {
    return undefined;
  }

  return resolvedName;
}

export function findNamedEntityName(target: CheckInTargetLike, entities: NamedEntityLike[]): string | undefined {
  if (!shouldUseNamedCheckInTarget(target.TargetType)) {
    return undefined;
  }

  const normalizedEntityId = normalizeCheckInValue(target.TargetEntityId);
  const normalizedUnitId = normalizeCheckInValue(target.UnitId);
  const normalizedTargetName = normalizeCheckInValue(target.TargetName);

  const matchingEntity = entities.find((entity) => {
    const normalizedEntityName = normalizeCheckInValue(entity.name);
    const normalizedId = normalizeCheckInValue(entity.id);

    if (normalizedEntityId.length > 0 && normalizedId === normalizedEntityId) {
      return true;
    }

    if (normalizedUnitId.length > 0 && normalizedId === normalizedUnitId) {
      return true;
    }

    if (normalizedTargetName.length > 0 && normalizedEntityName === normalizedTargetName) {
      return true;
    }

    return false;
  });

  return matchingEntity?.name;
}
