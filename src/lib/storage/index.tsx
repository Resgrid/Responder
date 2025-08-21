// import Platform from react-native not needed for storage init
import type { MMKV } from 'react-native-mmkv';
import { useMMKVBoolean } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

import { getGeneralStorage } from './secure-storage';

export let storage: MMKV;
// In test environment, provide an in-memory storage fallback so tests don't break before async init
if (process.env.NODE_ENV === 'test') {
  const memoryMap = new Map<string, string>();
  storage = {
    getString: (key: string) => memoryMap.get(key) as string | undefined,
    set: (key: string, value: string) => {
      memoryMap.set(key, value);
    },
    delete: (key: string) => {
      memoryMap.delete(key);
    },
  } as unknown as MMKV;
} else {
  // Initialize storage asynchronously
  let storageInitialized = false;
  const initializeStorage = async () => {
    if (storageInitialized) return;
    storageInitialized = true;
    try {
      storage = await getGeneralStorage();
    } catch (error) {
      storageInitialized = false;
      throw error;
    }
  };
  // Initialize secure storage
  initializeStorage().catch((error) => {
    console.error('Failed to initialize secure storage:', error);
  });
}

const IS_FIRST_TIME = 'IS_FIRST_TIME';

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  return value ? JSON.parse(value) : null;
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.delete(key);
}

export const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.delete(name);
  },
};

export const useIsFirstTime = () => {
  const [isFirstTime, setIsFirstTime] = useMMKVBoolean(IS_FIRST_TIME, storage);
  if (isFirstTime === undefined || isFirstTime === null || isFirstTime === true) {
    return [true, setIsFirstTime] as const;
  }
  return [isFirstTime, setIsFirstTime] as const;
};
