import React from 'react';
import { CameraOff, RefreshCw } from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isStreaming: boolean;
  error: string | null;
  mirrored: boolean;
  onRetry: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  canvasRef,
  isStreaming,
  error,
  mirrored,
  onRetry,
}) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden select-none">
      {/* Hidden Video Feed for MediaPipe processing */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute opacity-0 pointer-events-none -z-10"
      />

      {/* Main Canvas Rendering Layer */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain transition-transform duration-200 ${
          mirrored ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
            <CameraOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">摄像头启动异常</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-500/20 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            重试连接
          </button>
        </div>
      )}

      {/* Initializing State */}
      {!isStreaming && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-center">
          <div className="w-12 h-12 border-4 border-sky-400/20 border-t-sky-400 rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-300 font-medium">正在开启摄像头并初始化硬件加速...</p>
        </div>
      )}
    </div>
  );
};
