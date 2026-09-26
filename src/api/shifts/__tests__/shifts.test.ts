interface MockEndpoint {
  get: jest.Mock;
  post: jest.Mock;
}

// The module under test creates its endpoints at import time, which runs before any top-level
// statement here, so the registry lives inside the mock factory.
jest.mock('../../common/client', () => {
  const endpoints: Record<string, { get: jest.Mock; post: jest.Mock }> = {};
  return {
    __endpoints: endpoints,
    createApiEndpoint: (endpoint: string) => {
      const api = { get: jest.fn(), post: jest.fn() };
      endpoints[endpoint] = api;
      return api;
    },
  };
});

import {
  assignToShiftDay,
  cancelShiftTrade,
  finishShiftTrade,
  getAllShifts,
  getMyShifts,
  getOnDutyPersonnel,
  getPendingApprovals,
  getShift,
  getShiftDay,
  getShiftDayPersonnelOptions,
  getShiftDaysForDateRange,
  getShiftTrades,
  getTodaysShifts,
  getTradeCandidates,
  removeFromShiftDay,
  requestShiftTrade,
  respondToShiftTrade,
  reviewShiftSignup,
  reviewShiftTrade,
  signupForShiftDay,
  toNumericId,
  withdrawFromShiftDay,
} from '../shifts';

const mockEndpoints: Record<string, MockEndpoint> = jest.requireMock('../../common/client').__endpoints;

const endpoint = (path: string) => {
  const api = mockEndpoints[path];
  if (!api) throw new Error(`endpoint ${path} was not created`);
  return api;
};

const ok = (data: unknown) => ({ data });

