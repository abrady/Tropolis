import { CharacterDef } from '../character';
import { parseFrames } from '../frame-utils';
import sheetData from '../data/characters/Overlord/Idle.anim';
import sheetSrc from '../data/characters/Overlord/Overlord.png';

const image = new Image();
image.src = sheetSrc;

const frames = parseFrames(sheetData);

const Overlord: CharacterDef = {
  image,
  animations: {
    idle: [frames[0]],
    talk: frames.slice(1),
    all: frames
  }
};

export default Overlord;
