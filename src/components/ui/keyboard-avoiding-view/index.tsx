'use client';
// react-native-keyboard-controller's implementation, unlike React Native's, avoids
// the keyboard on Android too and can measure its own screen offset instead of
// relying on a hardcoded one. The app ships adjustResize (app.config.ts) so the OS
// never pans the window underneath it — see the note there.
export { KeyboardAvoidingView } from 'react-native-keyboard-controller';
