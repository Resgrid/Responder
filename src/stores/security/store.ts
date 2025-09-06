import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getCurrentUsersRights } from '@/api/security/security';
import { type DepartmentRightsResultData } from '@/models/v4/security/departmentRightsResultData';
import type { ApiResponse } from '@/types/api';

import { zustandStorage } from '../../lib/storage';

export interface SecurityState {
  error: string | null;
  getRights: () => Promise<void>;
  rights: DepartmentRightsResultData | null;
}

export const securityStore = create<SecurityState>()(
  persist(
    (set, _get) => ({
      error: null,
      rights: null,
      getRights: async () => {
        try {
          const response = (await getCurrentUsersRights()) as ApiResponse<DepartmentRightsResultData>;

          set({
            rights: response.Data,
          });
        } catch (error) {
          // If refresh fails, log out the user
        }
      },
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

export const useSecurityStore = () => {
  const store = securityStore();
  return {
    getRights: store.getRights,
    isUserDepartmentAdmin: store.rights?.IsAdmin,
    isUserGroupAdmin: (groupId: number) => store.rights?.Groups.some((right) => right.GroupId === groupId && right.IsGroupAdmin),
    canUserCreateCalls: store.rights?.CanCreateCalls,
    canUserCreateNotes: store.rights?.CanAddNote,
    canUserCreateMessages: store.rights?.CanCreateMessage,
    canUserViewPII: store.rights?.CanViewPII,
    departmentCode: store.rights?.DepartmentCode,
  };
};
