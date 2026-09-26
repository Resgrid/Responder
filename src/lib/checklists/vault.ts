import { Buffer } from 'buffer';
import { aesDecryptAsync, aesEncryptAsync, AESEncryptionKey, AESSealedData, CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Dedicated AES-GCM envelopes. Never use the app's shared/static MMKV key for checklist content.
// Native keys are device-only and available only while unlocked. Web has no persistent vault.
const native = Platform.OS !== 'web';
const storage = native ? new MMKV({ id: 'checklists-ciphertext-v1' }) : null;
const memory = new Map<string, string>();
const keys = new Map<string, Promise<AESEncryptionKey>>();
const slot = async (scope: string, name: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, `checklists:v1:${scope}:${name}`);
const keyFor = (scope: string): Promise<AESEncryptionKey> => {
  let pending = keys.get(scope);
  if (!pending) {
    pending = (async () => {
      const name = `checklists.${await slot(scope, 'key')}`;
      const saved = native ? await SecureStore.getItemAsync(name, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }) : null;
      if (saved) return AESEncryptionKey.import(saved, 'base64');
      const key = await AESEncryptionKey.generate();
      if (native) await SecureStore.setItemAsync(name, await key.encoded('base64'), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      return key;
    })();
    keys.set(scope, pending);
    const operation = pending;
    pending
      .finally(() => {
        if (native && keys.get(scope) === operation) keys.delete(scope);
      })
      .catch(() => keys.delete(scope));
  }
  return pending;
};
export const vaultRead = async <T>(scope: string, name: string): Promise<T | null> => {
  const id = await slot(scope, name);
  const ciphertext = native ? storage?.getString(id) : memory.get(id);
  if (!ciphertext) return null;
  const bytes = await aesDecryptAsync(AESSealedData.fromCombined(ciphertext), await keyFor(scope), { additionalData: Buffer.from(`${scope}:${name}`, 'utf8') });
  return JSON.parse(Buffer.from(bytes).toString('utf8')) as T;
};
export const vaultWrite = async (scope: string, name: string, value: unknown): Promise<void> => {
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  if (plaintext.byteLength > 32 * 1024 * 1024) throw new Error('storage_full');
  const ciphertext = await aesEncryptAsync(plaintext, await keyFor(scope), { additionalData: Buffer.from(`${scope}:${name}`, 'utf8') });
  const id = await slot(scope, name);
  const text = await ciphertext.combined('base64');
  if (native) storage!.set(id, text);
  else memory.set(id, text);
};
export const vaultRemove = async (scope: string, name: string): Promise<void> => {
  const id = await slot(scope, name);
  if (native) storage!.delete(id);
  else memory.delete(id);
};
