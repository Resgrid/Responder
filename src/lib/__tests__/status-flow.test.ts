import { canSubmitStatusWithoutInput, getOfferedStatuses, resolveCurrentStatusId } from '../status-flow';

// A Belgian EMS unit set: Standplaats → (dispatch) → Vertrokken → Ter Plaatse → Naar ZH / Standplaats / Buiten dienst.
const standplaats = { Id: 10, Text: 'Standplaats', NextIds: [] as number[], Detail: 0, Note: 0 };
const telefonisch = { Id: 11, Text: 'Telefonisch', NextIds: [] as number[], Detail: 0, Note: 0 };
const vertrokken = { Id: 12, Text: 'Vertrokken', NextIds: [13], Detail: 2, Note: 0 };
const terPlaatse = { Id: 13, Text: 'Ter Plaatse', NextIds: [14, 10, 16], Detail: 2, Note: 0 };
const naarZh = { Id: 14, Text: 'Naar ZH', NextIds: [15], Detail: 4, Note: 0 };
const aankomstZh = { Id: 15, Text: 'Aankomst ZH', NextIds: [], Detail: 0, Note: 0 };
const buitenDienst = { Id: 16, Text: 'Buiten dienst', NextIds: [], Detail: 0, Note: 2 };
const statuses = [standplaats, telefonisch, vertrokken, terPlaatse, naarZh, aankomstZh, buitenDienst];

describe('resolveCurrentStatusId', () => {
  it('matches the server StateId first', () => {
    expect(resolveCurrentStatusId(statuses, { StateId: 12, State: 'Something else' })).toBe('12');
  });

  it('falls back to the status text for servers that do not send StateId', () => {
    expect(resolveCurrentStatusId(statuses, { State: '  ter plaatse ' })).toBe('13');
    expect(resolveCurrentStatusId(statuses, { StateId: 0, State: 'Vertrokken' })).toBe('12');
  });

  it('falls back to the text when the id is not one of these statuses', () => {
    expect(resolveCurrentStatusId(statuses, { StateId: 999, State: 'Naar ZH' })).toBe('14');
  });

  it('treats id 0 as a status only when there is no text to contradict it', () => {
    const builtIn = [
      { Id: 0, Text: 'Available' },
      { Id: 2, Text: 'Responding' },
    ];

    // Responder sends only the personnel status type.
    expect(resolveCurrentStatusId(builtIn, { StateId: 0 })).toBe('0');
    // A unit with no status yet reports 0 as "Unknown".
    expect(resolveCurrentStatusId(builtIn, { StateId: 0, State: 'Unknown' })).toBeNull();
    expect(resolveCurrentStatusId(builtIn, { StateId: 0, State: 'Available' })).toBe('0');
  });

  it('is null when the current status is not in the list or unknown', () => {
    expect(resolveCurrentStatusId(statuses, { StateId: 999, State: 'Responding' })).toBeNull();
    expect(resolveCurrentStatusId(statuses, { State: '' })).toBeNull();
    expect(resolveCurrentStatusId(statuses, null)).toBeNull();
    expect(resolveCurrentStatusId([], { StateId: 12 })).toBeNull();
  });
});

describe('getOfferedStatuses', () => {
  it('offers only On Scene after Departed', () => {
    const result = getOfferedStatuses(statuses, '12', false);

    expect(result.offered.map((status) => status.Text)).toEqual(['Ter Plaatse']);
    expect(result.isRestricted).toBe(true);
    expect(result.hiddenCount).toBe(6);
  });

  it('offers To Hospital, To Station and Out of Service after On Scene, in the department order', () => {
    expect(getOfferedStatuses(statuses, '13', false).offered.map((status) => status.Id)).toEqual([10, 14, 16]);
  });

  it('offers everything when the crew asks for all statuses', () => {
    const result = getOfferedStatuses(statuses, '12', true);

    expect(result.offered).toHaveLength(statuses.length);
    expect(result.isRestricted).toBe(false);
    expect(result.hiddenCount).toBe(0);
  });

  it('offers everything when the current status has no next statuses or is unknown', () => {
    expect(getOfferedStatuses(statuses, '10', false).isRestricted).toBe(false);
    expect(getOfferedStatuses(statuses, null, false).offered).toHaveLength(statuses.length);
    expect(getOfferedStatuses([{ Id: 1, Text: 'A' }], '1', false).isRestricted).toBe(false);
  });

  it('never leaves the crew without buttons when every next status was removed', () => {
    const orphaned = [{ ...vertrokken, NextIds: [99] }, standplaats];

    expect(getOfferedStatuses(orphaned, '12', false).offered).toHaveLength(2);
  });

  it('accepts string ids from older payloads', () => {
    const stringy = [
      { Id: '1', Text: 'A', NextIds: ['2'] },
      { Id: '2', Text: 'B' },
    ];

    expect(getOfferedStatuses(stringy, '1', false).offered.map((status) => status.Text)).toEqual(['B']);
  });
});

describe('canSubmitStatusWithoutInput', () => {
  it('saves a status with no destination and no required note straight away', () => {
    expect(canSubmitStatusWithoutInput(standplaats, { allowsCalls: false, hasDefaultCall: false })).toBe(true);
  });

  it('saves a call status straight away when the call can be filled in', () => {
    expect(canSubmitStatusWithoutInput(vertrokken, { allowsCalls: true, hasDefaultCall: true })).toBe(true);
  });

  it('asks for the destination when there is no call to default to, or the status takes another kind', () => {
    expect(canSubmitStatusWithoutInput(vertrokken, { allowsCalls: true, hasDefaultCall: false })).toBe(false);
    expect(canSubmitStatusWithoutInput(naarZh, { allowsCalls: false, hasDefaultCall: true })).toBe(false);
  });

  it('asks for a required note but skips an optional one', () => {
    expect(canSubmitStatusWithoutInput(buitenDienst, { allowsCalls: false, hasDefaultCall: false })).toBe(false);
    expect(canSubmitStatusWithoutInput({ Detail: 0, Note: 1 }, { allowsCalls: false, hasDefaultCall: false })).toBe(true);
  });

  it('cannot submit without a status', () => {
    expect(canSubmitStatusWithoutInput(null, { allowsCalls: true, hasDefaultCall: true })).toBe(false);
  });
});
