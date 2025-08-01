import { describe, it, expect } from 'vitest';
import { GameState, LevelData } from './game-state';

const levels: Record<string, LevelData> = {
  One: { image: new Image(), dialogue: 'title: One\n---\nGuide: first\n===', start: 'One', examine: [] },
  Two: { image: new Image(), dialogue: 'title: Two\n---\nGuide: second\n===', start: 'Two', examine: [] }
};

describe('GameState', () => {
  it('loads initial level and switches levels', () => {
    const gs = new GameState(levels, 'One');
    expect(gs.currentLevel).toBe('One');
    expect(gs.visited.has('One')).toBe(true);
    const gen1 = gs.getManager().advance();
    const e1 = gen1.next().value;
    expect(e1.type).toBe('line');
    expect(e1.text).toBe('first');

    gs.gotoLevel('Two');
    expect(gs.currentLevel).toBe('Two');
    expect(gs.visited.has('Two')).toBe(true);
    const gen2 = gs.getManager().advance();
    const e2 = gen2.next().value;
    expect(e2.type).toBe('line');
    expect(e2.text).toBe('second');
  });

  it('manages inventory', () => {
    const gs = new GameState(levels, 'One');
    gs.addItem('key');
    expect(gs.hasItem('key')).toBe(true);
    gs.removeItem('key');
    expect(gs.hasItem('key')).toBe(false);
  });
});
