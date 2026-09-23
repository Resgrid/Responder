import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import {
  acceptWorkOrderAssignment,
  addWorkOrderComment,
  addWorkOrderLabor,
  getReadinessAccess,
  getWorkOrder,
  getWorkOrderChoices,
  getWorkOrderImage,
  getWorkOrders,
  newWorkOrder,
  setWorkOrderStatus,
  uploadWorkOrderFile,
} from '@/api/workOrders/workOrders';
import { workOrderError } from '@/lib/workOrders/status';
import type { ReadinessAccess, WorkOrderChoices, WorkOrderDetail, WorkOrderSummary, WorkOrderTransition } from '@/models/v4/workOrders';
import { WorkOrderPriority, WorkOrderType } from '@/models/v4/workOrders';
import useAuthStore from '@/stores/auth/store';
import { securityStore } from '@/stores/security/store';

// Work orders for the Responder app: report a problem, follow what you reported, and work what is assigned
// to you. The server scopes every list and detail to the person; this store never decides visibility.

export interface WorkOrderReport {
  title: string;
  description: string;
  type: number;
  priority: number;
  unitId: number | null;
  groupId: number | null;
  assetId: string | null;
  location: string;
  safetyCritical: boolean;
}

export interface WorkOrdersState {
  identity: string | null;
  access: ReadinessAccess | null;
  choices: WorkOrderChoices | null;
  assignedToMe: boolean;
  items: WorkOrderSummary[];
  page: number;
  hasMore: boolean;
  canWrite: boolean;
  detail: WorkOrderDetail | null;
  images: Record<string, string>;
  busy: boolean;
  error: string | null;
  notice: string | null;
  load: (assignedToMe?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  open: (id: string) => Promise<void>;
  report: (input: WorkOrderReport) => Promise<string | null>;
  transition: (input: Omit<WorkOrderTransition, 'Revision'>) => Promise<boolean>;
  accept: () => Promise<boolean>;
  comment: (note: string) => Promise<boolean>;
  logHours: (workDate: string, hours: number, note: string | null) => Promise<boolean>;
  attach: (file: { uri: string; name: string; type: string }) => Promise<boolean>;
  viewImage: (fileId: string) => Promise<string | null>;
  close: () => void;
}

const initial = {
  identity: null as string | null,
  access: null,
  choices: null,
  assignedToMe: true,
  items: [],
  page: 0,
  hasMore: false,
  canWrite: false,
  detail: null,
  images: {},
  busy: false,
  error: null,
  notice: null,
};

const currentIdentity = (): string | null => {
  const userId = useAuthStore.getState().userId;
  const departmentId = securityStore.getState().rights?.DepartmentId;
  return userId && departmentId ? `${userId}:${departmentId}` : null;
};

export const useWorkOrdersStore = create<WorkOrdersState>()((set, get) => {
  const settle = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    set({ busy: true, error: null, notice: null });
    try {
      return await work();
    } catch (error) {
      const code = workOrderError(error);
      set({ error: code });
      // Someone else changed the order: show what it is now so the person can decide again.
      if (code === 'Conflict' || code === 'RevisionConflict') {
        const id = get().detail?.Order.Id;
        if (id)
          await getWorkOrder(id)
            .then((detail) => set({ detail }))
            .catch(() => undefined);
      }
      return undefined;
    } finally {
      set({ busy: false });
    }
  };

  /** Run a command against the open order at its current Revision and adopt the detail it answers with. */
  const command = async (run: (id: string, revision: number) => Promise<WorkOrderDetail>) => {
    const detail = get().detail;
    if (!detail) return false;
    const done = await settle(async () => {
      const next = await run(detail.Order.Id, detail.Order.Revision);
      set({ detail: next, items: get().items.map((item) => (item.Id === next.Order.Id ? next.Order : item)) });
      return true;
    });
    return done === true;
  };

  return {
    ...initial,
    load: async (assignedToMe = get().assignedToMe) => {
      const identity = currentIdentity();
      if (get().identity !== identity) set({ ...initial, identity });
      await settle(async () => {
        const [access, choices, page] = await Promise.all([getReadinessAccess(), get().choices ? Promise.resolve(get().choices) : getWorkOrderChoices(), getWorkOrders({ page: 0, assignedToMe })]);
        set({ access, choices, assignedToMe, items: page.Items, page: 0, hasMore: page.HasMore, canWrite: page.CanWrite && access.MaintenanceEnabled });
      });
    },
    loadMore: async () => {
      if (!get().hasMore || get().busy) return;
      await settle(async () => {
        const next = get().page + 1;
        const page = await getWorkOrders({ page: next, assignedToMe: get().assignedToMe });
        set({ items: [...get().items, ...page.Items.filter((item) => !get().items.some((existing) => existing.Id === item.Id))], page: next, hasMore: page.HasMore });
      });
    },
    open: async (id) => {
      await settle(async () => {
        const [detail, choices] = await Promise.all([getWorkOrder(id), get().choices ? Promise.resolve(get().choices) : getWorkOrderChoices()]);
        set({ detail, choices, images: {} });
      });
    },
    report: async (input) => {
      const created = await settle(async () => {
        const detail = await newWorkOrder({
          RequestId: randomUUID(),
          Revision: 0,
          Type: input.type ?? WorkOrderType.Corrective,
          Priority: input.priority ?? WorkOrderPriority.Normal,
          TargetUnitId: input.unitId,
          TargetGroupId: input.groupId,
          InventoryAssetId: input.assetId,
          Content: {
            Title: input.title.trim(),
            Description: input.description.trim() || null,
            LocationText: input.location.trim() || null,
            Currency: get().choices?.Currency ?? null,
            SafetyCritical: input.safetyCritical,
            Steps: [],
          },
        });
        set({ detail, items: [detail.Order, ...get().items] });
        return detail.Order.Id;
      });
      return created ?? null;
    },
    transition: (input) => command((id, revision) => setWorkOrderStatus(id, { ...input, Revision: revision })),
    accept: () => command((id, revision) => acceptWorkOrderAssignment(id, revision)),
    comment: (note) => command((id, revision) => addWorkOrderComment(id, revision, note.trim())),
    logHours: (workDate, hours, note) => command((id, revision) => addWorkOrderLabor(id, revision, workDate, hours, note, get().choices?.Currency ?? null)),
    attach: (file) => command((id, revision) => uploadWorkOrderFile(id, revision, file)),
    viewImage: async (fileId) => {
      const cached = get().images[fileId];
      if (cached) return cached;
      const uri = await settle(() => getWorkOrderImage(fileId));
      if (uri) set({ images: { ...get().images, [fileId]: uri } });
      return uri ?? null;
    },
    close: () => set({ detail: null, images: {}, error: null, notice: null }),
  };
});
