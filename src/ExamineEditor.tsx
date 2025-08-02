import React, { useState, useRef, useCallback } from 'react';
import {
  ORIGINAL_WIDTH,
  ORIGINAL_HEIGHT,
  ExamineRect,
  ExamineRectType,
  DialogueExamineRect,
  InventoryExamineRect,
  NoneExamineRect,
} from './examine';

export function exportRectangles(rects: ExamineRect[]): string {
  return JSON.stringify(rects);
}

interface ExamineEditorProps {
  width: number;
  height: number;
  background: HTMLImageElement;
  onClose?: () => void;
  initialRects?: ExamineRect[];
}

export default function ExamineEditor({
  width,
  height,
  background,
  onClose,
  initialRects = [],
}: ExamineEditorProps) {
  const [rectangles, setRectangles] = useState<ExamineRect[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [drawingIndex, setDrawingIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate scaling factors for converting viewport coords to original coords
  const scaleToOriginal = {
    x: ORIGINAL_WIDTH / width,
    y: ORIGINAL_HEIGHT / height,
  };

  const scaleToViewport = {
    x: width / ORIGINAL_WIDTH,
    y: height / ORIGINAL_HEIGHT,
  };

  // Convert viewport rectangle to original coordinates for export
  const convertToOriginalCoords = (rect: ExamineRect): ExamineRect => ({
    ...rect,
    x: rect.x * scaleToOriginal.x,
    y: rect.y * scaleToOriginal.y,
    width: rect.width * scaleToOriginal.x,
    height: rect.height * scaleToOriginal.y,
  });

  // Convert original coordinates to viewport coordinates for editing
  const convertToViewportCoords = useCallback(
    (rect: ExamineRect): ExamineRect => ({
      ...rect,
      x: rect.x * scaleToViewport.x,
      y: rect.y * scaleToViewport.y,
      width: rect.width * scaleToViewport.x,
      height: rect.height * scaleToViewport.y,
    }),
    [scaleToViewport.x, scaleToViewport.y]
  );

  // Initialize rectangles from initial rects converted to viewport coordinates
  React.useEffect(() => {
    if (initialRects.length > 0) {
      setRectangles(initialRects.map(convertToViewportCoords));
    }
  }, [initialRects, width, height, convertToViewportCoords]);

  const getPointerPos = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPointerPos(e);
    const idx = rectangles.findIndex(
      (r) => pos.x >= r.x && pos.x <= r.x + r.width && pos.y >= r.y && pos.y <= r.y + r.height
    );
    if (idx !== -1) {
      setSelected(idx);
      setDraggingIndex(idx);
      setStart(pos);
    } else {
      const newRect: NoneExamineRect = {
        type: ExamineRectType.None,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        args: '',
      };
      setRectangles((prev) => [...prev, newRect]);
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
      setRectangles((prev) =>
        prev.map((r, i) => (i === draggingIndex ? { ...r, x: r.x + dx, y: r.y + dy } : r))
      );
      setStart(pos);
    } else if (drawingIndex !== null) {
      setRectangles((prev) =>
        prev.map((r, i) =>
          i === drawingIndex ? { ...r, width: pos.x - start.x, height: pos.y - start.y } : r
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
    setDrawingIndex(null);
    setStart(null);
  };

  const updateField = (field: string, value: string | number | ExamineRectType) => {
    if (selected === null) return;
    setRectangles((prev) =>
      prev.map((r, i) => {
        if (i !== selected) return r;

        // Handle type changes
        if (field === 'type') {
          const baseRect = { x: r.x, y: r.y, width: r.width, height: r.height };
          switch (value) {
            case ExamineRectType.Dialogue:
              return {
                ...baseRect,
                type: ExamineRectType.Dialogue,
                level: '',
                dialogueNode: '',
              } as DialogueExamineRect;
            case ExamineRectType.AddToInventory:
              return {
                ...baseRect,
                type: ExamineRectType.AddToInventory,
                item: '',
              } as InventoryExamineRect;
            case ExamineRectType.None:
            default:
              return { ...baseRect, type: ExamineRectType.None, args: '' } as NoneExamineRect;
          }
        }

        return { ...r, [field]: value };
      })
    );
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
        style={{
          backgroundImage: `url(${background.src})`,
          backgroundSize: 'cover',
          cursor: 'crosshair',
        }}
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
              x:{' '}
              <input
                type="number"
                value={selectedRect.x}
                onChange={(e) => updateField('x', Number(e.target.value))}
              />
            </label>
            <label>
              y:{' '}
              <input
                type="number"
                value={selectedRect.y}
                onChange={(e) => updateField('y', Number(e.target.value))}
              />
            </label>
            <label>
              width:{' '}
              <input
                type="number"
                value={selectedRect.width}
                onChange={(e) => updateField('width', Number(e.target.value))}
              />
            </label>
            <label>
              height:{' '}
              <input
                type="number"
                value={selectedRect.height}
                onChange={(e) => updateField('height', Number(e.target.value))}
              />
            </label>
            <label>
              type:
              <select
                value={selectedRect.type}
                onChange={(e) => updateField('type', e.target.value as ExamineRectType)}
              >
                <option value={ExamineRectType.None}>None</option>
                <option value={ExamineRectType.Dialogue}>Dialogue</option>
                <option value={ExamineRectType.AddToInventory}>Add to Inventory</option>
              </select>
            </label>
            {selectedRect.type === ExamineRectType.Dialogue && (
              <>
                <label>
                  level:{' '}
                  <input
                    type="text"
                    value={selectedRect.level}
                    onChange={(e) => updateField('level', e.target.value)}
                  />
                </label>
                <label>
                  dialogueNode:{' '}
                  <input
                    type="text"
                    value={selectedRect.dialogueNode}
                    onChange={(e) => updateField('dialogueNode', e.target.value)}
                  />
                </label>
              </>
            )}
            {selectedRect.type === ExamineRectType.AddToInventory && (
              <label>
                item:{' '}
                <input
                  type="text"
                  value={selectedRect.item}
                  onChange={(e) => updateField('item', e.target.value)}
                />
              </label>
            )}
            {selectedRect.type === ExamineRectType.None && (
              <label>
                args:{' '}
                <input
                  type="text"
                  value={selectedRect.args}
                  onChange={(e) => updateField('args', e.target.value)}
                />
              </label>
            )}
          </div>
        ) : (
          <div>No rectangle selected</div>
        )}
        <button
          onClick={() => console.log(exportRectangles(rectangles.map(convertToOriginalCoords)))}
        >
          Export
        </button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    </div>
  );
}
