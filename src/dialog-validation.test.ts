import { describe, it, expect } from 'vitest';
import { parseYarn, validateYarn } from './yarn-utils';
import fs from 'fs';

const cryo = fs.readFileSync('src/dialogue/cryoroom.yarn', 'utf8');
const nodes = parseYarn(cryo);

describe('dialogue validation', () => {
  it('all paths terminate and nodes reachable', () => {
    const result = validateYarn(nodes, 'CryoRoom_Intro');
    expect(result.unreachable).toEqual([]);
    expect(result.nonterminating).toEqual([]);
  });
});
