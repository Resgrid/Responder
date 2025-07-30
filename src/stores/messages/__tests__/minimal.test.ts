import { renderHook } from '@testing-library/react-native';

// Mock the logger
jest.mock('@/lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the API completely
jest.mock('@/api/messaging/messages', () => ({
  getInboxMessages: jest.fn(),
  getSentMessages: jest.fn(),
  getRecipients: jest.fn(),
  getMessage: jest.fn(),
  sendMessage: jest.fn(),
  deleteMessage: jest.fn(),
  respondToMessage: jest.fn(),
}));

import { useMessagesStore } from '../store';

describe('MessagesStore - Minimal Test', () => {
  it('should create store without hanging', () => {
    const { result } = renderHook(() => useMessagesStore());
    expect(result.current).toBeDefined();
  });
});
