import { describe, it, expect } from 'vitest';
import { parseGab, GabNode, parseGabFile } from './gab-utils';
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
      metadata: {}
    } as GabNode);
    expect(result[1].title).toBe('Next');
    expect(result[1].metadata).toEqual({ position: '0,0' });
    expect(result[1].body).toBe('Next node text');
  });
});

describe('loadLevel validation', () => {
  it('validates that all loadLevel commands reference existing levels', () => {
    const dialogueDir = path.join(__dirname, 'dialogue');
    
    // Get all available levels from the actual levels object
    const availableLevels = Object.keys(levels);
    
    // Get all gab files
    const gabFiles = fs.readdirSync(dialogueDir)
      .filter(file => file.endsWith('.gab'));
    
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
              line: index + 1
            });
          }
        }
      });
    }
    
    if (invalidReferences.length > 0) {
      const errorMessage = 'Invalid loadLevel references found:\n' +
        invalidReferences.map(ref => 
          `  ${ref.file}:${ref.line} - loadLevel ${ref.level} (available: ${availableLevels.join(', ')})`
        ).join('\n');
      
      expect(invalidReferences).toEqual([]);
    }
  });
});