import cryoroomImg from '../../data/locations/cryoroom.png';
import mallImg from '../../data/locations/mall.png';
import bookstoreImg from '../../data/locations/bookstore.png';
import sector7Img from '../../data/locations/sector7.png';
import { LevelData } from '../game-state';
import { getRoomDialogueData } from '../dialogue';
import { getRoomExamineRects } from './rooms';

const cryoroomDialogueData = getRoomDialogueData('cryoroom')!;
const testDialogueData = getRoomDialogueData('test')!;
const mallDialogueData = getRoomDialogueData('mall')!;
const bookstoreDialogueData = getRoomDialogueData('bookstore')!;
const sector7DialogueData = getRoomDialogueData('sector7')!;

const levels: Record<string, LevelData> = {
  cryoroom: {
    image: new Image(),
    dialogue: cryoroomDialogueData.dialogue,
    start: cryoroomDialogueData.start,
    examine: getRoomExamineRects('cryoroom'),
    connections: ['mall', 'sector7']
  },
  test: { 
      image: new Image(), 
      dialogue: testDialogueData.dialogue, 
      start: testDialogueData.start,
     examine: [],
     connections: []
    },
  mall: {
    image: new Image(),
    dialogue: mallDialogueData.dialogue,
    start: mallDialogueData.start,
    examine: getRoomExamineRects('mall'),
    connections: ['bookstore', 'cryoroom']
  },
  bookstore: {
    image: new Image(),
    dialogue: bookstoreDialogueData.dialogue,
    start: bookstoreDialogueData.start,
    examine: getRoomExamineRects('bookstore'),
    connections: ['mall']
  },
  sector7: {
    image: new Image(),
    dialogue: sector7DialogueData.dialogue,
    start: sector7DialogueData.start,
    examine: getRoomExamineRects('sector7'),
    connections: ['mall', 'cryoroom']
  },
};

levels.test.image.src = cryoroomImg;
levels.cryoroom.image.src = cryoroomImg;
levels.mall.image.src = mallImg;
levels.bookstore.image.src = bookstoreImg;
levels.sector7.image.src = sector7Img;

export { levels };
