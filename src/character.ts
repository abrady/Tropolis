import { Frame } from './frame-utils';

export interface CharacterDef {
  image: HTMLImageElement;
  animations: {
    idle: Frame[];
    talk: Frame[];
    [key: string]: Frame[];
  };
}
