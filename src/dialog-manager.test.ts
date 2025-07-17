import { describe, it, expect } from 'vitest';
import { DialogManager } from './dialog-manager';

const sample = `title: TestNode
---
Overlord: Begin
<<loadPuzzle TowerOfHanoi>>
===`;

const sampleLevel = `title: LevelNode
---
Overlord: Proceed
<<loadLevel Sector7>>
===`;

describe('DialogManager loadPuzzle command', () => {
  it('parses loadPuzzle command from yarn node', () => {
    const dm = new DialogManager(sample);
    dm.start('TestNode');
    const content = dm.getCurrent();
    expect(content.command).toEqual({ name: 'loadPuzzle', args: ['TowerOfHanoi'] });
  });
});

describe('DialogManager loadLevel command', () => {
  it('parses loadLevel command from yarn node', () => {
    const dm = new DialogManager(sampleLevel);
    dm.start('LevelNode');
    const content = dm.getCurrent();
    expect(content.command).toEqual({ name: 'loadLevel', args: ['Sector7'] });
  });
});
