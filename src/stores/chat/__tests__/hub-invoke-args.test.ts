/**
 * SignalR binds hub arguments positionally and rejects an invocation that supplies
 * fewer arguments than the hub method declares — C# default values do not make a
 * parameter optional on the wire. These tests pin the argument counts against the
 * ChatHub signatures so a short invoke can never silently strand the client outside
 * its channel groups again:
 *
 *   JoinChannel(string channelId, int? asUnitId)
 *   Typing(string channelId, string displayName, bool isTyping, int? asUnitId)
 *   MarkRead(string channelId, long seq, int? asUnitId)
 *   SetActiveChannel(string channelId, int? asUnitId)
 */
const mockInvoke = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/signalr.service', () => ({
  signalRService: { invoke: mockInvoke },
}));

jest.mock('@/lib/env', () => ({
  Env: { CHAT_HUB_NAME: 'chatHub' },
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn(), fatal: jest.fn() },
}));

jest.mock('@/lib/i18n/utils', () => ({ translate: (key: string) => key }));

jest.mock('@/lib/storage', () => ({ zustandStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));

jest.mock('@/api/chat/chat', () => ({
  getChannels: jest.fn().mockResolvedValue({ Data: [] }),
  getMessages: jest.fn().mockResolvedValue({ Data: [] }),
  getMembers: jest.fn().mockResolvedValue({ Data: [] }),
  getMyPendingAcks: jest.fn().mockResolvedValue({ Data: [] }),
  markRead: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/api/chat/chatbot', () => ({
  getChatbotChannel: jest.fn(),
  sendChatbotMessage: jest.fn(),
  newChatbotSession: jest.fn(),
}));

jest.mock('@/stores/auth/store', () => ({
  __esModule: true,
  default: { getState: () => ({ userId: 'user-1', profile: { name: 'Test User' } }) },
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: { getState: () => ({ showToast: jest.fn() }) },
}));

// Loaded lazily so the mock factories above run after their `mock*` consts exist.
type ChatStoreApi = typeof import('../store').useChatStore;
let useChatStore: ChatStoreApi;

beforeAll(() => {
  useChatStore = require('../store').useChatStore as ChatStoreApi;
});

describe('chat hub invocations', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
    useChatStore.setState({ messagesByChannel: {}, channels: [] });
  });

  it('sends both JoinChannel arguments', async () => {
    await useChatStore.getState().joinChannel('channel-1');

    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'JoinChannel', 'channel-1', null);
  });

  it('sends both SetActiveChannel arguments, with null clearing the marker', () => {
    useChatStore.getState().setActiveChannel('channel-1');
    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'SetActiveChannel', 'channel-1', null);

    mockInvoke.mockClear();
    useChatStore.getState().setActiveChannel(null);
    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'SetActiveChannel', null, null);
  });

  it('sends all four Typing arguments in hub order', () => {
    useChatStore.getState().sendTyping('channel-1', true);

    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'Typing', 'channel-1', 'Test User', true, null);
  });

  it('sends all three MarkRead arguments', async () => {
    useChatStore.setState({
      messagesByChannel: {
        'channel-1': [
          {
            ChatMessageId: 'm1',
            ChatChannelId: 'channel-1',
            MessageSeq: 42,
            SenderParticipantType: 0,
            SenderUserId: 'user-2',
            SenderDisplayName: 'Other',
            Body: 'hi',
            MessageType: 0,
            Priority: 0,
            ThreadRootMessageId: null,
            ThreadReplyCount: 0,
            AlsoSendToChannel: false,
            MetadataJson: null,
            ClientMessageId: 'c1',
            SentOn: new Date(0).toISOString(),
            Reactions: [],
            Attachments: [],
          },
        ],
      },
    } as unknown as Parameters<typeof useChatStore.setState>[0]);

    await useChatStore.getState().markChannelRead('channel-1');

    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'MarkRead', 'channel-1', 42, null);
  });
});

describe('active-channel marker resynchronization', () => {
  // Fake timers are on globally, so drain the microtask queue via the timer API.
  const flush = () => jest.advanceTimersByTimeAsync(0);

  beforeEach(async () => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
    useChatStore.getState().reset();
    await flush();
    mockInvoke.mockClear();
  });

  it('re-asserts a non-null marker on reconnect', async () => {
    useChatStore.getState().setActiveChannel('channel-1');
    await flush();
    mockInvoke.mockClear();

    useChatStore.getState().handleChatConnected();

    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'SetActiveChannel', 'channel-1', null);
  });

  it('retries a null marker that failed to send once reconnected', async () => {
    mockInvoke.mockRejectedValue(new Error('disconnected'));
    useChatStore.getState().setActiveChannel(null);
    await flush();
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);

    useChatStore.getState().handleChatConnected();

    expect(mockInvoke).toHaveBeenCalledWith('chatHub', 'SetActiveChannel', null, null);
  });

  it('does not resend a null marker the hub already confirmed', async () => {
    useChatStore.getState().setActiveChannel(null);
    await flush();
    mockInvoke.mockClear();

    useChatStore.getState().handleChatConnected();
    await flush();

    expect(mockInvoke).not.toHaveBeenCalledWith('chatHub', 'SetActiveChannel', expect.anything(), expect.anything());
  });
});

