// Platform-agnostic entry point for CallKeep service
// This file exports the appropriate platform-specific implementation

import { Platform } from 'react-native';

import type { CallKeepConfig } from './callkeep.service.android';
import * as androidCallKeep from './callkeep.service.android';
import * as iosCallKeep from './callkeep.service.ios';

// Export the appropriate service based on platform
export const callKeepService = Platform.OS === 'ios' ? iosCallKeep.callKeepService : androidCallKeep.callKeepService;
export const CallKeepService = Platform.OS === 'ios' ? iosCallKeep.CallKeepService : androidCallKeep.CallKeepService;

// Re-export the type
export type { CallKeepConfig };
