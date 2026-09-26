jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('@/api/workOrders/workOrders', () => ({
  getReadinessAccess: jest.fn(),
  getWorkOrders: jest.fn(),
  getWorkOrder: jest.fn(),
  getWorkOrderChoices: jest.fn(),
  newWorkOrder: jest.fn(),
  setWorkOrderStatus: jest.fn(),
  acceptWorkOrderAssignment: jest.fn(),
  addWorkOrderComment: jest.fn(),
  addWorkOrderLabor: jest.fn(),
  uploadWorkOrderFile: jest.fn(),
  getWorkOrderImage: jest.fn(),
}));
jest.mock('@/stores/auth/store', () => {
  const { create } = jest.requireActual('zustand');
  return { __esModule: true, default: create(() => ({ userId: 'me' })) };
});
jest.mock('@/stores/security/store', () => {
  const { create } = jest.requireActual('zustand');
  return { securityStore: create(() => ({ rights: { DepartmentId: '77' } })) };
});

import * as api from '@/api/workOrders/workOrders';
import useAuthStore from '@/stores/auth/store';
import { useWorkOrdersStore } from '@/stores/workOrders/store';

const server = jest.mocked(api);
const summary = (revision = 1, status = 2) => ({ Id: 'wo-1', Number: 'WO-2026-000001', Title: 'Pump leak', Status: status, Priority: 1, Revision: revision, UpdatedOn: '', CreatedOn: '' });
const detailOf = (revision = 1, status = 2) => ({
  Order: summary(revision, status),
  Input: { Content: { Title: 'Pump leak', Steps: [] } },
  CanWrite: true,
  CanManage: false,
  CanEdit: false,
  CanContribute: true,
  CanAccept: true,
  Transitions: [3],
  Activities: [],
  Labor: [],
  Files: [],
});
const detail = (revision = 1, status = 2) => detailOf(revision, status) as never;

beforeEach(() => {
  jest.clearAllMocks();
  useWorkOrdersStore.setState({ identity: null, access: null, choices: null, items: [], detail: null, images: {}, error: null });
  server.getReadinessAccess.mockResolvedValue({ ChecklistsEnabled: true, MaintenanceEnabled: true });
  server.getWorkOrderChoices.mockResolvedValue({ Currency: 'USD', Users: [], Roles: [], Units: [{ Id: '12', Name: 'Engine 41' }], Groups: [], Assets: [] });
  server.getWorkOrders.mockResolvedValue({ Items: [summary()], HasMore: false, CanWrite: true } as never);
});

it('loads the assigned list with the Readiness Pro write gate and reports a problem idempotently', async () => {
  await useWorkOrdersStore.getState().load(true);
  expect(server.getWorkOrders).toHaveBeenCalledWith({ page: 0, assignedToMe: true });
  expect(useWorkOrdersStore.getState().canWrite).toBe(true);

  server.newWorkOrder.mockResolvedValue({ ...detailOf(1, 0), Order: { ...summary(1, 0), Id: 'wo-2' } } as never);
  const id = await useWorkOrdersStore.getState().report({ title: ' Pump leak ', description: '', type: 0, priority: 2, unitId: 12, groupId: null, assetId: null, location: 'Bay 2', safetyCritical: false });
  expect(id).toBe('wo-2');
  expect(server.newWorkOrder).toHaveBeenCalledWith(
    expect.objectContaining({
      RequestId: '11111111-1111-4111-8111-111111111111',
      Priority: 2,
      TargetUnitId: 12,
      Content: expect.objectContaining({ Title: 'Pump leak', LocationText: 'Bay 2', Currency: 'USD', Steps: [] }),
    })
  );

  server.getReadinessAccess.mockResolvedValue({ ChecklistsEnabled: true, MaintenanceEnabled: false });
  await useWorkOrdersStore.getState().load(false);
  expect(useWorkOrdersStore.getState().canWrite).toBe(false);
});

it("drops a list that arrives after the person changed, so the old identity's orders never reach the new one", async () => {
  let answer!: (value: never) => void;
  server.getWorkOrders.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)) as never);
  const loading = useWorkOrdersStore.getState().load(true);

  useAuthStore.setState({ userId: 'someone-else' });
  answer({ Items: [summary()], HasMore: false, CanWrite: true } as never);
  await loading;

  expect(useWorkOrdersStore.getState().items).toEqual([]);
  expect(useWorkOrdersStore.getState().canWrite).toBe(false);
  useAuthStore.setState({ userId: 'me' });
});

it('sends every command at the current revision and reloads the order when someone else changed it', async () => {
  server.getWorkOrder.mockResolvedValue(detail(4));
  await useWorkOrdersStore.getState().open('wo-1');
  server.acceptWorkOrderAssignment.mockResolvedValue(detail(5, 2));
  expect(await useWorkOrdersStore.getState().accept()).toBe(true);
  expect(server.acceptWorkOrderAssignment).toHaveBeenCalledWith('wo-1', 4);

  server.setWorkOrderStatus.mockRejectedValue({ response: { status: 409, data: { type: 'work_order_Conflict' } } });
  server.getWorkOrder.mockResolvedValue(detail(7, 3));
  expect(await useWorkOrdersStore.getState().transition({ Status: 3 })).toBe(false);
  expect(server.setWorkOrderStatus).toHaveBeenCalledWith('wo-1', { Status: 3, Revision: 5 });
  expect(useWorkOrdersStore.getState().error).toBe('Conflict');
  expect(useWorkOrdersStore.getState().detail?.Order.Revision).toBe(7);

  server.addWorkOrderLabor.mockResolvedValue(detail(8, 3));
  expect(await useWorkOrdersStore.getState().logHours('2026-09-22', 1.5, null)).toBe(true);
  expect(server.addWorkOrderLabor).toHaveBeenCalledWith('wo-1', 7, '2026-09-22', 1.5, null, 'USD');
});