describe('incoming message normalization', () => {
  beforeEach(() => {
    useChatStore.setState({ messagesByChannel: {}, channels: [] });
  });

  it('fills in collections the hub payload omits', () => {
    // The hub sends the message DTO as a JSON string and drops empty collections.
    useChatStore.getState().handleMessageReceived(JSON.stringify({ ChatMessageId: 'm1', ChatChannelId: 'channel-1', MessageSeq: 10, Body: 'hi', SentOn: new Date(0).toISOString() }));

    const stored = useChatStore.getState().messagesByChannel['channel-1']?.[0];
    expect(stored?.Reactions).toEqual([]);
    expect(stored?.Attachments).toEqual([]);
  });

  it('keeps existing reactions when a later payload omits them', () => {
    useChatStore.getState().handleMessageReceived({ ChatMessageId: 'm1', ChatChannelId: 'channel-1', MessageSeq: 10, Body: 'hi', SentOn: new Date(0).toISOString(), Reactions: [{ Emoji: '👍', UserId: 'user-2' }] });
    useChatStore.getState().handleMessageEdited({ ChatMessageId: 'm1', ChatChannelId: 'channel-1', MessageSeq: 10, Body: 'hi (edited)', SentOn: new Date(0).toISOString() });

    const stored = useChatStore.getState().messagesByChannel['channel-1']?.[0];
    expect(stored?.Body).toBe('hi (edited)');
    expect(stored?.Reactions).toHaveLength(1);
  });
});

describe('message list maintenance', () => {
  const message = (seq: number, overrides: Record<string, unknown> = {}) => ({
    ChatMessageId: `m${seq}`,
    ChatChannelId: 'channel-1',
    MessageSeq: seq,
    SenderParticipantType: 0,
    SenderUserId: 'user-2',
    SenderDisplayName: 'Other',
    Body: `body ${seq}`,
    MessageType: 0,
    Priority: 0,
    ThreadRootMessageId: null,
    ThreadReplyCount: 0,
    AlsoSendToChannel: false,
    MetadataJson: null,
    // Clamped so the pending-sentinel sequences below stay inside the Date range.
    SentOn: new Date(Math.min(seq, 4_000_000_000) * 1000).toISOString(),
    Reactions: [],
    Attachments: [],
    ...overrides,
  });

  beforeEach(() => {
    useChatStore.setState({ messagesByChannel: {}, channels: [], hasMoreByChannel: {} });
  });

  it('keeps the list ascending no matter what order the hub delivers', () => {
    [30, 10, 40, 20].forEach((seq) => useChatStore.getState().handleMessageReceived(message(seq)));

    expect(useChatStore.getState().messagesByChannel['channel-1']?.map((m) => m.MessageSeq)).toEqual([10, 20, 30, 40]);
  });

  it('re-positions an optimistic send when its server row reconciles', () => {
    useChatStore.getState().handleMessageReceived(message(10));
    useChatStore.getState().handleMessageReceived(message(30));

    // Optimistic sends carry a sentinel sequence that sorts to the very end of the list.
    const pendingSeq = 9_000_000_000_001;
    const pending = message(pendingSeq, { ChatMessageId: 'local-c1', ClientMessageId: 'c1', SentOn: new Date(pendingSeq).toISOString() });
    useChatStore.setState((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        'channel-1': [...(state.messagesByChannel['channel-1'] ?? []), pending as unknown as (typeof state.messagesByChannel)['channel-1'][number]],
      },
    }));

    useChatStore.getState().handleMessageReceived(message(20, { ChatMessageId: 'm-server', ClientMessageId: 'c1' }));

    const list = useChatStore.getState().messagesByChannel['channel-1'] ?? [];
    expect(list.map((m) => m.MessageSeq)).toEqual([10, 20, 30]);
    expect(list.filter((m) => m.ClientMessageId === 'c1')).toHaveLength(1);
  });

  it('caps in-memory retention per channel and reopens pagination when it evicts', () => {
    for (let seq = 1; seq <= 520; seq += 1) {
      useChatStore.getState().handleMessageReceived(message(seq));
    }

    const list = useChatStore.getState().messagesByChannel['channel-1'] ?? [];
    expect(list).toHaveLength(500);
    expect(list[0]?.MessageSeq).toBe(21);
    expect(list[list.length - 1]?.MessageSeq).toBe(520);
    expect(useChatStore.getState().hasMoreByChannel['channel-1']).toBe(true);
  });
});

describe('chat presence events', () => {
  beforeEach(() => {
    useChatStore.setState({ presence: new Set<string>() });
  });

  it('accepts the hub positional (userId, isOnline) form', () => {
    useChatStore.getState().handlePresenceChanged('user-2', true);
    expect(useChatStore.getState().presence.has('user-2')).toBe(true);

    useChatStore.getState().handlePresenceChanged('user-2', false);
    expect(useChatStore.getState().presence.has('user-2')).toBe(false);
  });

  it('still accepts an object payload', () => {
    useChatStore.getState().handlePresenceChanged({ UserId: 'user-3', IsOnline: true });
    expect(useChatStore.getState().presence.has('user-3')).toBe(true);
  });
});

describe('chat typing events', () => {
  beforeEach(() => {
    useChatStore.setState({ typingByChannel: {} });
  });

  it('reads the hub payload ChannelId field', () => {
    useChatStore.getState().handleTyping({ ChannelId: 'channel-1', UserId: 'user-2', DisplayName: 'Other', IsTyping: true });

    expect(useChatStore.getState().typingByChannel['channel-1']?.[0]?.displayName).toBe('Other');
  });

  it('reads a camelCase hub payload', () => {
    useChatStore.getState().handleTyping({ channelId: 'channel-1', userId: 'user-2', displayName: 'Other', isTyping: true });

    expect(useChatStore.getState().typingByChannel['channel-1']?.[0]?.userId).toBe('user-2');
  });
});
