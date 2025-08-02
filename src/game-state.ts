import type { LevelName } from './examine/levels';

export interface LevelData {
  image: HTMLImageElement;
  dialogue: string;
  start: string;
  examine: ExamineRect[]; // using unknown instead of any for better type safety
  connections: LevelName[];
}

export type GameStateListener = (state: GameState) => void;

import { DialogueManager, DialogueGenerator } from './dialogue-manager';
import { ExamineRect } from './examine';

export class GameState {
  private levels: Record<LevelName, LevelData>;
  private background?: HTMLImageElement;
  private listeners: GameStateListener[] = [];
  private dialogueGenerator?: DialogueGenerator;

  inventory = new Set<string>();
  visited = new Set<string>();
  dialogueVisited: Record<string, boolean> = {};
  flags: Record<string, boolean> = {};
  currentLevel: LevelName = 'test';

  constructor(levels: Record<LevelName, LevelData>, initialLevel: LevelName) {
    if (!levels[initialLevel]) {
      throw new Error(`Unknown level: ${initialLevel}`);
    }
    this.levels = levels;
    this.gotoLevel(initialLevel);
  }

  startDialogue(dialogueId: string): DialogueGenerator {
    const data = this.levels[this.currentLevel];
    if (!data) throw new Error(`Unknown level: ${this.currentLevel}`);
    const manager = new DialogueManager(
      data.dialogue,
      {
        loadPuzzle: () => {},
        loadLevel: () => {},
        return: () => {},
      },
      this.dialogueVisited
    );
    manager.start(dialogueId);
    this.dialogueGenerator = manager.advance();
    return this.dialogueGenerator;
  }

  gotoLevel(level: LevelName) {
    const data = this.levels[level];
    if (!data) throw new Error(`Unknown level: ${level}`);
    this.currentLevel = level;
    this.startDialogue(data.start);
    this.background = data.image;
    this.visited.add(level);
    this.emit();
  }

  public getDialogueGenerator(): DialogueGenerator | undefined {
    return this.dialogueGenerator;
  }

  getBackground() {
    return this.background;
  }

  getAvailableLocations(): LevelName[] {
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
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  private emit() {
    for (const l of this.listeners) l(this);
  }
}
