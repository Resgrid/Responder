import type { Href } from 'expo-router';

// What this app does with a deployment. The server enforces every rule again; this only shapes the UI.
export const operationsCapabilities = {
  /** Write crew / individual time reports: the person's own time and, as a crew boss, their unit's Crew Time Report. */
  editTime: true,
  /** Record odometer / engine / fuel readings against a deployment unit. */
  recordUsage: true,
  /** Add expenses (meals, fuel, lodging) with a receipt photo. */
  recordExpenses: true,
  /** Approve submitted time reports when the person holds TimeReports_Approve. */
  approveTime: true,
  /** Draft and validate the CAL OES MARS F-42 from the field. */
  draftF42: true,
  homeRoute: '/(app)/home' as Href,
  useActiveUnitId: (): string | null => null,
};
