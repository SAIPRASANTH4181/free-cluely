import { useState, useEffect, useRef, useCallback } from 'react';
import { ScreenshotQueueManager } from '../lib/screenshot-queue-manager';
import { ScreenshotItem } from '../types/screenshot-queue';

export function useScreenshotQueue(config?: {
  maxConcurrent?: number;
  autoProcess?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}) {
  const [queue, setQueue] = useState<ScreenshotItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    error: 0
  });
  
  const queueManagerRef = useRef<ScreenshotQueueManager | null>(null);

  useEffect(() => {
    queueManagerRef.current = new ScreenshotQueueManager(config);
    
    const manager = queueManagerRef.current;
    
    // Set up event listeners
    manager.on('itemAdded', (item: ScreenshotItem) => {
      setQueue(prev => [...prev, item]);
      setStats(manager.getQueueStats());
    });
    
    manager.on('itemProcessing', (item: ScreenshotItem) => {
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'processing' } : q
      ));
      setIsProcessing(true);
      setStats(manager.getQueueStats());
    });
    
    manager.on('itemCompleted', (item: ScreenshotItem) => {
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'completed' } : q
      ));
      setIsProcessing(false);
      setStats(manager.getQueueStats());
    });
    
    manager.on('itemError', (item: ScreenshotItem) => {
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'error' } : q
      ));
      setIsProcessing(false);
      setStats(manager.getQueueStats());
    });
    
    manager.on('itemRemoved', (item: ScreenshotItem) => {
      setQueue(prev => prev.filter(q => q.id !== item.id));
      setStats(manager.getQueueStats());
    });

    // Cleanup function
    return () => {
      if (manager) {
        manager.clearQueue();
      }
    };
  }, [config]);

  const addScreenshot = useCallback(async (path: string, preview: string): Promise<string> => {
    if (queueManagerRef.current) {
      return await queueManagerRef.current.addScreenshot(path, preview);
    }
    throw new Error('Queue manager not initialized');
  }, []);

  const removeScreenshot = useCallback((id: string): boolean => {
    if (queueManagerRef.current) {
      return queueManagerRef.current.removeScreenshot(id);
    }
    return false;
  }, []);

  const clearQueue = useCallback((): void => {
    if (queueManagerRef.current) {
      queueManagerRef.current.clearQueue();
      setQueue([]);
      setStats({
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        error: 0
      });
    }
  }, []);

  const processNext = useCallback(async (): Promise<void> => {
    if (queueManagerRef.current) {
      await queueManagerRef.current.processNext();
    }
  }, []);

  const getProcessingCount = useCallback((): number => {
    if (queueManagerRef.current) {
      return queueManagerRef.current.getProcessingCount();
    }
    return 0;
  }, []);

  const updateConfig = useCallback((newConfig: Partial<typeof config>): void => {
    if (queueManagerRef.current) {
      queueManagerRef.current.updateConfig(newConfig);
    }
  }, []);

  return {
    queue,
    isProcessing,
    stats,
    addScreenshot,
    removeScreenshot,
    clearQueue,
    processNext,
    getProcessingCount,
    updateConfig
  };
} 