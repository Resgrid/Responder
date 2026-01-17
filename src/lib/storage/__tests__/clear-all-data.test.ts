import { logger } from '@/lib/logging';

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock storage
const mockClearAll = jest.fn();
jest.mock('../index', () => ({
  storage: {
    clearAll: () => mockClearAll(),
  },
}));

// Mock filter functions
const mockClearUnitsFilterOptions = jest.fn();
const mockClearPersonnelFilterOptions = jest.fn();
jest.mock('../units-filter', () => ({
  clearUnitsFilterOptions: () => mockClearUnitsFilterOptions(),
}));

jest.mock('../personnel-filter', () => ({
  clearPersonnelFilterOptions: () => mockClearPersonnelFilterOptions(),
}));

// Mock secure storage
const mockClearSecureKeys = jest.fn().mockResolvedValue(undefined);
jest.mock('../secure-storage', () => ({
  clearSecureKeys: () => mockClearSecureKeys(),
}));

import {
  clearAllAppData,
  getRegisteredStoreCount,
  getRegisteredStoreNames,
  registerStoreReset,
  unregisterStoreReset,
} from '../clear-all-data';

describe('clearAllAppData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerStoreReset', () => {
    it('should register a store reset function', () => {
      const mockResetFn = jest.fn();
      registerStoreReset('testStore', mockResetFn);

      expect(getRegisteredStoreCount()).toBeGreaterThan(0);
      expect(getRegisteredStoreNames()).toContain('testStore');
    });

    it('should log when a store is registered', () => {
      const mockResetFn = jest.fn();
      registerStoreReset('anotherStore', mockResetFn);

      expect(logger.debug).toHaveBeenCalledWith({
        message: 'Store registered for reset',
        context: { storeName: 'anotherStore' },
      });
    });
  });

  describe('unregisterStoreReset', () => {
    it('should unregister a store reset function', () => {
      const mockResetFn = jest.fn();
      registerStoreReset('tempStore', mockResetFn);

      expect(getRegisteredStoreNames()).toContain('tempStore');

      unregisterStoreReset('tempStore');

      expect(getRegisteredStoreNames()).not.toContain('tempStore');
    });
  });

  describe('clearAllAppData', () => {
    beforeEach(() => {
      // Register some mock stores for testing
      registerStoreReset('mockStore1', jest.fn());
      registerStoreReset('mockStore2', jest.fn());
    });

    afterEach(() => {
      unregisterStoreReset('mockStore1');
      unregisterStoreReset('mockStore2');
    });

    it('should clear all data by default', async () => {
      await clearAllAppData();

      expect(logger.info).toHaveBeenCalledWith({
        message: 'Starting app data cleanup',
        context: { options: { resetStores: true, clearStorage: true, clearSecure: false, clearFilters: true } },
      });

      expect(mockClearUnitsFilterOptions).toHaveBeenCalled();
      expect(mockClearPersonnelFilterOptions).toHaveBeenCalled();
      expect(mockClearAll).toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledWith({
        message: 'App data cleanup completed successfully',
      });
    });

    it('should skip store reset when resetStores is false', async () => {
      const mockResetFn = jest.fn();
      registerStoreReset('skipResetStore', mockResetFn);

      await clearAllAppData({ resetStores: false });

      // Store reset function should not be called
      expect(mockResetFn).not.toHaveBeenCalled();

      unregisterStoreReset('skipResetStore');
    });

    it('should skip storage clearing when clearStorage is false', async () => {
      await clearAllAppData({ clearStorage: false });

      expect(mockClearAll).not.toHaveBeenCalled();
    });

    it('should skip filter clearing when clearFilters is false', async () => {
      await clearAllAppData({ clearFilters: false });

      expect(mockClearUnitsFilterOptions).not.toHaveBeenCalled();
      expect(mockClearPersonnelFilterOptions).not.toHaveBeenCalled();
    });

    it('should clear secure storage when clearSecure is true', async () => {
      await clearAllAppData({ clearSecure: true });

      expect(mockClearSecureKeys).toHaveBeenCalled();
    });

    it('should not clear secure storage by default', async () => {
      await clearAllAppData();

      expect(mockClearSecureKeys).not.toHaveBeenCalled();
    });

    it('should handle errors during store reset gracefully', async () => {
      const errorResetFn = jest.fn(() => {
        throw new Error('Reset failed');
      });
      registerStoreReset('errorStore', errorResetFn);

      // Should not throw
      await expect(clearAllAppData()).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to reset store',
        context: { storeName: 'errorStore', error: expect.any(Error) },
      });

      unregisterStoreReset('errorStore');
    });

    it('should execute reset functions for all registered stores', async () => {
      const mockResetFn1 = jest.fn();
      const mockResetFn2 = jest.fn();

      registerStoreReset('store1', mockResetFn1);
      registerStoreReset('store2', mockResetFn2);

      await clearAllAppData();

      expect(mockResetFn1).toHaveBeenCalled();
      expect(mockResetFn2).toHaveBeenCalled();

      unregisterStoreReset('store1');
      unregisterStoreReset('store2');
    });
  });

  describe('getRegisteredStoreCount', () => {
    it('should return the count of registered stores', () => {
      const initialCount = getRegisteredStoreCount();

      registerStoreReset('countTest1', jest.fn());
      registerStoreReset('countTest2', jest.fn());

      expect(getRegisteredStoreCount()).toBe(initialCount + 2);

      unregisterStoreReset('countTest1');
      unregisterStoreReset('countTest2');
    });
  });

  describe('getRegisteredStoreNames', () => {
    it('should return an array of registered store names', () => {
      registerStoreReset('nameTest1', jest.fn());
      registerStoreReset('nameTest2', jest.fn());

      const names = getRegisteredStoreNames();

      expect(names).toContain('nameTest1');
      expect(names).toContain('nameTest2');
      expect(Array.isArray(names)).toBe(true);

      unregisterStoreReset('nameTest1');
      unregisterStoreReset('nameTest2');
    });
  });
});
