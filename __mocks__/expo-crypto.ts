// Jest stand-in for expo-crypto, whose native AES classes cannot load under Jest. Randomness and digests use Node's
// crypto so PKCE values are real; tests that need fixed values still mock expo-crypto themselves, which takes precedence.
import { createHash, randomBytes, randomUUID as nodeRandomUUID } from 'crypto';

export const CryptoDigestAlgorithm = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512', MD5: 'MD5' } as const;
export const CryptoEncoding = { HEX: 'hex', BASE64: 'base64' } as const;

const nodeAlgorithm = (algorithm: string) => algorithm.replace('-', '').toLowerCase();

export const getRandomBytes = (byteCount: number): Uint8Array => new Uint8Array(randomBytes(byteCount));
export const getRandomBytesAsync = async (byteCount: number): Promise<Uint8Array> => getRandomBytes(byteCount);
export const randomUUID = (): string => nodeRandomUUID();
export const digestStringAsync = async (algorithm: string, data: string, options?: { encoding?: string }): Promise<string> =>
  createHash(nodeAlgorithm(algorithm))
    .update(data)
    .digest(options?.encoding === 'base64' ? 'base64' : 'hex');
export const digest = async (algorithm: string, data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> => {
  // A copy into a fresh ArrayBuffer: Node's pooled Buffer may sit on a shared backing store.
  return new Uint8Array(createHash(nodeAlgorithm(algorithm)).update(Buffer.from(data as ArrayBuffer)).digest()).buffer;
};
export const aesEncryptAsync = jest.fn();
export const aesDecryptAsync = jest.fn();
export class AESEncryptionKey {}
export class AESSealedData {}
