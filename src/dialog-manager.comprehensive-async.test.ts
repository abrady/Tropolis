import { describe, it, expect, beforeEach } from 'vitest';
import { DialogManager } from './dialog-manager';

describe('DialogManager Comprehensive Tests (Async)', () => {
  let commandCalls: { name: string; args: string[] }[] = [];
  let currentManager: DialogManager | null = null;
  
  const handlers = {
    loadPuzzle: (args: string[]) => {
      commandCalls.push({ name: 'loadPuzzle', args });
      // Simulate async command completion
      setTimeout(() => currentManager?.completeCommand(), 0);
    },
    loadLevel: (args: string[]) => {
      commandCalls.push({ name: 'loadLevel', args });
      // Simulate immediate completion for level loading  
      setTimeout(() => currentManager?.completeCommand(), 0);
    }
  };

  beforeEach(() => {
    commandCalls = [];
    currentManager = null;
  });

  describe('Core Dialogue Flow', () => {
    const basicYarn = `
speaker: Alice
---
talkAnim aliceTalk
===
speaker: Bob  
---
talkAnim bobTalk
===
title: Start
---
Alice: Hello there!
Alice: How are you doing?
Bob: I'm doing well, thanks.
Alice: That's great to hear.
===`;

    it('should return correct speaker and text blocks with nextLines()', () => {
      const dm = new DialogManager(basicYarn, handlers);
      currentManager = dm;
      dm.start('Start');
      
      const first = dm.nextLines();
      expect(first).toEqual({
        lines: ['Alice: Hello there!', 'Alice: How are you doing?'],
        speaker: 'Alice'
      });
      
      const second = dm.nextLines();
      expect(second).toEqual({
        lines: ['Bob: I\'m doing well, thanks.'],
        speaker: 'Bob'
      });
      
      const third = dm.nextLines();
      expect(third).toEqual({
        lines: ['Alice: That\'s great to hear.'],
        speaker: 'Alice'
      });
      
      const done = dm.nextLines();
      expect(done).toBeNull();
    });

    it('should correctly indicate when dialogue continues with hasMoreLines()', () => {
      const dm = new DialogManager(basicYarn, handlers);
      currentManager = dm;
      dm.start('Start');
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // Alice's first block
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // Bob's block
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // Alice's final block
      
      expect(dm.hasMoreLines()).toBe(false);
    });

    it('should retrieve correct speaker animations', () => {
      const dm = new DialogManager(basicYarn, handlers);
      currentManager = dm;
      expect(dm.getAnimationForSpeaker('Alice')).toBe('aliceTalk');
      expect(dm.getAnimationForSpeaker('Bob')).toBe('bobTalk');
      expect(() => dm.getAnimationForSpeaker('Unknown')).toThrow();
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

    it('should handle jump commands correctly through multiple nodes', async () => {
      const dm = new DialogManager(jumpYarn, handlers);
      currentManager = dm;
      dm.start('Start');
      
      // Read the initial dialogue
      const first = dm.nextLines();
      expect(first?.speaker).toBe('Player');
      expect(dm.hasMoreLines()).toBe(false);
      
      // Follow the jump to Middle
      await dm.follow();
      let content = dm.getCurrent();
      expect(content.lines[0]).toContain('You made it to the middle');
      
      // Read middle dialogue and jump to End
      dm.nextLines();
      await dm.follow();
      content = dm.getCurrent();
      expect(content.lines[0]).toContain('Journey complete!');
      
      // Read end dialogue and jump to Final
      dm.nextLines();
      await dm.follow();
      content = dm.getCurrent();
      expect(content.lines[0]).toContain('All done now!');
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

    it('should handle detour commands with return stack', async () => {
      const dm = new DialogManager(detourYarn, handlers);
      currentManager = dm;
      dm.start('Main');
      
      // Read main dialogue
      dm.nextLines();
      
      // Choose detour option
      const content = dm.getCurrent();
      expect(content.options).toHaveLength(2);
      expect(content.options[0].detour).toBe(true);
      
      dm.choose(0); // Choose detour
      
      // Should be in detour
      const detourLines = dm.nextLines();
      expect(detourLines?.speaker).toBe('Helper');
      
      // Finish detour dialogue
      dm.nextLines(); // Second Helper line
      expect(dm.hasMoreLines()).toBe(false);
      
      // Follow should return to main
      await dm.follow();
      const afterDetour = dm.getCurrent();
      expect(afterDetour.options).toHaveLength(2); // Back to main options
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
      const dm = new DialogManager(optionsYarn, handlers);
      currentManager = dm;
      dm.start('Start');
      
      dm.nextLines(); // Read guide line
      
      const content = dm.getCurrent();
      expect(content.options).toHaveLength(2);
      expect(content.options[0].text).toBe('Path A');
      expect(content.options[1].text).toBe('Path B');
      
      dm.choose(1); // Choose Path B
      
      const result = dm.nextLines();
      expect(result?.lines[0]).toContain('You chose path B');
    });
  });

  describe('Command System and Timing', () => {
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

    it('should NOT execute commands during nextLines()', () => {
      const dm = new DialogManager(commandYarn, handlers);
      currentManager = dm;
      dm.start('PuzzleNode');
      
      // Read all dialogue lines
      dm.nextLines(); // First guide block
      expect(commandCalls).toHaveLength(0); // No commands yet
      
      dm.nextLines(); // This should return null (no more lines)
      expect(commandCalls).toHaveLength(0); // Still no commands
    });

    it('should execute commands only when follow() is called after all dialogue', async () => {
      const dm = new DialogManager(commandYarn, handlers);
      currentManager = dm;
      dm.start('PuzzleNode');
      
      // Read all dialogue
      dm.nextLines();
      expect(dm.hasMoreLines()).toBe(false);
      
      // Now follow should execute command and jump
      await dm.follow();
      
      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0]).toEqual({ name: 'loadPuzzle', args: ['TowerOfHanoi'] });
      
      // Should have jumped to AfterPuzzle
      const content = dm.getCurrent();
      expect(content.lines[0]).toContain('Well done!');
    });

    it('should track command running state', async () => {
      const dm = new DialogManager(commandYarn, handlers);
      currentManager = dm;
      dm.start('PuzzleNode');
      
      dm.nextLines();
      expect(dm.isCommandRunning()).toBe(false);
      
      // Start follow() but don't await - command should be running
      const followPromise = dm.follow();
      expect(dm.isCommandRunning()).toBe(true);
      
      // Should error if trying to call follow() while running
      await expect(dm.follow()).rejects.toThrow('Cannot call follow() while command is running');
      
      // Wait for command to complete
      await followPromise;
      expect(dm.isCommandRunning()).toBe(false);
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

    it('should track visited state and show/hide conditional options', async () => {
      const dm = new DialogManager(conditionalYarn, handlers);
      currentManager = dm;
      dm.start('Start');
      
      dm.nextLines();
      
      let content = dm.getCurrent();
      // Should only show 2 options (shop and continue, not the conditional thank you)
      expect(content.options).toHaveLength(2);
      expect(content.options[0].text).toBe('Visit the shop');
      expect(content.options[1].text).toBe('Continue');
      
      // Visit shop
      dm.choose(0);
      dm.nextLines(); // Read merchant line
      await dm.follow(); // Return from detour
      
      // Now the conditional option should appear
      content = dm.getCurrent();
      expect(content.options).toHaveLength(3);
      expect(content.options[1].text).toBe('Thanks for visiting the shop');
    });

    it('should mark options as visited when targets are visited', async () => {
      const dm = new DialogManager(conditionalYarn, handlers);
      currentManager = dm;
      dm.start('Start');
      
      dm.nextLines();
      let content = dm.getCurrent();
      expect(content.options[0].visited).toBe(false);
      
      // Visit shop
      dm.choose(0);
      dm.nextLines();
      await dm.follow(); // Return
      
      // Shop option should now be marked as visited
      content = dm.getCurrent();
      expect(content.options[0].visited).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    const emptyYarn = `
title: Empty
---
===`;

    it('should handle empty nodes gracefully', () => {
      const dm = new DialogManager(emptyYarn, handlers);
      currentManager = dm;
      dm.start('Empty');
      
      const content = dm.getCurrent();
      expect(content.lines).toHaveLength(0);
      expect(content.options).toHaveLength(0);
      expect(content.next).toBeNull();
      
      const lines = dm.nextLines();
      expect(lines).toBeNull();
    });

    const invalidJumpYarn = `
title: BadJump
---
Guide: Going nowhere.
<<jump NonExistent>>
===`;

    it('should handle invalid jump targets gracefully', async () => {
      const dm = new DialogManager(invalidJumpYarn, handlers);
      currentManager = dm;
      dm.start('BadJump');
      
      dm.nextLines();
      await expect(dm.follow()).resolves.not.toThrow();
      
      // Should stay in same node or handle gracefully
      const content = dm.getCurrent();
      expect(content).toBeDefined();
    });

    const noSpeakerYarn = `
title: NoSpeaker
---
This line has no speaker.
Another line without speaker.
===`;

    it('should handle lines without speakers', () => {
      const dm = new DialogManager(noSpeakerYarn, handlers);
      currentManager = dm;
      dm.start('NoSpeaker');
      
      const result = dm.nextLines();
      expect(result?.speaker).toBeNull();
      expect(result?.lines).toHaveLength(2);
      expect(result?.lines[0]).toBe('This line has no speaker.');
    });
  });

  describe('Complex Flow Integration', () => {
    const complexYarn = `
speaker: Guide
---
talkAnim guideTalk
===
title: Hub
---
Guide: Welcome to the hub.
-> Visit Area A
    <<detour AreaA>>
-> Visit Area B  
    <<detour AreaB>>
-> {AreaA} {AreaB} You've seen everything!
    <<jump Finale>>
-> Exit
    <<jump Exit>>
===
title: AreaA
---
Guide: This is Area A.
<<loadPuzzle PuzzleA>>
<<jump AreaA_After>>
===
title: AreaA_After
---
Guide: You completed Area A!
===
title: AreaB
---
Guide: This is Area B.
<<loadLevel LevelB>>
===
title: Finale
---
Guide: Congratulations on exploring everything!
===
title: Exit
---
Guide: Thanks for visiting!
===`;

    it('should handle complex branching with multiple conditions and commands', async () => {
      const dm = new DialogManager(complexYarn, handlers);
      currentManager = dm;
      dm.start('Hub');
      
      // Initial state - should show 2 options (areas + exit, not finale)
      dm.nextLines();
      let content = dm.getCurrent();
      expect(content.options).toHaveLength(3);
      
      // Visit Area A
      dm.choose(0);
      dm.nextLines(); // Read area A intro
      await dm.follow(); // Execute puzzle command and jump
      
      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0].name).toBe('loadPuzzle');
      
      // Should be in AreaA_After
      dm.nextLines(); // Read completion message
      await dm.follow(); // Return to hub
      
      // Visit Area B
      content = dm.getCurrent();
      dm.choose(1); // Choose Area B (index may have shifted)
      dm.nextLines();
      await dm.follow(); // Execute level command
      
      expect(commandCalls).toHaveLength(2);
      expect(commandCalls[1].name).toBe('loadLevel');
      
      await dm.follow(); // Return to hub
      
      // Now finale option should be available
      content = dm.getCurrent();
      const finaleOption = content.options.find(opt => opt.text.includes('seen everything'));
      expect(finaleOption).toBeDefined();
    });
  });
});