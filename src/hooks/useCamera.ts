import { useState, useEffect, useRef, useCallback } from 'react';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  devices: CameraDeviceInfo[];
  activeDeviceId: string;
  isStreaming: boolean;
  error: string | null;
  videoDimensions: { width: number; height: number };
  switchCamera: (deviceId: string) => void;
  restartCamera: () => void;
}

export function useCamera(initialDeviceId?: string): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>(initialDeviceId || '');
  const activeDeviceIdRef = useRef<string>(initialDeviceId || '');
  activeDeviceIdRef.current = activeDeviceId;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Enumerate video devices
  const updateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `摄像头 ${index + 1}`,
        }));
      setDevices(videoInputs);
    } catch (err) {
      console.warn('枚举摄像头设备失败:', err);
    }
  }, []);

  // Start video stream
  const startStream = useCallback(async (requestedDeviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前环境不支持摄像头视频采集 (getUserMedia 不可用)');
      return;
    }

    setIsStreaming(false);
    setError(null);

    // Stop existing stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const oldStream = videoRef.current.srcObject as MediaStream;
      oldStream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    try {
      const targetId = requestedDeviceId !== undefined ? requestedDeviceId : activeDeviceIdRef.current;
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          deviceId: targetId ? { exact: targetId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
            setVideoDimensions({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
            setIsStreaming(true);
          }
        };
      }

      // Sync activeDeviceId from actual granted stream track without retriggering
      const actualDeviceId = stream.getVideoTracks()[0]?.getSettings()?.deviceId;
      if (actualDeviceId && actualDeviceId !== activeDeviceIdRef.current) {
        activeDeviceIdRef.current = actualDeviceId;
        setActiveDeviceId(actualDeviceId);
      }

      // Re-enumerate to get labels if permissions were just granted
      await updateDevices();
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      let msg = '无法启动摄像头: ';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = '摄像头权限被拒绝，请在系统设置中允许访问摄像头。';
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = '未检测到可用的摄像头硬件设备。';
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = '摄像头正被其他应用程序占用，请关闭其他应用后重试。';
      } else {
        msg += e.message || '未知错误';
      }
      setError(msg);
      setIsStreaming(false);
    }
  }, [updateDevices]);

  // Initial startup
  useEffect(() => {
    startStream();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startStream]);

  const switchCamera = useCallback((deviceId: string) => {
    setActiveDeviceId(deviceId);
    activeDeviceIdRef.current = deviceId;
    startStream(deviceId);
  }, [startStream]);

  const restartCamera = useCallback(() => {
    startStream();
  }, [startStream]);

  return {
    videoRef,
    canvasRef,
    devices,
    activeDeviceId,
    isStreaming,
    error,
    videoDimensions,
    switchCamera,
    restartCamera,
  };
}
