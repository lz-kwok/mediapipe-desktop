import {
  DrawingUtils,
  HandLandmarker,
  FaceLandmarker,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export type FaceRenderMode = 'contour' | 'mesh';

export function drawHand(
  ctx: CanvasRenderingContext2D,
  drawingUtils: DrawingUtils,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number
) {
  // 1. Draw connecting skeleton bones
  drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
    color: '#00F0FF',
    lineWidth: 3.5,
  });

  // 2. Draw regular joint dots
  drawingUtils.drawLandmarks(landmarks, {
    color: '#38BDF8',
    fillColor: '#0F172A',
    lineWidth: 1.5,
    radius: (data) => {
      // Larger radius for wrist and knuckles
      return [0, 5, 9, 13, 17].includes(data.index ?? -1) ? 4.5 : 3;
    },
  });

  // 3. Draw glowing highlight on fingertips (Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20)
  const tipIndices = [4, 8, 12, 16, 20];
  ctx.save();
  for (const idx of tipIndices) {
    const pt = landmarks[idx];
    if (!pt) continue;
    const x = pt.x * width;
    const y = pt.y * height;

    // Glowing outer circle
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, 8);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
    gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Solid inner core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFace(
  ctx: CanvasRenderingContext2D,
  drawingUtils: DrawingUtils,
  landmarks: NormalizedLandmark[],
  mode: FaceRenderMode
) {
  if (mode === 'mesh') {
    // High-density 3D triangulation tessellation mesh
    ctx.save();
    ctx.globalAlpha = 0.4;
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
      color: '#C084FC',
      lineWidth: 0.7,
    });
    ctx.restore();

    // Bold contour overlay
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
      color: '#A855F7',
      lineWidth: 2,
    });
  } else {
    // Pure elegant facial organ contours
    // Lips
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
      color: '#F43F5E',
      lineWidth: 2.5,
    });

    // Eyes
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
      color: '#38BDF8',
      lineWidth: 2.2,
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
      color: '#38BDF8',
      lineWidth: 2.2,
    });

    // Eyebrows
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
      color: '#34D399',
      lineWidth: 2.2,
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
      color: '#34D399',
      lineWidth: 2.2,
    });

    // Face oval outline
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
      color: '#A78BFA',
      lineWidth: 2.2,
    });

    // Irises
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {
      color: '#FBBF24',
      lineWidth: 2,
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, {
      color: '#FBBF24',
      lineWidth: 2,
    });
  }
}

interface OrganDef {
  name: string;
  enName: string;
  color: string;
  getPoint: (lm: NormalizedLandmark[]) => { x: number; y: number } | null;
  offsetX: number;
  offsetY: number;
}

const ORGANS: OrganDef[] = [
  {
    name: '左眼',
    enName: 'Left Eye',
    color: '#38BDF8',
    offsetX: -90,
    offsetY: -35,
    getPoint: (lm) => {
      if (lm[468]) return { x: lm[468].x, y: lm[468].y };
      if (lm[33] && lm[133]) return { x: (lm[33].x + lm[133].x) / 2, y: (lm[33].y + lm[133].y) / 2 };
      return null;
    },
  },
  {
    name: '右眼',
    enName: 'Right Eye',
    color: '#38BDF8',
    offsetX: 30,
    offsetY: -35,
    getPoint: (lm) => {
      if (lm[473]) return { x: lm[473].x, y: lm[473].y };
      if (lm[362] && lm[263]) return { x: (lm[362].x + lm[263].x) / 2, y: (lm[362].y + lm[263].y) / 2 };
      return null;
    },
  },
  {
    name: '鼻梁',
    enName: 'Nose',
    color: '#C084FC',
    offsetX: 35,
    offsetY: -8,
    getPoint: (lm) => (lm[1] ? { x: lm[1].x, y: lm[1].y } : null),
  },
  {
    name: '嘴唇',
    enName: 'Lips',
    color: '#FB7185',
    offsetX: 35,
    offsetY: 15,
    getPoint: (lm) => {
      if (lm[13] && lm[14]) return { x: (lm[13].x + lm[14].x) / 2, y: (lm[13].y + lm[14].y) / 2 };
      return lm[0] ? { x: lm[0].x, y: lm[0].y } : null;
    },
  },
  {
    name: '下巴',
    enName: 'Chin',
    color: '#34D399',
    offsetX: -30,
    offsetY: 30,
    getPoint: (lm) => (lm[152] ? { x: lm[152].x, y: lm[152].y } : null),
  },
];

