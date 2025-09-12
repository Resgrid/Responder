export default jest.fn().mockImplementation(() => ({
  setLoggingEnabled: jest.fn().mockReturnThis(),
  enableCrashReporting: jest.fn().mockReturnThis(),
  setRequiresConsent: jest.fn().mockReturnThis(),
  giveConsent: jest.fn().mockReturnThis(),
  setLocation: jest.fn().mockReturnThis(),
  enableParameterTamperingProtection: jest.fn().mockReturnThis(),
}));
