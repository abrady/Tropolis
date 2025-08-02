import { parseFrames } from './frame-utils';
import { describe, it, expect } from 'vitest';

describe('parseFrames', () => {
  it('converts frame data into array', () => {
    const data = {
      frames: {
        frame1: {
          frame: { x: 10, y: 20, w: 30, h: 40 },
          duration: 50,
        },
        frame2: {
          frame: { x: 1, y: 2, w: 3, h: 4 },
          duration: 60,
        },
      },
    };
    const result = parseFrames(data);
    expect(result).toEqual([
      { x: 10, y: 20, w: 30, h: 40, duration: 50 },
      { x: 1, y: 2, w: 3, h: 4, duration: 60 },
    ]);
  });
});
