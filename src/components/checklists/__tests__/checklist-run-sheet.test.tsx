jest.mock('@/stores/data-protection/store', () => ({ dataProtectionStore: { getState: () => ({ isStepUpActive: () => false }) } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'image-id' }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', deleteAsync: jest.fn() }));
jest.mock('@/api/checklists/checklists', () => ({ attestChecklistRun: jest.fn() }));
jest.mock('@/components/checklists/signature-pad', () => ({ ChecklistSignaturePad: () => null }));
jest.mock('@/components/ui/button', () => { const { Pressable, Text } = require('react-native'); return { Button: ({ isDisabled, ...props }: { isDisabled?: boolean }) => <Pressable {...props} disabled={isDisabled} accessibilityState={{ disabled: !!isDisabled }} />, ButtonText: Text }; });
jest.mock('@/components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@/stores/auth/store', () => { const { create } = jest.requireActual('zustand'); return { __esModule: true, default: create(() => ({ userId: 'author' })) }; });
jest.mock('@/stores/checklists/store', () => { const { create } = jest.requireActual('zustand'); return { useChecklistsStore: create(() => ({ active: null, update: jest.fn().mockResolvedValue(undefined), queue: jest.fn().mockResolvedValue(undefined), close: jest.fn(), addImage: jest.fn().mockResolvedValue(undefined) })) }; });
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { ChecklistRunSheet } from '@/components/checklists/checklist-run-sheet';
import { draft } from '@/lib/checklists/__tests__/fixtures';
import { useChecklistsStore } from '@/stores/checklists/store';

beforeEach(() => { jest.clearAllMocks(); const local = draft(); local.queued = false; useChecklistsStore.setState({ active: local }); });
it.each([0,1,2,3,4,5,6,7,8,9])('renders question type %i with localized controls', type => {
  const local = draft(); local.queued = false; local.run.Form.Sections[0].Items[0].Type = type; local.run.Form.Sections[0].Items[0].Options = ['Synthetic option'];
  useChecklistsStore.setState({ active: local }); const screen = render(<ChecklistRunSheet />);
  expect(screen.getByText('Ready (checklists.labels.Required)')).toBeTruthy();
  if ([3,4,5,7].includes(type)) { fireEvent.changeText(screen.getByLabelText('checklists.labels.Answer'), '12'); expect(useChecklistsStore.getState().update).toHaveBeenCalledWith(expect.objectContaining({ Answers: [expect.objectContaining({ Value: '12' })] })); }
  if ([0,1,2,6].includes(type)) { fireEvent.press(screen.getByText(type===0 ? 'checklists.labels.Pass' : type===1 ? 'checklists.labels.Yes' : type===2 ? 'checklists.labels.Checked' : 'Synthetic option')); expect(useChecklistsStore.getState().update).toHaveBeenCalled(); }
  if (type===8) expect(screen.getByText('checklists.labels.Photo')).toBeTruthy();
  if (type===9) expect(screen.getByText('checklists.labels.Signature')).toBeTruthy();
  screen.unmount();
});
it('queues progress and submission through the durable store', async () => {
  const screen=render(<ChecklistRunSheet />); fireEvent.press(screen.getByText('checklists.labels.SaveProgress'));
  await waitFor(()=>expect(useChecklistsStore.getState().queue).toHaveBeenCalledWith(false));
  fireEvent.press(screen.getByText('checklists.labels.SubmitRun')); await waitFor(()=>expect(useChecklistsStore.getState().queue).toHaveBeenCalledWith(true)); screen.unmount();
});
it('normalizes photo bytes and deletes only app cache copies after encrypted persistence', async () => {
  const local=draft(); local.queued=false; local.run.Form.Sections[0].Items[0].Type=8; useChecklistsStore.setState({active:local});
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({granted:true} as never);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({canceled:false,assets:[{uri:'file:///gallery/original.heic',width:4000,height:3000}]} as never);
  jest.mocked(manipulateAsync).mockResolvedValue({uri:'file:///cache/converted.jpg',width:2048,height:1536,base64:'synthetic-image'});
  const screen=render(<ChecklistRunSheet />); fireEvent.press(screen.getByText('checklists.labels.Photo'));
  await waitFor(()=>expect(useChecklistsStore.getState().addImage).toHaveBeenCalledWith(expect.objectContaining({base64:'synthetic-image',contentType:'image/jpeg'})));
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/converted.jpg',{idempotent:true}); expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith('file:///gallery/original.heic',expect.anything()); screen.unmount();
});
it('removes entered values from the screen as soon as the store conceals the draft', () => {
  const screen=render(<ChecklistRunSheet />); act(() => useChecklistsStore.setState({active:null})); screen.rerender(<ChecklistRunSheet />);
  expect(screen.queryByText('Synthetic readiness check')).toBeNull(); screen.unmount();
});
