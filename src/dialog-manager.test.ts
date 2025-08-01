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

    it('generates line and action events from yarn node with puzzle command', () => {
      const dm = new DialogManager(samplePuzzle, noopHandlers);
      
      const firstEvent = dm.start('TestNode');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Begin');
      expect(firstEvent.speaker).toBe('Overlord');
      
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('action');
      expect(secondEvent.command).toBe('loadPuzzle');
      expect(secondEvent.args).toEqual(['TowerOfHanoi']);
      
      const thirdEvent = dm.advance();
      expect(thirdEvent.type).toBe('end');
    });

    it('generates line and action events from yarn node with level command', () => {
      const dm = new DialogManager(sampleLevel, noopHandlers);
      
      const firstEvent = dm.start('LevelNode');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Proceed');
      expect(firstEvent.speaker).toBe('Overlord');
      
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('action');
      expect(secondEvent.command).toBe('loadLevel');
      expect(secondEvent.args).toEqual(['Sector7']);
      
      const thirdEvent = dm.advance();
      expect(thirdEvent.type).toBe('end');
    });
  });

  describe('Speaker Animation System', () => {
    const sampleAnim = `speaker: Overlord
---
talkAnim overlordTalk
===
title: AnimNode
---
Overlord: Hi
===`;

    it('loads talk animation for speaker', () => {
      const dm = new DialogManager(sampleAnim, noopHandlers);
      expect(dm.getAnimationForSpeaker('Overlord')).toBe('overlordTalk');
    });

    it('throws if speaker not defined', () => {
      const dm = new DialogManager(sampleAnim, noopHandlers);
      expect(() => dm.getAnimationForSpeaker('Unknown')).toThrow();
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

    it('generates individual line events for each dialogue line', () => {
      const dm = new DialogManager(sampleLines, noopHandlers);
      
      const events: DialogEvent[] = [];
      let event = dm.start('LinesNode');
      events.push(event);
      
      while (event.type !== 'end') {
        event = dm.advance();
        events.push(event);
      }
      
      expect(events).toHaveLength(7); // 6 lines + 1 end
      
      expect(events[0]).toEqual({ type: 'line', text: 'one', speaker: 'A' });
      expect(events[1]).toEqual({ type: 'line', text: 'two', speaker: 'A' });
      expect(events[2]).toEqual({ type: 'line', text: 'three', speaker: 'B' });
      expect(events[3]).toEqual({ type: 'line', text: 'Hello there!', speaker: 'Alice' });
      expect(events[4]).toEqual({ type: 'line', text: 'How are you doing?', speaker: 'Alice' });
      expect(events[5]).toEqual({ type: 'line', text: 'I\'m doing well, thanks.', speaker: 'Bob' });
      expect(events[6]).toEqual({ type: 'end' });
    });

    it('retrieves correct speaker animations', () => {
      const dm = new DialogManager(sampleLines, noopHandlers);
      expect(dm.getAnimationForSpeaker('Alice')).toBe('aliceTalk');
      expect(dm.getAnimationForSpeaker('Bob')).toBe('bobTalk');
    });
  });

  describe('Command System and Timing', () => {
    const sampleCmd = `title: CmdNode
---
Overlord: Do it
<<loadPuzzle TowerOfHanoi>>
===`;

    const commandYarn = `
title: PuzzleNode
---
Guide: Solve this puzzle.
Guide: Good luck!
<<loadPuzzle TowerOfHanoi>>
<<jump AfterPuzzle>>
===
title: AfterPuzzle
---
Guide: Well done!
===`;

    it('generates action events for commands in dialogue', () => {
      const dm = new DialogManager(sampleCmd, noopHandlers);
      
      const firstEvent = dm.start('CmdNode');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Do it');
      expect(firstEvent.speaker).toBe('Overlord');
      
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('action');
      expect(secondEvent.command).toBe('loadPuzzle');
      expect(secondEvent.args).toEqual(['TowerOfHanoi']);
    });

    it('generates events in correct order: lines, then actions, then navigation', () => {
      const dm = new DialogManager(commandYarn, noopHandlers);
      
      const firstEvent = dm.start('PuzzleNode');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Solve this puzzle.');
      expect(firstEvent.speaker).toBe('Guide');
      
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('line');
      expect(secondEvent.text).toBe('Good luck!');
      expect(secondEvent.speaker).toBe('Guide');
      
      const thirdEvent = dm.advance();
      expect(thirdEvent.type).toBe('action');
      expect(thirdEvent.command).toBe('loadPuzzle');
      expect(thirdEvent.args).toEqual(['TowerOfHanoi']);
      
      // After action, should automatically navigate to AfterPuzzle
      const fourthEvent = dm.advance();
      expect(fourthEvent.type).toBe('line');
      expect(fourthEvent.text).toBe('Well done!');
      expect(fourthEvent.speaker).toBe('Guide');
    });
  });

  describe('Navigation and Branching', () => {
    const jumpYarn = `
title: Start
---
Player: I should go somewhere.
<<jump Middle>>
===
title: Middle
---
Guide: You made it to the middle.
<<jump End>>
===
title: End
---
Guide: Journey complete!
<<jump Final>>
===
title: Final
---
Guide: All done now!
===`;

    it('should handle jump commands correctly through multiple nodes', () => {
      const dm = new DialogManager(jumpYarn, noopHandlers);
      
      // Start node
      const firstEvent = dm.start('Start');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('I should go somewhere.');
      expect(firstEvent.speaker).toBe('Player');
      
      // Should automatically jump to Middle after the line
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('line');
      expect(secondEvent.text).toBe('You made it to the middle.');
      expect(secondEvent.speaker).toBe('Guide');
      
      // Should automatically jump to End
      const thirdEvent = dm.advance();
      expect(thirdEvent.type).toBe('line');
      expect(thirdEvent.text).toBe('Journey complete!');
      expect(thirdEvent.speaker).toBe('Guide');
      
      // Should automatically jump to Final
      const fourthEvent = dm.advance();
      expect(fourthEvent.type).toBe('line');
      expect(fourthEvent.text).toBe('All done now!');
      expect(fourthEvent.speaker).toBe('Guide');
      
      // Should end
      const fifthEvent = dm.advance();
      expect(fifthEvent.type).toBe('end');
    });

    const detourYarn = `
title: Main
---
Guide: Main conversation.
-> Go on a detour
    <<detour Detour>>
-> Continue main
    <<jump End>>
===
title: Detour
---
Helper: This is a detour.
Helper: Returning now.
===
title: End
---
Guide: All done!
===`;

    it('should handle detour commands with return stack', () => {
      const dm = new DialogManager(detourYarn, noopHandlers);
      
      // Start at Main
      const firstEvent = dm.start('Main');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Main conversation.');
      expect(firstEvent.speaker).toBe('Guide');
      
      // Should get choice event
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('choice');
      expect(secondEvent.options).toHaveLength(2);
      expect(secondEvent.options[0].text).toBe('Go on a detour');
      expect(secondEvent.options[0].detour).toBe(true);
      
      // Choose detour option
      const thirdEvent = dm.choose(0);
      expect(thirdEvent.type).toBe('line');
      expect(thirdEvent.text).toBe('This is a detour.');
      expect(thirdEvent.speaker).toBe('Helper');
      
      // Continue detour
      const fourthEvent = dm.advance();
      expect(fourthEvent.type).toBe('line');
      expect(fourthEvent.text).toBe('Returning now.');
      expect(fourthEvent.speaker).toBe('Helper');
      
      // Should return to main options
      const fifthEvent = dm.advance();
      expect(fifthEvent.type).toBe('choice');
      expect(fifthEvent.options).toHaveLength(2); // Back to main options
    });

    const optionsYarn = `
title: Start
---
Guide: Choose your path.
-> Path A
    <<jump PathA>>
-> Path B
    <<jump PathB>>
===
title: PathA
---
Guide: You chose path A.
===
title: PathB
---
Guide: You chose path B.
===`;

    it('should navigate to correct nodes when choosing options', () => {
      const dm = new DialogManager(optionsYarn, noopHandlers);
      
      // Start with dialogue
      const firstEvent = dm.start('Start');
      expect(firstEvent.type).toBe('line');
      expect(firstEvent.text).toBe('Choose your path.');
      expect(firstEvent.speaker).toBe('Guide');
      
      // Get choice options
      const secondEvent = dm.advance();
      expect(secondEvent.type).toBe('choice');
      expect(secondEvent.options).toHaveLength(2);
      expect(secondEvent.options[0].text).toBe('Path A');
      expect(secondEvent.options[1].text).toBe('Path B');
      
      // Choose Path B
      const thirdEvent = dm.choose(1);
      expect(thirdEvent.type).toBe('line');
      expect(thirdEvent.text).toBe('You chose path B.');
      expect(thirdEvent.speaker).toBe('Guide');
    });
  });

  describe('Conditional Logic and Visited State', () => {
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

  describe('Edge Cases', () => {
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