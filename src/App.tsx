import { useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { useMediaPipe, DetectorEngine } from './hooks/useMediaPipe';
import { useAudioTranscriber } from './hooks/useAudioTranscriber';
import { CameraView } from './components/CameraView';
import { RightControlPanel } from './components/RightControlPanel';
import { GestureHUD } from './components/GestureHUD';
import { TranscriberPanel } from './components/TranscriberPanel';
import { FaceRenderMode } from './utils/drawing';
import { Sparkles } from 'lucide-react';

export type ObjectSensitivity = 'high' | 'medium' | 'low';

const SENSITIVITY_THRESHOLDS: Record<ObjectSensitivity, number> = {
  high: 0.22,
  medium: 0.28,
  low: 0.38,
};

export default function App() {
  const [mirrored, setMirrored] = useState(true);
  const [enableHands, setEnableHands] = useState(true);
  const [enableGestureRecognizer, setEnableGestureRecognizer] = useState(true);
  const [enableFace, setEnableFace] = useState(true);
  const [faceMode, setFaceMode] = useState<FaceRenderMode>('contour');
  const [showOrganLabels, setShowOrganLabels] = useState(true);
  const [enableObjectDetection, setEnableObjectDetection] = useState(true);
  const [detectorEngine, setDetectorEngine] = useState<DetectorEngine>('yolo-world');
  const [objectSensitivity, setObjectSensitivity] = useState<ObjectSensitivity>('medium');
  const [enableTranscriber, setEnableTranscriber] = useState(true);

  const {
    isListening: isAudioListening,
    liveText: audioLiveText,
    history: audioHistory,
    volume: audioVolume,
    error: audioError,
    toggleListening: toggleAudioListening,
    clearHistory: clearAudioHistory,
  } = useAudioTranscriber(false);

  const {
    videoRef,
    canvasRef,
    devices,
    activeDeviceId,
    isStreaming,
    error: cameraError,
    switchCamera,
    restartCamera,
  } = useCamera();

  const {
    isModelLoading,
    fps,
    latency,
    error: modelError,
    detectorInfo,
    currentGesture,
    gestureHistory,
    retryInit,
  } = useMediaPipe(videoRef, canvasRef, {
    enableHands,
    enableFace,
    faceMode,
    showOrganLabels,
    enableObjectDetection,
    detectorEngine,
    objectConfidenceThreshold: SENSITIVITY_THRESHOLDS[objectSensitivity],
    enableGestureRecognizer,
    mirrored,
  });

  const handleGlobalRetry = () => {
    if (cameraError) {
      restartCamera();
    }
    if (modelError) {
      retryInit();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Left Title Bar Badge */}
      <div className="absolute top-5 left-6 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs text-slate-300 pointer-events-none select-none shadow-lg">
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        <span className="font-semibold text-white tracking-wide">MediaPipe Desktop Vision</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Wasm + GPU + Objects
        </span>
      </div>

      {/* Camera and Landmark/Object Rendering Viewport */}
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        isStreaming={isStreaming && !isModelLoading}
        error={cameraError || modelError}
        mirrored={mirrored}
        onRetry={handleGlobalRetry}
      />

      {/* Left Screen Audio Transcriber HUD Panel */}
      <TranscriberPanel
        isListening={isAudioListening}
        liveText={audioLiveText}
        history={audioHistory}
        volume={audioVolume}
        error={audioError}
        enabled={enableTranscriber}
        onToggleListening={toggleAudioListening}
        onClearHistory={clearAudioHistory}
      />

      {/* Right Screen: Unified Column with Gesture Recognition HUD & Frosted Glass Control Dock */}
      <div className="fixed top-5 right-6 z-30 flex flex-col gap-3 pointer-events-none select-none max-h-[calc(100vh-2.5rem)]">
        {/* Upper Right Gesture Recognition HUD (Time, Type & History) */}
        <GestureHUD
          currentGesture={currentGesture}
          gestureHistory={gestureHistory}
          enabled={enableGestureRecognizer && isStreaming && !isModelLoading}
        />

        {/* Right Side Control Dock (Unified Frosted Glass Panel under Gesture HUD) */}
        {isStreaming && !isModelLoading && (
          <RightControlPanel
            devices={devices}
            activeDeviceId={activeDeviceId}
            onSelectDevice={switchCamera}
            mirrored={mirrored}
            onToggleMirror={() => setMirrored((prev) => !prev)}
            enableHands={enableHands}
            onToggleHands={() => setEnableHands((prev) => !prev)}
            enableGestureRecognizer={enableGestureRecognizer}
            onToggleGestureRecognizer={() => setEnableGestureRecognizer((prev) => !prev)}
            enableFace={enableFace}
            onToggleFace={() => setEnableFace((prev) => !prev)}
            faceMode={faceMode}
            onToggleFaceMode={(mode) => setFaceMode(mode)}
            showOrganLabels={showOrganLabels}
            onToggleOrganLabels={() => setShowOrganLabels((prev) => !prev)}
            enableObjectDetection={enableObjectDetection}
            onToggleObjectDetection={() => setEnableObjectDetection((prev) => !prev)}
            detectorEngine={detectorEngine}
            onToggleDetectorEngine={() => setDetectorEngine((prev) => (prev === 'yolo-world' ? 'mediapipe' : 'yolo-world'))}
            detectorInfo={detectorInfo}
            objectSensitivity={objectSensitivity}
            onChangeObjectSensitivity={(mode) => setObjectSensitivity(mode)}
            enableTranscriber={enableTranscriber}
            onToggleTranscriber={() => setEnableTranscriber((prev) => !prev)}
            fps={fps}
            latency={latency}
          />
        )}
      </div>
    </div>
  );
}
