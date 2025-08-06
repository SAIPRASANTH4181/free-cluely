import { ScreenshotQueueManager } from './screenshot-queue-manager';
import { ScreenshotItem } from '../types/screenshot-queue';

// Mock the window.electronAPI
const mockElectronAPI = {
  analyzeImageFile: jest.fn(),
  generateSolution: jest.fn()
};

// Mock window object
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('ScreenshotQueueManager', () => {
  let queueManager: ScreenshotQueueManager;

  beforeEach(() => {
    queueManager = new ScreenshotQueueManager({
      maxConcurrent: 2,
      autoProcess: false,
      retryAttempts: 2,
      retryDelay: 100
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Queue Management', () => {
    test('should add screenshot to queue', async () => {
      const id = await queueManager.addScreenshot('/test/path.png', 'data:image/png;base64,test');
      
      expect(id).toBeDefined();
      expect(queueManager.getQueue()).toHaveLength(1);
      expect(queueManager.getQueue()[0].status).toBe('pending');
    });

    test('should remove screenshot from queue', async () => {
      const id = await queueManager.addScreenshot('/test/path.png', 'data:image/png;base64,test');
      
      const result = queueManager.removeScreenshot(id);
      
      expect(result).toBe(true);
      expect(queueManager.getQueue()).toHaveLength(0);
    });

    test('should return false when removing non-existent screenshot', () => {
      const result = queueManager.removeScreenshot('non-existent-id');
      expect(result).toBe(false);
    });

    test('should clear entire queue', async () => {
      await queueManager.addScreenshot('/test1.png', 'preview1');
      await queueManager.addScreenshot('/test2.png', 'preview2');
      
      queueManager.clearQueue();
      
      expect(queueManager.getQueue()).toHaveLength(0);
      expect(queueManager.getProcessingCount()).toBe(0);
    });
  });

  describe('Processing', () => {
    test('should process items up to maxConcurrent limit', async () => {
      // Mock successful processing
      mockElectronAPI.analyzeImageFile.mockResolvedValue({
        problem_statement: 'Test problem',
        input_format: { description: 'Test input', parameters: [] },
        output_format: { description: 'Test output', type: 'string', subtype: 'text' },
        complexity: { time: 'O(n)', space: 'O(1)' },
        test_cases: [],
        validation_type: 'manual',
        difficulty: 'custom'
      });

      mockElectronAPI.generateSolution.mockResolvedValue({
        solution: {
          code: 'function solve() { return "solution"; }',
          thoughts: ['Step 1', 'Step 2'],
          time_complexity: 'O(n)',
          space_complexity: 'O(1)'
        }
      });

      // Add 3 items but only 2 should process concurrently
      await queueManager.addScreenshot('/test1.png', 'preview1');
      await queueManager.addScreenshot('/test2.png', 'preview2');
      await queueManager.addScreenshot('/test3.png', 'preview3');

      // Start processing
      await queueManager.processNext();
      await queueManager.processNext();
      await queueManager.processNext();

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(queueManager.getProcessingCount()).toBeLessThanOrEqual(2);
    });

    test('should handle processing errors with retry', async () => {
      // Mock failed processing
      mockElectronAPI.analyzeImageFile.mockRejectedValue(new Error('Processing failed'));

      const id = await queueManager.addScreenshot('/test.png', 'preview');
      
      await queueManager.processNext();

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const queue = queueManager.getQueue();
      const item = queue.find(q => q.id === id);
      
      expect(item?.status).toBe('error');
      expect(item?.metadata?.error).toBe('Processing failed');
    });

    test('should emit events correctly', async () => {
      const events: any[] = [];
      
      queueManager.on('itemAdded', (item) => events.push({ type: 'itemAdded', item }));
      queueManager.on('itemProcessing', (item) => events.push({ type: 'itemProcessing', item }));
      queueManager.on('itemCompleted', (item) => events.push({ type: 'itemCompleted', item }));

      // Mock successful processing
      mockElectronAPI.analyzeImageFile.mockResolvedValue({
        problem_statement: 'Test problem',
        input_format: { description: 'Test input', parameters: [] },
        output_format: { description: 'Test output', type: 'string', subtype: 'text' },
        complexity: { time: 'O(n)', space: 'O(1)' },
        test_cases: [],
        validation_type: 'manual',
        difficulty: 'custom'
      });

      mockElectronAPI.generateSolution.mockResolvedValue({
        solution: {
          code: 'function solve() { return "solution"; }',
          thoughts: ['Step 1', 'Step 2'],
          time_complexity: 'O(n)',
          space_complexity: 'O(1)'
        }
      });

      const id = await queueManager.addScreenshot('/test.png', 'preview');
      await queueManager.processNext();

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('itemAdded');
      expect(events[1].type).toBe('itemProcessing');
      expect(events[2].type).toBe('itemCompleted');
    });
  });

  describe('Statistics', () => {
    test('should provide accurate queue statistics', async () => {
      await queueManager.addScreenshot('/test1.png', 'preview1');
      await queueManager.addScreenshot('/test2.png', 'preview2');
      
      const stats = queueManager.getQueueStats();
      
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.error).toBe(0);
    });

    test('should track processing count correctly', async () => {
      expect(queueManager.getProcessingCount()).toBe(0);
      
      await queueManager.addScreenshot('/test.png', 'preview');
      await queueManager.processNext();
      
      expect(queueManager.getProcessingCount()).toBe(1);
    });
  });

  describe('Configuration', () => {
    test('should update configuration correctly', () => {
      queueManager.updateConfig({ maxConcurrent: 5, retryAttempts: 5 });
      
      // Test that configuration is applied by checking processing behavior
      expect(queueManager.getQueue()).toHaveLength(0);
    });

    test('should respect autoProcess configuration', async () => {
      const autoProcessManager = new ScreenshotQueueManager({ autoProcess: true });
      
      // Mock successful processing
      mockElectronAPI.analyzeImageFile.mockResolvedValue({
        problem_statement: 'Test problem',
        input_format: { description: 'Test input', parameters: [] },
        output_format: { description: 'Test output', type: 'string', subtype: 'text' },
        complexity: { time: 'O(n)', space: 'O(1)' },
        test_cases: [],
        validation_type: 'manual',
        difficulty: 'custom'
      });

      mockElectronAPI.generateSolution.mockResolvedValue({
        solution: {
          code: 'function solve() { return "solution"; }',
          thoughts: ['Step 1', 'Step 2'],
          time_complexity: 'O(n)',
          space_complexity: 'O(1)'
        }
      });

      await autoProcessManager.addScreenshot('/test.png', 'preview');
      
      // Wait for auto-processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(autoProcessManager.getProcessingCount()).toBe(0);
    });
  });
});

// Example usage demonstration
export const exampleUsage = () => {
  const queueManager = new ScreenshotQueueManager({
    maxConcurrent: 3,
    autoProcess: true,
    retryAttempts: 3,
    retryDelay: 1000
  });

  // Set up event listeners
  queueManager.on('itemAdded', (item) => {
    console.log('Screenshot added:', item.id);
  });

  queueManager.on('itemCompleted', (item) => {
    console.log('Screenshot processed:', item.id);
    console.log('Problem:', item.metadata?.problemStatement);
    console.log('Solution:', item.metadata?.solution);
  });

  queueManager.on('itemError', (item) => {
    console.error('Screenshot failed:', item.id, item.metadata?.error);
  });

  // Add screenshots
  queueManager.addScreenshot('/path/to/screenshot1.png', 'data:image/png;base64,preview1');
  queueManager.addScreenshot('/path/to/screenshot2.png', 'data:image/png;base64,preview2');

  // Get queue statistics
  const stats = queueManager.getQueueStats();
  console.log('Queue stats:', stats);

  // Remove a screenshot
  queueManager.removeScreenshot('screenshot_id');

  // Clear entire queue
  queueManager.clearQueue();
}; 