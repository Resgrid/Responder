const Countly = {
  initWithConfig: async (_config?: unknown) => {},
  start: async () => {},
  halt: async () => {},
  endSession: async () => {},
  setUserData: async (_userData?: unknown) => {},
  events: {
    recordEvent: async (_eventName?: string, _segmentation?: unknown, _count?: number, _sum?: number) => {},
  },
  consent: {
    giveConsent: async () => {},
    removeConsent: async () => {},
  },
};

export default Countly;
