# Screenshot Queue Management System

A robust, scalable queue management system for handling multiple screenshots with AI processing, real-time status updates, and comprehensive error handling.

## Features

- **Concurrent Processing**: Configurable maximum concurrent processing limit
- **Real-time Status Tracking**: Track pending, processing, completed, and error states
- **Retry Mechanism**: Automatic retry with configurable attempts and delay
- **Event-driven Architecture**: Real-time updates via event emitters
- **React Integration**: Custom hook for seamless React integration
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Queue Statistics**: Real-time statistics and monitoring
- **Pause/Resume**: Ability to pause and resume processing

## Architecture

### Core Components

1. **ScreenshotQueueManager**: Main queue management class
2. **useScreenshotQueue**: React hook for queue integration
3. **EnhancedScreenshotQueue**: React component with UI
4. **Type Definitions**: TypeScript interfaces for type safety

### Data Flow

```
Screenshot Added → Queue Manager → AI Processing → Status Update → Event Emission → UI Update
```

## Installation

The system is already integrated into the project. No additional installation required.

## Usage

### Basic Usage

```typescript
import { ScreenshotQueueManager } from './lib/screenshot-queue-manager';

const queueManager = new ScreenshotQueueManager({
  maxConcurrent: 3,
  autoProcess: true,
  retryAttempts: 3,
  retryDelay: 1000
});

// Add screenshot
const id = await queueManager.addScreenshot('/path/to/screenshot.png', 'data:image/png;base64,preview');

// Remove screenshot
queueManager.removeScreenshot(id);

// Get queue statistics
const stats = queueManager.getQueueStats();
```

### React Hook Usage

```typescript
import { useScreenshotQueue } from './hooks/useScreenshotQueue';

function MyComponent() {
  const {
    queue,
    isProcessing,
    stats,
    addScreenshot,
    removeScreenshot,
    clearQueue,
    processNext
  } = useScreenshotQueue({
    maxConcurrent: 3,
    autoProcess: true
  });

  const handleTakeScreenshot = async () => {
    try {
      const id = await addScreenshot('/path/to/screenshot.png', 'preview');
      console.log('Screenshot added:', id);
    } catch (error) {
      console.error('Failed to add screenshot:', error);
    }
  };

  return (
    <div>
      <button onClick={handleTakeScreenshot}>Take Screenshot</button>
      <div>Processing: {isProcessing ? 'Yes' : 'No'}</div>
      <div>Queue Size: {stats.total}</div>
    </div>
  );
}
```

### React Component Usage

```typescript
import { EnhancedScreenshotQueue } from './components/Queue/EnhancedScreenshotQueue';

function QueuePage() {
  return (
    <EnhancedScreenshotQueue
      onItemComplete={(item) => {
        console.log('Item completed:', item);
      }}
      onItemError={(item) => {
        console.error('Item failed:', item.metadata?.error);
      }}
    />
  );
}
```

## API Reference

### ScreenshotQueueManager

#### Constructor Options

```typescript
interface QueueManagerConfig {
  maxConcurrent: number;    // Maximum concurrent processing (default: 3)
  autoProcess: boolean;      // Auto-start processing (default: true)
  retryAttempts: number;     // Number of retry attempts (default: 3)
  retryDelay: number;        // Delay between retries in ms (default: 1000)
}
```

#### Methods

- `addScreenshot(path: string, preview: string): Promise<string>` - Add screenshot to queue
- `removeScreenshot(id: string): boolean` - Remove screenshot from queue
- `processNext(): Promise<void>` - Process next item in queue
- `clearQueue(): void` - Clear entire queue
- `getQueue(): ScreenshotItem[]` - Get current queue
- `getProcessingCount(): number` - Get number of currently processing items
- `getQueueStats(): QueueStats` - Get queue statistics
- `updateConfig(config: Partial<QueueManagerConfig>): void` - Update configuration

#### Events

- `itemAdded` - Emitted when item is added to queue
- `itemProcessing` - Emitted when item starts processing
- `itemCompleted` - Emitted when item completes processing
- `itemError` - Emitted when item fails processing
- `itemRemoved` - Emitted when item is removed from queue

### useScreenshotQueue Hook

#### Parameters

```typescript
interface HookConfig {
  maxConcurrent?: number;
  autoProcess?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}
```

#### Returns

