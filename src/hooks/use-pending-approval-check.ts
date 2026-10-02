import { type Href, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getPendingApproval } from '@/api/mfa/account-security';
import { logger } from '@/lib/logging';

const CHECK_INTERVAL_MS = 15000;
const APPROVE_PATH = '/approve-sign-in';

/**
 * A push can be late or never arrive (passkey plan section 7.9): whenever Responder comes to the foreground, it asks the
 * server whether a request is waiting for this member and opens the approval screen if one is. At most every 15 seconds.
 */
export const usePendingApprovalCheck = (enabled: boolean): void => {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let lastCheck = 0;
    const check = async () => {
      const now = Date.now();
      if (now - lastCheck < CHECK_INTERVAL_MS) {
        return;
      }
      lastCheck = now;
      try {
        const pending = await getPendingApproval();
        if (pending && pathnameRef.current !== APPROVE_PATH) {
          router.push(APPROVE_PATH as Href);
        }
      } catch (error) {
        logger.warn({ message: 'Could not check for a waiting approval request', context: { error } });
      }
    };

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
      }
    });
    return () => subscription?.remove?.();
  }, [enabled, router]);
};
