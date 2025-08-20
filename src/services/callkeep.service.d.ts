// Type declarations for platform-specific CallKeep service

export interface CallKeepConfig {
  appName: string;
  maximumCallGroups: number;
  maximumCallsPerCallGroup: number;
  includesCallsInRecents: boolean;
  supportsVideo: boolean;
  ringtoneSound?: string;
}

export interface CallKeepServiceInterface {
  setup(config: CallKeepConfig): Promise<void>;
  startCall(roomName: string, handle?: string): Promise<string>;
  endCall(): Promise<void>;
  setMuteStateCallback(callback: ((muted: boolean) => void) | null): void;
  isCallActiveNow(): boolean;
  getCurrentCallUUID(): string | null;
  cleanup(): Promise<void>;
}

export declare class CallKeepService implements CallKeepServiceInterface {
  static getInstance(): CallKeepService;
  setup(config: CallKeepConfig): Promise<void>;
  startCall(roomName: string, handle?: string): Promise<string>;
  endCall(): Promise<void>;
  setMuteStateCallback(callback: ((muted: boolean) => void) | null): void;
  isCallActiveNow(): boolean;
  getCurrentCallUUID(): string | null;
  cleanup(): Promise<void>;
}

export declare const callKeepService: CallKeepService;
