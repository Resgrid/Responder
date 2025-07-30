import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { logger } from '../logging';

const UNITS_FILTER_OPTIONS = 'UNITS_FILTER_OPTIONS';

// Create storage instance to avoid circular dependency
const storage = Platform.OS === 'web' ? new MMKV({ id: 'ResgridUnit' }) : new MMKV({ id: 'ResgridUnit', encryptionKey: 'hunter2' });

/**
 * Load units filter options from MMKV storage
 */
export const loadUnitsFilterOptions = async (): Promise<string[]> => {
  try {
    const filterOptions = storage.getString(UNITS_FILTER_OPTIONS);
    const parsedOptions = filterOptions ? JSON.parse(filterOptions) : [];
    logger.info({
      message: 'Units filter options loaded from storage',
      context: { options: parsedOptions },
    });
    return parsedOptions;
  } catch (error) {
    logger.error({
      message: 'Failed to load units filter options from storage',
      context: { error },
    });
    return [];
  }
};

/**
 * Save units filter options to MMKV storage
 */
export const saveUnitsFilterOptions = (options: string[]): void => {
  try {
    storage.set(UNITS_FILTER_OPTIONS, JSON.stringify(options));
    logger.info({
      message: 'Units filter options saved to storage',
      context: { options },
    });
  } catch (error) {
    logger.error({
      message: 'Failed to save units filter options to storage',
      context: { error, options },
    });
  }
};

/**
 * Clear units filter options from MMKV storage
 */
export const clearUnitsFilterOptions = (): void => {
  try {
    storage.delete(UNITS_FILTER_OPTIONS);
    logger.info({
      message: 'Units filter options cleared from storage',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to clear units filter options from storage',
      context: { error },
    });
  }
};

/**
 * Get the storage key for units filter options
 */
export const getUnitsFilterStorageKey = (): string => {
  return UNITS_FILTER_OPTIONS;
};
