import { Buffer } from 'buffer';

import { api } from '@/api/common/client';
import type { ChecklistAccess, ChecklistDuePage, ChecklistHistory, ChecklistImage, ChecklistInput, ChecklistResult, ChecklistRun, ChecklistStart } from '@/models/v4/checklists';

// Deliberately uncached. The shared client attaches only the current in-memory ADP grant.
export const getChecklistAccess = async () => (await api.get<ChecklistResult<ChecklistAccess>>('/ChecklistRuns/GetChecklistAccess')).data.Data;
export const getDueChecklists = async (page: number, unitId?: string) =>
  (await api.get<ChecklistResult<ChecklistDuePage>>('/ChecklistRuns/GetDueChecklists', { params: { page, unitId, forCurrentUser: !unitId } })).data.Data;
export const getChecklistRun = async (id: string) => (await api.get<ChecklistResult<ChecklistRun>>('/ChecklistRuns/GetChecklistRun', { params: { id } })).data.Data;
export const previewChecklistOccurrence = async (occurrenceId: string) => (await api.get<ChecklistResult<ChecklistRun>>('/ChecklistRuns/GetChecklistRun', { params: { occurrenceId } })).data.Data;
export const startChecklistRun = async (input: ChecklistStart) => (await api.post<ChecklistResult<ChecklistRun>>('/ChecklistRuns/StartChecklistRun', input)).data.Data;
export const saveChecklistRun = async (id: string, input: ChecklistInput, submit: boolean) =>
  (await api.post<ChecklistResult<ChecklistRun>>(`/ChecklistRuns/${submit ? 'CompleteChecklistRun' : 'SaveChecklistRunProgress'}`, { Id: id, Input: input })).data.Data;
export const uploadChecklistImage = async (id: string, revision: number, image: ChecklistImage) =>
  (await api.post<ChecklistResult<ChecklistRun>>('/ChecklistRuns/UploadChecklistRunFile', { Id: id, Revision: revision, ItemId: image.itemId, Name: image.name, ContentType: image.contentType, Data: image.base64 })).data
    .Data;
export const attestChecklistRun = async (id: string, submissionHash: string, attestation: string) =>
  (await api.post<ChecklistResult<ChecklistRun>>('/ChecklistRuns/AttestChecklistRun', { Id: id, SubmissionHash: submissionHash, Attestation: attestation })).data.Data;
export const getChecklistHistory = async (page: number, unitId?: string) => (await api.get<ChecklistResult<ChecklistHistory[]>>('/ChecklistRuns/GetChecklistHistory', { params: { page, unitId } })).data;

// Evidence is returned to the runner in memory; never create a shared cache file for a protected read.
export const getChecklistImage = async (id: string) => {
  const response = await api.get<ArrayBuffer>('/ChecklistRuns/GetChecklistRunFile', { params: { id }, responseType: 'arraybuffer' });
  const contentType = String(response.headers['content-type'] ?? '').split(';')[0];
  if (!['image/png', 'image/jpeg'].includes(contentType) || response.data.byteLength > 10 * 1024 * 1024) throw new Error('denied');
  return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
};
