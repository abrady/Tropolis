import { describe, it, expect } from 'vitest';
import { DialogManager } from './dialog-manager';

const noopHandlers = {
  loadPuzzle: () => {},
  loadLevel: () => {}
};

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

const sampleAnim = `speaker: Overlord
---
talkAnim overlordTalk
===
title: AnimNode
---
Overlord: Hi
===`;

describe('DialogManager loadPuzzle command', () => {
  it('parses loadPuzzle command from yarn node', () => {
    const dm = new DialogManager(sample, noopHandlers);
    dm.start('TestNode');
    const content = dm.getCurrent();
    expect(content.command).toEqual({ name: 'loadPuzzle', args: ['TowerOfHanoi'] });
  });
});

describe('DialogManager loadLevel command', () => {
  it('parses loadLevel command from yarn node', () => {
    const dm = new DialogManager(sampleLevel, noopHandlers);
    dm.start('LevelNode');
    const content = dm.getCurrent();
    expect(content.command).toEqual({ name: 'loadLevel', args: ['Sector7'] });
  });
});

describe('speaker animation definitions', () => {
  it('loads talk animation for speaker', () => {
    const dm = new DialogManager(sampleAnim, noopHandlers);
    dm.start('AnimNode');
    expect(dm.getAnimationForSpeaker('Overlord')).toBe('overlordTalk');
  });
  it('throws if speaker not defined', () => {
    const dm = new DialogManager(sampleAnim, noopHandlers);
    expect(() => dm.getAnimationForSpeaker('Unknown')).toThrow();
  });
});

const sampleLines = `title: LinesNode
---
A: one
A: two
B: three
===`;

const sampleCmd = `title: CmdNode
---
Overlord: Do it
<<loadPuzzle TowerOfHanoi>>
===`;

describe('headless dialogue stepping', () => {
  it('groups lines by speaker', () => {
    const dm = new DialogManager(sampleLines, noopHandlers);
    dm.start('LinesNode');
    const first = dm.nextLines();
    expect(first).toEqual({ lines: ['A: one', 'A: two'], speaker: 'A' });
    const second = dm.nextLines();
    expect(second).toEqual({ lines: ['B: three'], speaker: 'B' });
    const done = dm.nextLines();
    expect(done).toBeNull();
  });

  it('executes command callbacks', () => {
    const calls: string[] = [];
    const dm = new DialogManager(sampleCmd, {
      loadPuzzle: args => calls.push(args[0]),
      loadLevel: () => {}
    });
    dm.start('CmdNode');
    const lines = dm.nextLines();
    expect(lines?.speaker).toBe('Overlord');
    expect(calls).toEqual(['TowerOfHanoi']);
  });
});
