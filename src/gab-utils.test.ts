import { describe, it, expect } from 'vitest';
import { parseGab, GabNode, parseGabFile, validateSpeakers, validateGab } from './gab-utils';
import { levels } from './examine/levels';
import * as fs from 'fs';
import * as path from 'path';

const sample = `title: Start
---
Hello world
-> Option 1
    Response
-> Option 2
    Another
===
# inter node comment
title: Next
position: 0,0
---
Next node text
===`;

describe('parseGab', () => {
  it('parses nodes from gab text', () => {
    const result = parseGab(sample);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({
      title: 'Start',
      body: 'Hello world\n-> Option 1\n    Response\n-> Option 2\n    Another',
      metadata: {},
    } as GabNode);
    expect(result[1].title).toBe('Next');
    expect(result[1].metadata).toEqual({ position: '0,0' });
    expect(result[1].body).toBe('Next node text');
  });

  it('throws on unknown metadata fields', () => {
    const content = `title: Foo\n tag: bar\n---\n===`;
    expect(() => parseGab(content)).toThrow("Unknown field 'tag' in node 'Foo'");
  });
});

describe('loadLevel validation', () => {
  it('validates that all loadLevel commands reference existing levels', () => {
    const dialogueDir = path.join(__dirname, 'dialogue');

    // Get all available levels from the actual levels object
    const availableLevels = Object.keys(levels);

    // Get all gab files
    const gabFiles = fs.readdirSync(dialogueDir).filter((file) => file.endsWith('.gab'));

    const invalidReferences: { file: string; level: string; line: number }[] = [];

    for (const gabFile of gabFiles) {
      const content = fs.readFileSync(path.join(dialogueDir, gabFile), 'utf-8');
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        const loadLevelMatch = line.match(/<<\s*loadLevel\s+([A-Za-z0-9_]+)\s*>>/);
        if (loadLevelMatch) {
          const referencedLevel = loadLevelMatch[1];
          if (!availableLevels.includes(referencedLevel)) {
            invalidReferences.push({
              file: gabFile,
              level: referencedLevel,
              line: index + 1,
            });
          }
        }
      });
    }

    if (invalidReferences.length > 0) {
      expect(invalidReferences).toEqual([]);
    }
  });
});

describe('comment support', () => {
  it('strips # comments from lines', () => {
    const content = `title: Start # this is a comment
---
Hello world # another comment
-> Option 1 # comment on option
    Response
===`;
    const result = parseGab(content);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Start');
    expect(result[0].body).toBe('Hello world \n-> Option 1 \n    Response');
  });

  it('handles comments in metadata', () => {
    const content = `title: Test
tags: cryo, intro # these are tags
position: 0,0 # coordinates
---
Some dialogue
===`;
    const result = parseGab(content);
    expect(result.length).toBe(1);
    expect(result[0].metadata).toEqual({ tags: 'cryo, intro', position: '0,0' });
  });

  it('handles comments in speaker sections', () => {
    const content = `speaker: Overlord # main character
---
talkAnim: overlordTalk # animation name
===
title: Start
---
Test dialogue
===`;
    const result = parseGabFile(content);
    expect(result.speakers.Overlord).toEqual({ talkAnim: 'overlordTalk' });
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].title).toBe('Start');
  });

  it('strips # comments from anywhere in line', () => {
    const content = `title: HashTag
---
User: I love #hashtags
Bot: Use # for comments though
===`;
    const result = parseGab(content);
    expect(result[0].body).toBe('User: I love \nBot: Use ');
  });

  it('handles empty lines with comments', () => {
    const content = `title: Test
---
Line 1
# this is just a comment line
Line 2
===`;
    const result = parseGab(content);
    expect(result[0].body).toBe('Line 1\n\nLine 2');
  });

  it('handles comments at different positions', () => {
    const content = `title: Position Test
---
Start of line # end comment
   # comment with leading spaces
	# comment with tab
===`;
    const result = parseGab(content);
    expect(result[0].body).toBe('Start of line \n   \n\t');
  });
});

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
});