export function drawOrganLabels(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  mirrored: boolean = false
) {
  if (!landmarks || landmarks.length === 0) return;

  ctx.save();
  ctx.font = '500 11px system-ui, sans-serif';

  for (const organ of ORGANS) {
    const pt = organ.getPoint(landmarks);
    if (!pt) continue;

    const targetX = pt.x * width;
    const targetY = pt.y * height;
    const bubbleX = targetX + organ.offsetX;
    const bubbleY = targetY + organ.offsetY;

    // 1. Draw glowing pinpoint on the organ center
    ctx.beginPath();
    ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
    ctx.fillStyle = organ.color;
    ctx.fill();

    // 2. Draw connecting leader line
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(bubbleX + (organ.offsetX > 0 ? 0 : 75), bubbleY + 12);
    ctx.strokeStyle = organ.color;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Draw rounded speech bubble card
    const text = `${organ.name} ${organ.enName}`;
    const textWidth = ctx.measureText ? ctx.measureText(text).width : 60;
    const cardWidth = textWidth + 16;
    const cardHeight = 22;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = organ.color;
    ctx.lineWidth = 1.2;

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, cardWidth, cardHeight, 11);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bubbleX, bubbleY, cardWidth, cardHeight);
      ctx.strokeRect(bubbleX, bubbleY, cardWidth, cardHeight);
    }

    // 4. Draw label text (handle mirror flip if canvas is scale-x-[-1])
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    if (mirrored) {
      // Flip text locally so it appears readable in mirrored video mode
      ctx.save();
      const centerX = bubbleX + cardWidth / 2;
      const centerY = bubbleY + cardHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 0.5);
      ctx.restore();
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(text, bubbleX + 8, bubbleY + cardHeight / 2 + 0.5);
    }
  }

  ctx.restore();
}

export interface DetectionResultItem {
  boundingBox?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  categories: Array<{
    categoryName: string;
    score: number;
  }>;
}

export interface TrackedObject {
  id: string;
  category: string;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  lastSeen: number;
  hitCount: number;
}

const OBJECT_CN_MAP: Record<string, string> = {
  'cell phone': '📱 手机',
  'cup': '☕ 水杯',
  'bottle': '🍼 瓶子',
  'laptop': '💻 笔记本电脑',
  'mouse': '🖱️ 鼠标',
  'keyboard': '⌨️ 键盘',
  'book': '📖 书本',
  'clock': '⏰ 时钟',
  'chair': '🪑 椅子',
  'couch': '🛋️ 沙发',
  'backpack': '🎒 背包',
  'umbrella': '☂️ 雨伞',
  'handbag': '👜 手提包',
  'scissors': '✂️ 剪刀',
  'remote': '📺 遥控器',
  'tv': '🖥️ 显示器',
  'potted plant': '🪴 盆栽',
  'bowl': '🥣 碗',
  'fork': '🍴 叉子',
  'knife': '🔪 刀',
  'spoon': '🥄 勺子',
  'banana': '🍌 香蕉',
  'apple': '🍎 苹果',
  'orange': '🍊 橙子',
  'sandwich': '🥪 三明治',
  'pizza': '🍕 披萨',
  'donut': '🍩 甜甜圈',
  'cake': '🍰 蛋糕',
  'bed': '🛏️ 床',
  'vase': '🏺 花瓶',
  'car': '🚗 汽车',
  'bicycle': '🚲 自行车',
  'motorcycle': '🏍️ 摩托车',
  'airplane': '✈️ 飞机',
  'bus': '🚌 公交车',
  'train': '🚆 火车',
  'truck': '🚚 卡车',
  'boat': '🚤 轮船',
  'traffic light': '🚦 红绿灯',
  'fire hydrant': '🧯 消防栓',
  'stop sign': '🛑 停车标',
  'bench': '🪑 长凳',
  'bird': '🐦 小鸟',
  'cat': '🐈 小猫',
  'dog': '🐕 小狗',
  'tie': '👔 领带',
  'suitcase': '🧳 行李箱',
  'sports ball': '⚽ 运动球',
  'wine glass': '🍷 高脚杯',
  'toothbrush': '🪥 牙刷',
  'hair drier': '💨 吹风机',
  'teddy bear': '🧸 玩具熊',
  'pen': '🖊️ 笔',
};

