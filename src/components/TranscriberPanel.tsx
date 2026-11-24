import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Trash2, Copy, Check, Radio } from 'lucide-react';
import { TranscriptItem } from '../hooks/useAudioTranscriber';

interface TranscriberPanelProps {
  isListening: boolean;
  liveText: string;
  history: TranscriptItem[];
  volume: number;
  error: string | null;
  enabled: boolean;
  onToggleListening: () => void;
  onClearHistory: () => void;
}

export const TranscriberPanel: React.FC<TranscriberPanelProps> = ({
  isListening,
  liveText,
  history,
  volume,
  error,
  enabled,
  onToggleListening,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!enabled) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  // Equalizer bar heights calculated from real-time volume
  const getBarHeight = (multiplier: number) => {
    if (!isListening) return 4;
    return Math.max(4, Math.min(18, Math.round(volume * 22 * multiplier)));
  };

  return (
    <div className="fixed top-20 left-6 z-30 flex flex-col w-[320px] max-h-[calc(100vh-170px)] pointer-events-auto select-none transition-all duration-300">
      <div className="flex flex-col h-full rounded-2xl bg-slate-900/85 backdrop-blur-md border border-sky-500/30 p-3.5 shadow-2xl text-slate-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>实时语音转录 / TRANSCRIBER</span>
          </div>

          {/* Recording & Audio Wave Indicator */}
          <div className="flex items-center gap-2">
            {isListening && (
              <div className="flex items-end gap-0.5 h-4 px-1">
                <span
                  className="w-1 bg-sky-400 rounded-full transition-all duration-75"
                  style={{ height: `${getBarHeight(0.7)}px` }}
                />
                <span
                  className="w-1 bg-cyan-300 rounded-full transition-all duration-75"
                  style={{ height: `${getBarHeight(1.2)}px` }}
                />
                <span
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${getBarHeight(0.9)}px` }}
                />
                <span
                  className="w-1 bg-sky-400 rounded-full transition-all duration-75"
                  style={{ height: `${getBarHeight(0.5)}px` }}
                />
              </div>
            )}

            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isListening ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {isListening ? 'REC' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Audio Utterance (Real-time Streaming Text) */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs min-h-[54px] flex flex-col justify-center">
          {liveText ? (
            <div className="text-white font-medium break-words leading-relaxed">
              <span>{liveText}</span>
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-sky-400 animate-pulse align-middle" />
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
              <span>正在聆听声音，请对着麦克风说话...</span>
            </div>
          ) : (
            <div className="text-slate-500 text-center py-1">
              麦克风已暂停，点击下方按钮开启语音识别
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
            {error}
          </div>
        )}

        {/* Transcribed History Section */}
        <div className="flex items-center justify-between mt-2.5 mb-1 px-0.5">
          <span className="text-[11px] font-medium text-slate-400">已识别文本 ({history.length})</span>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              title="清空转录记录"
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>清空</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px] scrollbar-thin scrollbar-thumb-slate-700">
          {history.length > 0 ? (
            history.map((item) => (
              <div
                key={item.id}
                className="group relative p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-sky-500/30 transition-all text-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                  <span>{item.timestamp}</span>
                  <button
                    onClick={() => handleCopy(item.id, item.text)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    title="复制文本"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="text-slate-200 break-words leading-relaxed select-text font-normal">
                  {item.text}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-500 text-xs">
              暂无已确认转录文本
            </div>
          )}
        </div>

        {/* Bottom Toolbar Controls */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isListening
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm shadow-red-500/20 hover:bg-red-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/20 hover:bg-sky-500/30'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>暂停麦克风</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>开启麦克风</span>
              </>
            )}
          </button>

          <span className="text-[10px] text-slate-500 font-mono">
            16kHz · zh-CN
          </span>
        </div>
      </div>
    </div>
  );
};