describe('speaker validation', () => {
  it('validates that all referenced speakers are defined', () => {
    const content = `speaker: Alice
---
talkAnim: aliceTalk
===
speaker: Bob
---
talkAnim: bobTalk
===
title: Conversation
---
Alice: Hello there!
Bob: Hi Alice, how are you?
Alice: I'm doing well, thanks.
===`;
    const gabFile = parseGabFile(content);
    const result = validateSpeakers(gabFile);
    expect(result.undefinedSpeakers).toEqual([]);
  });

  it('detects undefined speakers', () => {
    const content = `speaker: Alice
---
talkAnim: aliceTalk
===
title: Conversation
---
Alice: Hello there!
Charlie: Who is this Charlie guy?
Bob: I don't know.
===`;
    const gabFile = parseGabFile(content);
    const result = validateSpeakers(gabFile);
    expect(result.undefinedSpeakers).toEqual([
      { speaker: 'Charlie', node: 'Conversation', line: 'Charlie: Who is this Charlie guy?' },
      { speaker: 'Bob', node: 'Conversation', line: "Bob: I don't know." },
    ]);
  });

  it('handles speakers with underscores and numbers', () => {
    const content = `speaker: AI_Bot_2
---
talkAnim: robotTalk
===
title: FutureChat
---
AI_Bot_2: Greetings, human.
User123: This speaker is not defined.
===`;
    const gabFile = parseGabFile(content);
    const result = validateSpeakers(gabFile);
    expect(result.undefinedSpeakers).toEqual([
      { speaker: 'User123', node: 'FutureChat', line: 'User123: This speaker is not defined.' },
    ]);
  });

  it('ignores lines that do not match speaker pattern', () => {
    const content = `speaker: Alice
---
talkAnim: aliceTalk
===
title: Test
---
Alice: This is valid dialogue.
-> This is a choice option
    Not speaker: dialogue
Some random text without colon
: Invalid speaker name starting with colon
123Invalid: Numbers can't start speaker names
===`;
    const gabFile = parseGabFile(content);
    const result = validateSpeakers(gabFile);
    expect(result.undefinedSpeakers).toEqual([]);
  });

  it('validates speakers across multiple nodes', () => {
    const content = `speaker: Alice
---
talkAnim: aliceTalk
===
title: Node1
---
Alice: I'm in node 1.
Bob: I'm undefined in node 1.
===
title: Node2
---
Alice: I'm in node 2.
Charlie: I'm undefined in node 2.
===`;
    const gabFile = parseGabFile(content);
    const result = validateSpeakers(gabFile);
    expect(result.undefinedSpeakers).toEqual([
      { speaker: 'Bob', node: 'Node1', line: "Bob: I'm undefined in node 1." },
      { speaker: 'Charlie', node: 'Node2', line: "Charlie: I'm undefined in node 2." },
    ]);
  });

  it('validates speakers in actual gab files', () => {
    const dialogueDir = path.join(__dirname, 'dialogue');
    const gabFiles = fs.readdirSync(dialogueDir).filter((file) => file.endsWith('.gab'));

    const issues: { file: string; speaker: string; node: string }[] = [];

    for (const gabFile of gabFiles) {
      const content = fs.readFileSync(path.join(dialogueDir, gabFile), 'utf-8');
      const parsedFile = parseGabFile(content);
      const result = validateSpeakers(parsedFile);

      for (const issue of result.undefinedSpeakers) {
        issues.push({
          file: gabFile,
          speaker: issue.speaker,
          node: issue.node,
        });
      }
    }

    if (issues.length > 0) {
      const errorMessage =
        'Undefined speakers found in gab files:\n' +
        issues
          .map((issue) => `  ${issue.file} - Speaker "${issue.speaker}" in node "${issue.node}"`)
          .join('\n');

      console.log(errorMessage);
      expect(issues).toEqual([]);
    }
  });
});

describe('validateGab', () => {
  it('treats examine nodes as additional start points for cycle detection', () => {
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
Speaker: loop
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
