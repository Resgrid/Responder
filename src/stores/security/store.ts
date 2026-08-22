import { useMemo } from 'react';
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
          const response = await getCurrentUsersRights();

          // Type guard to ensure response is properly structured
          if (response && typeof response === 'object' && 'Data' in response) {
            const typedResponse = response as ApiResponse<DepartmentRightsResultData>;

            // Guard against missing or invalid Data
            if (typedResponse.Data) {
              set({
                rights: typedResponse.Data,
                error: null,
              });
            } else {
              set({
                rights: null,
                error: 'Invalid response: missing data',
              });
            }
          } else {
            set({
              rights: null,
              error: 'Invalid response format',
            });
          }
        } catch (error) {
          // Set error state and null out rights on failure
          set({
            rights: null,
            error: error instanceof Error ? error.message : 'Failed to get user rights',
          });
        }
      },
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

/**
 * Field-level selectors plus a memoized result: subscribing to the whole store and rebuilding
 * the permission object (and its `isUserGroupAdmin` closure) on every render handed every call
 * site a fresh identity each pass, defeating the memoization downstream of it.
 */
export const useSecurityStore = () => {
  const error = securityStore((state) => state.error);
  const getRights = securityStore((state) => state.getRights);
  const rights = securityStore((state) => state.rights);

  return useMemo(
    () => ({
      error,
      getRights,
      isUserDepartmentAdmin: rights?.IsAdmin,
      isUserGroupAdmin: (groupId: number) => rights?.Groups.some((right) => right.GroupId === groupId && right.IsGroupAdmin),
      canUserCreateCalls: rights?.CanCreateCalls,
      canUserCreateNotes: rights?.CanAddNote,
      canUserCreateMessages: rights?.CanCreateMessage,
      canUserViewPII: rights?.CanViewPII,
      departmentCode: rights?.DepartmentCode,
    }),
    [error, getRights, rights]
  );
};
