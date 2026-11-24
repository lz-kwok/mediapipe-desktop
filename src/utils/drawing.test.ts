import { describe, it, expect } from 'vitest';
import {
  drawHand,
  drawFace,
  drawOrganLabels,
  drawDetectedObjects,
  translateObjectName,
  updateTrackedObjects,
} from './drawing';

describe('drawing utils', () => {
  it('should export all required functions', () => {
    expect(typeof drawHand).toBe('function');
    expect(typeof drawFace).toBe('function');
    expect(typeof drawOrganLabels).toBe('function');
    expect(typeof drawDetectedObjects).toBe('function');
    expect(typeof translateObjectName).toBe('function');
    expect(typeof updateTrackedObjects).toBe('function');
  });

  it('should correctly translate COCO categories to Chinese', () => {
    expect(translateObjectName('cell phone')).toContain('手机');
    expect(translateObjectName('cup')).toContain('水杯');
    expect(translateObjectName('laptop')).toContain('笔记本电脑');
    expect(translateObjectName('mouse')).toContain('鼠标');
    expect(translateObjectName('keyboard')).toContain('键盘');
    expect(translateObjectName('bottle')).toContain('瓶子');
  });

  it('should filter out person from detected objects and track objects over time', () => {
    const rawDetections = [
      {
        boundingBox: { originX: 10, originY: 10, width: 100, height: 100 },
        categories: [{ categoryName: 'person', score: 0.95 }],
      },
      {
        boundingBox: { originX: 150, originY: 50, width: 80, height: 80 },
        categories: [{ categoryName: 'cup', score: 0.35 }],
      },
    ];

    const now = 1000;
    const tracked = updateTrackedObjects([], rawDetections, 640, 480, now);
    expect(tracked.length).toBe(1);
    expect(tracked[0].category).toBe('cup');
    expect(tracked[0].score).toBe(0.35);
    expect(tracked[0].hitCount).toBe(1);

    // Second consecutive detection increments hitCount to 2 (confirming real object)
    const confirmedTracked = updateTrackedObjects(tracked, rawDetections, 640, 480, now + 33);
    expect(confirmedTracked[0].hitCount).toBe(2);

    // Test persistence: if next frame detection momentarily misses, tracked object persists within 400ms
    const nextFrameTracked = updateTrackedObjects(confirmedTracked, [], 640, 480, now + 100);
    expect(nextFrameTracked.length).toBe(1);
    expect(nextFrameTracked[0].category).toBe('cup');

    // After 500ms without detection, it expires
    const expiredTracked = updateTrackedObjects(nextFrameTracked, [], 640, 480, now + 600);
    expect(expiredTracked.length).toBe(0);
  });
});
