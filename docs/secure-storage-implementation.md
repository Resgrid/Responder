# Secure Storage Implementation for PII Protection

## Overview

This document outlines the secure storage implementation that addresses PII (Personally Identifiable Information) exposure risks in the offline queue system. The implementation removes hard-coded encryption keys and implements proper encryption key management with environment variable support.

## Security Improvements

### 1. Hard-coded Key Removal

**Previous Implementation:**
```typescript
// INSECURE - Hard-coded encryption key
const storage = new MMKV({
  id: 'ResgridUnit',
  encryptionKey: 'hunter2', // ❌ Hard-coded in source
});
```

**New Implementation:**
```typescript
// SECURE - Dynamic key from secure keystore
const encryptionKey = await getOrCreateSecureKey(ENCRYPTION_KEY_STORAGE_KEY);
const storage = new MMKV({
  id: 'ResgridUnit',
  encryptionKey, // ✅ Securely generated and stored
});
```

### 2. Platform-Specific Security

#### Mobile Platforms (iOS/Android)
- **Secure Key Storage**: Uses `expo-secure-store` which leverages iOS Keychain and Android Keystore
- **Key Generation**: Cryptographically secure random keys using native crypto APIs
- **Key Rotation**: Supports encryption key rotation for enhanced security
- **Segregated Storage**: Separate MMKV instances for general data and offline queue data

#### Web Platform
- **Encrypted localStorage**: Uses AES encryption for browser storage
- **Session Keys**: Generates encryption keys per session for maximum security
- **PII Opt-out**: Option to disable offline queue persistence on web builds to eliminate PII exposure risk
- **Fallback Protection**: Graceful degradation when encryption is not available

### 3. Encryption Key Management

#### Key Sources (Priority Order)
1. **Environment Variable**: `RESPOND_STORAGE_ENCRYPTION_KEY`
2. **Secure Keystore**: Device-specific secure storage (iOS Keychain/Android Keystore)
3. **Generated Key**: Cryptographically secure random key generated at runtime

#### Key Rotation
```typescript
// Rotate encryption keys for enhanced security
await rotateEncryptionKeys();
```

#### Emergency Cleanup
```typescript
// Emergency PII cleanup - clears all encryption keys
await emergencyPIICleanup();
```

### 4. Segregated Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Secure Storage Layer                     │
├─────────────────────────────────────────────────────────────┤
│  General Storage          │  Offline Queue Storage           │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ MMKV Instance       │  │  │ MMKV Instance               │ │
│  │ ID: ResgridUnit     │  │  │ ID: ResgridOfflineQueue     │ │
│  │ Key: GeneralKey     │  │  │ Key: OfflineQueueKey        │ │
│  │                     │  │  │                             │ │
│  │ - App settings      │  │  │ - Personnel status events   │ │
│  │ - User preferences  │  │  │ - Unit status events        │ │
│  │ - UI state          │  │  │ - Location updates          │ │
│  └─────────────────────┘  │  │ - Call image uploads        │ │
│                           │  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5. PII Protection Features

#### PII Detection
```typescript
// Automatically detect PII in offline queue events
const hasPII = containsPII(queuedEvent);
```

#### Data Sanitization
```typescript
// Sanitize events for safe logging
const sanitizedEvent = sanitizeEventForLogging(queuedEvent);
```

#### Security Auditing
```typescript
// Audit offline queue for PII exposure risks
const audit = auditPIIExposure(queuedEvents);
console.log(`Risk Level: ${audit.riskLevel}`);
console.log('Recommendations:', audit.recommendations);
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Optional: Provide your own encryption key
# If not set, a secure key will be automatically generated and stored
RESPOND_STORAGE_ENCRYPTION_KEY=your-256-bit-encryption-key-here
```

### Key Generation

For production environments, generate a secure 256-bit key:

```bash
# Generate a secure key (256-bit / 32 bytes / 64 hex characters)
openssl rand -hex 32
```

## Security Best Practices

### 1. Environment-Specific Keys
- Use different encryption keys for development, staging, and production
- Store keys in secure environment variable management systems
- Avoid committing keys to source control

### 2. Key Rotation Schedule
- Rotate encryption keys quarterly for high-security environments
- Implement automated key rotation for production systems
- Monitor key usage and access patterns

### 3. Web Platform Considerations
- Consider disabling offline queue persistence on web builds for maximum PII protection
- Use session-only storage for PII-sensitive operations
- Implement CSP headers to protect against XSS attacks

### 4. Monitoring and Auditing
- Regularly audit offline queue for PII exposure using `auditPIIExposure()`
- Monitor encryption key access and rotation events
- Set up alerts for failed encryption/decryption operations

## Migration Guide

### From Hard-coded Keys

1. **Update Dependencies**:
   ```bash
   yarn add expo-secure-store crypto-js react-native-get-random-values
   ```

2. **Replace Storage Initialization**:
   ```typescript
   // Before
   const storage = new MMKV({ 
     id: 'ResgridUnit', 
     encryptionKey: 'hunter2' 
   });

   // After
   import { getGeneralStorage } from '@/lib/storage/secure-storage';
   const storage = await getGeneralStorage();
   ```

3. **Update Environment Configuration**:
   - Add `RESPOND_STORAGE_ENCRYPTION_KEY` to your environment schema
   - Optionally set the encryption key in your `.env` files

### For Offline Queue

1. **Update Store Configuration**:
   ```typescript
   // Before
   storage: createJSONStorage(() => zustandStorage),

   // After
   import { secureOfflineQueueStorage } from '@/lib/storage/offline-queue-storage';
   storage: createJSONStorage(() => secureOfflineQueueStorage),
   ```

## Testing

Run the PII protection tests:

```bash
yarn test src/lib/storage/__tests__/pii-protection.test.ts
```

## Troubleshooting

### Common Issues

1. **Key Generation Fails on Web**:
   - Ensure browser supports `crypto.getRandomValues`
   - Check for CSP restrictions
   - Fallback to session-only storage

2. **Secure Store Access Denied**:
   - Check device biometric/passcode settings
   - Verify app permissions
   - Implement graceful fallback to generated keys

3. **Decryption Fails After Key Rotation**:
   - Implement key versioning
   - Migrate data to new encryption key
   - Clear and re-initialize storage if necessary

### Debugging

Enable debug logging for storage operations:

```typescript
import { logger } from '@/lib/logging';

// Check storage initialization
logger.debug('Storage initialization status');
```

## Security Considerations

- **Blast Radius Limitation**: Separate MMKV instances ensure compromise of one storage area doesn't affect others
- **Forward Secrecy**: Key rotation provides forward secrecy for historical data
- **Platform Security**: Leverages platform-specific secure storage mechanisms
- **Graceful Degradation**: Fallback mechanisms ensure app functionality even if secure storage fails
- **PII Minimization**: Tools to detect, sanitize, and audit PII exposure

This implementation significantly reduces the security risks associated with storing PII in offline queues while maintaining functionality across all supported platforms.
