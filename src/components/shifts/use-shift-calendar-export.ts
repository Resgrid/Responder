import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAnalytics } from '@/hooks/use-analytics';
import { addShiftDaysToCalendar, type ShiftCalendarEventText } from '@/lib/shift-calendar';
import { isWorkshiftDay } from '@/lib/shift-utils';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { useToastStore } from '@/stores/toast/store';

import { canAddDayToCalendar, getAssignmentTypeKey } from './shift-labels';

interface ShiftCalendarExport {
  /** Adds (or updates) every day the caller works in the device calendar; others are skipped. */
  addToCalendar: (days: ShiftDayResultData[]) => Promise<void>;
  isExporting: boolean;
}

/** Device-calendar export with the toasts and analytics every caller wants. */
export const useShiftCalendarExport = (): ShiftCalendarExport => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);
  const [isExporting, setIsExporting] = useState(false);

  const describe = useCallback(
    (day: ShiftDayResultData): ShiftCalendarEventText => {
      const place = isWorkshiftDay(day) ? day.MyUnitName : (day.Roster ?? []).find((entry) => entry.GroupId && entry.GroupId === day.MyGroupId)?.GroupName;
      const lines = [t(getAssignmentTypeKey(day.ShiftType)), place ? t('shifts.calendar_export.event_place', { place }) : '', t('shifts.calendar_export.event_footer')];
      return {
        title: t('shifts.calendar_export.event_title', { name: day.ShiftName }),
        notes: lines.filter((line) => !!line).join('\n'),
      };
    },
    [t]
  );

  const addToCalendar = useCallback(
    async (days: ShiftDayResultData[]) => {
      const working = days.filter(canAddDayToCalendar);
      if (working.length === 0) {
        showToast('info', t('shifts.calendar_export.nothing_to_add'));
        return;
      }

      setIsExporting(true);
      try {
        const result = await addShiftDaysToCalendar(working, describe);
        trackEvent('shift_calendar_export', { timestamp: new Date().toISOString(), count: working.length, ...result });

        if (result.denied) {
          showToast('error', t('shifts.calendar_export.permission_denied'));
        } else if (result.added + result.updated === 0) {
          showToast('error', t('shifts.calendar_export.failed'));
        } else if (working.length === 1) {
          showToast('success', result.updated > 0 ? t('shifts.calendar_export.updated_one') : t('shifts.calendar_export.added_one'));
        } else {
          showToast('success', t('shifts.calendar_export.added_many', { count: result.added + result.updated }));
        }
      } catch {
        showToast('error', t('shifts.calendar_export.failed'));
      } finally {
        setIsExporting(false);
      }
    },
    [describe, showToast, t, trackEvent]
  );

  return { addToCalendar, isExporting };
};
