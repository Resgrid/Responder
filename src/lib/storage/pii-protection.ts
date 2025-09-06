import { Platform } from 'react-native';

import { logger } from '@/lib/logging';
import { type QueuedEvent } from '@/models/offline-queue/queued-event';

import { clearSecureKeys, rotateEncryptionKeys } from './secure-storage';

/**
 * PII-sensitive fields that should be handled with extra care
 */
const PII_SENSITIVE_FIELDS = [
  'userId',
  'note', // May contain personal information
  'latitude',
  'longitude',
  'filePath', // May contain identifying information
  'name', // User names or personal identifiers
] as const;

/**
 * Check if an event contains PII data
 */
export const containsPII = (event: QueuedEvent): boolean => {
  const eventData = event.data;

  return PII_SENSITIVE_FIELDS.some((field) => {
    const value = eventData[field];
    return value !== undefined && value !== null && value !== '';
  });
};

/**
 * Sanitize PII data for logging or non-secure storage
 */
export const sanitizeEventForLogging = (event: QueuedEvent): Partial<QueuedEvent> => {
  const sanitizedData = { ...event.data };

  // Remove or mask PII fields
  PII_SENSITIVE_FIELDS.forEach((field) => {
    if (sanitizedData[field] !== undefined) {
      if (field === 'latitude' || field === 'longitude') {
        // Mask coordinates with rounded values for general location
        const value = parseFloat(sanitizedData[field] as string);
        if (!isNaN(value)) {
          sanitizedData[field] = Math.round(value * 100) / 100; // Round to 2 decimal places
        }
      } else if (field === 'note') {
        // Mask note content
        sanitizedData[field] = sanitizedData[field] ? '[REDACTED]' : '';
      } else {
        // Completely remove other PII fields
        delete sanitizedData[field];
      }
    }
  });

  return {
    ...event,
    data: sanitizedData,
  };
};

/**
 * Check if offline queue storage should be disabled for web builds
 */
export const shouldDisableOfflineQueueForWeb = (): boolean => {
  if (Platform.OS !== 'web') {
    return false;
  }

  // Check if we have proper encryption setup for web
  // If not, disable offline queue persistence for PII safety
  try {
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const hasCrypto = typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues;

    if (!hasLocalStorage || !hasCrypto) {
      logger.warn({
        message: 'Web environment lacks proper encryption support, disabling offline queue persistence',
        context: { hasLocalStorage, hasCrypto },
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error({
      message: 'Error checking web encryption capabilities, disabling offline queue persistence',
      context: { error },
    });
    return true;
  }
};

/**
 * Security audit function to check for PII exposure risks
 */
export const auditPIIExposure = (
  events: QueuedEvent[]
): {
  totalEvents: number;
  eventsWithPII: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
} => {
  const eventsWithPII = events.filter(containsPII);
  const piiPercentage = events.length > 0 ? (eventsWithPII.length / events.length) * 100 : 0;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const recommendations: string[] = [];

  if (piiPercentage > 50) {
    riskLevel = 'high';
    recommendations.push('Consider implementing field-level encryption for PII data');
    recommendations.push('Rotate encryption keys more frequently');
    recommendations.push('Implement automatic PII data expiration');
  } else if (piiPercentage > 20) {
    riskLevel = 'medium';
    recommendations.push('Monitor PII data retention policies');
    recommendations.push('Consider data minimization strategies');
  }

  if (Platform.OS === 'web' && eventsWithPII.length > 0) {
    recommendations.push('Review web storage encryption implementation');
    recommendations.push('Consider disabling PII persistence on web builds');
  }

  if (events.length > 1000) {
    recommendations.push('Implement automatic cleanup of old offline queue events');
  }

  return {
    totalEvents: events.length,
    eventsWithPII: eventsWithPII.length,
    riskLevel,
    recommendations,
  };
};

/**
 * Emergency PII cleanup - remove all potentially sensitive data
 */
export const emergencyPIICleanup = async (): Promise<void> => {
  try {
    logger.warn({
      message: 'Initiating emergency PII cleanup',
    });

    // Clear all encryption keys (this will make existing encrypted data unreadable)
    await clearSecureKeys();

    // Clear web storage if applicable
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('offline-queue')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    logger.info({
      message: 'Emergency PII cleanup completed',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to complete emergency PII cleanup',
      context: { error },
    });
    throw error;
  }
};

/**
 * Scheduled key rotation for enhanced security
 */
export const performScheduledKeyRotation = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    logger.info({
      message: 'Key rotation not supported on web platform',
    });
    return;
  }

  try {
    logger.info({
      message: 'Performing scheduled encryption key rotation',
    });

    await rotateEncryptionKeys();

    logger.info({
      message: 'Scheduled encryption key rotation completed successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to perform scheduled key rotation',
      context: { error },
    });
    throw error;
  }
};

/**
 * Get PII protection recommendations based on current configuration
 */
export const getPIIProtectionRecommendations = (): string[] => {
  const recommendations: string[] = [];

  if (Platform.OS === 'web') {
    recommendations.push('Consider disabling offline queue persistence on web builds for maximum PII protection');
    recommendations.push('Implement session-only storage for PII-sensitive operations on web');
  } else {
    recommendations.push('Ensure encryption keys are stored in secure hardware when available');
    recommendations.push('Implement biometric authentication for accessing PII data');
  }

  recommendations.push('Regularly audit offline queue for PII exposure');
  recommendations.push('Implement automatic data expiration for old events');
  recommendations.push('Use data minimization - only store necessary PII fields');
  recommendations.push('Consider field-level encryption for highly sensitive data');

  return recommendations;
};
