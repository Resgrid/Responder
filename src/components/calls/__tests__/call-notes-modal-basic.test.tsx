// Mock @gorhom/bottom-sheet to avoid parsing ESM/TS issues
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(View, null, props.children),
    BottomSheetBackdrop: (props: any) => React.createElement(View, null, props.children),
    BottomSheetView: (props: any) => React.createElement(View, null, props.children),
  };
});
// Mock gesture handler ScrollView
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ScrollView: (props: any) => React.createElement(View, null, props.children) };
});
// Mock keyboard controller
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: (props: any) => null,
}));
// Mock icons and translation
jest.mock('lucide-react-native', () => ({ SearchIcon: () => null, X: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
// Mock analytics, auth and store hooks
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: jest.fn() }) }));
jest.mock('@/lib/auth', () => ({ useAuthStore: () => ({ profile: { sub: 'test-user' } }) }));
jest.mock('@/stores/calls/detail-store', () => ({
  useCallDetailStore: () => ({
    callNotes: [],
    addNote: jest.fn(),
    searchNotes: () => [],
    isNotesLoading: false,
    fetchCallNotes: jest.fn(),
  }),
}));

describe('CallNotesModal Basic', () => {
  it('should exist', () => {
    const CallNotesModal = require('../call-notes-modal').default;
    expect(CallNotesModal).toBeDefined();
  });
});
