
// Original background image dimensions - should match ExamineOverlay
export const ORIGINAL_WIDTH = 1536;
export const ORIGINAL_HEIGHT = 1024;

export enum ExamineRectType {
  None = 'none',
  Dialogue = 'dialogue',
  AddToInventory = 'inventory',
}

interface BaseExamineRect {
  x: number; 
  y: number;
  width: number;
  height: number;
}

export interface DialogueExamineRect extends BaseExamineRect {
  type: ExamineRectType.Dialogue;
  level: string;
  dialogueNode: string;
}

export interface InventoryExamineRect extends BaseExamineRect {
  type: ExamineRectType.AddToInventory;
  item: string;
}

export interface NoneExamineRect extends BaseExamineRect {
  type: ExamineRectType.None;
  args: string;
}

export type ExamineRect = DialogueExamineRect | InventoryExamineRect | NoneExamineRect;
