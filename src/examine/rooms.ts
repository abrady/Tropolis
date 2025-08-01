import { ExamineRect } from '../ExamineEditor';
import { cryoroomExamineRects } from './cryoroom';

export interface RoomExamineData {
  rects: ExamineRect[];
}

export const roomExamineData: Record<string, RoomExamineData> = {
  'cryoroom': {
    rects: cryoroomExamineRects
  }
};

export function getRoomExamineRects(roomName: string): ExamineRect[] {
  const room = roomExamineData[roomName];
  return room ? room.rects : [];
}