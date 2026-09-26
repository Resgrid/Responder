import { Buffer } from 'buffer';

import { api } from '@/api/common/client';
import type { ReadinessAccess, WorkOrderApiResult, WorkOrderChoices, WorkOrderDetail, WorkOrderFilter, WorkOrderInput, WorkOrderPage, WorkOrderTransition } from '@/models/v4/workOrders';

// v4 WorkOrders (all routes on one controller). Uncached: orders move under the person during a shift and a
// stale Revision is refused by the server anyway.

export const getReadinessAccess = async () => (await api.get<WorkOrderApiResult<ReadinessAccess>>('/Readiness/GetAccess')).data.Data;

export const getWorkOrders = async ({ page = 0, status = null, assignedToMe = false }: WorkOrderFilter = {}) =>
  (await api.get<WorkOrderApiResult<WorkOrderPage>>('/WorkOrders/GetWorkOrders', { params: { Page: page, Status: status ?? undefined, AssignedToMe: assignedToMe } })).data.Data;

export const getWorkOrder = async (id: string) => (await api.get<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/GetWorkOrder', { params: { id } })).data.Data;

export const getWorkOrderChoices = async () => (await api.get<WorkOrderApiResult<WorkOrderChoices>>('/WorkOrders/GetWorkOrderChoices')).data.Data;

export const newWorkOrder = async (input: WorkOrderInput) => (await api.post<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/NewWorkOrder', input)).data.Data;

export const setWorkOrderStatus = async (id: string, input: WorkOrderTransition) => (await api.post<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/SetWorkOrderStatus', { Id: id, Input: input })).data.Data;

export const acceptWorkOrderAssignment = async (id: string, revision: number) => (await api.post<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/AcceptWorkOrderAssignment', { Id: id, Revision: revision })).data.Data;

export const addWorkOrderComment = async (id: string, revision: number, note: string) =>
  (await api.post<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/AddWorkOrderComment', { Id: id, Revision: revision, Note: note })).data.Data;

/** Hours the signed-in person worked (UserId null = self); the date is the local calendar day. */
export const addWorkOrderLabor = async (id: string, revision: number, workDate: string, hours: number, note: string | null, currency: string | null) =>
  (
    await api.post<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/AddWorkOrderLabor', {
      Id: id,
      Input: { Revision: revision, UserId: null, WorkDate: workDate, Content: { Hours: hours, Note: note, Currency: currency } },
    })
  ).data.Data;

/** A JPEG photo or a PDF, multipart; the server scans it before anyone can open it. */
export const uploadWorkOrderFile = async (id: string, revision: number, file: { uri: string; name: string; type: string }) => {
  const form = new FormData();
  form.append('id', id);
  form.append('revision', String(revision));
  form.append('file', file as unknown as Blob);
  return (await api.post<WorkOrderApiResult<WorkOrderDetail>>('/WorkOrders/UploadWorkOrderFile', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })).data.Data;
};

/** An attached image as a data URI, held in memory only (never written to a shared cache). */
export const getWorkOrderImage = async (fileId: string) => {
  const response = await api.get<ArrayBuffer>('/WorkOrders/GetWorkOrderFile', { params: { id: fileId }, responseType: 'arraybuffer' });
  const contentType = String(response.headers['content-type'] ?? '').split(';')[0];
  if (!['image/png', 'image/jpeg'].includes(contentType) || response.data.byteLength > 10 * 1024 * 1024) throw new Error('unsupported');
  return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
};
