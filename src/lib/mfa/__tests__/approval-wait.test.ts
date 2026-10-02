import { waitForApproval } from '../approval-wait';

describe('waitForApproval', () => {
  // The app's Jest setup fakes timers; the 1 ms polling interval here runs on real ones.
  beforeEach(() => jest.useRealTimers());
  afterEach(() => jest.useFakeTimers());

  it('polls until the request is decided', async () => {
    const status = jest
      .fn()
      .mockResolvedValueOnce({ State: 'pending', ExpiresAt: null })
      .mockResolvedValueOnce({ State: 'pending', ExpiresAt: null })
      .mockResolvedValueOnce({ State: 'approved', ExpiresAt: null });

    await expect(waitForApproval(status, undefined, 1)).resolves.toBe('approved');
    expect(status).toHaveBeenCalledTimes(3);
  });

  it('stops for a denial, an expiry, an abort, or a server it cannot reach', async () => {
    await expect(waitForApproval(jest.fn().mockResolvedValue({ State: 'denied', ExpiresAt: null }), undefined, 1)).resolves.toBe('denied');
    await expect(waitForApproval(jest.fn().mockResolvedValue({ State: 'expired', ExpiresAt: null }), undefined, 1)).resolves.toBe('expired');
    await expect(waitForApproval(jest.fn().mockRejectedValue(new Error('offline')), undefined, 1)).resolves.toBe('unavailable');

    const controller = new AbortController();
    const status = jest.fn().mockImplementation(async () => {
      controller.abort();
      return { State: 'pending', ExpiresAt: null };
    });
    await expect(waitForApproval(status, controller.signal, 1)).resolves.toBe('aborted');
    expect(status).toHaveBeenCalledTimes(1);
  });

  it('leaves no abort listener behind on the signal after each poll', async () => {
    const controller = new AbortController();
    const add = jest.spyOn(controller.signal, 'addEventListener');
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    const status = jest
      .fn()
      .mockResolvedValueOnce({ State: 'pending', ExpiresAt: null })
      .mockResolvedValueOnce({ State: 'pending', ExpiresAt: null })
      .mockResolvedValueOnce({ State: 'approved', ExpiresAt: null });

    await expect(waitForApproval(status, controller.signal, 1)).resolves.toBe('approved');
    expect(add).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls.map(([, listener]) => listener)).toEqual(add.mock.calls.map(([, listener]) => listener));
  });
});
