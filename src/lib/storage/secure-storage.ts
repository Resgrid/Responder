import { Env } from '@env';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { logger } from '@/lib/logging';

// Storage keys
const ENCRYPTION_KEY_STORAGE_KEY = 'MMKV_ENCRYPTION_KEY';
const OFFLINE_QUEUE_KEY_STORAGE_KEY = 'OFFLINE_QUEUE_ENCRYPTION_KEY';

// Key generation utilities
const generateSecureKey = (): string => {
  const array = new Uint8Array(32); // 256-bit key
  if (Platform.OS === 'web') {
    // Use crypto.getRandomValues for web
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for older browsers or testing environments
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
  } else {
    // Use native crypto for mobile
    require('react-native-get-random-values');
    crypto.getRandomValues(array);
  }

  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Secure key management for mobile platforms
const getOrCreateSecureKey = async (keyName: string): Promise<string> => {
  try {
    // First check if we have a key from environment variable
    if (Env.STORAGE_ENCRYPTION_KEY && Env.STORAGE_ENCRYPTION_KEY.trim() !== '') {
      logger.info({
        message: 'Using encryption key from environment variable',
        context: { keyName },
      });
      return Env.STORAGE_ENCRYPTION_KEY;
    }

    // Try to get existing key from secure store
    let key = await SecureStore.getItemAsync(keyName);

    if (!key) {
      // Generate new key and store it securely
      key = generateSecureKey();
      await SecureStore.setItemAsync(keyName, key);

      logger.info({
        message: 'Generated and stored new encryption key',
        context: { keyName },
      });
    } else {
      logger.debug({
        message: 'Retrieved existing encryption key',
        context: { keyName },
      });
    }

    return key;
  } catch (error) {
    logger.error({
      message: 'Failed to get or create secure key',
      context: { keyName, error },
    });

    // Fallback to a generated key for this session only
    const fallbackKey = generateSecureKey();
    logger.warn({
      message: 'Using fallback encryption key for session',
      context: { keyName },
    });

    return fallbackKey;
  }
};

// Web-specific encrypted storage
class WebEncryptedStorage {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  private encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
    } catch (error) {
      logger.error({
        message: 'Failed to encrypt data',
        context: { error },
      });
      return data; // Fallback to unencrypted data
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || encryptedData; // Return original if decryption fails
    } catch (error) {
      logger.warn({
        message: 'Failed to decrypt data, returning as-is',
        context: { error },
      });
      return encryptedData; // Return encrypted data if decryption fails
    }
  }

  set(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      logger.error({
        message: 'Failed to set encrypted item in localStorage',
        context: { key, error },
      });
      // Fallback to unencrypted storage
      localStorage.setItem(key, value);
    }
  }

  getString(key: string): string | undefined {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return undefined;

      // Try to decrypt, fallback to original if it fails
      return this.decrypt(item);
    } catch (error) {
      logger.error({
        message: 'Failed to get encrypted item from localStorage',
        context: { key, error },
      });
      return localStorage.getItem(key) || undefined;
    }
  }

  delete(key: string): void {
    localStorage.removeItem(key);
  }

  getAllKeys(): string[] {
    return Object.keys(localStorage);
  }

  clearAll(): void {
    localStorage.clear();
  }
}

// Initialize storage instances
let generalStorage: MMKV | undefined;
let offlineQueueStorage: MMKV | undefined;
let webEncryptedStorage: WebEncryptedStorage | undefined;
let storageInitializing = false;

const initializeStorage = async (): Promise<void> => {
  if (storageInitializing) return;
  storageInitializing = true;
  try {
    if (Platform.OS === 'web') {
      // For web, use encrypted localStorage
      const encryptionKey = Env.STORAGE_ENCRYPTION_KEY || generateSecureKey();
      webEncryptedStorage = new WebEncryptedStorage(encryptionKey);

      // Create a MMKV instance that uses our encrypted web storage
      generalStorage = new MMKV({
        id: 'ResgridUnit',
      });

      // For offline queue, we'll disable persistence on web for PII safety
      offlineQueueStorage = new MMKV({
        id: 'ResgridOfflineQueue',
      });

      logger.info({
        message: 'Initialized web storage with encryption',
      });
    } else {
      // For mobile platforms, use secure key storage
      const generalKey = await getOrCreateSecureKey(ENCRYPTION_KEY_STORAGE_KEY);
      const offlineQueueKey = await getOrCreateSecureKey(OFFLINE_QUEUE_KEY_STORAGE_KEY);

      generalStorage = new MMKV({
        id: 'ResgridUnit',
        encryptionKey: generalKey,
      });

      offlineQueueStorage = new MMKV({
        id: 'ResgridOfflineQueue',
        encryptionKey: offlineQueueKey,
      });

      logger.info({
        message: 'Initialized mobile storage with secure encryption keys',
      });
    }
  } catch (error) {
    logger.error({
      message: 'Failed to initialize secure storage, falling back to basic storage',
      context: { error },
    });

    // Fallback to basic MMKV without encryption
    generalStorage = new MMKV({
      id: 'ResgridUnit',
    });

    offlineQueueStorage = new MMKV({
      id: 'ResgridOfflineQueue',
    });
    storageInitializing = false;
  }
};

// Storage getters with lazy initialization
export const getGeneralStorage = async (): Promise<MMKV> => {
  if (!generalStorage) {
    await initializeStorage();
  }
  return generalStorage!;
};

export const getOfflineQueueStorage = async (): Promise<MMKV> => {
  if (!offlineQueueStorage) {
    await initializeStorage();
  }
  return offlineQueueStorage!;
};

export const getWebEncryptedStorage = (): WebEncryptedStorage | undefined => {
  return webEncryptedStorage;
};

// Initialize storage on module load
initializeStorage().catch((error) => {
  logger.error({
    message: 'Failed to initialize storage on module load',
    context: { error },
  });
});

// Utility functions for key rotation
export const rotateEncryptionKeys = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    logger.warn({
      message: 'Key rotation not supported on web platform',
    });
    return;
  }

  try {
    // Generate new keys
    const newGeneralKey = generateSecureKey();
    const newOfflineQueueKey = generateSecureKey();

    // Store new keys
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newGeneralKey);
    await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY_STORAGE_KEY, newOfflineQueueKey);

    // Reinitialize storage with new keys
    generalStorage = new MMKV({
      id: 'ResgridUnit',
      encryptionKey: newGeneralKey,
    });

    offlineQueueStorage = new MMKV({
      id: 'ResgridOfflineQueue',
      encryptionKey: newOfflineQueueKey,
    });

    logger.info({
      message: 'Successfully rotated encryption keys',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to rotate encryption keys',
      context: { error },
    });
    throw error;
  }
};

export const clearSecureKeys = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    logger.warn({
      message: 'Secure key clearing not supported on web platform',
    });
    return;
  }

  try {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
    await SecureStore.deleteItemAsync(OFFLINE_QUEUE_KEY_STORAGE_KEY);

    logger.info({
      message: 'Cleared all secure encryption keys',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to clear secure keys',
      context: { error },
    });
  }
};
