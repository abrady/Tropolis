import { describe, it, expect } from 'vitest';
import { parseGab, GabNode } from './gab-utils';

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