import { getCallCloseErrorMessage } from '@/lib/call-close';

const axiosError = (response?: { status: number; data?: unknown }) => Object.assign(new Error(response ? `Request failed with status code ${response.status}` : 'Network Error'), { isAxiosError: true, response });

const ACTIVE_COMMAND = 'This call has an active incident command. Close the incident command first, then close the call.';

describe('getCallCloseErrorMessage', () => {
  it('reads the plain-text reason of a 400', () => {
    expect(getCallCloseErrorMessage(axiosError({ status: 400, data: `  ${ACTIVE_COMMAND}  ` }))).toBe(ACTIVE_COMMAND);
  });

  it('reads a JSON reason (Message, then detail/title)', () => {
    expect(getCallCloseErrorMessage(axiosError({ status: 400, data: { Message: 'Call is already closed' } }))).toBe('Call is already closed');
    expect(getCallCloseErrorMessage(axiosError({ status: 400, data: { title: 'One or more validation errors occurred.' } }))).toBe('One or more validation errors occurred.');
  });

  it('has no reason for network, timeout, rate-limit and server failures', () => {
    expect(getCallCloseErrorMessage(axiosError())).toBeNull();
    expect(getCallCloseErrorMessage(axiosError({ status: 408, data: 'Request Timeout' }))).toBeNull();
    expect(getCallCloseErrorMessage(axiosError({ status: 429, data: 'Too Many Requests' }))).toBeNull();
    expect(getCallCloseErrorMessage(axiosError({ status: 500, data: 'Server exploded' }))).toBeNull();
  });

  it('has no reason for empty bodies, HTML pages or non-axios errors', () => {
    expect(getCallCloseErrorMessage(axiosError({ status: 400, data: '' }))).toBeNull();
    expect(getCallCloseErrorMessage(axiosError({ status: 400, data: '<html><body>Bad Request</body></html>' }))).toBeNull();
    expect(getCallCloseErrorMessage(new Error('boom'))).toBeNull();
  });
});
