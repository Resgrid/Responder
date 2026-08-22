import { create } from 'zustand';

import { getAllPersonnelInfos } from '@/api/personnel/personnel';
import { getAllUnitRolesAndAssignmentsForDepartment } from '@/api/units/unitRoles';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { type UnitRoleResultData } from '@/models/v4/unitRoles/unitRoleResultData';
import type { ApiResponse } from '@/types/api';

interface RolesState {
  roles: UnitRoleResultData[];
  users: PersonnelInfoResultData[];
  isLoading: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  fetchUsers: () => Promise<void>;
}

export const useRolesStore = create<RolesState>((set) => ({
  roles: [],
  users: [],
  isLoading: false,
  error: null,
  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = (await getAllUnitRolesAndAssignmentsForDepartment()) as ApiResponse<UnitRoleResultData[]>;
      set({ roles: response.Data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch all unit roles', isLoading: false });
    }
  },
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const personnelResponse = (await getAllPersonnelInfos('')) as ApiResponse<PersonnelInfoResultData[]>;
      set({ users: personnelResponse.Data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch personnel', isLoading: false });
    }
  },
}));
