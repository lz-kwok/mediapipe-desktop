import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  ObjectDetector,
  GestureRecognizer,
  DrawingUtils,
  HandLandmarkerResult,
  FaceLandmarkerResult,
  ObjectDetectorResult,
} from '@mediapipe/tasks-vision';
import {
  drawHand,
  drawFace,
  drawOrganLabels,
  drawDetectedObjects,
  updateTrackedObjects,
  translateObjectName,
  TrackedObject,
  FaceRenderMode,
} from '../utils/drawing';
import { YoloDetector } from '../utils/yoloDetector';

export interface DetectedGesture {
  categoryName: string;
  score: number;
  handedness: string;
  timestamp: string;
  rawTimestamp: number;
}

export type DetectorEngine = 'yolo11' | 'mediapipe';

export interface DetectorInfo {
  engine: DetectorEngine;
  backend: 'webgpu' | 'wasm' | 'mediapipe' | 'loading' | 'error';
  latency: number;
  detectedCount: number;
  detectedLabels: string[];
}

export interface UseMediaPipeOptions {
  enableHands: boolean;
  enableFace: boolean;
  faceMode: FaceRenderMode;
  showOrganLabels?: boolean;
  enableObjectDetection?: boolean;
  objectConfidenceThreshold?: number;
  detectorEngine?: DetectorEngine;
  enableGestureRecognizer?: boolean;
  mirrored?: boolean;
}

