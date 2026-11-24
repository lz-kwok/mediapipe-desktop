import React, { useState } from 'react';
import {
  Camera,
  FlipHorizontal,
  Hand,
  Smile,
  Sparkles,
  Tag,
  Package,
  Mic,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
} from 'lucide-react';
import { CameraDeviceInfo } from '../hooks/useCamera';
import { FaceRenderMode } from '../utils/drawing';
import { DetectorInfo } from '../hooks/useMediaPipe';
import { PerformanceBadge } from './PerformanceBadge';

export interface RightControlPanelProps {
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

/**
 * Minimalist iOS-style Toggle Switch
 */
const Switch: React.FC<{
  checked: boolean;
  onChange: () => void;
  activeColor?: string;
}> = ({ checked, onChange, activeColor = 'bg-emerald-500' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? `${activeColor} shadow-[0_0_12px_rgba(16,185,129,0.35)]` : 'bg-slate-800 border-slate-700/60'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        } mt-0.5`}
      />
    </button>
  );
};

export const RightControlPanel: React.FC<RightControlPanelProps> = ({
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="w-[320px] select-none pointer-events-auto transition-all duration-300">
      {/* Main Frosted Glass Card */}
      <div className="rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-slate-200 overflow-hidden">
        {/* Panel Header */}
        <div
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-white">控制中心</span>
              <span className="text-[10px] font-mono text-slate-400">VISION CONTROLS</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PerformanceBadge fps={fps} latency={latency} />
            <button
              title={isCollapsed ? '展开面板' : '折叠面板'}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-3.5 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
            {/* 1. Camera & Viewport Bar */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950/60 border border-white/5">
              <Camera className="w-4 h-4 text-sky-400 shrink-0 ml-1.5" />
              <div className="flex-1 min-w-0">
                <select
                  value={activeDeviceId}
                  onChange={(e) => onSelectDevice(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-300 font-medium cursor-pointer outline-none truncate pr-1"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mirror Toggle */}
              <button
                onClick={onToggleMirror}
                title={mirrored ? '关闭画面镜像' : '开启画面镜像'}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  mirrored
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>镜像</span>
              </button>
            </div>

            {/* Section: Perception Toggles */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                AI 视觉与交互感知
              </div>

              {/* Hand Landmarks */}
              <div
                onClick={onToggleHands}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-white/[0.04] hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${enableHands ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800/60 text-slate-500'}`}>
                    <Hand className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-200">手势骨骼</span>
                    <span className="text-[10px] text-slate-400">21 节点 3D 手指连线</span>
                  </div>
                </div>
                <Switch checked={enableHands} onChange={onToggleHands} activeColor="bg-cyan-500" />
              </div>

              {/* Gesture HUD */}
              <div
                onClick={onToggleGestureRecognizer}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-white/[0.04] hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${enableGestureRecognizer ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 text-slate-500'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-200">手势识别 HUD</span>
                    <span className="text-[10px] text-slate-400">识别剪刀手/点赞/握拳等</span>
                  </div>
                </div>
                <Switch checked={enableGestureRecognizer} onChange={onToggleGestureRecognizer} activeColor="bg-emerald-500" />
              </div>

              {/* Face Landmarker */}
              <div className="rounded-xl bg-slate-950/40 border border-white/[0.04] p-2 space-y-2">
                <div
                  onClick={onToggleFace}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${enableFace ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800/60 text-slate-500'}`}>
                      <Smile className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">面部 3D 网格</span>
                      <span className="text-[10px] text-slate-400">468 点五官精细追踪</span>
                    </div>
                  </div>
                  <Switch checked={enableFace} onChange={onToggleFace} activeColor="bg-purple-500" />
                </div>

                {/* Sub controls for Face */}
                {enableFace && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] text-xs">
                    {/* Mode segmented pill */}
                    <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFaceMode('contour');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                          faceMode === 'contour'
                            ? 'bg-purple-600 text-white font-medium shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        轮廓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFaceMode('mesh');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                          faceMode === 'mesh'
                            ? 'bg-purple-600 text-white font-medium shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        网格
                      </button>
                    </div>

                    {/* Organ Labels toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleOrganLabels();
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all ${
                        showOrganLabels
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      <span>五官气泡</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Object Detection (YOLO-World / MediaPipe) */}
              <div className="rounded-xl bg-slate-950/40 border border-white/[0.04] p-2 space-y-2.5">
                <div
                  onClick={onToggleObjectDetection}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${enableObjectDetection ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800/60 text-slate-500'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">日常物品识别</span>
                      <span className="text-[10px] text-slate-400">
                        {detectorEngine === 'yolo-world' ? 'YOLO-World 60类开放词表' : 'MediaPipe 基础检测'}
                      </span>
                    </div>
                  </div>
                  <Switch checked={enableObjectDetection} onChange={onToggleObjectDetection} activeColor="bg-amber-500" />
                </div>

                {/* Sub controls for Object Detection */}
                {enableObjectDetection && (
                  <div className="space-y-2 pt-1 border-t border-white/[0.04]">
                    {/* Model Engine Selector Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDetectorEngine();
                      }}
                      title="点击切换检测引擎：YOLO-World（60类日常随身词表）/ MediaPipe（轻量）"
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/60 hover:border-emerald-500/40 text-xs transition-all group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-slate-200 group-hover:text-white">
                          {detectorEngine === 'yolo-world' ? 'YOLO-World (开放词表)' : 'MediaPipe (基础80类)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">
                          {detectorInfo?.backend?.toUpperCase() || 'WASM'} · {detectorInfo?.latency || 0}ms
                        </span>
                      </div>
                    </button>

                    {/* Sensitivity Segmented Selector */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        灵敏度:
                      </span>
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeObjectSensitivity('high');
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${
                            objectSensitivity === 'high'
                              ? 'bg-amber-600 text-white font-medium shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          高
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeObjectSensitivity('medium');
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${
                            objectSensitivity === 'medium'
                              ? 'bg-amber-600 text-white font-medium shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          中
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeObjectSensitivity('low');
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${
                            objectSensitivity === 'low'
                              ? 'bg-amber-600 text-white font-medium shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          低
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Transcriber */}
              <div
                onClick={onToggleTranscriber}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-white/[0.04] hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${enableTranscriber ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800/60 text-slate-500'}`}>
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-200">语音转写看板</span>
                    <span className="text-[10px] text-slate-400">屏幕左侧实时字幕流</span>
                  </div>
                </div>
                <Switch checked={enableTranscriber} onChange={onToggleTranscriber} activeColor="bg-sky-500" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
