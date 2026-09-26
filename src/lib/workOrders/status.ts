import { type WorkOrderDetail, WorkOrderStatus } from '@/models/v4/workOrders';

// Pure rules for the work order screens. The server filters Transitions for the person and re-checks every
// rule; these only decide which fields a transition form asks for and how a refusal is worded.

export const isTerminal = (status: number) => status >= WorkOrderStatus.Closed;

/** Not yet finished: requested through on hold. */
export const isOpen = (status: number) => status < WorkOrderStatus.Completed;

export interface TransitionNeeds {
  reason: boolean;
  resolution: boolean;
  cause: boolean;
  verification: boolean;
  duplicateOf: boolean;
  /** Completing with unchecked steps needs an explicit confirmation. */
  confirmTasks: boolean;
}

export const transitionNeeds = (detail: Pick<WorkOrderDetail, 'Order' | 'Input'>, to: number): TransitionNeeds => {
  const from = detail.Order.Status;
  const reopen = isTerminal(from) && to === WorkOrderStatus.Accepted;
  const backFromCompleted = from === WorkOrderStatus.Completed && to === WorkOrderStatus.InProgress;
  const openSteps = (detail.Input?.Content?.Steps ?? []).some((step) => !step.Completed);
  return {
    reason: reopen || backFromCompleted || ([WorkOrderStatus.OnHold, WorkOrderStatus.Cancelled, WorkOrderStatus.Rejected, WorkOrderStatus.Duplicate] as number[]).includes(to),
    resolution: to === WorkOrderStatus.Completed,
    cause: to === WorkOrderStatus.Completed,
    verification: to === WorkOrderStatus.Closed,
    duplicateOf: to === WorkOrderStatus.Duplicate,
    confirmTasks: to === WorkOrderStatus.Completed && openSteps,
  };
};

export interface TransitionFields {
  reason: string;
  resolution: string;
  cause: string;
  verification: string;
  duplicateOf: string;
  confirmTasks: boolean;
}

/** The first missing required field, or null when the form can be sent. */
export const missingField = (needs: TransitionNeeds, fields: TransitionFields): keyof TransitionFields | null => {
  if (needs.reason && !fields.reason.trim()) return 'reason';
  if (needs.resolution && !fields.resolution.trim()) return 'resolution';
  if (needs.cause && !fields.cause.trim()) return 'cause';
  if (needs.verification && !fields.verification.trim()) return 'verification';
  if (needs.duplicateOf && !fields.duplicateOf.trim()) return 'duplicateOf';
  if (needs.confirmTasks && !fields.confirmTasks) return 'confirmTasks';
  return null;
};

/**
 * A server refusal as a short code for translation. ProblemDetails carry "work_order_<Code>"; a stale
 * Revision is 409 Conflict; the Readiness Pro gate is 402.
 */
export const workOrderError = (error: unknown): string => {
  const response = (error as { response?: { status?: number; data?: { type?: string } } })?.response;
  const type = String(response?.data?.type ?? '');
  if (type === 'protected_data_required') return 'locked';
  if (response?.status === 402) return 'readiness_required';
  if (type.startsWith('work_order_')) return type.slice('work_order_'.length);
  if (response?.status === 409) return 'Conflict';
  if (response?.status === 401 || response?.status === 403 || response?.status === 404) return 'denied';
  if (error instanceof Error && error.message === 'denied') return 'photo_denied';
  return 'retry';
};

/** A local calendar day as the "yyyy-MM-dd" the labor entry carries. */
export const todayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
