import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStore = new Map<string, unknown>();

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn((key: string) => (mockStore.has(key) ? mockStore.get(key) : null)),
  setItem: jest.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
  }),
  removeItem: jest.fn((key: string) => {
    mockStore.delete(key);
  }),
}));

jest.mock('@env', () => ({
  Env: {
    BASE_API_URL: 'https://api.resgrid.test',
    API_VERSION: 'v4',
  },
}));

import { getActiveCallId, setActiveCallId } from '../app';

describe('app storage accessors', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  describe('getActiveCallId', () => {
    it('returns the stored call id', () => {
      setActiveCallId('call-7');

      expect(getActiveCallId()).toBe('call-7');
    });

    it('returns an empty string when nothing is stored', () => {
      expect(getActiveCallId()).toBe('');
    });
  });
});
