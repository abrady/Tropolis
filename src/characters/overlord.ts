import { CharacterDef } from '../character';
import { parseFrames } from '../frame-utils';
import sheetDataJson from '../../data/characters/Overlord/Idle.anim?raw';
import sheetSrc from '../../data/characters/Overlord/Overlord.png';

const image = new Image();
image.src = sheetSrc;

const frames = parseFrames(JSON.parse(sheetDataJson));

const Overlord: CharacterDef = {
  image,
  animations: {
    idle: [frames[0]],
    talk: frames.slice(1),
    all: frames,
  },
};

export default Overlord;
