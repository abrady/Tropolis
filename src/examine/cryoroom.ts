import { ExamineRect, ExamineRectType, DialogueExamineRect } from '../examine';

export const cryoroomExamineRects: ExamineRect[] = [
  {
    type: ExamineRectType.Dialogue,
    x: 10,
    y: 297,
    width: 1708,
    height: 666,
    level: 'cryoroom',
    dialogueNode: 'CryoRoom_ExamineCryoChambers',
  } as DialogueExamineRect,
];
