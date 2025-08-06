export interface ScreenshotItem {
  id: string;
  path: string;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  timestamp: number;
  metadata?: {
    problemStatement?: string;
    solution?: string;
    error?: string;
  };
}

export interface QueueManagerEvents {
  itemAdded: (item: ScreenshotItem) => void;
  itemProcessing: (item: ScreenshotItem) => void;
  itemCompleted: (item: ScreenshotItem) => void;
  itemError: (item: ScreenshotItem) => void;
  itemRemoved: (item: ScreenshotItem) => void;
}

export interface QueueManagerConfig {
  maxConcurrent: number;
  autoProcess: boolean;
  retryAttempts: number;
  retryDelay: number;
} 