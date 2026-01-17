/**
 * Clear All App Data Utility
 *
 * This module provides functionality to clear all app data including:
 * - All Zustand stores (reset to initial state)
 * - MMKV storage (cached values, persisted state)
 * - Secure storage keys
 * - Filter options
 *
 * Used during logout to ensure complete data cleanup
 */

import { logger } from '@/lib/logging';

import { storage } from './index';
import { clearPersonnelFilterOptions } from './personnel-filter';
import { clearSecureKeys } from './secure-storage';
import { clearUnitsFilterOptions } from './units-filter';

// Store reset functions registry
type StoreResetFunction = () => void;

const storeResetFunctions: Map<string, StoreResetFunction> = new Map();

/**
 * Register a store reset function
 * Stores should call this during initialization to register their reset function
 */
export const registerStoreReset = (storeName: string, resetFn: StoreResetFunction): void => {
  storeResetFunctions.set(storeName, resetFn);
  logger.debug({
    message: 'Store registered for reset',
    context: { storeName },
  });
};

/**
 * Unregister a store reset function
 */
export const unregisterStoreReset = (storeName: string): void => {
  storeResetFunctions.delete(storeName);
};

/**
 * Reset all registered stores to their initial state
 */
const resetAllStores = (): void => {
  logger.info({
    message: 'Resetting all registered stores',
    context: { storeCount: storeResetFunctions.size },
  });

  storeResetFunctions.forEach((resetFn, storeName) => {
    try {
      resetFn();
      logger.debug({
        message: 'Store reset successfully',
        context: { storeName },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to reset store',
        context: { storeName, error },
      });
    }
  });
};

/**
 * Clear all MMKV storage data
 */
const clearMMKVStorage = (): void => {
  try {
    storage.clearAll();
    logger.info({
      message: 'MMKV storage cleared successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to clear MMKV storage',
      context: { error },
    });
  }
};

/**
 * Clear filter options from storage
 */
const clearFilterOptions = (): void => {
  try {
    clearUnitsFilterOptions();
    clearPersonnelFilterOptions();
    logger.info({
      message: 'Filter options cleared successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to clear filter options',
      context: { error },
    });
  }
};

/**
 * Clear secure storage keys
 */
const clearSecureStorage = async (): Promise<void> => {
  try {
    await clearSecureKeys();
    logger.info({
      message: 'Secure storage cleared successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to clear secure storage',
      context: { error },
    });
  }
};

/**
 * Clear all app data - should be called during logout
 *
 * This clears:
 * - All registered Zustand stores
 * - MMKV persisted storage
 * - Secure storage keys
 * - Filter options
 *
 * @param options Configuration options for clearing data
 */
export const clearAllAppData = async (
  options: {
    resetStores?: boolean;
    clearStorage?: boolean;
    clearSecure?: boolean;
    clearFilters?: boolean;
  } = {}
): Promise<void> => {
  const { resetStores = true, clearStorage = true, clearSecure = false, clearFilters = true } = options;

  logger.info({
    message: 'Starting app data cleanup',
    context: { options: { resetStores, clearStorage, clearSecure, clearFilters } },
  });

  try {
    // Clear filters first (they're stored in MMKV)
    if (clearFilters) {
      clearFilterOptions();
    }

    // Reset stores before clearing storage (in case they persist state)
    if (resetStores) {
      resetAllStores();
    }

    // Clear MMKV storage
    if (clearStorage) {
      clearMMKVStorage();
    }

    // Clear secure storage (encryption keys) - only if explicitly requested
    if (clearSecure) {
      await clearSecureStorage();
    }

    logger.info({
      message: 'App data cleanup completed successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Error during app data cleanup',
      context: { error },
    });
    throw error;
  }
};

/**
 * Get the count of registered stores
 */
export const getRegisteredStoreCount = (): number => {
  return storeResetFunctions.size;
};

/**
 * Get the names of registered stores
 */
export const getRegisteredStoreNames = (): string[] => {
  return Array.from(storeResetFunctions.keys());
};
