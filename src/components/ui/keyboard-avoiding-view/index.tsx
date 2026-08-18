'use client';
// react-native-keyboard-controller's implementation, unlike React Native's, avoids
// the keyboard on Android too and can measure its own screen offset instead of
// relying on a hardcoded one. The app ships adjustResize (app.config.ts) so the OS
// never pans the window underneath it — see the note there.
export { KeyboardAvoidingView } from 'react-native-keyboard-controller';
// Prefer this on screens that run edge-to-edge to the bottom of the display: it skips
// the screen-position measurement entirely. See the file for why that matters on Android.
export { BottomAnchoredKeyboardView } from './bottom-anchored';
