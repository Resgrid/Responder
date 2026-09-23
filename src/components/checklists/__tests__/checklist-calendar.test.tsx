jest.mock('@/hooks/use-checklist-live-updates', () => ({ useChecklistLiveUpdates: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/api/common/client', () => ({ api: { get: jest.fn() } }));
jest.mock('@/components/ui/button', () => { const { Pressable, Text } = require('react-native'); return { Button: Pressable, ButtonText: Text }; });
jest.mock('@/components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('@/stores/checklists/store', () => { const { create }=jest.requireActual('zustand'); return { checklistScope: () => 'scope', useChecklistsStore: create(() => ({ scope: 'scope', locked: false, access: { IsProtected: false } })) }; });
jest.mock('@/stores/data-protection/store', () => ({ dataProtectionStore: { getState: () => ({ isStepUpActive: () => false }) } }));
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { api } from '@/api/common/client';
import { ChecklistCalendar } from '@/components/checklists/checklist-calendar';
import { useChecklistsStore } from '@/stores/checklists/store';
beforeEach(()=>{ jest.clearAllMocks();useChecklistsStore.setState({scope:'scope',locked:false}); });
it('requests virtual checklist entries and opens an occurrence rather than calendar attendance',async()=>{
 jest.mocked(api.get).mockResolvedValue({data:{Data:[{CalendarItemId:'checklist:one',SourceId:'one',IsVirtual:true,Title:'Synthetic due check',StartUtc:'2026-09-08T10:00:00Z'},{CalendarItemId:'regular',Title:'Ordinary event'}]}});
 const screen=render(<ChecklistCalendar />); await waitFor(()=>expect(screen.getByText(/Synthetic due check/)).toBeTruthy());
 expect(api.get).toHaveBeenCalledWith('/Calendar/GetDepartmentCalendarItemsInRange',expect.objectContaining({params:expect.objectContaining({includeChecklists:true})}));
 fireEvent.press(screen.getByText(/Synthetic due check/)); expect(mockPush).toHaveBeenCalledWith({pathname:'/checklists',params:{occurrenceId:'one'}}); expect(screen.queryByText('Ordinary event')).toBeNull(); screen.unmount();
});
it('drops a late protected calendar response after concealment',async()=>{
 let release!: (value: unknown) => void; jest.mocked(api.get).mockReturnValue(new Promise(resolve=>{release=resolve;}));
 const screen=render(<ChecklistCalendar />); act(()=>useChecklistsStore.setState({locked:true}));
 await act(async()=>release({data:{Data:[{CalendarItemId:'one',IsVirtual:true,Title:'SYNTHETIC PRIVATE'}]}}));
 expect(screen.queryByText('SYNTHETIC PRIVATE')).toBeNull(); screen.unmount();
});
