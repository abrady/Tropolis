export interface DialogueOption {
  text: string;
  target: string | null;
  visited?: boolean;
  detour?: boolean;
}

export type CommandHandlers = {
  loadPuzzle(args: string[]): void;
  loadLevel(args: string[]): void;
};

export interface DialogueCommand {
  name: keyof CommandHandlers;
  args: string[];
}

export interface DialogueContent {
  lines: string[];
  options: DialogueOption[];
  next: string | null;
  command?: DialogueCommand | null;
}

import { parseYarnFile, YarnNode, Speaker } from './yarn-utils';

export class DialogManager {
  private nodes: Record<string, YarnNode> = {};
  private speakerInfo: Record<string, Speaker> = {};
  private visited = new Set<string>();
  private current: string | null = null;
  private returnStack: string[] = [];
  private lineIndex = 0;
  private commandHandled = false;
  public currentSpeaker: string | null = null;
  private commandHandlers: CommandHandlers;

  constructor(yarnText: string, handlers: CommandHandlers) {
    const { nodes, speakers } = parseYarnFile(yarnText);
    this.speakerInfo = speakers;
    for (const n of nodes) {
      this.nodes[n.title] = n;
    }
    this.commandHandlers = handlers;
  }

  getAnimationForSpeaker(name: string): string | undefined {
    const info = this.speakerInfo[name];
    if (!info) {
      throw new Error(`No animation defined for speaker ${name}`);
    }
    const anim = info.talkAnim;
    if (!anim || anim === 'none' || anim === '') return undefined;
    return anim;
  }

  start(startNode: string) {
    this.goto(startNode);
  }

  goto(nodeName: string | null) {
    if (!nodeName || !this.nodes[nodeName]) return;
    this.current = nodeName;
    this.visited.add(nodeName);
    this.resetLineState();
  }

  getCurrent(): DialogueContent {
    if (!this.current) return { lines: [], options: [], next: null, command: null };
    const content = parseNodeBody(this.nodes[this.current].body, this.visited);
    if (!content.next && content.options.length === 0 && this.returnStack.length > 0) {
      return { ...content, next: '__return__' };
    }
    return content;
  }

  choose(index: number) {
    const content = this.getCurrent();
    const opt = content.options[index];
    if (opt) {
      if (opt.detour && this.current) {
        this.returnStack.push(this.current);
      }
      this.goto(opt.target);
    }
  }

  follow() {
    const content = this.getCurrent();
    // Execute command if we've reached the end of dialogue
    if (this.lineIndex >= content.lines.length) {
      this.handleCommand(content);
    }
    if (content.next) {
      if (content.next === '__return__') {
        const ret = this.returnStack.pop();
        if (ret) this.goto(ret);
      } else {
        this.goto(content.next);
      }
    } else if (this.returnStack.length > 0) {
      const ret = this.returnStack.pop();
      if (ret) this.goto(ret);
    }
  }

  private resetLineState() {
    this.lineIndex = 0;
    this.commandHandled = false;
    this.currentSpeaker = null;
  }

  /**
   * Returns the next block of dialogue lines for the current node. The returned
   * lines all share the same speaker. If no more lines remain, null is
   * returned but commands are NOT triggered automatically.
   */
  nextLines(): { lines: string[]; speaker: string | null } | null {
    const content = this.getCurrent();
    if (this.lineIndex >= content.lines.length) {
      return null;
    }
    const linesToShow: string[] = [];
    let currentSpeaker: string | null = null;
    const first = content.lines[this.lineIndex];
    const firstMatch = first.match(/^(.*?):\s*(.*)$/);
    if (firstMatch) currentSpeaker = firstMatch[1];
    for (; this.lineIndex < content.lines.length; this.lineIndex++) {
      const l = content.lines[this.lineIndex];
      const m = l.match(/^(.*?):\s*(.*)$/);
      if (linesToShow.length > 0 && m && currentSpeaker && m[1] !== currentSpeaker) {
        break;
      }
      linesToShow.push(l);
      if (m && linesToShow.length === 1) currentSpeaker = m[1];
    }
    this.currentSpeaker = currentSpeaker;
    return { lines: linesToShow, speaker: currentSpeaker };
  }

  hasMoreLines(): boolean {
    const content = this.getCurrent();
    return this.lineIndex < content.lines.length;
  }

  skipToEnd() {
    const content = this.getCurrent();
    this.lineIndex = content.lines.length;
  }

  private handleCommand(content: DialogueContent) {
    if (content.command && !this.commandHandled) {
      const handler = this.commandHandlers[content.command.name];
      handler(content.command.args);
      this.commandHandled = true;
    }
  }
}

function parseNodeBody(body: string, visitedNodes: Set<string>): DialogueContent {
  const lines = body.split(/\r?\n/);
  const texts: string[] = [];
  const options: DialogueOption[] = [];
  let next: string | null = null;
  let command: DialogueCommand | null = null;
  let i = 0;

  // gather dialogue lines until options or jump
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('->')) break;
    if (trimmed.startsWith('<<')) {
      const m = trimmed.match(/<<\s*jump\s+([A-Za-z0-9_]+)\s*>>/);
      if (m) {
        next = m[1];
        i++;
        continue;
      }
      const puzzleMatch = trimmed.match(/<<\s*loadPuzzle\s+([A-Za-z0-9_]+)\s*>>/);
      if (puzzleMatch) {
        command = { name: 'loadPuzzle', args: [puzzleMatch[1]] };
        i++;
        continue;
      }
      const levelMatch = trimmed.match(/<<\s*loadLevel\s+([A-Za-z0-9_]+)\s*>>/);
      if (levelMatch) {
        command = { name: 'loadLevel', args: [levelMatch[1]] };
        i++;
        continue;
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
      let detour = false;
      if (i + 1 < lines.length) {
        const cmdMatch = lines[i + 1].trim().match(/<<\s*(jump|detour)\s+([A-Za-z0-9_]+)\s*>>/);
        if (cmdMatch) {
          detour = cmdMatch[1] === 'detour';
          target = cmdMatch[2];
          i++; // consume command line
        }
      }
      options.push({ text, target, visited: target ? visitedNodes.has(target) : false, detour });
    }
  }
  return { lines: texts, options, next, command };
}

