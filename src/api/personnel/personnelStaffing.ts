import { createApiEndpoint } from '@/api/common/client';
import { type GetCurrentStaffingResult } from '@/models/v4/personnelStaffing/getCurrentStaffingResult';
import { type SavePersonStaffingInput } from '@/models/v4/personnelStaffing/savePersonStaffingInput';
import { type SavePersonStaffingResult } from '@/models/v4/personnelStaffing/savePersonStaffingResult';

const getCurrentPersonnelStaffingApi = createApiEndpoint('/PersonnelStaffing/GetCurrentPersonnelStaffing');
const savePersonnelStaffingApi = createApiEndpoint('/PersonnelStaffing/SavePersonnelStaffing');

export const getCurrentPersonnelStaffing = async (userId: string) => {
	const response = await getCurrentPersonnelStaffingApi.get<GetCurrentStaffingResult>({
		userId: userId,
	});
	return response.data;
};

export const savePersonnelStaffing = async (data: SavePersonStaffingInput) => {
	const response = await savePersonnelStaffingApi.post<SavePersonStaffingResult>({
		...data,
	});
	return response.data;
};
