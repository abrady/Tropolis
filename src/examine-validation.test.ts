import { describe, it, expect } from 'vitest';
import { ExamineRect, ExamineRectType, DialogueExamineRect } from './examine';
import { parseGab } from './gab-utils';
import { roomExamineData } from './examine/rooms';
import { readFileSync } from 'fs';
import { join } from 'path';

function validateDialogueNodeExists(dialogueFile: string, nodeName: string): boolean {
  try {
    const content = readFileSync(join(__dirname, 'dialogue', dialogueFile), 'utf-8');
    const nodes = parseGab(content);
    return nodes.some((node) => node.title === nodeName);
  } catch {
    return false;
  }
}

function validateExamineRect(rect: ExamineRect): string[] {
  const errors: string[] = [];

  // Basic validation
  if (rect.x < 0) errors.push(`Invalid x coordinate: ${rect.x}`);
  if (rect.y < 0) errors.push(`Invalid y coordinate: ${rect.y}`);
  if (rect.width <= 0) errors.push(`Invalid width: ${rect.width}`);
  if (rect.height <= 0) errors.push(`Invalid height: ${rect.height}`);

  // Type-specific validation
  switch (rect.type) {
    case ExamineRectType.Dialogue:
      if (!rect.level || rect.level.trim() === '') {
        errors.push('Missing level parameter for dialogue rect');
      }
      if (!rect.dialogueNode || rect.dialogueNode.trim() === '') {
        errors.push('Missing dialogueNode parameter for dialogue rect');
      } else {
        const dialogueFile = `${rect.level}.gab`;
        if (!validateDialogueNodeExists(dialogueFile, rect.dialogueNode)) {
          errors.push(`Dialogue node '${rect.dialogueNode}' not found in ${dialogueFile}`);
        }
      }
      break;

    case ExamineRectType.AddToInventory:
      if (!rect.item || rect.item.trim() === '') {
        errors.push('Missing item parameter for inventory rect');
      }
      break;

    case ExamineRectType.None:
      if (!rect.args || rect.args.trim() === '') {
        errors.push('Missing args parameter for none rect');
      }
      break;
  }

  return errors;
}

describe('Examine Rectangle Validation', () => {
  it('validates all room examine rectangles', () => {
    const allErrors: string[] = [];

    for (const [roomName, roomData] of Object.entries(roomExamineData)) {
      roomData.rects.forEach((rect, index) => {
        const errors = validateExamineRect(rect);
        if (errors.length > 0) {
          allErrors.push(`Room '${roomName}', rect ${index}: ${errors.join(', ')}`);
        }
      });
    }

    if (allErrors.length > 0) {
      console.log('Examine Rectangle Validation Errors:');
      allErrors.forEach((error) => console.log(`  - ${error}`));
    }

    expect(allErrors).toEqual([]);
  });

  it('validates individual examine rectangle basic properties', () => {
    const validRect: ExamineRect = {
      type: ExamineRectType.None,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      args: 'valid_args',
    };

    expect(validateExamineRect(validRect)).toEqual([]);
  });

  it('catches invalid examine rectangle properties', () => {
    const invalidRect: ExamineRect = {
      type: ExamineRectType.None,
      x: -1,
      y: -5,
      width: 0,
      height: -10,
      args: '',
    };

    const errors = validateExamineRect(invalidRect);
    expect(errors).toContain('Invalid x coordinate: -1');
    expect(errors).toContain('Invalid y coordinate: -5');
    expect(errors).toContain('Invalid width: 0');
    expect(errors).toContain('Invalid height: -10');
    expect(errors).toContain('Missing args parameter for none rect');
  });

  it('validates dialogue node references', () => {
    const dialogueRect: DialogueExamineRect = {
      type: ExamineRectType.Dialogue,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      level: 'cryoroom',
      dialogueNode: 'NonExistentNode',
    };

    const errors = validateExamineRect(dialogueRect);
    expect(errors).toContain("Dialogue node 'NonExistentNode' not found in cryoroom.gab");
  });

  it('validates existing dialogue nodes', () => {
    const dialogueRect: DialogueExamineRect = {
      type: ExamineRectType.Dialogue,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      level: 'cryoroom',
      dialogueNode: 'CryoRoom_Intro',
    };

    const errors = validateExamineRect(dialogueRect);
    expect(errors).toEqual([]);
  });

  it('validates dialogue rect missing parameters', () => {
    const dialogueRect: DialogueExamineRect = {
      type: ExamineRectType.Dialogue,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      level: '',
      dialogueNode: '',
    };

    const errors = validateExamineRect(dialogueRect);
    expect(errors).toContain('Missing level parameter for dialogue rect');
    expect(errors).toContain('Missing dialogueNode parameter for dialogue rect');
  });
});
