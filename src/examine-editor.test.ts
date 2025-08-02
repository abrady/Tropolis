import { describe, it, expect } from 'vitest';
import { exportRectangles } from './ExamineEditor';
import { ExamineRect, ExamineRectType, NoneExamineRect } from './examine';

describe('exportRectangles', () => {
  it('returns JSON string of rectangles', () => {
    const rects: ExamineRect[] = [
      { type: ExamineRectType.None, x: 1, y: 2, width: 3, height: 4, args: 'a' } as NoneExamineRect,
      { type: ExamineRectType.None, x: 5, y: 6, width: 7, height: 8, args: 'b' } as NoneExamineRect,
    ];
    const json = exportRectangles(rects);
    expect(json).toBe(JSON.stringify(rects));
  });
});
