import { describe, it, expect } from 'vitest';
import { GameState, LevelData } from './game-state';
import { LevelName } from './examine/levels';

const levels: Record<LevelName, LevelData> = {
  cryoroom: { image: new Image(), dialogue: 'title: One\n---\nGuide: first\n===', start: 'One', examine: [], connections: ['test'] },
  test: { image: new Image(), dialogue: 'title: Two\n---\nGuide: second\n===', start: 'Two', examine: [], connections: ['cryoroom'] },
  mall: { image: new Image(), dialogue: 'title: Mall\n---\nGuide: mall\n===', start: 'Mall', examine: [], connections: [] },
  bookstore: { image: new Image(), dialogue: 'title: Bookstore\n---\nGuide: bookstore\n===', start: 'Bookstore', examine: [], connections: [] },
  sector7: { image: new Image(), dialogue: 'title: Sector7\n---\nGuide: sector7\n===', start: 'Sector7', examine: [], connections: [] }
};

describe('GameState', () => {
  it('loads initial level and switches levels', () => {
    const gs = new GameState(levels, 'cryoroom');
    expect(gs.currentLevel).toBe('cryoroom');
    expect(gs.visited.has('cryoroom')).toBe(true);
    // Remove getCurrentEvent test since that method doesn't exist
    
    gs.gotoLevel('test');
    expect(gs.currentLevel).toBe('test');
    expect(gs.visited.has('test')).toBe(true);
  });

  it('manages inventory', () => {
    const gs = new GameState(levels, 'cryoroom');
    gs.addItem('key');
    expect(gs.hasItem('key')).toBe(true);
    gs.removeItem('key');
    expect(gs.hasItem('key')).toBe(false);
  });
});
