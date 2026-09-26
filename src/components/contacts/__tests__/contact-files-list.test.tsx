import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert } from 'react-native';

import { getContactFileBase64 } from '@/api/contacts/contactFiles';
import { type ContactFileResultData } from '@/models/v4/contactFiles/contactFilesResult';

import { ContactFilesList } from '../contact-files-list';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/api/contacts/contactFiles', () => ({
  getContactFileBase64: jest.fn(() => Promise.resolve('AAAA')),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
}));

jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { DownloadIcon: View, FileIcon: View, LockIcon: View, PaperclipIcon: View };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const file = (overrides: Partial<ContactFileResultData> = {}): ContactFileResultData =>
  ({
    Id: 'file-1',
    ContactId: 'contact-1',
    Type: 1,
    TypeName: 'Pre-plan',
    Name: 'Site plan',
    FileName: 'site-plan.pdf',
    Mime: 'application/pdf',
    Size: 2048,
    IsProtected: false,
    RedactedFields: [],
    ...overrides,
  }) as ContactFileResultData;

describe('ContactFilesList download', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stages the file in its own cache folder, shares it, and removes it afterwards', async () => {
    render(<ContactFilesList files={[file()]} />);

    fireEvent.press(screen.getByTestId('contact-file-download-file-1'));

    await waitFor(() => expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/contact-files/file-1/', { idempotent: true }));
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith('file:///cache/contact-files/file-1/', { intermediates: true });
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('file:///cache/contact-files/file-1/site-plan.pdf', 'AAAA', { encoding: 'base64' });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/contact-files/file-1/site-plan.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
    expect(jest.mocked(Sharing.shareAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(FileSystem.deleteAsync).mock.invocationCallOrder[0]);
  });

  it('never writes outside the staging folder for a server name carrying a path', async () => {
    render(<ContactFilesList files={[file({ FileName: '../../Library/Preferences/app.plist' })]} />);

    fireEvent.press(screen.getByTestId('contact-file-download-file-1'));

    await waitFor(() => expect(FileSystem.writeAsStringAsync).toHaveBeenCalled());
    const [uri] = jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0];
    expect(uri).toBe('file:///cache/contact-files/file-1/_.._Library_Preferences_app.plist');
  });

  it('uses the file id when the name is withheld', async () => {
    render(<ContactFilesList files={[file({ FileName: 'REDACTED', RedactedFields: ['contactattachments.filename'] })]} />);

    fireEvent.press(screen.getByTestId('contact-file-download-file-1'));

    await waitFor(() => expect(FileSystem.writeAsStringAsync).toHaveBeenCalled());
    expect(jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][0]).toBe('file:///cache/contact-files/file-1/contact_file_file-1');
  });

  it('still removes the staged file when sharing fails', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('share failed'));
    render(<ContactFilesList files={[file()]} />);

    fireEvent.press(screen.getByTestId('contact-file-download-file-1'));

    await waitFor(() => expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/contact-files/file-1/', { idempotent: true }));
    expect(Alert.alert).toHaveBeenCalledWith('contacts.files.download_failed');
    expect(getContactFileBase64).toHaveBeenCalledTimes(1);
  });
});
