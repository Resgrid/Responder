jest.mock('@/api/certifications/certifications', () => ({
  getMyCertifications: jest.fn(),
  getCertification: jest.fn(),
  getPersonCertificationTypes: jest.fn(),
  saveCertification: jest.fn(),
  renewCertification: jest.fn(),
  deleteCertification: jest.fn(),
  getCertificationCredits: jest.fn(),
  addCertificationCredit: jest.fn(),
}));
jest.mock('@/stores/auth/store', () => {
  const { create } = jest.requireActual('zustand');
  return { __esModule: true, default: create(() => ({ userId: 'me' })) };
});
jest.mock('@/stores/security/store', () => {
  const { create } = jest.requireActual('zustand');
  return { securityStore: create(() => ({ rights: { DepartmentId: '77' } })) };
});

import * as api from '@/api/certifications/certifications';
import { optionalDate } from '@/lib/certifications/format';
import useAuthStore from '@/stores/auth/store';
import { certificationError, sortCertifications, useCertificationsStore } from '@/stores/certifications/store';

const server = jest.mocked(api);
const cert = (id: number, expiresOn: string | null, patch: Record<string, unknown> = {}) => ({ Id: id, UserId: 'me', Name: `C${id}`, ExpiresOn: expiresOn, Status: 0, HasFile: false, CreditHours: 0, ...patch }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  useCertificationsStore.setState({ identity: null, items: [], types: [], detail: null, credits: [], error: null });
});

it('lists own certifications soonest expiry first and keeps only active catalog types', async () => {
  server.getMyCertifications.mockResolvedValue([cert(1, null), cert(2, '2027-01-01'), cert(3, '2026-10-01')]);
  server.getPersonCertificationTypes.mockResolvedValue([{ Id: 5, Name: 'EMT', IsActive: true }, { Id: 6, Name: 'Old', IsActive: false }] as never);
  await useCertificationsStore.getState().load();
  expect(useCertificationsStore.getState().items.map((item) => item.Id)).toEqual([3, 2, 1]);
  expect(useCertificationsStore.getState().types.map((type) => type.Id)).toEqual([5]);
  expect(sortCertifications([cert(9, null), cert(8, '2026-01-01')]).map((item) => item.Id)).toEqual([8, 9]);
});

it('renews, logs hours and removes the open certification', async () => {
  server.getCertification.mockResolvedValue(cert(3, '2026-10-01'));
  server.getCertificationCredits.mockResolvedValue([]);
  await useCertificationsStore.getState().open(3);
  server.renewCertification.mockResolvedValue(cert(3, '2028-10-01'));
  expect(await useCertificationsStore.getState().renew('2028-10-01', null)).toBe(true);
  expect(server.renewCertification).toHaveBeenCalledWith(3, '2028-10-01', null);
  expect(useCertificationsStore.getState().detail?.ExpiresOn).toBe('2028-10-01');

  server.addCertificationCredit.mockResolvedValue([{ Id: 1, CertificationId: 3, CreditDate: '2026-09-22', Hours: 2, HasFile: false }]);
  server.getCertification.mockResolvedValue(cert(3, '2028-10-01', { CreditHours: 2 }));
  expect(await useCertificationsStore.getState().addCredit({ CreditDate: null, Hours: 2 })).toBe(true);
  expect(server.addCertificationCredit).toHaveBeenCalledWith({ CreditDate: null, Hours: 2, CertificationId: 3 });
  expect(useCertificationsStore.getState().detail?.CreditHours).toBe(2);

  server.deleteCertification.mockResolvedValue({} as never);
  expect(await useCertificationsStore.getState().remove()).toBe(true);
  expect(useCertificationsStore.getState().items.some((item) => item.Id === 3)).toBe(false);
});

it("drops a detail that arrives after the person changed, so the old identity's record is never shown", async () => {
  let answer!: (value: never) => void;
  server.getCertification.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)) as never);
  server.getCertificationCredits.mockResolvedValue([]);
  const opening = useCertificationsStore.getState().open(3);

  useAuthStore.setState({ userId: 'someone-else' });
  answer(cert(3, '2026-10-01'));
  await opening;

  expect(useCertificationsStore.getState().detail).toBeNull();
  useAuthStore.setState({ userId: 'me' });
});

it('maps refusals and validates optional dates', () => {
  expect(certificationError({ response: { status: 400, headers: { 'x-resgrid-reason': 'certifications_file_too_large' } } })).toBe('certifications_file_too_large');
  expect(certificationError({ response: { status: 401 } })).toBe('denied');
  expect(optionalDate('')).toEqual({ ok: true, value: null });
  expect(optionalDate('2026-02-30').ok).toBe(true);
  expect(optionalDate('26-1-1').ok).toBe(false);
});
