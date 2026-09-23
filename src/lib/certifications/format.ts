import { CertificationStatus } from '@/models/v4/certifications';

/** Text tone for an expiry: expired red, within 60 days amber, otherwise muted. */
export const expiryTone = (days?: number | null, status?: number) => {
  if (status === CertificationStatus.Expired || (days != null && days < 0)) return 'text-error-600';
  if (days != null && days <= 60) return 'text-warning-600';
  return 'text-typography-500';
};

export const isDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** An optional calendar-day field: blank is null, anything else must be yyyy-MM-dd. */
export const optionalDate = (value: string): { ok: boolean; value: string | null } => {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  return isDateKey(trimmed) ? { ok: true, value: trimmed } : { ok: false, value: null };
};
