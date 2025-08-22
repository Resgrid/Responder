import { Platform } from 'react-native';
import { MMKV, useMMKVBoolean } from 'react-native-mmkv';
import { type StateStorage } from 'zustand/middleware';

export let storage: MMKV;
if (Platform.OS === 'web') {
  storage = new MMKV({
    id: 'ResgridResponder',
  });
} else {
  storage = new MMKV({
    id: 'ResgridResponder',
    encryptionKey: 'a330fb72-1916-4cc2-99fe-efd4986b254f',
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
