import { Platform } from 'react-native';
import { type StateStorage } from 'zustand/middleware';

import { logger } from '@/lib/logging';

import { getOfflineQueueStorage, getWebEncryptedStorage } from './secure-storage';

class SecureOfflineQueueStorage implements StateStorage {
  private initialized = false;
  private storage: any = null;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      if (Platform.OS === 'web') {
        // For web, we'll disable offline queue persistence for PII safety
        // or use encrypted localStorage if available
        this.storage = getWebEncryptedStorage();
        if (!this.storage) {
          logger.warn({
            message: 'Web encrypted storage not available, offline queue will not persist',
          });
        }
      } else {
        this.storage = await getOfflineQueueStorage();
      }
      this.initialized = true;

      logger.debug({
        message: 'Offline queue storage initialized',
        context: { platform: Platform.OS, hasStorage: !!this.storage },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize offline queue storage',
        context: { error },
      });
      this.storage = null;
      this.initialized = true;
    }
  }

  setItem: StateStorage['setItem'] = async (name, value) => {
    await this.ensureInitialized();

    if (!this.storage) {
      logger.warn({
        message: 'No secure storage available for offline queue, data will not persist',
        context: { key: name },
      });
      return;
    }

    try {
      if (Platform.OS === 'web' && this.storage.set) {
        this.storage.set(name, value);
      } else {
        this.storage.set(name, value);
      }

      logger.debug({
        message: 'Offline queue data saved to secure storage',
        context: { key: name },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to save offline queue data to secure storage',
        context: { key: name, error },
      });
    }
  };

  getItem: StateStorage['getItem'] = async (name) => {
    await this.ensureInitialized();

    if (!this.storage) {
      logger.debug({
        message: 'No secure storage available for offline queue',
        context: { key: name },
      });
      return null;
    }

    try {
      let value: string | undefined;

      if (Platform.OS === 'web' && this.storage.getString) {
        value = this.storage.getString(name);
      } else {
        value = this.storage.getString(name);
      }

      logger.debug({
        message: 'Offline queue data retrieved from secure storage',
        context: { key: name, hasValue: !!value },
      });

      return value ?? null;
    } catch (error) {
      logger.error({
        message: 'Failed to retrieve offline queue data from secure storage',
        context: { key: name, error },
      });
      return null;
    }
  };

  removeItem: StateStorage['removeItem'] = async (name) => {
    await this.ensureInitialized();

    if (!this.storage) {
      logger.debug({
        message: 'No secure storage available for offline queue',
        context: { key: name },
      });
      return;
    }

    try {
      if (Platform.OS === 'web' && this.storage.delete) {
        this.storage.delete(name);
      } else {
        this.storage.delete(name);
      }

      logger.debug({
        message: 'Offline queue data removed from secure storage',
        context: { key: name },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to remove offline queue data from secure storage',
        context: { key: name, error },
      });
    }
  };
}

export const secureOfflineQueueStorage = new SecureOfflineQueueStorage();
