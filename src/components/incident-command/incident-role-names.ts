import { type TFunction } from 'i18next';

/**
 * Standard NIMS/ICS position titles, keyed by the Core `IncidentRoleType` value.
 *
 * English titles rather than translation keys: these are the position names an IC is trained
 * against, and the IC app treats them the same way. Translating them needs a subject-matter
 * translator per locale, not a literal one.
 */
const ICS_ROLE_NAMES: Record<number, string> = {
  0: 'Incident Commander',
  1: 'Deputy Incident Commander',
  2: 'Unified Command Member',
  3: 'Operations Section Chief',
  4: 'Planning Section Chief',
  5: 'Logistics Section Chief',
  6: 'Finance/Admin Section Chief',
  7: 'Safety Officer',
  8: 'Liaison Officer',
  9: 'Public Information Officer',
  10: 'Staging Area Manager',
  11: 'Resources Unit Leader',
  12: 'Situation Unit Leader',
  13: 'Documentation Unit Leader',
  14: 'Communications Unit Leader',
  15: 'Division/Group Supervisor',
  16: 'Branch Director',
  17: 'Strike Team/Task Force Leader',
  18: 'Medical Unit Leader',
  19: 'Rehab Officer',
  20: 'Medical Branch Director',
  21: 'Triage Officer',
  22: 'Treatment Officer',
  23: 'Transport Officer',
  24: 'HazMat Group Supervisor',
  25: 'Decon Officer',
  26: 'Entry Team Leader',
  27: 'Search Group Supervisor',
  28: 'Air Operations Branch Director',
  29: 'Shelter/Mass Care Coordinator',
  30: 'Damage Assessment Lead',
};

/** Display name for an ICS position; falls back to a generic label for a value we don't know yet. */
export const getIncidentRoleName = (t: TFunction, roleType: number): string => ICS_ROLE_NAMES[roleType] ?? t('incident_command.role_generic', { role: roleType });
