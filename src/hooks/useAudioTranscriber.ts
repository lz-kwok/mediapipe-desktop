import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, AudioTranscriber } from '@mediapipe/tasks-audio';

export interface TranscriptItem {
  id: string;
  text: string;
  timestamp: string;
  rawTime: number;
}

export interface UseAudioTranscriberResult {
  isListening: boolean;
  isModelLoaded: boolean;
  liveText: string;
  history: TranscriptItem[];
  volume: number; // 0.0 - 1.0 for audio wave visualizer
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  clearHistory: () => void;
}

export function useAudioTranscriber(autoStart: boolean = false): UseAudioTranscriberResult {
  const [isListening, setIsListening] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [history, setHistory] = useState<TranscriptItem[]>([]);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriberRef = useRef<AudioTranscriber | null>(null);
  const isListeningRef = useRef(false);

  // 1. Initialize MediaPipe Audio Tasks WASM runtime
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipeAudio() {
      try {
        const audioFileset = await FilesetResolver.forAudioTasks('/models/wasm');
        if (isCancelled) return;

        // Try initializing AudioTranscriber with local model if available
        try {
          const transcriber = await AudioTranscriber.createFromOptions(audioFileset, {
            baseOptions: {
              modelAssetPath: '/models/parakeet_tdt_0.6b_v3_5s_i8_stateful.litertlm',
            },
            sampleRateHz: 16000,
            enableInterimResults: true,
          });
          if (!isCancelled) {
            transcriberRef.current = transcriber;
          }
        } catch {
          // If 600MB model is not bundled locally, fallback gracefully to system SpeechRecognition
          console.info('[MediaPipe] 离线 litertlm 大模型未就绪，启用系统级流式语音转录引擎');
        }

        setIsModelLoaded(true);
      } catch (err: unknown) {
        console.warn('MediaPipe Audio 初始化警告:', err);
        // Still allow Web Speech recognition fallback
        setIsModelLoaded(true);
      }
    }

    initMediaPipeAudio();

    return () => {
      isCancelled = true;
      if (transcriberRef.current) {
        try {
          transcriberRef.current.close();
        } catch {}
        transcriberRef.current = null;
      }
    };
  }, []);

  // Format current timestamp HH:mm:ss
  const getFormattedTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  // 2. Start Microphone Audio Capture and Speech Recognition
  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      // Setup AudioContext & Analyser for real-time waveform visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Volume tracking loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (dataArray.length * 255);
        setVolume(Math.min(1, avg * 2.2));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      isListeningRef.current = true;
      setIsListening(true);
      animationFrameRef.current = requestAnimationFrame(updateVolume);

      // Initialize SpeechRecognition Engine
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN'; // Default Chinese with auto fallback

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              const trimmed = transcript.trim();
              if (trimmed) {
                setHistory((prev) => [
                  {
                    id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    text: trimmed,
                    timestamp: getFormattedTime(),
                    rawTime: Date.now(),
                  },
                  ...prev.slice(0, 49), // Keep latest 50 sentences
                ]);
              }
              setLiveText('');
            } else {
              currentInterim += transcript;
            }
          }
          if (currentInterim) {
            setLiveText(currentInterim);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.warn('语音转录识别事件:', event.error);
          }
        };

        recognition.onend = () => {
          // Restart if still listening
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setError('当前环境不支持语音识别，请允许麦克风权限');
      }
    } catch (err: unknown) {
      console.error('麦克风开启失败:', err);
      const e = err as Error;
      setError(e.message || '麦克风权限被拒绝或设备不存在');
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, []);

  // 3. Stop Listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setLiveText('');
    setVolume(0);

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLiveText('');
  }, []);

  useEffect(() => {
    if (autoStart) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, [autoStart, startListening, stopListening]);

  return {
    isListening,
    isModelLoaded,
    liveText,
    history,
    volume,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearHistory,
  };
}