describe('shifts api', () => {
  beforeEach(() => {
    Object.values(mockEndpoints).forEach((api) => {
      api.get.mockReset();
      api.post.mockReset();
    });
  });

  it('creates every contract endpoint', () => {
    expect(Object.keys(mockEndpoints).sort()).toEqual(
      [
        '/Shifts/AssignToShiftDay',
        '/Shifts/CancelShiftTrade',
        '/Shifts/FinishShiftTrade',
        '/Shifts/GetMyShifts',
        '/Shifts/GetOnDutyPersonnel',
        '/Shifts/GetPendingApprovals',
        '/Shifts/GetShift',
        '/Shifts/GetShiftDay',
        '/Shifts/GetShiftDayPersonnelOptions',
        '/Shifts/GetShiftDaysForDateRange',
        '/Shifts/GetShiftTrades',
        '/Shifts/GetShifts',
        '/Shifts/GetTodaysShifts',
        '/Shifts/GetTradeCandidates',
        '/Shifts/RemoveFromShiftDay',
        '/Shifts/RequestShiftTrade',
        '/Shifts/RespondToShiftTrade',
        '/Shifts/ReviewShiftSignup',
        '/Shifts/ReviewShiftTrade',
        '/Shifts/SignupForShiftDay',
        '/Shifts/WithdrawFromShiftDay',
      ].sort()
    );
  });

  describe('reads', () => {
    it('getAllShifts returns the response body', async () => {
      endpoint('/Shifts/GetShifts').get.mockResolvedValue(ok({ Data: [{ ShiftId: '1' }] }));
      await expect(getAllShifts()).resolves.toEqual({ Data: [{ ShiftId: '1' }] });
      expect(endpoint('/Shifts/GetShifts').get).toHaveBeenCalledWith();
    });

    it('getShift sends the id the server binds (id=), not shiftId=', async () => {
      endpoint('/Shifts/GetShift').get.mockResolvedValue(ok({ Data: {} }));
      await getShift('12');
      expect(endpoint('/Shifts/GetShift').get).toHaveBeenCalledWith({ id: '12' });
    });

    it('getShiftDay sends id=', async () => {
      endpoint('/Shifts/GetShiftDay').get.mockResolvedValue(ok({ Data: {} }));
      await getShiftDay('55');
      expect(endpoint('/Shifts/GetShiftDay').get).toHaveBeenCalledWith({ id: '55' });
    });

    it('getTodaysShifts takes no params', async () => {
      endpoint('/Shifts/GetTodaysShifts').get.mockResolvedValue(ok({ Data: [] }));
      await getTodaysShifts();
      expect(endpoint('/Shifts/GetTodaysShifts').get).toHaveBeenCalledWith();
    });

    it('getShiftDaysForDateRange sends start/end and only adds shiftId when given', async () => {
      const api = endpoint('/Shifts/GetShiftDaysForDateRange');
      api.get.mockResolvedValue(ok({ Data: [] }));

      await getShiftDaysForDateRange('2026-09-01', '2026-09-30');
      expect(api.get).toHaveBeenLastCalledWith({ start: '2026-09-01', end: '2026-09-30' });

      await getShiftDaysForDateRange('2026-09-01', '2026-09-30', '7');
      expect(api.get).toHaveBeenLastCalledWith({ start: '2026-09-01', end: '2026-09-30', shiftId: '7' });
    });

    it('getMyShifts leaves the window to the server unless given', async () => {
      const api = endpoint('/Shifts/GetMyShifts');
      api.get.mockResolvedValue(ok({ Data: [] }));

      await getMyShifts();
      expect(api.get).toHaveBeenLastCalledWith(undefined);

      await getMyShifts('2026-09-24', '2026-10-24');
      expect(api.get).toHaveBeenLastCalledWith({ start: '2026-09-24', end: '2026-10-24' });
    });

    it('getShiftTrades, getPendingApprovals and getOnDutyPersonnel take no params', async () => {
      endpoint('/Shifts/GetShiftTrades').get.mockResolvedValue(ok({ Data: [] }));
      endpoint('/Shifts/GetPendingApprovals').get.mockResolvedValue(ok({ Data: { IsSupervisor: true, Signups: [], Trades: [] } }));
      endpoint('/Shifts/GetOnDutyPersonnel').get.mockResolvedValue(ok({ Data: [] }));

      await getShiftTrades();
      await expect(getPendingApprovals()).resolves.toEqual({ Data: { IsSupervisor: true, Signups: [], Trades: [] } });
      await getOnDutyPersonnel();

      expect(endpoint('/Shifts/GetShiftTrades').get).toHaveBeenCalledWith();
      expect(endpoint('/Shifts/GetPendingApprovals').get).toHaveBeenCalledWith();
      expect(endpoint('/Shifts/GetOnDutyPersonnel').get).toHaveBeenCalledWith();
    });

    it('getTradeCandidates and getShiftDayPersonnelOptions send shiftDayId=', async () => {
      endpoint('/Shifts/GetTradeCandidates').get.mockResolvedValue(ok({ Data: [] }));
      endpoint('/Shifts/GetShiftDayPersonnelOptions').get.mockResolvedValue(ok({ Data: [] }));

      await getTradeCandidates('9');
      await getShiftDayPersonnelOptions('9');

      expect(endpoint('/Shifts/GetTradeCandidates').get).toHaveBeenCalledWith({ shiftDayId: '9' });
      expect(endpoint('/Shifts/GetShiftDayPersonnelOptions').get).toHaveBeenCalledWith({ shiftDayId: '9' });
    });
  });

  describe('writes', () => {
    beforeEach(() => {
      Object.values(mockEndpoints).forEach((api) => api.post.mockResolvedValue(ok({ Id: '1', ApprovalPending: false, ErrorCode: '', Status: 'success' })));
    });

    it('signupForShiftDay posts numeric ShiftDayId and GroupId', async () => {
      await signupForShiftDay('10', '3');
      expect(endpoint('/Shifts/SignupForShiftDay').post).toHaveBeenCalledWith({ ShiftDayId: 10, GroupId: 3 });
    });

    it('withdrawFromShiftDay posts the sign-up id', async () => {
      await withdrawFromShiftDay('44');
      expect(endpoint('/Shifts/WithdrawFromShiftDay').post).toHaveBeenCalledWith({ ShiftSignupId: 44 });
    });

    it('requestShiftTrade keeps user ids as GUID strings', async () => {
      await requestShiftTrade('10', ['guid-a', 'guid-b'], 'family event');
      expect(endpoint('/Shifts/RequestShiftTrade').post).toHaveBeenCalledWith({ ShiftDayId: 10, UserIds: ['guid-a', 'guid-b'], Note: 'family event' });
    });

    it('respondToShiftTrade converts offered sign-up ids and defaults to none', async () => {
      await respondToShiftTrade('5', true, 'happy to', ['70', '71']);
      expect(endpoint('/Shifts/RespondToShiftTrade').post).toHaveBeenLastCalledWith({ ShiftSignupTradeId: 5, Accept: true, Note: 'happy to', OfferedShiftSignupIds: [70, 71] });

      await respondToShiftTrade('5', false, '');
      expect(endpoint('/Shifts/RespondToShiftTrade').post).toHaveBeenLastCalledWith({ ShiftSignupTradeId: 5, Accept: false, Note: '', OfferedShiftSignupIds: [] });
    });

    it('finishShiftTrade sends null for a straight give-away and a number for a swap', async () => {
      await finishShiftTrade('5', 'guid-a', null);
      expect(endpoint('/Shifts/FinishShiftTrade').post).toHaveBeenLastCalledWith({ ShiftSignupTradeId: 5, AcceptedUserId: 'guid-a', TargetShiftSignupId: null });

      await finishShiftTrade('5', 'guid-a', '88');
      expect(endpoint('/Shifts/FinishShiftTrade').post).toHaveBeenLastCalledWith({ ShiftSignupTradeId: 5, AcceptedUserId: 'guid-a', TargetShiftSignupId: 88 });
    });

    it('cancelShiftTrade posts the trade id', async () => {
      await cancelShiftTrade('5');
      expect(endpoint('/Shifts/CancelShiftTrade').post).toHaveBeenCalledWith({ ShiftSignupTradeId: 5 });
    });

    it('reviewShiftSignup and reviewShiftTrade send the decision and note', async () => {
      await reviewShiftSignup('44', true, 'ok');
      await reviewShiftTrade('5', false, 'coverage gap');
      expect(endpoint('/Shifts/ReviewShiftSignup').post).toHaveBeenCalledWith({ ShiftSignupId: 44, Approve: true, Note: 'ok' });
      expect(endpoint('/Shifts/ReviewShiftTrade').post).toHaveBeenCalledWith({ ShiftSignupTradeId: 5, Approve: false, Note: 'coverage gap' });
    });

    it('assignToShiftDay and removeFromShiftDay keep the user id a string', async () => {
      await assignToShiftDay('10', 'guid-c', '3');
      await removeFromShiftDay('10', 'guid-c', 'sick');
      expect(endpoint('/Shifts/AssignToShiftDay').post).toHaveBeenCalledWith({ ShiftDayId: 10, UserId: 'guid-c', GroupId: 3 });
      expect(endpoint('/Shifts/RemoveFromShiftDay').post).toHaveBeenCalledWith({ ShiftDayId: 10, UserId: 'guid-c', Note: 'sick' });
    });

    it('returns a failure body unchanged so the store can read ErrorCode', async () => {
      endpoint('/Shifts/SignupForShiftDay').post.mockResolvedValue(ok({ Id: '', ApprovalPending: false, ErrorCode: 'invalid_group', Status: 'failure' }));
      await expect(signupForShiftDay('10', '999')).resolves.toMatchObject({ ErrorCode: 'invalid_group', Status: 'failure' });
    });
  });

  it('toNumericId passes numbers through and parses strings', () => {
    expect(toNumericId(4)).toBe(4);
    expect(toNumericId('17')).toBe(17);
  });
});
