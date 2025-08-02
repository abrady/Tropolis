import cryoroomDialogue from './cryoroom.gab?raw';
import testChoiceDialogue from './test-choice.gab?raw';
import sector7Dialogue from './sector7.gab?raw';
import mallDialogue from './mall.gab?raw';
import bookstoreDialogue from './bookstore.gab?raw';
import type { LevelName } from '../examine/levels';

export interface RoomDialogueData {
  dialogue: string;
  start: string;
}

export const roomDialogueData: Record<LevelName, RoomDialogueData> = {
  cryoroom: {
    dialogue: cryoroomDialogue,
    start: 'CryoRoom_Intro',
  },
  test: {
    dialogue: testChoiceDialogue,
    start: 'ChoiceNode',
  },
  sector7: {
    dialogue: sector7Dialogue,
    start: 'Sector7_Start',
  },
  mall: {
    dialogue: mallDialogue,
    start: 'Mall_Start',
  },
  bookstore: {
    dialogue: bookstoreDialogue,
    start: 'Bookstore_Start',
  },
};

export function getRoomDialogue(roomName: LevelName): string {
  const room = roomDialogueData[roomName];
  return room ? room.dialogue : '';
}

export function getRoomDialogueStart(roomName: LevelName): string {
  const room = roomDialogueData[roomName];
  return room ? room.start : '';
}

export function getRoomDialogueData(roomName: LevelName): RoomDialogueData | null {
  return roomDialogueData[roomName] || null;
}
