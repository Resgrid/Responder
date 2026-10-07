import { Check, Fingerprint } from 'lucide-react-native';
import React from 'react';
import { type LayoutChangeEvent, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';

/** How long a status button has to be held (department setting "Hold to set status"). */
export const STATUS_HOLD_DURATION_MS = 2000;

/** A release sooner than this is a tap, which gets the "press and hold" hint instead of silence. */
const TAP_THRESHOLD_MS = 350;

/** How long the completed state (flash + check) stays before the button resets itself. */
const DONE_RESET_MS = 900;

type HoldPhase = 'idle' | 'holding' | 'done';

export interface HoldToConfirmButtonProps {
  /** Runs once the hold completes. */
  onConfirm: () => void;
  /** Runs when the button is tapped instead of held (show a "press and hold" hint). */
  onTap?: () => void;
  durationMs?: number;
  disabled?: boolean;
  /** The button's own colour (the status colour). */
  backgroundColor: string;
  /** Text/icon colour on top of `backgroundColor`. */
  foregroundColor: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** Shows the fingerprint "hold me" glyph at the right edge while idle. */
  showHoldGlyph?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const parseHex = (color: string): [number, number, number] | null => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return null;
  }

  const hex = match[1].length === 3 ? match[1].replace(/(.)/g, '$1$1') : match[1];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
};

/** A translucent tint of the foreground colour: light text gets a light sweep, dark text a dark one. */
const tint = (foregroundColor: string, alpha: number): string => {
  const rgb = parseHex(foregroundColor);
  if (!rgb) {
    return `rgba(255,255,255,${alpha})`;
  }

  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
};

/**
 * A button that confirms with a press and hold instead of a tap.
 *
 * While held a tinted fill sweeps across the button with a glowing leading edge and a shimmer running
 * through it, the button squeezes in slightly, a halo pulses around it and a pill counts down the
 * remaining time. On completion the button flashes, bounces and pops a check. Letting go early springs
 * the fill back; a quick tap calls `onTap` so the caller can explain the gesture.
 *
 * The confirmation itself runs off a JS timer started with the animation, so it fires exactly once and
 * does not depend on the UI-thread animation finishing (or being mocked away in tests). Screen readers
 * get a plain "activate" action that confirms directly, since a timed hold is not reachable there.
 */
