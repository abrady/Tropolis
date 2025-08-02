import { describe, it, expect } from 'vitest';
import { DialogueManager } from './dialogue-manager';

describe('DialogueManager Tests', () => {

  const noopHandlers = {
    loadPuzzle: () => {},
    loadLevel: () => {},
    return: () => {}
  };
  

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

    it('generates line and action events from gab node with puzzle command', () => {
      const dm = new DialogueManager(samplePuzzle, noopHandlers);
      
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

    it('generates line and action events from gab node with level command', () => {
      const dm = new DialogueManager(sampleLevel, noopHandlers);
      
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
      const dm = new DialogueManager(sampleChoice, noopHandlers);
      
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
talkAnim: aliceTalk
===
speaker: Bob  
---
talkAnim: bobTalk
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
      const dm = new DialogueManager(sampleLines, noopHandlers);
      expect(dm.getAnimationForSpeaker('Alice')).toBe('aliceTalk');
      expect(dm.getAnimationForSpeaker('Bob')).toBe('bobTalk');
    });
  });

  describe('examine node detection', () => {
    const examineDialogue = `title: RegularNode
---
Alice: This is a regular dialogue node.
===
title: ExamineNode
tags: examine
---
Alice: This is an examine dialogue node.
===`;

    it('detects examine tagged nodes correctly', () => {
      const dm = new DialogueManager(examineDialogue, noopHandlers);
      
      // Regular node should not be marked as examine
      dm.start('RegularNode');
      expect(dm.isCurrentNodeExamine()).toBe(false);
      
      // Examine tagged node should be marked as examine
      dm.start('ExamineNode');
      expect(dm.isCurrentNodeExamine()).toBe(true);
    });

    it('returns false for non-existent current node', () => {
      const dm = new DialogueManager(examineDialogue, noopHandlers);
      // Before starting any dialogue
      expect(dm.isCurrentNodeExamine()).toBe(false);
    });
  });
});