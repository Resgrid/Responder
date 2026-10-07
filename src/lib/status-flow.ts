/**
 * Status flow for the status pickers: which status is current, and which statuses to offer next.
 *
 * A department can give each status option a list of "next statuses" (Custom Statuses → option →
 * Next statuses; v4 `NextIds`). While a status with such a list is current the picker offers only
 * those, plus a "Show all statuses" escape for anything out of sequence. It is a display hint: the
 * server accepts any status, and dispatchers can set any status from the website.
 *
 * Shared byte-for-byte by the Unit and Responder apps.
 */

export interface StatusFlowOption {
  Id: number | string;
  Text: string;
  /** Ids of the options offered next while this one is current. Empty/missing = no restriction. */
  NextIds?: (number | string)[] | null;
  Detail?: number | string;
  Note?: number | string;
}

export interface CurrentStatusRef {
  /** The current status's option id (v4 `StateId`). Older servers do not send it. */
  StateId?: number | string | null;
  /** The current status's display text (v4 `State`). */
  State?: string | null;
}

export interface OfferedStatuses<T extends StatusFlowOption> {
  /** The statuses to show, in the department's order. */
  offered: T[];
  /** True when the list is narrowed to the current status's next statuses. */
  isRestricted: boolean;
  /** How many statuses the restriction hides (what "Show all statuses" would add). */
  hiddenCount: number;
}

const toId = (value: number | string | null | undefined): string => (value == null ? '' : String(value).trim());

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * The id of the option in `statuses` that is the current status, or null when it is not one of them
 * (no status yet, a status from another set, or a built-in status the list does not carry).
 *
 * Matches on the server's `StateId` first. Servers that do not send it — and statuses whose id is
 * not in the list — fall back to the display text, which is unique within a set in practice.
 */
export const resolveCurrentStatusId = (statuses: readonly StatusFlowOption[] | null | undefined, current: CurrentStatusRef | null | undefined): string | null => {
  if (!statuses || statuses.length === 0 || !current) {
    return null;
  }

  const stateId = toId(current.StateId);
  const stateText = current.State?.trim().toLowerCase();
  // 0 is a real option id in the built-in sets ("Available"), but a unit with no status yet also reports 0
  // (as "Unknown"); with text to go on, a 0 is only trusted through the text match below.
  if (stateId !== '' && (stateId !== '0' || !stateText)) {
    const byId = statuses.find((status) => toId(status.Id) === stateId);
    if (byId) {
      return toId(byId.Id);
    }
  }

  if (!stateText) {
    return null;
  }

  const byText = statuses.find((status) => status.Text?.trim().toLowerCase() === stateText);
  return byText ? toId(byText.Id) : null;
};

/**
 * The statuses to offer. Everything when `showAll` is set, when the current status is unknown, or when
 * it has no next statuses; otherwise only its next statuses. A list that would come out empty (every
 * next status since removed) falls back to everything rather than leaving the crew with no buttons.
 */
export const getOfferedStatuses = <T extends StatusFlowOption>(statuses: readonly T[] | null | undefined, currentStatusId: string | null, showAll: boolean): OfferedStatuses<T> => {
  const all = statuses ? [...statuses] : [];

  if (showAll || !currentStatusId) {
    return { offered: all, isRestricted: false, hiddenCount: 0 };
  }

  const current = all.find((status) => toId(status.Id) === currentStatusId);
  const nextIds = new Set((current?.NextIds ?? []).map((id) => toId(id)).filter((id) => id !== '' && id !== '0'));

  if (nextIds.size === 0) {
    return { offered: all, isRestricted: false, hiddenCount: 0 };
  }

  const offered = all.filter((status) => nextIds.has(toId(status.Id)));
  if (offered.length === 0) {
    return { offered: all, isRestricted: false, hiddenCount: 0 };
  }

  return { offered, isRestricted: true, hiddenCount: all.length - offered.length };
};

/**
 * Whether a status can be saved the moment it is held, with nothing more to ask: no required note, and
 * either no destination step or a destination step whose call the picker can fill from the active /
 * dispatched call. Anything else opens the step that still needs the crew.
 */
export const canSubmitStatusWithoutInput = (status: Pick<StatusFlowOption, 'Detail' | 'Note'> | null | undefined, options: { allowsCalls: boolean; hasDefaultCall: boolean }): boolean => {
  if (!status) {
    return false;
  }

  // CustomStateNoteTypes: 0 none, 1 optional, 2 required. An optional note is skipped by a hold.
  if (toNumber(status.Note) === 2) {
    return false;
  }

  if (toNumber(status.Detail) === 0) {
    return true;
  }

  return options.allowsCalls && options.hasDefaultCall;
};
