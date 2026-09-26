jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/ui/button', () => { const { Pressable, Text } = require('react-native'); return { Button: ({ isDisabled, ...props }: { isDisabled?: boolean }) => <Pressable {...props} disabled={isDisabled} accessibilityState={{ disabled: !!isDisabled }} />, ButtonText: Text }; });
jest.mock('react-native-svg', () => { const React = require('react'); const { View } = require('react-native'); return { __esModule: true, default: React.forwardRef((props: object, ref: unknown) => { React.useImperativeHandle(ref, () => ({ toDataURL: (callback: (base64: string) => void) => callback('synthetic-signature') })); return <View {...props} />; }), Path: View, Rect: View }; });
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PanResponder } from 'react-native';
import { ChecklistSignaturePad } from '@/components/checklists/signature-pad';
it('requires a real stroke, captures signature bytes in memory and clears strokes', async () => {
 const pan = jest.spyOn(PanResponder,'create').mockImplementation(config => ({ panHandlers: { onTouchStart: config.onPanResponderGrant, onTouchMove: config.onPanResponderMove } }) as never);
 const save = jest.fn(async () => undefined); const screen=render(<ChecklistSignaturePad onSave={save} />);
 fireEvent.press(screen.getByText('checklists.labels.SaveDraft')); expect(save).not.toHaveBeenCalled();
 fireEvent(screen.getByLabelText('checklists.labels.Signature'),'touchStart',{nativeEvent:{locationX:10,locationY:10}});
 fireEvent(screen.getByLabelText('checklists.labels.Signature'),'touchMove',{nativeEvent:{locationX:60,locationY:60}});
 fireEvent.press(screen.getByText('checklists.labels.SaveDraft')); await waitFor(()=>expect(save).toHaveBeenCalledWith('synthetic-signature'));
 fireEvent.press(screen.getByText('checklists.ui.clearSignature')); fireEvent.press(screen.getByText('checklists.labels.SaveDraft')); expect(save).toHaveBeenCalledTimes(1);
 screen.unmount(); pan.mockRestore();
});
