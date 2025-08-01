import { describe, it, expect } from 'vitest';
import { exportRectangles, ExamineRect } from './ExamineEditor';

describe('exportRectangles', () => {
  it('returns JSON string of rectangles', () => {
    const rects: ExamineRect[] = [
      { x: 1, y: 2, width: 3, height: 4, label: 'a' },
      { x: 5, y: 6, width: 7, height: 8, label: 'b' }
    ];
    const json = exportRectangles(rects);
    expect(json).toBe(JSON.stringify(rects));
  });
});
