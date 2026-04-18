import { type CallExtraDataResultData } from '@/models/v4/calls/callExtraDataResultData';
import { type DispatchedEventResultData } from '@/models/v4/calls/dispatchedEventResultData';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { type UnitRoleResultData } from '@/models/v4/unitRoles/unitRoleResultData';

export interface CallAssignmentContext {
  userId: string | null;
  groupId: string | null;
  activeUnitId: string | null;
  roleIds: string[];
  roleNames: string[];
}

export interface DispatchTypeStyle {
  backgroundColor: string;
  textColor: string;
  label: string;
}

const normalizeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().toLowerCase();
};

const uniqueValues = (values: unknown[]): string[] => {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter((value) => value.length > 0))];
};

export const buildCallAssignmentContext = (currentUser: PersonnelInfoResultData | null, roles: UnitRoleResultData[], activeUnitId: string | null): CallAssignmentContext => {
  const normalizedRoleNames = new Set((currentUser?.Roles ?? []).map((roleName) => normalizeValue(roleName)).filter((roleName) => roleName.length > 0));

  const roleIds = roles
    .filter((role) => normalizedRoleNames.has(normalizeValue(role.Name)))
    .map((role) => role.UnitRoleId)
    .filter((roleId) => roleId.length > 0);

  return {
    userId: currentUser?.UserId ?? null,
    groupId: currentUser?.GroupId ?? null,
    activeUnitId,
    roleIds: uniqueValues(roleIds),
    roleNames: uniqueValues(currentUser?.Roles ?? []),
  };
};

export const getDispatchTypeStyle = (type: string): DispatchTypeStyle => {
  const normalizedType = normalizeValue(type);

  if (normalizedType.includes('user') || normalizedType.includes('personnel')) {
    return { backgroundColor: '#2563EB', textColor: '#FFFFFF', label: 'P' };
  }

  if (normalizedType.includes('unit')) {
    return { backgroundColor: '#D97706', textColor: '#FFFFFF', label: 'U' };
  }

  if (normalizedType.includes('group') || normalizedType.includes('station')) {
    return { backgroundColor: '#059669', textColor: '#FFFFFF', label: 'G' };
  }

  if (normalizedType.includes('role')) {
    return { backgroundColor: '#7C3AED', textColor: '#FFFFFF', label: 'R' };
  }

  return { backgroundColor: '#6B7280', textColor: '#FFFFFF', label: '•' };
};

export const getUniqueDispatches = (dispatches: DispatchedEventResultData[]): DispatchedEventResultData[] => {
  const seen = new Set<string>();

  return dispatches.filter((dispatch) => {
    const type = normalizeValue(dispatch.Type);
    const nameKey = `name:${type}:${normalizeValue(dispatch.Name)}`;
    const id = normalizeValue(dispatch.Id);
    const idKey = id.length > 0 ? `id:${type}:${id}` : null;

    if (seen.has(nameKey) || (idKey !== null && seen.has(idKey))) {
      return false;
    }

    seen.add(nameKey);
    if (idKey !== null) {
      seen.add(idKey);
    }
    return true;
  });
};

export const isCallActive = (state: string): boolean => {
  const normalizedState = normalizeValue(state);
  return normalizedState.length === 0 ? true : normalizedState === 'active';
};

export const isDispatchAssignedToUser = (dispatch: DispatchedEventResultData, context: CallAssignmentContext): boolean => {
  const normalizedType = normalizeValue(dispatch.Type);
  const normalizedDispatchId = normalizeValue(dispatch.Id);
  const normalizedDispatchName = normalizeValue(dispatch.Name);
  const normalizedDispatchGroupId = normalizeValue(dispatch.GroupId);
  const normalizedUserId = normalizeValue(context.userId);
  const normalizedGroupId = normalizeValue(context.groupId);
  const normalizedActiveUnitId = normalizeValue(context.activeUnitId);
  const roleIdSet = new Set(context.roleIds.map((roleId) => normalizeValue(roleId)));
  const roleNameSet = new Set(context.roleNames.map((roleName) => normalizeValue(roleName)));

  if (normalizedType.includes('user') || normalizedType.includes('personnel')) {
    return normalizedDispatchId.length > 0 && normalizedDispatchId === normalizedUserId;
  }

  if (normalizedType.includes('group') || normalizedType.includes('station')) {
    return (normalizedDispatchId.length > 0 && normalizedDispatchId === normalizedGroupId) || (normalizedDispatchGroupId.length > 0 && normalizedDispatchGroupId === normalizedGroupId);
  }

  if (normalizedType.includes('role')) {
    return roleIdSet.has(normalizedDispatchId) || roleNameSet.has(normalizedDispatchName);
  }

  if (normalizedType.includes('unit')) {
    return normalizedActiveUnitId.length > 0 && normalizedDispatchId === normalizedActiveUnitId;
  }

  return normalizedDispatchId === normalizedUserId || normalizedDispatchId === normalizedGroupId || roleIdSet.has(normalizedDispatchId) || roleNameSet.has(normalizedDispatchName);
};

export const isCurrentUserOnCall = (callExtraData: CallExtraDataResultData | null | undefined, context: CallAssignmentContext): boolean => {
  if (!callExtraData || callExtraData.Dispatches.length === 0) {
    return false;
  }

  return callExtraData.Dispatches.some((dispatch) => isDispatchAssignedToUser(dispatch, context));
};