export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  onConfirm,
  onTap,
  durationMs = STATUS_HOLD_DURATION_MS,
  disabled = false,
  backgroundColor,
  foregroundColor,
  style,
  contentStyle,
  children,
  showHoldGlyph = true,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [phase, setPhase] = React.useState<HoldPhase>('idle');
  const [remainingMs, setRemainingMs] = React.useState(durationMs);

  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const halo = useSharedValue(0);
  const flash = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const check = useSharedValue(0);
  const width = useSharedValue(0);

  const startedAtRef = React.useRef(0);
  const confirmTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = React.useRef<HoldPhase>('idle');
  // Read through a ref so a re-render between press-in and completion cannot run a stale callback.
  const onConfirmRef = React.useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const setPhaseBoth = React.useCallback((next: HoldPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = React.useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }

    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  React.useEffect(
    () => () => {
      clearTimers();
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [clearTimers]
  );

  const settleToIdle = React.useCallback(() => {
    cancelAnimation(progress);
    cancelAnimation(halo);
    cancelAnimation(shimmer);
    progress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    halo.value = withTiming(0, { duration: 180 });
    shimmer.value = 0;
    check.value = withTiming(0, { duration: 150 });
  }, [check, halo, progress, scale, shimmer]);

  const complete = React.useCallback(() => {
    clearTimers();
    setPhaseBoth('done');
    setRemainingMs(0);

    cancelAnimation(halo);
    cancelAnimation(shimmer);
    progress.value = 1;
    halo.value = withTiming(0, { duration: 260 });
    flash.value = withSequence(withTiming(0.6, { duration: 90 }), withTiming(0, { duration: 380 }));
    scale.value = withSequence(withTiming(1.05, { duration: 120, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 8, stiffness: 260 }));
    check.value = withSpring(1, { damping: 9, stiffness: 240 });

    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      setPhaseBoth('idle');
      setRemainingMs(durationMs);
      settleToIdle();
    }, DONE_RESET_MS);

    onConfirmRef.current();
  }, [check, clearTimers, durationMs, flash, halo, progress, scale, setPhaseBoth, settleToIdle, shimmer]);

  const handlePressIn = React.useCallback(() => {
    if (disabled || phaseRef.current !== 'idle') {
      return;
    }

    startedAtRef.current = Date.now();
    setPhaseBoth('holding');
    setRemainingMs(durationMs);

    progress.value = 0;
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.linear });
    scale.value = withSpring(0.97, { damping: 15, stiffness: 260 });
    halo.value = withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.35, { duration: 420 })), -1, false);
    shimmer.value = 0;
    shimmer.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, false);

    confirmTimerRef.current = setTimeout(complete, durationMs);
    tickTimerRef.current = setInterval(() => {
      setRemainingMs(Math.max(0, durationMs - (Date.now() - startedAtRef.current)));
    }, 100);
  }, [complete, disabled, durationMs, halo, progress, scale, setPhaseBoth, shimmer]);

  const handlePressOut = React.useCallback(() => {
    if (phaseRef.current !== 'holding') {
      return;
    }

    const heldFor = Date.now() - startedAtRef.current;
    clearTimers();
    setPhaseBoth('idle');
    setRemainingMs(durationMs);
    settleToIdle();

    if (heldFor < TAP_THRESHOLD_MS) {
      onTap?.();
    }
  }, [clearTimers, durationMs, onTap, setPhaseBoth, settleToIdle]);

  const handleAccessibilityAction = React.useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === 'activate' && !disabled && phaseRef.current === 'idle') {
        complete();
      }
    },
    [complete, disabled]
  );

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      width.value = event.nativeEvent.layout.width;
    },
    [width]
  );

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: halo.value,
    transform: [{ scale: 1 + halo.value * 0.03 }],
  }));

  // A full-width layer slid in from the left, so the filled part is exactly progress × width.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * width.value }],
  }));

  const edgeStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0.01 && progress.value < 0.995 ? 1 : 0,
    transform: [{ translateX: progress.value * width.value - 3 }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ translateX: shimmer.value * (width.value + 80) - 60 }, { skewX: '-20deg' }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.4 + check.value * 0.6 }],
  }));

  const fillColor = tint(foregroundColor, 0.28);
  const edgeColor = tint(foregroundColor, 0.9);
  const shimmerColor = tint(foregroundColor, 0.22);
  const pillBackground = tint(foregroundColor, 0.18);
  const remainingLabel = `${(remainingMs / 1000).toFixed(1)}s`;

  return (
    <Animated.View style={[styles.wrapper, containerStyle, disabled ? styles.disabled : null]}>
      {/* The halo sits behind the button and pulses while it is held. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.halo, { borderColor: backgroundColor, shadowColor: backgroundColor }, haloStyle]} />
      <Pressable
        testID={testID}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLayout={handleLayout}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, busy: phase === 'holding' }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={handleAccessibilityAction}
        style={[styles.button, { backgroundColor }, style]}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }, fillStyle]}>
          <Animated.View style={[styles.shimmer, { backgroundColor: shimmerColor }, shimmerStyle]} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.edge, { backgroundColor: edgeColor, shadowColor: edgeColor }, edgeStyle]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

        <View style={[styles.content, contentStyle]}>
          <View style={styles.label}>{children}</View>

          {phase === 'holding' ? (
            <View testID={testID ? `${testID}-countdown` : undefined} style={[styles.pill, { backgroundColor: pillBackground }]}>
              <Text style={[styles.pillText, { color: foregroundColor }]}>{remainingLabel}</Text>
            </View>
          ) : null}

          {phase === 'done' ? (
            <Animated.View style={[styles.pill, styles.checkPill, { backgroundColor: pillBackground }, checkStyle]}>
              <Check size={16} color={foregroundColor} strokeWidth={3} />
            </Animated.View>
          ) : null}

          {phase === 'idle' && showHoldGlyph ? (
            <View style={styles.glyph}>
              <Fingerprint size={18} color={foregroundColor} strokeWidth={1.75} />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  halo: {
    borderRadius: 12,
    borderWidth: 3,
    margin: -4,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  button: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  shimmer: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 36,
  },
  edge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  flash: {
    backgroundColor: '#ffffff',
  },
  pill: {
    marginLeft: 8,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  checkPill: {
    minWidth: 32,
  },
  glyph: {
    marginLeft: 8,
    opacity: 0.55,
  },
});
