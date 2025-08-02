import { describe, it, expect } from 'vitest';
import { parseGab, GabNode, validateGab, GabParseError } from './gab-utils';

describe('gab-vscode linter', () => {
  describe('basic node parsing', () => {
    it('parses a simple node with title, tags, and speaker dialogue', () => {
      const content = `title: Title
tags: tags
---
Speaker: test line
===`;

      const result = parseGab(content);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        title: 'Title',
        body: 'Speaker: test line',
        metadata: { tags: 'tags' },
      } as GabNode);
    });

    it('validates that a simple terminating node does not show as non-terminating', () => {
      const content = `title: TestNode
tags: test
---
Speaker: test line
===`;

      const nodes = parseGab(content);
      const result = validateGab(nodes, 'TestNode');

      // This node should be naturally terminating since it has no outgoing edges
      expect(result.nonterminating).not.toContain('TestNode');
      expect(result.unreachable).not.toContain('TestNode');
    });

    it('parses node without tags', () => {
      const content = `title: SimpleNode
---
Speaker: hello world
===`;

      const result = parseGab(content);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        title: 'SimpleNode',
        body: 'Speaker: hello world',
        metadata: {},
      } as GabNode);
    });

    it('handles multiple lines of dialogue', () => {
      const content = `title: MultiLine
---
Speaker1: First line
Speaker2: Second line
Speaker1: Third line
===`;

      const result = parseGab(content);
      expect(result.length).toBe(1);
      expect(result[0].body).toBe(
        'Speaker1: First line\nSpeaker2: Second line\nSpeaker1: Third line'
      );
    });
    it('reports unknown metadata fields', () => {
      const content = `title: Foo\n tag: bar\n---\n===`;
      const errors: GabParseError[] = [];
      parseGab(content, errors);
      expect(errors).toEqual([{ line: 1, message: "Unknown field 'tag' in node 'Foo'" }]);
    });
  });

  describe('validation logic', () => {
    it('recognizes nodes with choices as having outgoing edges', () => {
      const content = `title: ChoiceNode
---
Speaker: Choose an option
-> Option 1
    <<jump Target1>>
-> Option 2
    <<jump Target2>>
===

title: Target1
---
Speaker: You chose option 1
===

title: Target2
---
Speaker: You chose option 2
===`;

      const nodes = parseGab(content);
      const result = validateGab(nodes, 'ChoiceNode');

      expect(result.nonterminating).not.toContain('ChoiceNode');
      // Target1 and Target2 should be naturally terminating since they have no outgoing edges
      expect(result.nonterminating).toEqual([]);
    });

    it('recognizes return commands as terminating', () => {
      const content = `title: ReturnNode
---
Speaker: This should return
<<return>>
===`;

      const nodes = parseGab(content);
      const result = validateGab(nodes, 'ReturnNode');

      // This should be terminating because of the return command
      expect(result.nonterminating).not.toContain('ReturnNode');
    });

    it('recognizes nodes that do not terminate', () => {
      const content = `title: Bookstore_Start
---
Overlord: This is the old Central Library Bookstore, 11235.
Overlord: The automated archive system is still functional.
Overlord: You might find useful information about the city's infrastructure here.
-> Search the archives
    <<jump Bookstore_Archives>>
===

title: Bookstore_Archives
---
Speaker: Choose an option
-> Option 1
    <<jump Bookstore_Start>>
===

title: Target1
---
Speaker: You chose option 1
===

title: Target2
---
Speaker: You chose option 2
===`;

      const nodes = parseGab(content);
      const result = validateGab(nodes, 'Bookstore_Start');

      expect(result.nonterminating).toContain('Bookstore_Start');
    });

    it('treats examine nodes as additional start points for non-termination checks', () => {
      const content = `title: Start
---
Speaker: start
===

title: Examine_Start
tags: examine
---
Speaker: examining
-> Go
    <<jump Loop>>
===

title: Loop
---
Speaker: in loop
-> Back
    <<jump Examine_Start>>
===`;

      const nodes = parseGab(content);
      const result = validateGab(nodes, 'Start');

      expect(result.unreachable).toEqual([]);
      expect(result.nonterminating).toContain('Loop');
      expect(result.nonterminating).not.toContain('Examine_Start');
    });
  });
});
