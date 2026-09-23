import { isOpen, isTerminal, missingField, transitionNeeds, workOrderError } from '@/lib/workOrders/status';
import { WorkOrderStatus } from '@/models/v4/workOrders';

const detail = (status: number, steps: { Text: string; Completed: boolean }[] = []) =>
  ({ Order: { Status: status }, Input: { Content: { Title: 'Pump leak', Steps: steps } } }) as never;

const blank = { reason: '', resolution: '', cause: '', verification: '', duplicateOf: '', confirmTasks: false };

it('classifies open and terminal statuses', () => {
  expect(isOpen(WorkOrderStatus.InProgress)).toBe(true);
  expect(isOpen(WorkOrderStatus.Completed)).toBe(false);
  expect(isTerminal(WorkOrderStatus.Completed)).toBe(false);
  expect(isTerminal(WorkOrderStatus.Cancelled)).toBe(true);
});

it('asks for exactly what the server requires for a transition', () => {
  expect(transitionNeeds(detail(WorkOrderStatus.InProgress), WorkOrderStatus.OnHold)).toMatchObject({ reason: true, resolution: false });
  expect(transitionNeeds(detail(WorkOrderStatus.InProgress), WorkOrderStatus.Completed)).toMatchObject({ reason: false, resolution: true, cause: true, confirmTasks: false });
  expect(transitionNeeds(detail(WorkOrderStatus.InProgress, [{ Text: 'Drain', Completed: false }]), WorkOrderStatus.Completed).confirmTasks).toBe(true);
  expect(transitionNeeds(detail(WorkOrderStatus.Completed), WorkOrderStatus.InProgress).reason).toBe(true);
  expect(transitionNeeds(detail(WorkOrderStatus.Closed), WorkOrderStatus.Accepted).reason).toBe(true);
  expect(transitionNeeds(detail(WorkOrderStatus.Assigned), WorkOrderStatus.InProgress)).toEqual({ reason: false, resolution: false, cause: false, verification: false, duplicateOf: false, confirmTasks: false });
  expect(transitionNeeds(detail(WorkOrderStatus.Completed), WorkOrderStatus.Closed).verification).toBe(true);
});

it('names the first missing field and passes a complete form', () => {
  const needs = transitionNeeds(detail(WorkOrderStatus.InProgress, [{ Text: 'Drain', Completed: false }]), WorkOrderStatus.Completed);
  expect(missingField(needs, blank)).toBe('resolution');
  expect(missingField(needs, { ...blank, resolution: 'Replaced seal', cause: 'Wear' })).toBe('confirmTasks');
  expect(missingField(needs, { ...blank, resolution: 'Replaced seal', cause: 'Wear', confirmTasks: true })).toBeNull();
});

it('turns server refusals into short codes', () => {
  expect(workOrderError({ response: { status: 409, data: { type: 'work_order_AcceptAssignmentFirst' } } })).toBe('AcceptAssignmentFirst');
  expect(workOrderError({ response: { status: 409 } })).toBe('Conflict');
  expect(workOrderError({ response: { status: 402, data: { type: 'work_order_ReadinessProRequired' } } })).toBe('readiness_required');
  expect(workOrderError({ response: { status: 403, data: { type: 'protected_data_required' } } })).toBe('locked');
  expect(workOrderError({ response: { status: 404 } })).toBe('denied');
  expect(workOrderError(new Error('boom'))).toBe('retry');
});
