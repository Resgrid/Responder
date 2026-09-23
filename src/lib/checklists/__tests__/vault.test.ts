const mockDisk = new Map<string,string>();
const mockKeys = new Map<string,string>();
jest.mock('react-native', () => ({ Platform:{OS:'ios'} }));
jest.mock('react-native-mmkv', () => ({ MMKV:jest.fn().mockImplementation(()=>({getString:(k:string)=>mockDisk.get(k),set:(k:string,v:string)=>mockDisk.set(k,v),delete:(k:string)=>mockDisk.delete(k)})) }));
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device-only',getItemAsync:jest.fn(async(k:string)=>mockKeys.get(k)??null),setItemAsync:jest.fn(async(k:string,v:string)=>{mockKeys.set(k,v);}) }));
// Exercise authenticated encryption and AAD with Node's crypto, standing in for the native Expo module.
jest.mock('expo-crypto',()=>{
  const crypto=jest.requireActual<typeof import('crypto')>('crypto');
  const bytes=(v:string|Uint8Array)=>typeof v==='string'?Buffer.from(v,'base64'):Buffer.from(v);
  return { CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(_:string,s:string)=>crypto.createHash('sha256').update(s).digest('hex'),
    AESEncryptionKey:{generate:async()=>{const b=crypto.randomBytes(32);return {b,encoded:async()=>b.toString('base64')};},import:async(s:string)=>({b:Buffer.from(s,'base64')})},
    AESSealedData:{fromCombined:bytes},
    aesEncryptAsync:async(data:Uint8Array,key:{b:Buffer},options:{additionalData:Uint8Array})=>{ const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key.b,iv);cipher.setAAD(bytes(options.additionalData));const payload=Buffer.concat([iv,cipher.update(bytes(data)),cipher.final(),cipher.getAuthTag()]);return {combined:async()=>payload.toString('base64')}; },
    aesDecryptAsync:async(data:Uint8Array,key:{b:Buffer},options:{additionalData:Uint8Array})=>{ const payload=bytes(data);const decipher=crypto.createDecipheriv('aes-256-gcm',key.b,payload.subarray(0,12));decipher.setAAD(bytes(options.additionalData));decipher.setAuthTag(payload.subarray(-16));return Buffer.concat([decipher.update(payload.subarray(12,-16)),decipher.final()]); },
  };
});
import * as SecureStore from 'expo-secure-store';
import { vaultRead,vaultWrite } from '@/lib/checklists/vault';

it('persists only ciphertext, isolates tenants and uses a device-only OS key',async()=>{
  await vaultWrite('server|77|author','draft',{notes:'SYNTHETIC PHI',image:'synthetic-base64'});
  expect([...mockDisk.values()].join()).not.toContain('SYNTHETIC PHI');expect([...mockDisk.values()].join()).not.toContain('synthetic-base64');
  expect(await vaultRead('server|77|author','draft')).toEqual({notes:'SYNTHETIC PHI',image:'synthetic-base64'});
  expect(await vaultRead('server|88|author','draft')).toBeNull();
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String),expect.any(String),{keychainAccessible:'device-only'});
});
it('refuses tampered or relocated ciphertext without a plaintext fallback',async()=>{
  await vaultWrite('tamper-scope','first',{notes:'private'});const first=[...mockDisk.entries()].at(-1)!;
  await vaultWrite('tamper-scope','second',{notes:'second'});const second=[...mockDisk.entries()].at(-1)!;
  mockDisk.set(second[0],first[1]);await expect(vaultRead('tamper-scope','second')).rejects.toThrow();
});
