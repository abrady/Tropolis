import React, { useState, useRef } from 'react';

export enum ExamineRectType {
  None = 'none',
  Dialogue = 'dialogue',
  AddToInventory = 'inventory',
}

export interface ExamineRect {
  type: ExamineRectType;
  x: number; 
  y: number;
  width: number;
  height: number;
  args: string;
}

export function exportRectangles(rects: ExamineRect[]): string {
  return JSON.stringify(rects);
}

interface ExamineEditorProps {
  width: number;
  height: number;
  background: HTMLImageElement;
  onClose?: () => void;
}

export default function ExamineEditor({ width, height, background, onClose }: ExamineEditorProps) {
  const [rectangles, setRectangles] = useState<ExamineRect[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [drawingIndex, setDrawingIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [start, setStart] = useState<{x: number; y: number} | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getPointerPos = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPointerPos(e);
    const idx = rectangles.findIndex(r =>
      pos.x >= r.x && pos.x <= r.x + r.width &&
      pos.y >= r.y && pos.y <= r.y + r.height
    );
    if (idx !== -1) {
      setSelected(idx);
      setDraggingIndex(idx);
      setStart(pos);
    } else {
      const newRect: ExamineRect = { x: pos.x, y: pos.y, width: 0, height: 0, label: '' };
      setRectangles(prev => [...prev, newRect]);
      const newIndex = rectangles.length;
      setSelected(newIndex);
      setDrawingIndex(newIndex);
      setStart(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!start) return;
    const pos = getPointerPos(e);
    if (draggingIndex !== null) {
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      setRectangles(prev => prev.map((r, i) => i === draggingIndex ? { ...r, x: r.x + dx, y: r.y + dy } : r));
      setStart(pos);
    } else if (drawingIndex !== null) {
      setRectangles(prev => prev.map((r, i) => i === drawingIndex ? { ...r, width: pos.x - start.x, height: pos.y - start.y } : r));
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
    setDrawingIndex(null);
    setStart(null);
  };

  const updateField = (field: keyof ExamineRect, value: string | number) => {
    if (selected === null) return;
    setRectangles(prev => prev.map((r, i) => i === selected ? { ...r, [field]: value } : r));
  };

  const selectedRect = selected !== null ? rectangles[selected] : null;

  return (
    <div className="examine-editor-overlay" style={{ width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ backgroundImage: `url(${background.src})`, backgroundSize: 'cover', cursor: 'crosshair' }}
      >
        {rectangles.map((r, i) => (
          <rect
            key={i}
            x={Math.min(r.x, r.x + r.width)}
            y={Math.min(r.y, r.y + r.height)}
            width={Math.abs(r.width)}
            height={Math.abs(r.height)}
            fill="rgba(255,0,0,0.3)"
            stroke={i === selected ? 'yellow' : 'red'}
          />
        ))}
      </svg>
      <div className="examine-editor-panel">
        {selectedRect ? (
          <div>
            <label>
              x: <input type="number" value={selectedRect.x} onChange={e => updateField('x', Number(e.target.value))} />
            </label>
            <label>
              y: <input type="number" value={selectedRect.y} onChange={e => updateField('y', Number(e.target.value))} />
            </label>
            <label>
              width: <input type="number" value={selectedRect.width} onChange={e => updateField('width', Number(e.target.value))} />
            </label>
            <label>
              height: <input type="number" value={selectedRect.height} onChange={e => updateField('height', Number(e.target.value))} />
            </label>
            <label>
              label: <input type="text" value={selectedRect.label} onChange={e => updateField('label', e.target.value)} />
            </label>
          </div>
        ) : (
          <div>No rectangle selected</div>
        )}
        <button onClick={() => console.log(exportRectangles(rectangles))}>Export</button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    </div>
  );
}
