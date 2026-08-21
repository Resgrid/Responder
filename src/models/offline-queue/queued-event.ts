export enum QueuedEventType {
  PERSONNEL_STATUS = 'personnel_status',
  CALL_IMAGE_UPLOAD = 'call_image_upload',
  CHECK_IN = 'check_in',
}

export enum QueuedEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

export interface QueuedEvent {
  id: string;
  type: QueuedEventType;
  status: QueuedEventStatus;
  data: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttemptAt?: number | undefined;
  nextRetryAt?: number | undefined;
  error?: string | undefined;
}

export interface QueuedPersonnelStatusEvent extends Omit<QueuedEvent, 'data'> {
  type: QueuedEventType.PERSONNEL_STATUS;
  data: {
    userId: string;
    statusType: string;
    note?: string;
    respondingTo?: string;
    respondingToType?: number | null;
    timestamp: string;
    timestampUtc: string;
    latitude?: string;
    longitude?: string;
    accuracy?: string;
    altitude?: string;
    altitudeAccuracy?: string;
    speed?: string;
    heading?: string;
    eventId?: string;
  };
}

export interface QueuedCallImageUploadEvent extends Omit<QueuedEvent, 'data'> {
  type: QueuedEventType.CALL_IMAGE_UPLOAD;
  data: {
    callId: string;
    userId: string;
    note: string;
    name: string;
    latitude?: number;
    longitude?: number;
    filePath: string;
  };
}

export interface QueuedCheckInEvent extends Omit<QueuedEvent, 'data'> {
  type: QueuedEventType.CHECK_IN;
  data: {
    callId: number;
    checkInType: number;
    unitId?: number;
    latitude?: string;
    longitude?: string;
    note?: string;
    timestamp: string;
  };
}
