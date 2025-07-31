import { describe, it, expect, beforeEach } from 'vitest';
import { DialogManager } from './dialog-manager';

describe('DialogManager Tests', () => {
  let commandCalls: { name: string; args: string[] }[] = [];
  let currentManager: DialogManager | null = null;

  const noopHandlers = {
    loadPuzzle: () => {},
    loadLevel: () => {},
    return: () => {}
  };
  
  const testHandlers = {
    loadPuzzle: (args: string[]) => {
      commandCalls.push({ name: 'loadPuzzle', args });
      // Simulate async command completion
      setTimeout(() => currentManager?.completeCommand(), 0);
    },
    loadLevel: (args: string[]) => {
      commandCalls.push({ name: 'loadLevel', args });
      // Simulate immediate completion for level loading
      setTimeout(() => currentManager?.completeCommand(), 0);
    },
    return: (args: string[]) => {
      commandCalls.push({ name: 'return', args });
      // Handle return command exactly like main app
      const ret = currentManager?.popReturnStack();
      if (ret) {
        currentManager?.goto(ret);
      }
      currentManager?.completeCommand();
    }
  };

  beforeEach(() => {
    commandCalls = [];
    currentManager = null;
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

    it('parses loadPuzzle command from yarn node', () => {
      const dm = new DialogManager(samplePuzzle, noopHandlers);
      dm.start('TestNode');
      const content = dm.getCurrent();
      expect(content.command).toEqual({ name: 'loadPuzzle', args: ['TowerOfHanoi'] });
    });

    it('parses loadLevel command from yarn node', () => {
      const dm = new DialogManager(sampleLevel, noopHandlers);
      dm.start('LevelNode');
      const content = dm.getCurrent();
      expect(content.command).toEqual({ name: 'loadLevel', args: ['Sector7'] });
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
      dm.start('AnimNode');
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

    it('groups lines by speaker', () => {
      const dm = new DialogManager(sampleLines, noopHandlers);
      currentManager = dm;
      dm.start('LinesNode');
      
      const first = dm.nextLines();
      expect(first).toEqual({ lines: ['A: one', 'A: two'], speaker: 'A' });
      
      const second = dm.nextLines();
      expect(second).toEqual({ lines: ['B: three'], speaker: 'B' });
      
      const third = dm.nextLines();
      expect(third).toEqual({ lines: ['Alice: Hello there!', 'Alice: How are you doing?'], speaker: 'Alice' });
      
      const fourth = dm.nextLines();
      expect(fourth).toEqual({ lines: ['Bob: I\'m doing well, thanks.'], speaker: 'Bob' });
      
      const done = dm.nextLines();
      expect(done).toBeNull();
    });

    it('correctly indicates when dialogue continues with hasMoreLines()', () => {
      const dm = new DialogManager(sampleLines, noopHandlers);
      currentManager = dm;
      dm.start('LinesNode');
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // A's block
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // B's block
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // Alice's block
      
      expect(dm.hasMoreLines()).toBe(true);
      dm.nextLines(); // Bob's block
      
      expect(dm.hasMoreLines()).toBe(false);
    });

    it('retrieves correct speaker animations', () => {
      const dm = new DialogManager(sampleLines, noopHandlers);
      currentManager = dm;
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

    it('executes command callbacks only when follow() is called', async () => {
      const calls: string[] = [];
      let manager: DialogManager;
      const dm = new DialogManager(sampleCmd, {
        loadPuzzle: args => {
          calls.push(args[0]);
          // Complete command immediately for test
          setTimeout(() => manager.completeCommand(), 0);
        },
        loadLevel: () => {}
      });
      manager = dm;
      dm.start('CmdNode');
      
      // Commands should NOT execute during nextLines()
      const lines = dm.nextLines();
      expect(lines?.speaker).toBe('Overlord');
      expect(calls).toEqual([]); // No commands executed yet
      
      // Commands should execute when follow() is called after all dialogue
      await dm.follow();
      expect(calls).toEqual(['TowerOfHanoi']);
    });

    it('should NOT execute commands during nextLines()', () => {
      const dm = new DialogManager(commandYarn, testHandlers);
      currentManager = dm;
      dm.start('PuzzleNode');
      
      // Read all dialogue lines
      dm.nextLines(); // First guide block
      expect(commandCalls).toHaveLength(0); // No commands yet
      
      dm.nextLines(); // This should return null (no more lines)
      expect(commandCalls).toHaveLength(0); // Still no commands
    });

    it('should execute commands only when follow() is called after all dialogue', async () => {
      const dm = new DialogManager(commandYarn, testHandlers);
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
      const dm = new DialogManager(commandYarn, testHandlers);
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
      const dm = new DialogManager(jumpYarn, testHandlers);
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
      const dm = new DialogManager(detourYarn, testHandlers);
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
      const dm = new DialogManager(optionsYarn, testHandlers);
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
      const dm = new DialogManager(conditionalYarn, testHandlers);
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
      const dm = new DialogManager(conditionalYarn, testHandlers);
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
      const dm = new DialogManager(emptyYarn, testHandlers);
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

    it('should throw error for invalid jump targets', async () => {
      const dm = new DialogManager(invalidJumpYarn, testHandlers);
      currentManager = dm;
      dm.start('BadJump');
      
      dm.nextLines();
      await expect(dm.follow()).rejects.toThrow("Node 'NonExistent' does not exist");
    });

    const noSpeakerYarn = `
title: NoSpeaker
---
This line has no speaker.
Another line without speaker.
===`;

    it('should handle lines without speakers', () => {
      const dm = new DialogManager(noSpeakerYarn, testHandlers);
      currentManager = dm;
      dm.start('NoSpeaker');
      
      const result = dm.nextLines();
      expect(result?.speaker).toBeNull();
      expect(result?.lines).toHaveLength(2);
      expect(result?.lines[0]).toBe('This line has no speaker.');
    });
  });
});