export interface UseMediaPipeResult {
  isModelLoading: boolean;
  fps: number;
  latency: number;
  error: string | null;
  detectorInfo: DetectorInfo;
  currentGesture: DetectedGesture | null;
  gestureHistory: DetectedGesture[];
  retryInit: () => void;
}

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options: UseMediaPipeOptions
): UseMediaPipeResult {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<DetectedGesture | null>(null);
  const [gestureHistory, setGestureHistory] = useState<DetectedGesture[]>([]);
  const [detectorInfo, setDetectorInfo] = useState<DetectorInfo>({
    engine: options.detectorEngine || 'yolo11',
    backend: 'loading',
    latency: 0,
    detectedCount: 0,
    detectedLabels: [],
  });

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const yoloDetectorRef = useRef<YoloDetector | null>(null);
  const isYoloInferencingRef = useRef(false);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const requestAnimationIdRef = useRef<number | null>(null);

  const currentGestureRef = useRef<DetectedGesture | null>(null);
  const lastGestureEmitTimeRef = useRef(0);
  const lastGestureDetectTimeRef = useRef(0);

  // Cached detection results to eliminate 30Hz frame-rate mismatch strobing
  const lastHandResultsRef = useRef<HandLandmarkerResult | null>(null);
  const lastFaceResultsRef = useRef<FaceLandmarkerResult | null>(null);
  const lastObjectResultsRef = useRef<ObjectDetectorResult | null>(null);
  const trackedObjectsRef = useRef<TrackedObject[]>([]);

  // Performance tracking
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const latencyHistoryRef = useRef<number[]>([]);
  const lastVideoTimeRef = useRef(-1);

  // Options ref to allow instant switching in the animation loop without restarting
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize MediaPipe with GPU and CPU fallback
  const initVision = useCallback(async () => {
    setIsModelLoading(true);
    setError(null);

    try {
      const vision = await FilesetResolver.forVisionTasks('/models/wasm');

      // Helper to initialize model with GPU and automatic CPU fallback
      async function createWithFallback<T>(
        loader: (delegate: 'GPU' | 'CPU') => Promise<T>,
        name: string
      ): Promise<T> {
        try {
          return await loader('GPU');
        } catch (gpuErr) {
          console.warn(`[MediaPipe] ${name} GPU 硬件加速不可用，自动降级为 CPU 运算:`, gpuErr);
          return await loader('CPU');
        }
      }

      // 1. Load Hand Landmarker
      const handLandmarker = await createWithFallback(
        (delegate) =>
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/hand_landmarker.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }),
        'HandLandmarker'
      );
      handLandmarkerRef.current = handLandmarker;

      // 2. Load Face Landmarker
      const faceLandmarker = await createWithFallback(
        (delegate) =>
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/face_landmarker.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          }),
        'FaceLandmarker'
      );
      faceLandmarkerRef.current = faceLandmarker;

      // 3. Load Object Detector
      const objectDetector = await createWithFallback(
        (delegate) =>
          ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/efficientdet_lite0.tflite',
              delegate,
            },
            runningMode: 'VIDEO',
            scoreThreshold: 0.25, // 保持合理的底层硬阈值，防止极低置信度的噪点误报
            maxResults: 16,       // 扩容到16个目标，防止镜头前的人体占据所有候选检测位
          }),
        'ObjectDetector'
      );
      objectDetectorRef.current = objectDetector;

      // 4. Load Gesture Recognizer
      const gestureRecognizer = await createWithFallback(
        (delegate) =>
          GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/gesture_recognizer.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }),
        'GestureRecognizer'
      );
      gestureRecognizerRef.current = gestureRecognizer;

      // 5. Load State-of-the-Art YOLO11 ONNX Detector (Small / Nano)
      try {
        const yolo = new YoloDetector();
        await yolo.init('/models/yolo11s.onnx');
        yoloDetectorRef.current = yolo;
        const activeBk = yolo.getActiveBackend() || 'wasm';
        console.log(`[Detector] YOLO11 目标检测器已就绪 (${activeBk})`);
        setDetectorInfo((prev) => ({
          ...prev,
          backend: activeBk,
        }));
      } catch (yoloErr) {
        console.warn('[Detector] YOLO11 加载失败，降级使用 MediaPipe 检测器:', yoloErr);
        setDetectorInfo((prev) => ({
          ...prev,
          backend: 'error',
        }));
      }

      setIsModelLoading(false);
    } catch (err: unknown) {
      console.error('MediaPipe 初始化异常:', err);
      const e = err as Error;
      setError(`模型加载失败: ${e.message || '请检查模型文件完整性'}`);
      setIsModelLoading(false);
    }
  }, []);

  useEffect(() => {
    initVision();

    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      if (objectDetectorRef.current) {
        objectDetectorRef.current.close();
        objectDetectorRef.current = null;
      }
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
        gestureRecognizerRef.current = null;
      }
      if (yoloDetectorRef.current) {
        yoloDetectorRef.current.close();
        yoloDetectorRef.current = null;
      }
    };
  }, [initVision]);

  // Main Detection and Render Loop
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      video &&
      canvas &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      // Sync canvas dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawingUtilsRef.current = null; // Recreate drawing utils with new context
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (!drawingUtilsRef.current) {
          drawingUtilsRef.current = new DrawingUtils(ctx);
        }
        const drawingUtils = drawingUtilsRef.current;

        // 1. Draw camera video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const now = performance.now();
        const currentOptions = optionsRef.current;

        // 2. Perform ML Inference when video advances to a new frame
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const startInferTime = performance.now();

          // Hand Inference
          if (currentOptions.enableHands && handLandmarkerRef.current) {
            try {
              lastHandResultsRef.current = handLandmarkerRef.current.detectForVideo(video, now);
            } catch (inferErr) {
              console.warn('手部追踪帧推理异常:', inferErr);
            }
          } else {
            lastHandResultsRef.current = null;
          }

          // Face Inference
          if (currentOptions.enableFace && faceLandmarkerRef.current) {
            try {
              lastFaceResultsRef.current = faceLandmarkerRef.current.detectForVideo(video, now);
            } catch (inferErr) {
              console.warn('面部追踪帧推理异常:', inferErr);
            }
          } else {
            lastFaceResultsRef.current = null;
          }

          // Object Detection Inference (Supports YOLO11 & MediaPipe)
          if (currentOptions.enableObjectDetection) {
            const engine = currentOptions.detectorEngine || 'yolo11';
            const minScore = currentOptions.objectConfidenceThreshold ?? 0.28;
            const objInferTime = performance.now();

            if (engine === 'yolo11') {
              if (yoloDetectorRef.current && yoloDetectorRef.current.isReady()) {
                if (!isYoloInferencingRef.current) {
                  isYoloInferencingRef.current = true;
                  yoloDetectorRef.current
                    .detect(video, minScore, 0.45)
                    .then((detections) => {
                      const updated = updateTrackedObjects(
                        trackedObjectsRef.current,
                        detections,
                        canvas.width,
                        canvas.height,
                        performance.now(),
                        minScore
                      );
                      trackedObjectsRef.current = updated;

                      const backend = yoloDetectorRef.current?.getActiveBackend() || 'wasm';
                      const lat = yoloDetectorRef.current?.getLastLatency() || 0;
                      const labels = updated.map((o) => translateObjectName(o.category));

                      setDetectorInfo({
                        engine: 'yolo11',
                        backend,
                        latency: lat,
                        detectedCount: updated.length,
                        detectedLabels: labels,
                      });
                    })
                    .catch((err) => {
                      console.warn('YOLO11 推理异常:', err);
                    })
                    .finally(() => {
                      isYoloInferencingRef.current = false;
                    });
                }
              } else if (objectDetectorRef.current) {
                // If YOLO11 is not ready, run MediaPipe as temporary fallback with indication
                try {
                  const res = objectDetectorRef.current.detectForVideo(video, objInferTime);
                  lastObjectResultsRef.current = res;
                  if (res && res.detections) {
                    const updated = updateTrackedObjects(
                      trackedObjectsRef.current,
                      res.detections,
                      canvas.width,
                      canvas.height,
                      objInferTime,
                      minScore
                    );
                    trackedObjectsRef.current = updated;
                    setDetectorInfo({
                      engine: 'mediapipe',
                      backend: 'mediapipe',
                      latency: Math.round(performance.now() - objInferTime),
                      detectedCount: updated.length,
                      detectedLabels: updated.map((o) => translateObjectName(o.category)),
                    });
                  }
                } catch (mErr) {
                  console.warn('MediaPipe 回退检测异常:', mErr);
                }
              }
            } else if (objectDetectorRef.current) {
              try {
                const res = objectDetectorRef.current.detectForVideo(video, objInferTime);
                lastObjectResultsRef.current = res;

                if (res && res.detections) {
                  const updated = updateTrackedObjects(
                    trackedObjectsRef.current,
                    res.detections,
                    canvas.width,
                    canvas.height,
                    objInferTime,
                    minScore
                  );
                  trackedObjectsRef.current = updated;
                  setDetectorInfo({
                    engine: 'mediapipe',
                    backend: 'mediapipe',
                    latency: Math.round(performance.now() - objInferTime),
                    detectedCount: updated.length,
                    detectedLabels: updated.map((o) => translateObjectName(o.category)),
                  });
                }
              } catch (inferErr) {
                console.warn('MediaPipe 物体检测帧推理异常:', inferErr);
              }
            }
          } else {
            lastObjectResultsRef.current = null;
            trackedObjectsRef.current = [];
          }

          // Gesture Recognition Inference
          if (currentOptions.enableGestureRecognizer && gestureRecognizerRef.current) {
            try {
              const gestureInferTime = performance.now();
              const gestureRes = gestureRecognizerRef.current.recognizeForVideo(video, gestureInferTime);

              if (gestureRes && gestureRes.gestures && gestureRes.gestures.length > 0) {
                let recognized: DetectedGesture | null = null;
                for (let i = 0; i < gestureRes.gestures.length; i++) {
                  const handGestures = gestureRes.gestures[i];
                  if (handGestures && handGestures.length > 0) {
                    const top = handGestures[0];
                    if (top.categoryName && top.categoryName !== 'None' && top.score >= 0.5) {
                      const handednessStr = gestureRes.handedness?.[i]?.[0]?.categoryName || 'Unknown';
                      const nowTime = new Date();
                      const timeStr = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}:${String(nowTime.getSeconds()).padStart(2, '0')}.${String(nowTime.getMilliseconds()).padStart(3, '0')}`;
                      recognized = {
                        categoryName: top.categoryName,
                        score: top.score,
                        handedness: handednessStr,
                        timestamp: timeStr,
                        rawTimestamp: Date.now(),
                      };
                      break;
                    }
                  }
                }

                if (recognized) {
                  lastGestureDetectTimeRef.current = performance.now();
                  const prev = currentGestureRef.current;
                  if (
                    !prev ||
                    prev.categoryName !== recognized.categoryName ||
                    performance.now() - lastGestureEmitTimeRef.current > 350
                  ) {
                    lastGestureEmitTimeRef.current = performance.now();
                    currentGestureRef.current = recognized;
                    setCurrentGesture(recognized);
                    setGestureHistory((hist) => [recognized!, ...hist.slice(0, 3)]);
                  }
                } else {
                  if (performance.now() - lastGestureDetectTimeRef.current > 1200) {
                    if (currentGestureRef.current !== null) {
                      currentGestureRef.current = null;
                      setCurrentGesture(null);
                    }
                  }
                }
              }
            } catch (gErr) {
              console.warn('手势识别帧推理异常:', gErr);
            }
          }

          // Track Latency
          const inferDuration = performance.now() - startInferTime;
          latencyHistoryRef.current.push(inferDuration);
          if (latencyHistoryRef.current.length > 30) {
            latencyHistoryRef.current.shift();
          }
        }

        // 3. Render Landmark Layers from cached results (prevents 30Hz strobe)
        // Hand Landmarks
        if (currentOptions.enableHands && lastHandResultsRef.current?.landmarks) {
          for (const landmarks of lastHandResultsRef.current.landmarks) {
            drawHand(ctx, drawingUtils, landmarks, canvas.width, canvas.height);
          }
        }

        // Face Mesh and Organ Labels
        if (currentOptions.enableFace && lastFaceResultsRef.current?.faceLandmarks) {
          for (const landmarks of lastFaceResultsRef.current.faceLandmarks) {
            drawFace(ctx, drawingUtils, landmarks, currentOptions.faceMode);

            // Draw facial organ speech bubbles
            if (currentOptions.showOrganLabels) {
              drawOrganLabels(ctx, landmarks, canvas.width, canvas.height, currentOptions.mirrored);
            }
          }
        }

        // Non-Human Object Detection Speech Bubbles (smoothed, anti-jitter & unmirrored)
        if (currentOptions.enableObjectDetection && trackedObjectsRef.current.length > 0) {
          const nowMs = performance.now();
          const liveObjects = trackedObjectsRef.current.filter((o) => nowMs - o.lastSeen < 450);
          drawDetectedObjects(ctx, liveObjects, canvas.width, canvas.height, currentOptions.mirrored);
        }

        // 4. Calculate FPS & Latency every 500ms
        frameCountRef.current += 1;
        if (now - lastFpsUpdateRef.current >= 500) {
          const deltaSec = (now - lastFpsUpdateRef.current) / 1000;
          setFps(Math.round(frameCountRef.current / deltaSec));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;

          if (latencyHistoryRef.current.length > 0) {
            const avgLatency =
              latencyHistoryRef.current.reduce((a, b) => a + b, 0) /
              latencyHistoryRef.current.length;
            setLatency(Math.round(avgLatency));
          }
        }
      }
    }

    requestAnimationIdRef.current = requestAnimationFrame(renderLoop);
  }, [videoRef, canvasRef]);

  // Start animation loop when models are ready
  useEffect(() => {
    if (!isModelLoading && !error) {
      requestAnimationIdRef.current = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (requestAnimationIdRef.current !== null) {
        cancelAnimationFrame(requestAnimationIdRef.current);
        requestAnimationIdRef.current = null;
      }
    };
  }, [isModelLoading, error, renderLoop]);

  return {
    isModelLoading,
    fps,
    latency,
    error,
    detectorInfo,
    currentGesture,
    gestureHistory,
    retryInit: initVision,
  };
}
