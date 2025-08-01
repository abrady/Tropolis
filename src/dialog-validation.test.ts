import { describe, it, expect } from 'vitest';
import { parseGab, validateGab } from './gab-utils';
import fs from 'fs';

const cryo = fs.readFileSync('src/dialogue/cryoroom.gab', 'utf8');
const nodes = parseGab(cryo);

describe('dialogue validation', () => {
  it('all paths terminate and nodes reachable', () => {
    const result = validateGab(nodes, 'CryoRoom_Intro');
    expect(result.unreachable).toEqual([]);
    expect(result.nonterminating).toEqual([]);
  });
});
