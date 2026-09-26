import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanResponder, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Button, ButtonText } from '@/components/ui/button';

interface Props {
  onSave: (base64: string) => Promise<void>;
}
export const ChecklistSignaturePad: React.FC<Props> = ({ onSave }) => {
  const { t } = useTranslation();
  const svg = useRef<Svg>(null);
  const strokes = useRef<string[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          strokes.current = [...strokes.current, `M${e.nativeEvent.locationX},${e.nativeEvent.locationY}`];
          setPaths([...strokes.current]);
        },
        onPanResponderMove: (e) => {
          const last = strokes.current.length - 1;
          if (last >= 0) {
            strokes.current[last] += ` L${e.nativeEvent.locationX},${e.nativeEvent.locationY}`;
            setPaths([...strokes.current]);
          }
        },
      }),
    []
  );
  return (
    <View>
      <View {...responder.panHandlers} accessibilityLabel={t('checklists.labels.Signature')} style={{ height: 180 }}>
        <Svg ref={svg} width="100%" height="180">
          <Rect width="100%" height="100%" fill="white" />
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke="black" fill="none" strokeWidth={2} />
          ))}
        </Svg>
      </View>
      <Button
        variant="outline"
        onPress={() => {
          strokes.current = [];
          setPaths([]);
        }}
      >
        <ButtonText>{t('checklists.ui.clearSignature')}</ButtonText>
      </Button>
      <Button
        isDisabled={!paths.some((p) => p.includes(' L')) || busy}
        onPress={() => {
          if (busy || !paths.some((p) => p.includes(' L')) || !svg.current) return;
          setBusy(true);
          svg.current?.toDataURL((base64) => {
            void onSave(base64).finally(() => setBusy(false));
          });
        }}
      >
        <ButtonText>{t('checklists.labels.SaveDraft')}</ButtonText>
      </Button>
    </View>
  );
};
