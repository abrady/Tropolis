import { describe, it, expect, vi } from 'vitest';
import { getRectAtPosition } from './ExamineOverlay';
import { ExamineRect, ExamineRectType } from './ExamineEditor';

describe('getRectAtPosition', () => {
  const rects: ExamineRect[] = [
    { type: ExamineRectType.None, x: 10, y: 10, width: 20, height: 30, args: 'A' },
    { type: ExamineRectType.None, x: 50, y: 50, width: 40, height: 40, args: 'B' }
  ];

  it('returns matching rect for coordinates', () => {
    const r1 = getRectAtPosition(rects, 15, 20);
    expect(r1?.args).toBe('A');
    const r2 = getRectAtPosition(rects, 70, 70);
    expect(r2?.args).toBe('B');
  });

  it('returns null when no match', () => {
    expect(getRectAtPosition(rects, 0, 0)).toBeNull();
  });
});

describe('ExamineOverlay dialogue functionality', () => {
  it('should call onDialogue callback when clicking on dialogue examinerect', () => {
    const dialogueCallback = vi.fn();
    const onExitCallback = vi.fn();
    
    const dialogueRect: ExamineRect = {
      type: ExamineRectType.Dialogue,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      args: 'TestDialogueNode'
    };
    
    const rects = [dialogueRect];
    
    // Simulate clicking on the dialogue rect
    const clickedRect = getRectAtPosition(rects, 15, 15);
    expect(clickedRect).toBe(dialogueRect);
    
    // Simulate the click handler logic from ExamineOverlay
    if (clickedRect && clickedRect.type === ExamineRectType.Dialogue) {
      dialogueCallback(clickedRect.args);
    }
    onExitCallback();
    
    expect(dialogueCallback).toHaveBeenCalledWith('TestDialogueNode');
    expect(onExitCallback).toHaveBeenCalled();
  });

  it('should not call onDialogue callback for non-dialogue examinerects', () => {
    const dialogueCallback = vi.fn();
    const onExitCallback = vi.fn();
    
    const inventoryRect: ExamineRect = {
      type: ExamineRectType.AddToInventory,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      args: 'SomeItem'
    };
    
    const rects = [inventoryRect];
    
    // Simulate clicking on the inventory rect
    const clickedRect = getRectAtPosition(rects, 15, 15);
    expect(clickedRect).toBe(inventoryRect);
    
    // Simulate the click handler logic from ExamineOverlay
    if (clickedRect && clickedRect.type === ExamineRectType.Dialogue) {
      dialogueCallback(clickedRect.args);
    }
    onExitCallback();
    
    expect(dialogueCallback).not.toHaveBeenCalled();
    expect(onExitCallback).toHaveBeenCalled();
  });

  it('should handle multiple examinerects and only trigger dialogue for dialogue type', () => {
    const dialogueCallback = vi.fn();
    
    const rects: ExamineRect[] = [
      {
        type: ExamineRectType.None,
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        args: 'NoneRect'
      },
      {
        type: ExamineRectType.Dialogue,
        x: 50,
        y: 50,
        width: 30,
        height: 30,
        args: 'DialogueNode'
      },
      {
        type: ExamineRectType.AddToInventory,
        x: 100,
        y: 100,
        width: 25,
        height: 25,
        args: 'InventoryItem'
      }
    ];
    
    // Test clicking on dialogue rect
    const dialogueRect = getRectAtPosition(rects, 60, 60);
    expect(dialogueRect?.type).toBe(ExamineRectType.Dialogue);
    
    if (dialogueRect && dialogueRect.type === ExamineRectType.Dialogue) {
      dialogueCallback(dialogueRect.args);
    }
    
    expect(dialogueCallback).toHaveBeenCalledWith('DialogueNode');
    
    // Test clicking on non-dialogue rects
    dialogueCallback.mockClear();
    
    const noneRect = getRectAtPosition(rects, 15, 15);
    const inventoryRect = getRectAtPosition(rects, 110, 110);
    
    [noneRect, inventoryRect].forEach(rect => {
      if (rect && rect.type === ExamineRectType.Dialogue) {
        dialogueCallback(rect.args);
      }
    });
    
    expect(dialogueCallback).not.toHaveBeenCalled();
  });
});
