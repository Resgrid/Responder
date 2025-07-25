import { createApiEndpoint } from '@/api/common/client';
import { type GetCurrentStatusResult } from '@/models/v4/personnelStatuses/getCurrentStatusResult';
import { type SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { type SavePersonStatusResult } from '@/models/v4/personnelStatuses/savePersonStatusResult';

const getCurrentPersonnelStatusApi = createApiEndpoint('/PersonnelStatuses/GetCurrentPersonnelStatus');
const savePersonnelStatusApi = createApiEndpoint('/PersonnelStatuses/SavePersonnelStatus');

export const getCurrentPersonnelStatus = async (userId: string) => {
	const response = await getCurrentPersonnelStatusApi.get<GetCurrentStatusResult>({
		userId: userId,
	});
	return response.data;
};

export const savePersonnelStatus = async (data: SavePersonStatusInput) => {
	const response = await savePersonnelStatusApi.post<SavePersonStatusResult>({
		...data,
	});
	return response.data;
};
