export const initWithConfig = jest.fn();
export const events = {
  recordEvent: jest.fn(),
  startEvent: jest.fn(),
  endEvent: jest.fn(),
  cancelEvent: jest.fn(),
};
export const setUserData = jest.fn();
export const endSession = jest.fn();
export const startSession = jest.fn();
export const isInitialized = jest.fn().mockResolvedValue(false);

export default {
  initWithConfig,
  events,
  setUserData,
  endSession,
  startSession,
  isInitialized,
};
