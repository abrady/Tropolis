import React, { useState, useEffect } from 'react';
import { ExamineRect, ExamineRectType } from './ExamineEditor';

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
  onDialogue?: (dialogueId: string) => void;
  debugMode?: boolean;
}

export default function ExamineOverlay({ width, height, rects, onExit, onDialogue, debugMode = false }: ExamineOverlayProps) {
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
      if (hover.type === ExamineRectType.Dialogue && onDialogue) {
        console.log(`${hover.dialogueNode} clicked`);
        onDialogue(hover.dialogueNode);
      } else if (hover.type === ExamineRectType.None) {
        console.log(`${hover.args} clicked`);
      } else if (hover.type === ExamineRectType.AddToInventory) {
        console.log(`${hover.item} clicked`);
      }
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
      style={{ 
        width, 
        height, 
        cursor: hover ? 'pointer' : 'crosshair', 
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 2500
      }}
      onMouseMove={handleMove}
      onClick={handleClick}
    >
      {debugMode && (
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1000 }}
        >
          {rects.map((rect, i) => (
            <rect
              key={i}
              x={Math.min(rect.x, rect.x + rect.width)}
              y={Math.min(rect.y, rect.y + rect.height)}
              width={Math.abs(rect.width)}
              height={Math.abs(rect.height)}
              fill="rgba(255,0,0,0.3)"
              stroke={rect === hover ? 'yellow' : 'red'}
              strokeWidth="2"
            />
          ))}
          {rects.map((rect, i) => (
            <text
              key={`text-${i}`}
              x={Math.min(rect.x, rect.x + rect.width) + 5}
              y={Math.min(rect.y, rect.y + rect.height) + 15}
              fill="white"
              fontSize="12"
              stroke="black"
              strokeWidth="0.5"
              style={{ pointerEvents: 'none' }}
            >
              {rect.type === ExamineRectType.Dialogue ? `D: ${rect.dialogueNode}` : 
               rect.type === ExamineRectType.AddToInventory ? `I: ${rect.item}` : 
               `N: ${rect.args}`}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
