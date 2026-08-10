'use client';
// react-native-keyboard-controller's implementation, unlike React Native's, avoids
// the keyboard on Android too (the app ships adjustPan, which RN's version ignores)
// and can measure its own screen offset instead of relying on a hardcoded one.
export { KeyboardAvoidingView } from 'react-native-keyboard-controller';