import { WORLD_CN_MAP } from './worldClasses';

export function translateObjectName(name: string): string {
  const lower = name.toLowerCase();
  return WORLD_CN_MAP[lower] || OBJECT_CN_MAP[lower] || `📦 ${name}`;
}

// Set of classes that are typically false alarms on desktop/webcam (e.g. hands/furniture hallucination)
export const WEBCAM_EXCLUDED_CLASSES = new Set([
  'person',
  'toilet',
  'hot dog',
  'baseball glove',
  'snowboard',
  'skis',
  'surfboard',
  'kite',
  'frisbee',
]);

// Temporal object tracker to smooth bounding boxes and eliminate flickering
export function updateTrackedObjects(
  existingTracked: TrackedObject[],
  rawDetections: DetectionResultItem[],
  width: number,
  height: number,
  now: number,
  minScore: number = 0.25
): TrackedObject[] {
  const validDetections: Array<{
    category: string;
    score: number;
    box: { x: number; y: number; width: number; height: number };
  }> = [];

  // 1. Filter out human/person detections and webcam hallucinations
  for (const det of rawDetections) {
    if (!det.categories || det.categories.length === 0) continue;
    const cat = det.categories[0];
    const catName = cat.categoryName || '';

    if (WEBCAM_EXCLUDED_CLASSES.has(catName.toLowerCase())) continue;
    if (typeof cat.score === 'number' && cat.score < minScore) continue;

    const bb = det.boundingBox;
    if (!bb) continue;

    let x = bb.originX;
    let y = bb.originY;
    let w = bb.width;
    let h = bb.height;

    // Handle normalized vs pixel coordinates
    if (w <= 1.0 && h <= 1.0) {
      x *= width;
      y *= height;
      w *= width;
      h *= height;
    }

    // Filter out abnormally small noise boxes (< 25px) or absurdly large screen-filling noise
    if (w < 25 || h < 25 || w * h < 800) continue;
    if (w > width * 0.94 && h > height * 0.94) continue;

    x = Math.max(2, Math.min(x, width - w - 2));
    y = Math.max(2, Math.min(y, height - h - 2));

    validDetections.push({
      category: catName,
      score: cat.score,
      box: { x, y, width: w, height: h },
    });
  }

  const updated: TrackedObject[] = [];
  const matchedDetIndices = new Set<number>();
  const maxMatchDist = Math.max(220, Math.min(width, height) * 0.3);

  // 2. Match current detections against previously tracked objects
  for (const item of existingTracked) {
    let bestMatchIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < validDetections.length; i++) {
      if (matchedDetIndices.has(i)) continue;
      const det = validDetections[i];
      if (det.category.toLowerCase() === item.category.toLowerCase()) {
        const centerItemX = item.box.x + item.box.width / 2;
        const centerItemY = item.box.y + item.box.height / 2;
        const centerDetX = det.box.x + det.box.width / 2;
        const centerDetY = det.box.y + det.box.height / 2;
        const dist = Math.hypot(centerItemX - centerDetX, centerItemY - centerDetY);

        if (dist < maxMatchDist && dist < bestDist) {
          bestDist = dist;
          bestMatchIdx = i;
        }
      }
    }

    if (bestMatchIdx >= 0) {
      matchedDetIndices.add(bestMatchIdx);
      const det = validDetections[bestMatchIdx];

      // Smooth interpolation (65% previous, 35% new) to eliminate jitter
      updated.push({
        id: item.id,
        category: det.category,
        score: Math.max(item.score * 0.5, det.score),
        box: {
          x: item.box.x * 0.65 + det.box.x * 0.35,
          y: item.box.y * 0.65 + det.box.y * 0.35,
          width: item.box.width * 0.65 + det.box.width * 0.35,
          height: item.box.height * 0.65 + det.box.height * 0.35,
        },
        lastSeen: now,
        hitCount: (item.hitCount || 1) + 1,
      });
    } else {
      // Keep tracked object alive for up to 550ms if momentarily lost
      if (now - item.lastSeen < 550) {
        updated.push(item);
      }
    }
  }

  // 3. Add unmatched new detections as fresh tracked objects
  for (let i = 0; i < validDetections.length; i++) {
    if (!matchedDetIndices.has(i)) {
      const det = validDetections[i];
      updated.push({
        id: `obj_${Math.random().toString(36).substring(2, 9)}`,
        category: det.category,
        score: det.score,
        box: det.box,
        lastSeen: now,
        hitCount: 1,
      });
    }
  }

  return updated;
}

