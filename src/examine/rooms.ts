import { ExamineRect } from '../examine';
import { cryoroomExamineRects } from './cryoroom';
import { mallExamineRects } from './mall';
import { sector7ExamineRects } from './sector7';
import { bookstoreExamineRects } from './bookstore';


export interface RoomExamineData {
  rects: ExamineRect[];
}

export const roomExamineData: Record<string, RoomExamineData> = {
  'cryoroom': {
    rects: cryoroomExamineRects
  },
  'mall': {
    rects: mallExamineRects
  },
  'sector7': {
    rects: sector7ExamineRects
  },
  'bookstore': {
    rects: bookstoreExamineRects
  },
};

export function getRoomExamineRects(roomName: string): ExamineRect[] {
  const room = roomExamineData[roomName];
  return room ? room.rects : [];
}