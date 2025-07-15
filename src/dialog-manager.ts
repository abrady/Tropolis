export interface DialogueOption {
  text: string;
  target: string | null;
  visited?: boolean;
}

export interface DialogueContent {
  lines: string[];
  options: DialogueOption[];
  next: string | null;
}

import { parseYarn, YarnNode } from './yarn-utils';

export class DialogManager {
  private nodes: Record<string, YarnNode> = {};
  private visited = new Set<string>();
  private current: string | null = null;

  constructor(yarnText: string) {
    const nodes = parseYarn(yarnText);
    for (const n of nodes) {
      this.nodes[n.title] = n;
    }
  }

  start(startNode: string) {
    this.goto(startNode);
  }

  goto(nodeName: string | null) {
    if (!nodeName || !this.nodes[nodeName]) return;
    this.current = nodeName;
    this.visited.add(nodeName);
  }

  getCurrent(): DialogueContent {
    if (!this.current) return { lines: [], options: [], next: null };
    return parseNodeBody(this.nodes[this.current].body, this.visited);
  }

  choose(index: number) {
    const content = this.getCurrent();
    const opt = content.options[index];
    if (opt) {
      this.goto(opt.target);
    }
  }

  follow() {
    const content = this.getCurrent();
    if (content.next) {
      this.goto(content.next);
    }
  }
}

function parseNodeBody(body: string, visitedNodes: Set<string>): DialogueContent {
  const lines = body.split(/\r?\n/);
  const texts: string[] = [];
  const options: DialogueOption[] = [];
  let next: string | null = null;
  let i = 0;

  // gather dialogue lines until options or jump
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('->')) break;
    if (trimmed.startsWith('<<')) {
      const m = trimmed.match(/<<\s*jump\s+([A-Za-z0-9_]+)\s*>>/);
      if (m) {
        next = m[1];
      }
      i++;
      continue;
    }
    if (trimmed) texts.push(lines[i]);
    i++;
  }

  // parse options
  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('->')) {
      let text = trimmed.slice(2).trim();
      // check for gating condition {Node}
      const gateMatch = text.match(/^\{([^}]+)\}\s*(.*)/);
      if (gateMatch) {
        const condition = gateMatch[1];
        text = gateMatch[2].trim();
        if (!visitedNodes.has(condition)) {
          // skip option if condition not met
          // also skip the following line with jump
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith('<<')) i++;
          continue;
        }
      }
      let target: string | null = null;
      if (i + 1 < lines.length) {
        const jumpMatch = lines[i + 1].trim().match(/<<\s*jump\s+([A-Za-z0-9_]+)\s*>>/);
        if (jumpMatch) {
          target = jumpMatch[1];
          i++; // consume jump line
        }
      }
      options.push({ text, target, visited: target ? visitedNodes.has(target) : false });
    }
  }
  return { lines: texts, options, next };
}

