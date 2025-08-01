import React, { useState, useEffect } from 'react';
import { ExamineRect } from './ExamineEditor';

export function getRectAtPosition(rects: ExamineRect[], x: number, y: number): ExamineRect | null {
  for (const r of rects) {
    const minX = Math.min(r.x, r.x + r.width);
    const maxX = Math.max(r.x, r.x + r.width);
    const minY = Math.min(r.y, r.y + r.height);
    const maxY = Math.max(r.y, r.y + r.height);
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return r;
    }
  }
  return null;
}

interface ExamineOverlayProps {
  width: number;
  height: number;
  rects: ExamineRect[];
  onExit?: () => void;
}

export default function ExamineOverlay({ width, height, rects, onExit }: ExamineOverlayProps) {
  const [hover, setHover] = useState<ExamineRect | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const r = getRectAtPosition(rects, x, y);
    setHover(r);
  };

  const handleClick = () => {
    if (hover) {
      console.log(`${hover.label} clicked`);
      if (onExit) onExit();
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && onExit) {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);

  return (
    <div
      className="examine-overlay"
      style={{ width, height, cursor: hover ? 'pointer' : 'default' }}
      onMouseMove={handleMove}
      onClick={handleClick}
    />
  );
}