```typescript
{
  queue: ScreenshotItem[];
  isProcessing: boolean;
  stats: QueueStats;
  addScreenshot: (path: string, preview: string) => Promise<string>;
  removeScreenshot: (id: string) => boolean;
  clearQueue: () => void;
  processNext: () => Promise<void>;
  getProcessingCount: () => number;
  updateConfig: (config: Partial<HookConfig>) => void;
}
```

### ScreenshotItem Interface

```typescript
interface ScreenshotItem {
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
```

## Configuration

### Default Configuration

```typescript
{
  maxConcurrent: 3,      // Process up to 3 screenshots simultaneously
  autoProcess: true,      // Automatically start processing when items are added
  retryAttempts: 3,       // Retry failed items up to 3 times
  retryDelay: 1000        // Wait 1 second between retries
}
```

### Performance Tuning

For high-volume processing:
```typescript
{
  maxConcurrent: 5,       // Increase concurrent processing
  retryAttempts: 2,       // Reduce retry attempts for faster failure
  retryDelay: 500         // Reduce retry delay
}
```

For reliability-focused processing:
```typescript
{
  maxConcurrent: 2,       // Reduce concurrent processing
  retryAttempts: 5,       // Increase retry attempts
  retryDelay: 2000        // Increase retry delay
}
```

## Error Handling

### Common Error Scenarios

1. **Network Errors**: Automatic retry with exponential backoff
2. **AI Processing Failures**: Retry with different parameters
3. **File System Errors**: Graceful degradation with error reporting
4. **Memory Issues**: Queue size limits and cleanup

### Error Recovery

```typescript
queueManager.on('itemError', (item) => {
  console.error('Processing failed:', item.metadata?.error);
  
  // Implement custom error recovery logic
  if (item.metadata?.error?.includes('network')) {
    // Retry with different network settings
  }
});
```

## Testing

### Unit Tests

Run the test suite:
```bash
npm test src/lib/screenshot-queue-manager.test.ts
```

### Integration Tests

Test with real screenshots:
```typescript
import { ScreenshotQueueManager } from './lib/screenshot-queue-manager';

const queueManager = new ScreenshotQueueManager();

// Test with real screenshot
const id = await queueManager.addScreenshot('/real/screenshot.png', 'preview');
await queueManager.processNext();

// Verify results
const item = queueManager.getQueue().find(q => q.id === id);
console.log('Processing result:', item?.metadata);
```

## Performance Considerations

### Time Complexity

- **Add Screenshot**: O(1) - Direct array push
- **Remove Screenshot**: O(n) - Array search and splice
- **Process Next**: O(n) - Finding next pending item
- **Queue Operations**: O(1) - Simple array operations

### Space Complexity

- **Queue Storage**: O(n) - Where n is number of screenshots
- **Processing Set**: O(k) - Where k is max concurrent processes
- **Event Listeners**: O(1) - Fixed number of listeners

### Memory Management

- Automatic cleanup of completed items
- Configurable queue size limits
- Garbage collection of failed items after retry attempts

## Best Practices

1. **Monitor Queue Size**: Implement alerts for large queue sizes
2. **Handle Errors Gracefully**: Always implement error event handlers
3. **Use Appropriate Configurations**: Adjust based on system resources
4. **Implement Logging**: Track processing metrics and errors
5. **Test Edge Cases**: Handle empty queues, network failures, etc.

## Migration from Legacy System

The new system is designed to work alongside the existing screenshot queue. To migrate:

1. **Gradual Migration**: Use both systems initially
2. **Feature Flags**: Enable new system for specific users
3. **Data Migration**: Transfer existing queue data
4. **Testing**: Validate with real-world usage

## Troubleshooting

### Common Issues

1. **Queue Not Processing**: Check `autoProcess` configuration
2. **High Memory Usage**: Reduce `maxConcurrent` or implement cleanup
3. **Network Timeouts**: Increase `retryDelay` and `retryAttempts`
4. **UI Not Updating**: Verify event listeners are properly connected

### Debug Mode

Enable debug logging:
```typescript
const queueManager = new ScreenshotQueueManager({
  debug: true  // Enable debug logging
});
```

## Contributing

When contributing to the queue management system:

1. **Add Tests**: Include unit tests for new features
2. **Update Documentation**: Keep README and comments current
3. **Follow Patterns**: Maintain consistent API design
4. **Performance**: Consider impact on processing performance
5. **Backward Compatibility**: Ensure existing integrations continue working

## License

This system is part of the Interview Coder project and follows the same license terms. 