import type { ChecklistAnswer, ChecklistForm, ChecklistItem } from '@/models/v4/checklists';

export const visibleChecklistItems = (form: ChecklistForm, answers: ChecklistAnswer[]): ChecklistItem[] => {
  const visible = new Set<string>();
  return form.Sections.flatMap((s) => s.Items).filter((item) => {
    const condition = item.VisibleWhen;
    const answer = condition ? answers.find((a) => a.ItemId === condition.ItemId) : undefined;
    const show = !condition || (visible.has(condition.ItemId) && answer?.Status === 1 && answer.Value === condition.EqualsValue);
    if (show) visible.add(item.Id);
    return show;
  });
};
export const isChecklistRequired = (item: ChecklistItem, answers: ChecklistAnswer[]): boolean =>
  item.Required || (!!item.RequiredWhen && answers.some((a) => a.ItemId === item.RequiredWhen?.ItemId && a.Status === 1 && a.Value === item.RequiredWhen.EqualsValue));
export const checklistFailed = (item: ChecklistItem, answer?: ChecklistAnswer): boolean => {
  if (answer?.Status !== 1) return false;
  if (item.Type === 0) return answer.Value === 'fail';
  if ([1, 2, 6].includes(item.Type)) return answer.Value !== item.PassingValue;
  if ([3, 4].includes(item.Type)) {
    const n = Number(answer.Value);
    return !Number.isFinite(n) || (item.Minimum != null && n < item.Minimum) || (item.Maximum != null && n > item.Maximum);
  }
  return false;
};
