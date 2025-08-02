export interface LevelData {
  image: HTMLImageElement;
  dialogue: string;
  start: string;
  examine: any[]; // using any to avoid circular import; callers can cast
  connections: string[];
}

export type GameStateListener = (state: GameState) => void;

import { DialogueManager } from './dialogue-manager';

export class GameState {
  private levels: Record<string, LevelData>;
  private manager: DialogueManager;
  private background: HTMLImageElement;
  private listeners: GameStateListener[] = [];

  inventory = new Set<string>();
  visited = new Set<string>();
  flags: Record<string, boolean> = {};
  currentLevel: string;

  constructor(levels: Record<string, LevelData>, initialLevel: string) {
    if (!levels[initialLevel]) {
      throw new Error(`Unknown level: ${initialLevel}`);
    }
    this.levels = levels;
    this.currentLevel = initialLevel;
    const data = levels[initialLevel];
    this.manager = new DialogueManager(data.dialogue, { loadPuzzle: () => {}, loadLevel: () => {}, return: () => {} });
    this.manager.start(data.start);
    this.background = data.image;
    this.visited.add(initialLevel);
  }

  gotoLevel(level: string) {
    const data = this.levels[level];
    if (!data) throw new Error(`Unknown level: ${level}`);
    this.currentLevel = level;
    this.manager = new DialogueManager(data.dialogue, { loadPuzzle: () => {}, loadLevel: () => {}, return: () => {} });
    this.manager.start(data.start);
    this.background = data.image;
    this.visited.add(level);
    this.emit();
  }

  getManager() {
    return this.manager;
  }

  getBackground() {
    return this.background;
  }

  getAvailableLocations() {
    const currentLevelData = this.levels[this.currentLevel];
    return currentLevelData ? currentLevelData.connections : [];
  }

  addItem(item: string) {
    this.inventory.add(item);
    this.emit();
  }

  removeItem(item: string) {
    this.inventory.delete(item);
    this.emit();
  }

  hasItem(item: string) {
    return this.inventory.has(item);
  }

  setFlag(flag: string, value = true) {
    this.flags[flag] = value;
    this.emit();
  }

  getFlag(flag: string) {
    return !!this.flags[flag];
  }

  subscribe(fn: GameStateListener) {
    this.listeners.push(fn);
  }

  unsubscribe(fn: GameStateListener) {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  private emit() {
    for (const l of this.listeners) l(this);
  }
}
