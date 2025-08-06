import { ScreenshotItem, QueueManagerEvents, QueueManagerConfig } from '../types/screenshot-queue';

class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, data?: any): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  off(event: string, callback: Function): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

export class ScreenshotQueueManager {
  private queue: ScreenshotItem[] = [];
  private processingQueue: Set<string> = new Set();
  private config: QueueManagerConfig;
  private eventEmitter: EventEmitter;
  private retryCounts: Map<string, number> = new Map();

  constructor(config: Partial<QueueManagerConfig> = {}) {
    this.config = {
      maxConcurrent: 3,
      autoProcess: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
    this.eventEmitter = new EventEmitter();
  }

  async addScreenshot(path: string, preview: string): Promise<string> {
    const id = this.generateId();
    const item: ScreenshotItem = {
      id,
      path,
      preview,
      status: 'pending',
      timestamp: Date.now()
    };

    this.queue.push(item);
    this.eventEmitter.emit('itemAdded', item);
    
    if (this.config.autoProcess) {
      this.processNext();
    }
    
    return id;
  }

  async processNext(): Promise<void> {
    if (this.processingQueue.size >= this.config.maxConcurrent) {
      return;
    }

    const nextItem = this.queue.find(item => item.status === 'pending');
    if (!nextItem) {
      return;
    }

    this.processingQueue.add(nextItem.id);
    nextItem.status = 'processing';
    this.eventEmitter.emit('itemProcessing', nextItem);

    try {
      // Process with AI using the electron API
      const problemInfo = await this.processWithAI(nextItem.path);
      const solution = await this.generateSolution(problemInfo);
      
      nextItem.status = 'completed';
      nextItem.metadata = {
        problemStatement: problemInfo.problem_statement,
        solution: solution.solution?.code || ''
      };
      
      this.eventEmitter.emit('itemCompleted', nextItem);
    } catch (error) {
      const retryCount = this.retryCounts.get(nextItem.id) || 0;
      
      if (retryCount < this.config.retryAttempts) {
        // Retry processing
        this.retryCounts.set(nextItem.id, retryCount + 1);
        nextItem.status = 'pending';
        this.processingQueue.delete(nextItem.id);
        
        setTimeout(() => {
          this.processNext();
        }, this.config.retryDelay);
        
        return;
      }
      
      nextItem.status = 'error';
      nextItem.metadata = { error: error.message };
      this.eventEmitter.emit('itemError', nextItem);
    } finally {
      this.processingQueue.delete(nextItem.id);
      this.retryCounts.delete(nextItem.id);
      
      // Process next item
      if (this.config.autoProcess) {
        this.processNext();
      }
    }
  }

  private async processWithAI(imagePath: string): Promise<any> {
    // Use the existing electron API to process with AI
    if (window.electronAPI) {
      // This would need to be implemented in the electron side
      // For now, we'll simulate the processing
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve({
            problem_statement: `Problem extracted from ${imagePath}`,
            input_format: { description: "Generated from screenshot", parameters: [] },
            output_format: { description: "Generated from screenshot", type: "string", subtype: "text" },
            complexity: { time: "N/A", space: "N/A" },
            test_cases: [],
            validation_type: "manual",
            difficulty: "custom"
          });
        }, 1000);
      });
    }
    throw new Error('Electron API not available');
  }

  private async generateSolution(problemInfo: any): Promise<any> {
    // Use the existing electron API to generate solution
    if (window.electronAPI) {
      // This would need to be implemented in the electron side
      // For now, we'll simulate the solution generation
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            solution: {
              code: `// Solution for: ${problemInfo.problem_statement}\nfunction solve() {\n  // Implementation here\n  return "solution";\n}`,
              thoughts: ["Step 1: Analyze the problem", "Step 2: Implement solution"],
              time_complexity: "O(n)",
              space_complexity: "O(1)"
            }
          });
        }, 1500);
      });
    }
    throw new Error('Electron API not available');
  }

  removeScreenshot(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    const item = this.queue[index];
    this.queue.splice(index, 1);
    this.processingQueue.delete(id);
    this.retryCounts.delete(id);
    this.eventEmitter.emit('itemRemoved', item);
    
    return true;
  }

  getQueue(): ScreenshotItem[] {
    return [...this.queue];
  }

  getProcessingCount(): number {
    return this.processingQueue.size;
  }

  getQueueStats() {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      error: 0
    };

    this.queue.forEach(item => {
      stats[item.status]++;
    });

    return stats;
  }

  clearQueue(): void {
    this.queue = [];
    this.processingQueue.clear();
    this.retryCounts.clear();
  }

  on<K extends keyof QueueManagerEvents>(event: K, callback: QueueManagerEvents[K]): void {
    this.eventEmitter.on(event, callback);
  }

  off<K extends keyof QueueManagerEvents>(event: K, callback: QueueManagerEvents[K]): void {
    this.eventEmitter.off(event, callback);
  }

  updateConfig(newConfig: Partial<QueueManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private generateId(): string {
    return `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 