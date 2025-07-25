import { createApiEndpoint } from '@/api/common/client';
import { type GetCurrentStatusResult } from '@/models/v4/personnelStatuses/getCurrentStatusResult';
import { type SavePersonsStatusesInput } from '@/models/v4/personnelStatuses/savePersonsStatusesInput';
import { type SavePersonsStatusesResult } from '@/models/v4/personnelStatuses/savePersonsStatusesResult';
import { type SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { type SavePersonStatusResult } from '@/models/v4/personnelStatuses/savePersonStatusResult';
import { type StatusesResult } from '@/models/v4/statuses/statusesResult';
import { type UnitTypeStatusesResult } from '@/models/v4/statuses/unitTypeStatusesResult';

const getAllPersonnelStatusesApi = createApiEndpoint('/Statuses/GetAllStatusesForPersonnel');
const getAllUnitStatusesApi = createApiEndpoint('/Statuses/GetAllUnitStatuses');
const getCurrentPersonStatusApi = createApiEndpoint('/PersonnelStatuses/GetCurrentStatus');
const savePersonStatusApi = createApiEndpoint('/PersonnelStatuses/SavePersonStatus');
const savePersonStatusesApi = createApiEndpoint('/PersonnelStatuses/SavePersonsStatuses');

export const getAllPersonnelStatuses = async () => {
	const response = await getAllPersonnelStatusesApi.get<StatusesResult>();
	return response.data;
};

export const getAllUnitStatuses = async () => {
	const response = await getAllUnitStatusesApi.get<UnitTypeStatusesResult>();
	return response.data;
};

export const getCurrentPersonStatus = async (userId: string) => {
	const response = await getCurrentPersonStatusApi.get<GetCurrentStatusResult>({
		userId: userId,
	});
	return response.data;
};

export const savePersonStatus = async (data: SavePersonStatusInput) => {
	if (!data.RespondingTo) {
		data.RespondingTo = '0';
	}

	const response = await savePersonStatusApi.post<SavePersonStatusResult>({
		...data,
	});
	return response.data;
};

export const savePersonsStatuses = async (data: SavePersonsStatusesInput) => {
	if (!data.RespondingTo) {
		data.RespondingTo = '0';
	}

	const response = await savePersonStatusesApi.post<SavePersonsStatusesResult>({
		...data,
	});
	return response.data;
};
