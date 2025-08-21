// Stub implementation for OfflineQueueProcessor
export class OfflineQueueProcessor {
  static getInstance(): OfflineQueueProcessor {
    return new OfflineQueueProcessor();
  }
  processQueue(): Promise<void> {
    return Promise.resolve();
  }
  addPersonnelStatusToQueue(..._args: any[]): string {
    return '';
  }
  cleanup(): void {}
  startProcessing(): Promise<void> {
    return Promise.resolve();
  }
  startBackgroundProcessing(): Promise<void> {
    return Promise.resolve();
  }
}
export const offlineQueueProcessor = OfflineQueueProcessor.getInstance();
