import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  FlipHorizontal,
  Hand,
  Smile,
  Layers,
  Sparkles,
  Tag,
  Package,
  Mic,
} from 'lucide-react';
import { CameraDeviceInfo } from '../hooks/useCamera';
import { FaceRenderMode } from '../utils/drawing';
import { DetectorInfo } from '../hooks/useMediaPipe';
import { PerformanceBadge } from './PerformanceBadge';

interface FloatingPillProps {
  devices: CameraDeviceInfo[];
  activeDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  mirrored: boolean;
  onToggleMirror: () => void;
  enableHands: boolean;
  onToggleHands: () => void;
  enableGestureRecognizer: boolean;
  onToggleGestureRecognizer: () => void;
  enableFace: boolean;
  onToggleFace: () => void;
  faceMode: FaceRenderMode;
  onToggleFaceMode: (mode: FaceRenderMode) => void;
  showOrganLabels: boolean;
  onToggleOrganLabels: () => void;
  enableObjectDetection: boolean;
  onToggleObjectDetection: () => void;
  detectorEngine: 'yolo-world' | 'yolo11' | 'mediapipe';
  onToggleDetectorEngine: () => void;
  detectorInfo?: DetectorInfo;
  objectSensitivity: 'high' | 'medium' | 'low';
  onChangeObjectSensitivity: (mode: 'high' | 'medium' | 'low') => void;
  enableTranscriber: boolean;
  onToggleTranscriber: () => void;
  fps: number;
  latency: number;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({
  devices,
  activeDeviceId,
  onSelectDevice,
  mirrored,
  onToggleMirror,
  enableHands,
  onToggleHands,
  enableGestureRecognizer,
  onToggleGestureRecognizer,
  enableFace,
  onToggleFace,
  faceMode,
  onToggleFaceMode,
  showOrganLabels,
  onToggleOrganLabels,
  enableObjectDetection,
  onToggleObjectDetection,
  detectorEngine,
  onToggleDetectorEngine,
  detectorInfo,
  objectSensitivity,
  onChangeObjectSensitivity,
  enableTranscriber,
  onToggleTranscriber,
  fps,
  latency,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const isHoveredRef = useRef(false);

  const resetTimer = () => {
    setIsVisible(true);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    if (!isHoveredRef.current) {
      timeoutRef.current = window.setTimeout(() => {
        if (!isHoveredRef.current) {
          setIsVisible(false);
        }
      }, 2500);
    }
  };

  useEffect(() => {
    const handleActivity = () => {
      resetTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Initial timeout
    timeoutRef.current = window.setTimeout(() => {
      if (!isHoveredRef.current) {
        setIsVisible(false);
      }
    }, 3000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      onMouseEnter={() => {
        isHoveredRef.current = true;
        setIsVisible(true);
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
        resetTimer();
      }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-2xl text-slate-200">
        {/* Camera Selector */}
        {devices.length > 0 && (
          <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-slate-700/60">
            <Camera className="w-4 h-4 text-sky-400 shrink-0" />
            <select
              value={activeDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-medium cursor-pointer outline-none max-w-[120px] truncate"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mirror Mode Toggle */}
        <button
          onClick={onToggleMirror}
          title="镜像翻转画面"
          className={`p-2 rounded-full transition-colors ${
            mirrored
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>

        {/* Hand Landmark Toggle */}
        <button
          onClick={onToggleHands}
          title={enableHands ? '关闭手势骨骼' : '开启手势骨骼'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            enableHands
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>手势骨骼</span>
        </button>

        {/* Gesture Recognition Toggle */}
        <button
          onClick={onToggleGestureRecognizer}
          title={enableGestureRecognizer ? '关闭手势识别' : '开启手势识别'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            enableGestureRecognizer
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>手势识别</span>
        </button>

        {/* Face Landmark Toggle */}
        <button
          onClick={onToggleFace}
          title={enableFace ? '关闭面部识别' : '开启面部识别'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            enableFace
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Smile className="w-3.5 h-3.5" />
          <span>面部识别</span>
        </button>

        {/* Face Mode Switcher (Visible when Face is enabled) */}
        {enableFace && (
          <div className="flex items-center p-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
            <button
              onClick={() => onToggleFaceMode('contour')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                faceMode === 'contour'
                  ? 'bg-purple-600 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>五官轮廓</span>
            </button>
            <button
              onClick={() => onToggleFaceMode('mesh')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                faceMode === 'mesh'
                  ? 'bg-purple-600 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>全网格</span>
            </button>
          </div>
        )}

        {/* Facial Organ Labels Toggle */}
        {enableFace && (
          <button
            onClick={onToggleOrganLabels}
            title={showOrganLabels ? '关闭五官标签' : '开启五官标签'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              showOrganLabels
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm shadow-pink-500/20'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>五官标签</span>
          </button>
        )}

        {/* Non-Human Object Detection Toggle */}
        <button
          onClick={onToggleObjectDetection}
          title={enableObjectDetection ? '关闭物品识别' : '开启物品识别'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            enableObjectDetection
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>物品识别</span>
        </button>

        {/* Detector Engine Switcher (YOLO-World vs MediaPipe) */}
        {enableObjectDetection && (
          <button
            onClick={onToggleDetectorEngine}
            title="点击切换检测引擎：YOLO-World（60类日常随身开放词表）/ MediaPipe（轻量）"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              detectorEngine !== 'mediapipe'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <span>
              {detectorEngine !== 'mediapipe'
                ? detectorInfo?.backend === 'error'
                  ? '⚠️ YOLO-World (异常)'
                  : detectorInfo?.backend === 'loading'
                  ? '⏳ YOLO-World (加载中)'
                  : `🌐 YOLO-World (${detectorInfo?.backend?.toUpperCase() || 'WASM'} · ${detectorInfo?.latency || 0}ms)`
                : `⚡ MediaPipe (${detectorInfo?.latency || 0}ms)`}
            </span>
          </button>
        )}

        {/* Object Sensitivity Mode Switcher (Visible when Object Detection is enabled) */}
        {enableObjectDetection && (
          <div className="flex items-center p-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
            <button
              onClick={() => onChangeObjectSensitivity('high')}
              title="高灵敏模式：0.18 置信度，适合远距离或日常随身小物件"
              className={`px-2 py-0.5 rounded-full transition-all ${
                objectSensitivity === 'high'
                  ? 'bg-amber-600 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              高灵敏
            </button>
            <button
              onClick={() => onChangeObjectSensitivity('medium')}
              title="标准模式：0.25 置信度，平衡灵敏与误报"
              className={`px-2 py-0.5 rounded-full transition-all ${
                objectSensitivity === 'medium'
                  ? 'bg-amber-600 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              标准
            </button>
            <button
              onClick={() => onChangeObjectSensitivity('low')}
              title="严格模式：0.38 置信度，仅识别高确定性特征"
              className={`px-2 py-0.5 rounded-full transition-all ${
                objectSensitivity === 'low'
                  ? 'bg-amber-600 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              严格
            </button>
          </div>
        )}

        {/* Audio Transcriber Toggle */}
        <button
          onClick={onToggleTranscriber}
          title={enableTranscriber ? '关闭语音转录' : '开启语音转录'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            enableTranscriber
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/20'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>语音转录</span>
        </button>

        {/* Performance Metrics */}
        <div className="pl-1 border-l border-slate-700/60">
          <PerformanceBadge fps={fps} latency={latency} />
        </div>
      </div>
    </div>
  );
};
