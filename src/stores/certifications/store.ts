import { create } from 'zustand';

import {
  addCertificationCredit,
  deleteCertification,
  getCertification,
  getCertificationCredits,
  getMyCertifications,
  getPersonCertificationTypes,
  renewCertification,
  saveCertification,
} from '@/api/certifications/certifications';
import type { AddCreditInput, Certification, CertificationCredit, CertificationType, SaveCertificationInput } from '@/models/v4/certifications';
import useAuthStore from '@/stores/auth/store';
import { securityStore } from '@/stores/security/store';

// The signed-in member's own certifications: what they hold, what is expiring, and the continuing-education
// hours toward renewal. The server keeps status and verification to the department.

export const certificationError = (error: unknown): string => {
  const response = (error as { response?: { status?: number; headers?: Record<string, string>; data?: { type?: string } } })?.response;
  const reason = String(response?.headers?.['x-resgrid-reason'] ?? '');
  if (response?.data?.type === 'protected_data_required') return 'locked';
  if (reason.startsWith('certifications_')) return reason;
  if (response?.status === 401 || response?.status === 403 || response?.status === 404) return 'denied';
  if (response?.status === 400) return 'validation';
  return 'retry';
};

export interface CertificationsState {
  identity: string | null;
  items: Certification[];
  types: CertificationType[];
  detail: Certification | null;
  credits: CertificationCredit[];
  busy: boolean;
  error: string | null;
  load: () => Promise<void>;
  open: (id: number) => Promise<void>;
  save: (input: SaveCertificationInput) => Promise<Certification | null>;
  renew: (expiresOn: string | null, number: string | null) => Promise<boolean>;
  remove: () => Promise<boolean>;
  addCredit: (input: Omit<AddCreditInput, 'CertificationId'>) => Promise<boolean>;
  close: () => void;
}

const initial = { identity: null as string | null, items: [], types: [], detail: null, credits: [], busy: false, error: null };

const currentIdentity = (): string | null => {
  const userId = useAuthStore.getState().userId;
  const departmentId = securityStore.getState().rights?.DepartmentId;
  return userId && departmentId ? `${userId}:${departmentId}` : null;
};

/** Soonest expiry first; records that never expire last. */
export const sortCertifications = (items: Certification[]) =>
  [...items].sort((a, b) => (a.ExpiresOn ?? '9999').localeCompare(b.ExpiresOn ?? '9999') || (a.TypeName ?? a.Name ?? '').localeCompare(b.TypeName ?? b.Name ?? ''));

export const useCertificationsStore = create<CertificationsState>()((set, get) => {
  const settle = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    set({ busy: true, error: null });
    try {
      return await work();
    } catch (error) {
      set({ error: certificationError(error) });
      return undefined;
    } finally {
      set({ busy: false });
    }
  };
  const upsert = (record: Certification) => set({ items: sortCertifications([record, ...get().items.filter((item) => item.Id !== record.Id)]) });
  /** Drop another sign-in's state before reading for this one, and return the identity the read belongs to. */
  const adoptIdentity = () => {
    const identity = currentIdentity();
    if (get().identity !== identity) set({ ...initial, identity });
    return identity;
  };
  /** The person signed out or switched while a read was in flight: its answer belongs to the old identity. */
  const isStale = (identity: string | null) => currentIdentity() !== identity || get().identity !== identity;

  return {
    ...initial,
    load: async () => {
      const identity = adoptIdentity();
      await settle(async () => {
        const [items, types] = await Promise.all([getMyCertifications(), getPersonCertificationTypes().catch(() => [] as CertificationType[])]);
        if (isStale(identity)) return;
        set({ items: sortCertifications(items), types: types.filter((type) => type.IsActive) });
      });
    },
    open: async (id) => {
      // The detail screen can be reached without the list (a deep link), so it adopts the identity itself.
      const identity = adoptIdentity();
      await settle(async () => {
        const [detail, credits] = await Promise.all([getCertification(id), getCertificationCredits(id)]);
        if (isStale(identity)) return;
        set({ detail, credits });
      });
    },
    save: async (input) => {
      const saved = await settle(async () => {
        const record = await saveCertification(input);
        upsert(record);
        if (get().detail?.Id === record.Id) set({ detail: record });
        return record;
      });
      return saved ?? null;
    },
    renew: async (expiresOn, number) => {
      const detail = get().detail;
      if (!detail) return false;
      const renewed = await settle(async () => {
        const record = await renewCertification(detail.Id, expiresOn, number);
        upsert(record);
        set({ detail: record });
        return true;
      });
      return renewed === true;
    },
    remove: async () => {
      const detail = get().detail;
      if (!detail) return false;
      const removed = await settle(async () => {
        await deleteCertification(detail.Id);
        set({ items: get().items.filter((item) => item.Id !== detail.Id), detail: null, credits: [] });
        return true;
      });
      return removed === true;
    },
    addCredit: async (input) => {
      const detail = get().detail;
      if (!detail) return false;
      const added = await settle(async () => {
        const credits = await addCertificationCredit({ ...input, CertificationId: detail.Id });
        const record = await getCertification(detail.Id);
        upsert(record);
        set({ credits, detail: record });
        return true;
      });
      return added === true;
    },
    close: () => set({ detail: null, credits: [], error: null }),
  };
});
