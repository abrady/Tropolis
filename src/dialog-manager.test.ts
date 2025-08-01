import { describe, it, expect, beforeEach } from 'vitest';
import { DialogManager, DialogEvent } from './dialog-manager';

describe('DialogManager Tests', () => {
  let commandCalls: { name: string; args: string[] }[] = [];

  const noopHandlers = {
    loadPuzzle: () => {},
    loadLevel: () => {},
    return: () => {}
  };
  
  const testHandlers = {
    loadPuzzle: (args: string[]) => {
      commandCalls.push({ name: 'loadPuzzle', args });
    },
    loadLevel: (args: string[]) => {
      commandCalls.push({ name: 'loadLevel', args });
    },
    return: (args: string[]) => {
      commandCalls.push({ name: 'return', args });
    }
  };

  beforeEach(() => {
    commandCalls = [];
  });

  describe('Basic Command Parsing', () => {
    const samplePuzzle = `title: TestNode
---
Overlord: Begin
<<loadPuzzle TowerOfHanoi>>
===`;

    const sampleLevel = `title: LevelNode
---
Overlord: Proceed
<<loadLevel Sector7>>
===`;

    const sampleChoice = `title: ChoiceNode
---
Overlord: Choose an option
-> Option 1
    <<detour Option1>>
-> {Option1} Option 2
    <<jump Option2>>
===

title: Option1
---
Overlord: You chose option 1
===

title: Option2
---
Overlord: You chose option 2
===
`;

    it('generates line and action events from yarn node with puzzle command', () => {
      const dm = new DialogManager(samplePuzzle, noopHandlers);
      
      dm.start('TestNode');
      const gen = dm.advance();
      let n = gen.next().value;
      expect(n.type).toBe('line');
      expect(n.text).toBe('Begin');
      expect(n.speaker).toBe('Overlord');
      
      n = gen.next().value;
      expect(n.type).toBe('command');
      expect(n.command).toBe('loadPuzzle');
      expect(n.args).toEqual(['TowerOfHanoi']);
      
      const thirdEvent = gen.next();
      expect(thirdEvent.done).toBe(true);
    });

    it('generates line and action events from yarn node with level command', () => {
      const dm = new DialogManager(sampleLevel, noopHandlers);
      
      dm.start('LevelNode');
      const gen = dm.advance();
      const firstEvent = gen.next().value;
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Proceed');
      expect(firstEvent.speaker).toBe('Overlord');

      const secondEvent = gen.next().value;
      expect(secondEvent.type).toBe('command');
      expect(secondEvent.command).toBe('loadLevel');
      expect(secondEvent.args).toEqual(['Sector7']);

      const thirdEvent = gen.next();
      expect(thirdEvent.done).toBe(true);
    });

    it('generates choice events with detour and jump commands', () => {
      const dm = new DialogManager(sampleChoice, noopHandlers);
      
      dm.start('ChoiceNode');
      const gen = dm.advance();
      let n = gen.next().value;
      expect(n.type).toBe('line');
      expect(n.text).toBe('Choose an option');
      expect(n.speaker).toBe('Overlord');

      n = gen.next().value;
      expect(n.type).toBe('choice');
      expect(n.options).toHaveLength(1);
      expect(n.options[0].text).toBe('Option 1');
      expect(n.options[0].detour).toBe(true);
      expect(n.options[0].visited).toBe(false);

      // Choose first option
      const choiceEvent = gen.next({ type: 'choice', optionIndex: 0 }).value;
      expect(choiceEvent.type).toBe('line');
      expect(choiceEvent.text).toBe('You chose option 1');
      expect(choiceEvent.speaker).toBe('Overlord');

      // this should pop back to parent and skip to the options
      n = gen.next().value;
      expect(n.type).toBe('choice');
      expect(n.options).toHaveLength(2);
      expect(n.options[0].text).toBe('Option 1');
      expect(n.options[0].detour).toBe(true);
      expect(n.options[0].visited).toBe(true);
      expect(n.options[1].text).toBe('Option 2');
      expect(n.options[1].visited).toBe(false);
      expect(n.options[1].detour).toBe(false);

      // Choose second option
      const choiceEvent2 = gen.next({ type: 'choice', optionIndex: 1 }).value;
      expect(choiceEvent2.type).toBe('line');
      expect(choiceEvent2.text).toBe('You chose option 2');
      expect(choiceEvent2.speaker).toBe('Overlord');

      // Advance to end
      const endEvent = gen.next();
      expect(endEvent.done).toBe(true);
    });
  });

  describe('Core Dialogue Flow', () => {
    const sampleLines = `
speaker: Alice
---
talkAnim aliceTalk
===
speaker: Bob  
---
talkAnim bobTalk
===
title: LinesNode
---
A: one
A: two
B: three
Alice: Hello there!
Alice: How are you doing?
Bob: I'm doing well, thanks.
===`;

    it('retrieves correct speaker animations', () => {
      const dm = new DialogManager(sampleLines, noopHandlers);
      expect(dm.getAnimationForSpeaker('Alice')).toBe('aliceTalk');
      expect(dm.getAnimationForSpeaker('Bob')).toBe('bobTalk');
    });
  });
});