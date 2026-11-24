import * as ort from 'onnxruntime-web/all';
import { DetectionResultItem } from './drawing';

// Configure ONNX Runtime to load wasm files locally from /ort-wasm/
ort.env.wasm.wasmPaths = '/ort-wasm/';

// Check if multi-threading SharedArrayBuffer is supported in current environment
const isSharedArrayBufferSupported =
  typeof crossOriginIsolated !== 'undefined' &&
  crossOriginIsolated &&
  typeof SharedArrayBuffer !== 'undefined';
ort.env.wasm.numThreads = isSharedArrayBufferSupported
  ? Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1))
  : 1;

export const COCO_CLASSES: string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

export interface YoloBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  classId: number;
  className: string;
}

export class YoloDetector {
  private session: ort.InferenceSession | null = null;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private inputWidth = 640;
  private inputHeight = 640;
  private isInitializing = false;
  private activeBackend: 'webgpu' | 'wasm' | null = null;
  private lastLatency: number = 0;
  private initError: string | null = null;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.inputWidth;
    this.offscreenCanvas.height = this.inputHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  public isReady(): boolean {
    return this.session !== null;
  }

  public getActiveBackend(): 'webgpu' | 'wasm' | null {
    return this.activeBackend;
  }

  public getLastLatency(): number {
    return this.lastLatency;
  }

  public getInitError(): string | null {
    return this.initError;
  }

