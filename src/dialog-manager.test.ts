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

  describe.skip('Conditional Logic and Visited State', () => {
    const conditionalYarn = `
title: Start
---
Guide: Welcome!
-> Visit the shop
    <<detour Shop>>
-> {Shop} Thanks for visiting the shop
    <<jump ThankYou>>
-> Continue
    <<jump End>>
===
title: Shop
---
Merchant: Welcome to my shop!
===
title: ThankYou
---
Guide: You're welcome!
===
title: End
---
Guide: Goodbye!
===`;

    it('should track visited state and show/hide conditional options', () => {
      const dm = new DialogManager(conditionalYarn, noopHandlers);
      
      // Start dialogue
      const firstEvent = dm.start('Start');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Welcome!');
      expect(firstEvent.speaker).toBe('Guide');
      
      // Get initial options (should only show 2, not the conditional one)
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('choice');
      expect(secondEvent.options).toHaveLength(2);
      expect(secondEvent.options[0].text).toBe('Visit the shop');
      expect(secondEvent.options[1].text).toBe('Continue');
      
      // Visit shop
      const thirdEvent = dm.choose(0);
      expect(thirdEvent.type).toBe('line');
      expect(thirdEvent.text).toBe('Welcome to my shop!');
      expect(thirdEvent.speaker).toBe('Merchant');
      
      // Return from detour - should now show conditional option
      const fourthEvent = dm.advance();
      expect(fourthEvent.type).toBe('choice');
      expect(fourthEvent.options).toHaveLength(3);
      expect(fourthEvent.options[1].text).toBe('Thanks for visiting the shop');
    });

    it('should mark options as visited when targets are visited', () => {
      const dm = new DialogManager(conditionalYarn, noopHandlers);
      
      const firstEvent = dm.start('Start');
      const secondEvent = dm.advance();
      expect(secondEvent.options[0].visited).toBe(false);
      
      // Visit shop
      const thirdEvent = dm.choose(0);
      const fourthEvent = dm.advance(); // Return from detour
      
      // Shop option should now be marked as visited
      expect(fourthEvent.options[0].visited).toBe(true);
    });
  });

  describe.skip('Edge Cases', () => {
    const emptyYarn = `
title: Empty
---
===`;

    it('should handle empty nodes gracefully', () => {
      const dm = new DialogManager(emptyYarn, noopHandlers);
      
      const firstEvent = dm.start('Empty');
      expect(firstEvent.type).toBe('end');
    });

    const invalidJumpYarn = `
title: BadJump
---
Guide: Going nowhere.
<<jump NonExistent>>
===`;

    it('should throw error for invalid jump targets', () => {
      const dm = new DialogManager(invalidJumpYarn, noopHandlers);
      
      const firstEvent = dm.start('BadJump');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Going nowhere.');
      
      // Should throw when trying to jump to non-existent node
      expect(() => dm.advance()).toThrow("Node 'NonExistent' does not exist");
    });

    const noSpeakerYarn = `
title: NoSpeaker
---
This line has no speaker.
Another line without speaker.
===`;

    it('should handle lines without speakers', () => {
      const dm = new DialogManager(noSpeakerYarn, noopHandlers);
      
      const firstEvent = dm.start('NoSpeaker');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('This line has no speaker.');
      expect(firstEvent.speaker).toBeNull();
      
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('line');
      expect(secondEvent.text).toBe('Another line without speaker.');
      expect(secondEvent.speaker).toBeNull();
    });
  });
});