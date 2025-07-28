import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { logger } from '../logging';

const PERSONNEL_FILTER_OPTIONS = 'PERSONNEL_FILTER_OPTIONS';

// Create storage instance to avoid circular dependency
const storage = Platform.OS === 'web' ? new MMKV({ id: 'ResgridUnit' }) : new MMKV({ id: 'ResgridUnit', encryptionKey: 'hunter2' });

/**
 * Load personnel filter options from MMKV storage
 */
export const loadPersonnelFilterOptions = async (): Promise<string[]> => {
  try {
    const filterOptions = storage.getString(PERSONNEL_FILTER_OPTIONS);
    const parsedOptions = filterOptions ? JSON.parse(filterOptions) : [];
    logger.info({
      message: 'Personnel filter options loaded from storage',
      context: { options: parsedOptions },
    });
    return parsedOptions;
  } catch (error) {
    logger.error({
      message: 'Failed to load personnel filter options from storage',
      context: { error },
    });
    return [];
  }
};

/**
 * Save personnel filter options to MMKV storage
 */
export const savePersonnelFilterOptions = (options: string[]): void => {
  try {
    storage.set(PERSONNEL_FILTER_OPTIONS, JSON.stringify(options));
    logger.info({
      message: 'Personnel filter options saved to storage',
      context: { options },
    });
  } catch (error) {
    logger.error({
      message: 'Failed to save personnel filter options to storage',
      context: { error, options },
    });
  }
};

/**
 * Clear personnel filter options from MMKV storage
 */
export const clearPersonnelFilterOptions = (): void => {
  try {
    storage.delete(PERSONNEL_FILTER_OPTIONS);
    logger.info({
      message: 'Personnel filter options cleared from storage',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to clear personnel filter options from storage',
      context: { error },
    });
  }
};

/**
 * Get the storage key for personnel filter options
 */
export const getPersonnelFilterStorageKey = (): string => {
  return PERSONNEL_FILTER_OPTIONS;
};