  public async init(modelPath: string = '/models/yolo11s.onnx'): Promise<void> {
    if (this.session || this.isInitializing) return;
    this.isInitializing = true;
    this.initError = null;

    try {
      console.log(`[YOLO11] 正在加载模型文件: ${modelPath}`);
      // Fetch buffer directly to prevent internal fetch resolution mismatch in WebView2
      let modelBuffer: ArrayBuffer;
      try {
        const resp = await fetch(modelPath);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} 无法获取模型: ${modelPath}`);
        }
        modelBuffer = await resp.arrayBuffer();
      } catch (fetchErr) {
        // Fallback to nano model if small model not found
        console.warn(`[YOLO11] 加载 ${modelPath} 异常，尝试降级加载 /models/yolo11n.onnx:`, fetchErr);
        const respNano = await fetch('/models/yolo11n.onnx');
        if (!respNano.ok) {
          throw new Error(`HTTP ${respNano.status} 无法获取 /models/yolo11n.onnx`);
        }
        modelBuffer = await respNano.arrayBuffer();
      }

      // Attempt WebGPU first for hardware acceleration, fallback to Wasm
      try {
        this.session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
        });
        this.activeBackend = 'webgpu';
        console.log('[YOLO11] ONNX WebGPU 会话初始化成功');
      } catch (gpuErr) {
        console.warn('[YOLO11] WebGPU 启动失败，自动切换为 CPU Wasm 引擎:', gpuErr);
        this.session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        this.activeBackend = 'wasm';
        console.log('[YOLO11] ONNX Wasm 会话初始化成功');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.initError = msg;
      console.error('[YOLO11] 模型加载失败:', err);
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  public async detect(
    imageSource: HTMLVideoElement | HTMLCanvasElement,
    scoreThreshold: number = 0.28,
    iouThreshold: number = 0.45
  ): Promise<DetectionResultItem[]> {
    if (!this.session) return [];

    const startTime = performance.now();
    const srcWidth = 'videoWidth' in imageSource ? imageSource.videoWidth : imageSource.width;
    const srcHeight = 'videoHeight' in imageSource ? imageSource.videoHeight : imageSource.height;

    if (srcWidth === 0 || srcHeight === 0) return [];

    // 1. Letterbox transformation to 640x640 keeping aspect ratio
    const scale = Math.min(this.inputWidth / srcWidth, this.inputHeight / srcHeight);
    const scaledWidth = Math.round(srcWidth * scale);
    const scaledHeight = Math.round(srcHeight * scale);
    const padX = Math.floor((this.inputWidth - scaledWidth) / 2);
    const padY = Math.floor((this.inputHeight - scaledHeight) / 2);

    this.offscreenCtx.fillStyle = '#727272'; // 114 standard gray padding
    this.offscreenCtx.fillRect(0, 0, this.inputWidth, this.inputHeight);
    this.offscreenCtx.drawImage(imageSource, padX, padY, scaledWidth, scaledHeight);

    const imgData = this.offscreenCtx.getImageData(0, 0, this.inputWidth, this.inputHeight);
    const { data } = imgData;

    // 2. Prepare CHW Float32Array tensor [1, 3, 640, 640]
    const numPixels = this.inputWidth * this.inputHeight;
    const float32Array = new Float32Array(3 * numPixels);

    const rOffset = 0;
    const gOffset = numPixels;
    const bOffset = 2 * numPixels;

    for (let i = 0; i < numPixels; i++) {
      const srcIdx = i * 4;
      float32Array[rOffset + i] = data[srcIdx] / 255.0;
      float32Array[gOffset + i] = data[srcIdx + 1] / 255.0;
      float32Array[bOffset + i] = data[srcIdx + 2] / 255.0;
    }

    const inputTensor = new ort.Tensor('float32', float32Array, [1, 3, this.inputWidth, this.inputHeight]);

    // 3. Run Inference
    const outputMap = await this.session.run({ images: inputTensor });
    const outputTensor = outputMap.output0 || Object.values(outputMap)[0];
    const outputData = outputTensor.data as Float32Array;

    this.lastLatency = Math.round(performance.now() - startTime);

    // Output shape: [1, 84, 8400]
    const numAnchors = 8400;
    const candidates: YoloBox[] = [];

    // 4. Parse candidates
    for (let col = 0; col < numAnchors; col++) {
      // Find top class score for this anchor
      let maxScore = -1;
      let maxClassId = -1;

      for (let c = 0; c < 80; c++) {
        const score = outputData[(4 + c) * numAnchors + col];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      if (maxScore >= scoreThreshold) {
        const cx = outputData[0 * numAnchors + col];
        const cy = outputData[1 * numAnchors + col];
        const w = outputData[2 * numAnchors + col];
        const h = outputData[3 * numAnchors + col];

        // Map from 640x640 letterbox coordinates back to original image space
        const origX = (cx - w / 2 - padX) / scale;
        const origY = (cy - h / 2 - padY) / scale;
        const origW = w / scale;
        const origH = h / scale;

        candidates.push({
          x: Math.max(0, origX),
          y: Math.max(0, origY),
          width: Math.min(srcWidth, origW),
          height: Math.min(srcHeight, origH),
          score: maxScore,
          classId: maxClassId,
          className: COCO_CLASSES[maxClassId] || `class_${maxClassId}`,
        });
      }
    }

    // 5. Non-Maximum Suppression (NMS)
    candidates.sort((a, b) => b.score - a.score);
    const selectedBoxes: YoloBox[] = [];

    for (const cand of candidates) {
      let keep = true;
      for (const sel of selectedBoxes) {
        if (cand.classId === sel.classId) {
          const iou = this.computeIoU(cand, sel);
          if (iou > iouThreshold) {
            keep = false;
            break;
          }
        }
      }
      if (keep) {
        selectedBoxes.push(cand);
        if (selectedBoxes.length >= 25) break;
      }
    }

    // 6. Map to DetectionResultItem format
    return selectedBoxes.map((b) => ({
      boundingBox: {
        originX: b.x,
        originY: b.y,
        width: b.width,
        height: b.height,
      },
      categories: [
        {
          categoryName: b.className,
          score: b.score,
        },
      ],
    }));
  }

  private computeIoU(a: YoloBox, b: YoloBox): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);

    const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const aArea = a.width * a.height;
    const bArea = b.width * b.height;
    const unionArea = aArea + bArea - interArea;

    return unionArea > 0 ? interArea / unionArea : 0;
  }

  public close(): void {
    if (this.session) {
      try {
        this.session.release();
      } catch {}
      this.session = null;
    }
  }
}
