export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  duration: number;
}

export function parseFrames(data: { frames: Record<string, any> }): Frame[] {
  return Object.keys(data.frames).map((key) => {
    const frame = data.frames[key];
    return {
      x: frame.frame.x,
      y: frame.frame.y,
      w: frame.frame.w,
      h: frame.frame.h,
      duration: frame.duration,
    } as Frame;
  });
}