export function drawDetectedObjects(
  ctx: CanvasRenderingContext2D,
  trackedObjects: TrackedObject[],
  width: number,
  height: number,
  mirrored: boolean = false
) {
  if (!trackedObjects || trackedObjects.length === 0) return;

  ctx.save();
  ctx.font = '600 12px system-ui, sans-serif';

  for (const obj of trackedObjects) {
    const rawCategory = obj.category || '';
    if (WEBCAM_EXCLUDED_CLASSES.has(rawCategory.toLowerCase())) continue;

    // High confidence (>= 0.38) or confirmed (hitCount >= 2) displays immediately
    if (obj.score < 0.38 && (obj.hitCount || 1) < 2) continue;

    const { x, y, width: w, height: h } = obj.box;
    const color = '#F59E0B'; // Amber neon
    const labelText = `${translateObjectName(rawCategory)} ${Math.round(obj.score * 100)}%`;

    // 1. Draw rounded bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }

    // 2. Draw stylish top-attached speech bubble
    const textWidth = ctx.measureText ? ctx.measureText(labelText).width : 80;
    const badgeW = textWidth + 18;
    const badgeH = 24;
    const badgeX = Math.max(4, Math.min(x + Math.min(10, Math.max(0, (w - badgeW) / 2)), width - badgeW - 4));
    const badgeY = Math.max(4, Math.min(y - badgeH - 6, height - badgeH - 4));

    // Bubble background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
    }

    // Small downward triangle pointer from bubble to bounding box
    ctx.beginPath();
    ctx.moveTo(badgeX + badgeW / 2 - 4, badgeY + badgeH);
    ctx.lineTo(badgeX + badgeW / 2, badgeY + badgeH + 4);
    ctx.lineTo(badgeX + badgeW / 2 + 4, badgeY + badgeH);
    ctx.fillStyle = color;
    ctx.fill();

    // 3. Draw text in bubble (handle mirror flip if canvas is scale-x-[-1])
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    if (mirrored) {
      ctx.save();
      const centerX = badgeX + badgeW / 2;
      const centerY = badgeY + badgeH / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.textAlign = 'center';
      ctx.fillText(labelText, 0, 0.5);
      ctx.restore();
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(labelText, badgeX + 9, badgeY + badgeH / 2 + 0.5);
    }
  }

  ctx.restore();
}
