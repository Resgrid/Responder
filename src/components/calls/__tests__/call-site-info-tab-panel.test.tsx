import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, Linking } from 'react-native';

import { logger } from '@/lib/logging';
import { type CallSiteInfoData } from '@/models/v4/calls/callSiteInfoResult';
import { useSiteInfoStore } from '@/stores/calls/site-info-store';

import { CallSiteInfoTabPanel } from '../call-site-info-tab-panel';

jest.mock('@/api/calls/callSiteInfo', () => ({ getCallSiteInfo: jest.fn(() => new Promise(() => undefined)) }));

jest.mock('@/stores/data-protection/store', () => {
  const { create } = jest.requireActual('zustand');
  return { dataProtectionStore: create(() => ({ grantToken: null })) };
});

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
}));

jest.mock('@/components/contacts/contact-files-list', () => ({ ContactFilesList: () => null }));
jest.mock('@/components/contacts/preplan-summary', () => ({ PreplanSummary: () => null }));

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { BuildingIcon: View, LockIcon: View, MapPinIcon: View, PhoneIcon: View, ShieldAlertIcon: View, UserIcon: View };
});

jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

const siteInfo: CallSiteInfoData = {
  CallId: '42',
  IsProtected: false,
  Contacts: [
    {
      ContactId: 'c1',
      CallContactType: 0,
      ContactType: 1,
      Name: 'Acme Warehouse',
      PhoneNumber: '5551234',
      EntranceGpsCoordinates: null,
      AlertNotes: [],
      Preplan: null,
      Hazards: [],
      Attachments: [],
    },
  ],
};

describe('CallSiteInfoTabPanel phone link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useSiteInfoStore.setState({ fetchSiteInfo: jest.fn(() => Promise.resolve()), reset: jest.fn(), siteInfo, isLoading: false, error: null });
  });

  it('dials the site contact', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<CallSiteInfoTabPanel callId="42" />);

    fireEvent.press(screen.getByTestId('site-contact-phone-c1'));

    await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:5551234'));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('tells the person when the dialer cannot open and logs without the number', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no dialer'));
    render(<CallSiteInfoTabPanel callId="42" />);

    fireEvent.press(screen.getByTestId('site-contact-phone-c1'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('contacts.errorTitle', 'contacts.openAppError'));
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ callId: '42', contactId: 'c1' }) }));
    expect(JSON.stringify(jest.mocked(logger.error).mock.calls)).not.toContain('5551234');
  });
});
