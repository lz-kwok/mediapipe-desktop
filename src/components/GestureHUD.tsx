import React from 'react';
import { DetectedGesture } from '../hooks/useMediaPipe';
import { Sparkles, Clock, History } from 'lucide-react';

interface GestureHUDProps {
  currentGesture: DetectedGesture | null;
  gestureHistory: DetectedGesture[];
  enabled: boolean;
}

interface GestureMeta {
  emoji: string;
  nameCn: string;
  nameEn: string;
}

export function getGestureMeta(categoryName: string): GestureMeta {
  switch (categoryName) {
    case 'Thumb_Up':
      return { emoji: '👍', nameCn: '点赞', nameEn: 'Thumb Up' };
    case 'Thumb_Down':
      return { emoji: '👎', nameCn: '点踩', nameEn: 'Thumb Down' };
    case 'Victory':
      return { emoji: '✌️', nameCn: '胜利 / 剪刀手', nameEn: 'Victory' };
    case 'Closed_Fist':
      return { emoji: '✊', nameCn: '握拳', nameEn: 'Closed Fist' };
    case 'Open_Palm':
      return { emoji: '✋', nameCn: '张开手掌', nameEn: 'Open Palm' };
    case 'Pointing_Up':
      return { emoji: '👆', nameCn: '食指指天', nameEn: 'Pointing Up' };
    case 'ILoveYou':
      return { emoji: '🤟', nameCn: '我爱你', nameEn: 'I Love You' };
    default:
      return { emoji: '🖐️', nameCn: categoryName, nameEn: categoryName };
  }
}

export const GestureHUD: React.FC<GestureHUDProps> = ({
  currentGesture,
  gestureHistory,
  enabled,
}) => {
  if (!enabled) return null;

  const activeMeta = currentGesture ? getGestureMeta(currentGesture.categoryName) : null;
  const lastGesture = !currentGesture && gestureHistory.length > 0 ? gestureHistory[0] : null;
  const lastMeta = lastGesture ? getGestureMeta(lastGesture.categoryName) : null;

  return (
    <div className="fixed top-5 right-6 z-30 flex flex-col gap-2 pointer-events-none select-none">
      {/* Main Glassmorphism HUD Card */}
      <div className="min-w-[260px] max-w-[320px] rounded-2xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 p-3.5 shadow-2xl text-slate-200 transition-all duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>手势识别 / GESTURE HUD</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                currentGesture
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400/80'
              }`}
            />
            <span className="text-[10px] text-slate-400 font-mono">
              {currentGesture ? 'LIVE' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Real-time Recognized Gesture Display */}
        {currentGesture && activeMeta ? (
          <div className="flex items-center gap-3 py-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-3xl shadow-lg shadow-cyan-500/10 shrink-0">
              {activeMeta.emoji}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-base font-bold text-white tracking-wide truncate">
                  {activeMeta.nameCn}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  {Math.round(currentGesture.score * 100)}%
                </span>
              </div>

              <div className="text-xs text-slate-400 truncate font-medium">
                {activeMeta.nameEn}
                <span className="mx-1 text-slate-600">·</span>
                <span className="text-slate-300">
                  {currentGesture.handedness === 'Left' ? '左手' : currentGesture.handedness === 'Right' ? '右手' : ''}
                </span>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-emerald-400">
                <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>时间: {currentGesture.timestamp}</span>
              </div>
            </div>
          </div>
        ) : lastGesture && lastMeta ? (
          /* Idle state with last recognized gesture retained */
          <div className="flex items-center gap-3 py-1 opacity-75">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-2xl shrink-0">
              {lastMeta.emoji}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">上次识别:</span>
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {lastMeta.nameCn} ({lastMeta.nameEn})
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-slate-400">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span>时间: {lastGesture.timestamp}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Standby state before any gestures detected */
          <div className="py-2 text-center">
            <div className="text-xs text-slate-400">等待手势进入镜头...</div>
            <div className="mt-1 text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <span>支持</span>
              <span className="text-slate-300 font-sans">👍 ✌️ ✋ ✊ 👆 🤟 👎</span>
            </div>
          </div>
        )}

        {/* History Stream (Last 2 detections) */}
        {gestureHistory.length > 1 && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <History className="w-3 h-3" />
              <span>近期识别记录</span>
            </div>
            {gestureHistory.slice(1, 3).map((item, idx) => {
              const meta = getGestureMeta(item.categoryName);
              return (
                <div
                  key={`${item.rawTimestamp}_${idx}`}
                  className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 px-2 py-0.5 rounded"
                >
                  <span className="flex items-center gap-1 text-slate-300">
                    <span>{meta.emoji}</span>
                    <span>{meta.nameCn}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
