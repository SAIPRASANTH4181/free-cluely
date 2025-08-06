import React, { useState } from 'react';
import { useScreenshotQueue } from '../../hooks/useScreenshotQueue';
import { ScreenshotItem } from '../../types/screenshot-queue';
import { Trash2, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface EnhancedScreenshotQueueProps {
  onItemComplete?: (item: ScreenshotItem) => void;
  onItemError?: (item: ScreenshotItem) => void;
}

const StatusIcon: React.FC<{ status: ScreenshotItem['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'processing':
      return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const StatusBadge: React.FC<{ status: ScreenshotItem['status'] }> = ({ status }) => {
  const getStatusColor = (status: ScreenshotItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const EnhancedScreenshotQueue: React.FC<EnhancedScreenshotQueueProps> = ({
  onItemComplete,
  onItemError
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const {
    queue,
    isProcessing,
    stats,
    addScreenshot,
    removeScreenshot,
    clearQueue,
    processNext,
    updateConfig
  } = useScreenshotQueue({
    maxConcurrent: 3,
    autoProcess: !isPaused,
    retryAttempts: 3,
    retryDelay: 1000
  });

  const handleTakeScreenshot = async () => {
    try {
      // Simulate taking a screenshot
      const mockPath = `/screenshot_${Date.now()}.png`;
      const mockPreview = `data:image/png;base64,mock_preview_${Date.now()}`;
      
      await addScreenshot(mockPath, mockPreview);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  };

  const handleRemoveScreenshot = (id: string) => {
    removeScreenshot(id);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    updateConfig({ autoProcess: !isPaused });
  };

  const handleProcessNext = () => {
    processNext();
  };

  const handleClearQueue = () => {
    clearQueue();
  };

  return (
    <div className="space-y-4">
      {/* Queue Stats */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Screenshot Queue</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTogglePause}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                isPaused 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={handleProcessNext}
              disabled={!isPaused || stats.pending === 0}
              className="px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearQueue}
              className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="text-xs text-gray-500">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
        </div>

        {/* Take Screenshot Button */}
        <button
          onClick={handleTakeScreenshot}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Take Screenshot
        </button>
      </div>

      {/* Queue Items */}
      <div className="space-y-2">
        {queue.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No screenshots in queue</p>
            <p className="text-sm">Take a screenshot to get started</p>
          </div>
        ) : (
          queue.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <StatusIcon status={item.status} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        Screenshot {item.id.slice(-8)}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                    {item.metadata?.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {item.metadata.error}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveScreenshot(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Preview Image */}
              <div className="mt-3">
                <img
                  src={item.preview}
                  alt="Screenshot preview"
                  className="w-full h-32 object-cover rounded-md border border-gray-200"
                />
              </div>

              {/* Metadata Display */}
              {item.metadata && (item.status === 'completed' || item.status === 'error') && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Results</h4>
                  {item.metadata.problemStatement && (
                    <div className="text-xs text-gray-600 mb-2">
                      <strong>Problem:</strong> {item.metadata.problemStatement}
                    </div>
                  )}
                  {item.metadata.solution && (
                    <div className="text-xs text-gray-600">
                      <strong>Solution:</strong> {item.metadata.solution.substring(0, 100)}...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 