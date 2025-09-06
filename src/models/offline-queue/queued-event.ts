export enum QueuedEventType {
  UNIT_STATUS = 'unit_status',
  PERSONNEL_STATUS = 'personnel_status',
  LOCATION_UPDATE = 'location_update',
  CALL_IMAGE_UPLOAD = 'call_image_upload',
  // Add other event types as needed
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

export interface QueuedUnitStatusEvent extends Omit<QueuedEvent, 'data'> {
  type: QueuedEventType.UNIT_STATUS;
  data: {
    unitId: string;
    statusType: string;
    note?: string;
    respondingTo?: string;
    timestamp: string;
    timestampUtc: string;
    roles?: {
      roleId: string;
      userId: string;
    }[];
    latitude?: string;
    longitude?: string;
    accuracy?: string;
    altitude?: string;
    altitudeAccuracy?: string;
    speed?: string;
    heading?: string;
  };
}

export interface QueuedLocationUpdateEvent extends Omit<QueuedEvent, 'data'> {
  type: QueuedEventType.LOCATION_UPDATE;
  data: {
    unitId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: string;
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
