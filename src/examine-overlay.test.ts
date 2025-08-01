import { describe, it, expect } from 'vitest';
import { getRectAtPosition } from './ExamineOverlay';
import { ExamineRect } from './ExamineEditor';

describe('getRectAtPosition', () => {
  const rects: ExamineRect[] = [
    { x: 10, y: 10, width: 20, height: 30, label: 'A' },
    { x: 50, y: 50, width: 40, height: 40, label: 'B' }
  ];

  it('returns matching rect for coordinates', () => {
    const r1 = getRectAtPosition(rects, 15, 20);
    expect(r1?.label).toBe('A');
    const r2 = getRectAtPosition(rects, 70, 70);
    expect(r2?.label).toBe('B');
  });

  it('returns null when no match', () => {
    expect(getRectAtPosition(rects, 0, 0)).toBeNull();
  });
});
