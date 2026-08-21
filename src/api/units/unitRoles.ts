import { type ActiveUnitRolesResult } from '@/models/v4/unitRoles/activeUnitRolesResult';

import { createApiEndpoint } from '../common/client';

const getAllUnitRolesAndAssignmentsForDepartmentApi = createApiEndpoint('/UnitRoles/GetAllUnitRolesAndAssignmentsForDepartment');

export const getAllUnitRolesAndAssignmentsForDepartment = async () => {
  const response = await getAllUnitRolesAndAssignmentsForDepartmentApi.get<ActiveUnitRolesResult>();
  return response.data;
};
