export interface DialogueOption {
  text: string;
  target: string | null;
  visited?: boolean;
  detour?: boolean;
}

export type CommandHandlers = {
  loadPuzzle(args: string[]): void;
  loadLevel(args: string[]): void;
  return(args: string[]): void;
};

export interface DialogCommand {
  name: keyof CommandHandlers;
  args: string[];
}

export interface DialogNode {
  lines: string[];
  options: DialogueOption[];
  next: string | null;
  command?: DialogCommand | null;
}

interface DialogState {
  currentNode: string;
  lineIndex: number;
  currentSpeaker: string | null;
  variables: Record<string, any>;   // e.g. { "$hasKey": true, "$score": 10 }
  flags: Record<string, boolean>;   // e.g. { "saw_dialog_Intro": true }
}

export interface DialogLines {
  lines: string[];
  speaker: string | null;
}  

import { parseYarnFile, YarnNode, Speaker } from './yarn-utils';

// The DialogManager class manages the flow of dialogue in a game or application,
// - start(node): initializes the dialogue from a starting node.
// - getCurrent(): retrieves the current dialogue content: lines, options, next node, and command.
//     currently not having content is used on in main.ts to decide if the dialog should be shown or not.
// - nextLines(): returns the next block of dialogue lines for the current node, sharing the same speaker

export class DialogManager {
  private nodes: Record<string, YarnNode> = {};
  private state: DialogState = {
    currentNode: '',
    lineIndex: 0,
    currentSpeaker: null,
    variables: {},
    flags: {},
  };
  private speakerInfo: Record<string, Speaker> = {};
  private visited = new Set<string>();
  private returnStack: string[] = [];
  private commandHandled = false;
  private commandRunning = false;
  private currentCommandResolver: (() => void) | null = null;

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
    if (!nodeName) {
      throw new Error('Cannot goto null or undefined node');
    }
    if (!this.nodes[nodeName]) {
      throw new Error(`Node '${nodeName}' does not exist`);
    }
    this.state = {
      currentNode: nodeName,
      lineIndex: 0,
      currentSpeaker: null,
      variables: {},
      flags: {}
    }
    this.visited.add(nodeName);
    this.resetLineState();
  }

  getCurrent(): DialogNode {
    if (!this.state.currentNode) {
      throw new Error('No current node set');
    }
    const content = parseNodeBody(this.nodes[this.state.currentNode].body, this.visited);
    return content;
  }

  choose(index: number) {
    const content = this.getCurrent();
    const opt = content.options[index];
    if (!opt) {
      throw new Error(`Invalid option index ${index} for node ${this.state.currentNode}`);
    }
    if (opt.detour && this.state.currentNode) {
      this.returnStack.push(this.state.currentNode);
    }
    this.goto(opt.target);
  }

  async follow() {
    if (this.commandRunning) {
      throw new Error('Cannot call follow() while command is running');
    }
    const content = this.getCurrent();
    if (this.state.lineIndex < content.lines.length) {
      throw new Error('Cannot follow() when there are lines to display');
    }
    await this.handleCommand(content);
    if (content.next) {
      this.goto(content.next);
    } else if (content.options.length === 0 && this.returnStack.length > 0) {
      // Auto-return when there are no options and we have a return stack
      const ret = this.returnStack.pop();
      if (ret) this.goto(ret);
    }
  }

  private resetLineState() {
    this.state.lineIndex = 0;
    this.commandHandled = false;
    this.commandRunning = false;
    this.currentCommandResolver = null;
  }

  /**
   * Returns the next block of dialogue lines for the current node. The returned
   * lines all share the same speaker. If no more lines remain, null is
   * returned but commands are NOT triggered automatically.
   */
  nextLines(): DialogLines | null {
    const content = this.getCurrent();
    if (this.state.lineIndex >= content.lines.length) {
      return null;
    }
    const linesToShow: string[] = [];
    let currentSpeaker: string | null = null;
    const first = content.lines[this.state.lineIndex];
    const firstMatch = first.match(/^(.*?):\s*(.*)$/);
    if (firstMatch) currentSpeaker = firstMatch[1];
    for (; this.state.lineIndex < content.lines.length; this.state.lineIndex++) {
      const l = content.lines[this.state.lineIndex];
      const m = l.match(/^(.*?):\s*(.*)$/);
      if (linesToShow.length > 0 && m && currentSpeaker && m[1] !== currentSpeaker) {
        break;
      }
      linesToShow.push(l);
      if (m && linesToShow.length === 1) currentSpeaker = m[1];
    }
    this.state.currentSpeaker = currentSpeaker;
    return { lines: linesToShow, speaker: currentSpeaker };
  }

  isCommandRunning(): boolean {
    return this.commandRunning;
  }

  completeCommand() {
    if (this.currentCommandResolver) {
      this.currentCommandResolver();
    }
  }

  hasMoreLines(): boolean {
    const content = this.getCurrent();
    return this.state.lineIndex < content.lines.length;
  }

  skipToEnd() {
    const content = this.getCurrent();
    this.state.lineIndex = content.lines.length;
  }

  showNext(): boolean {
    const content = this.getCurrent();
    // Show Next button only if there are more lines to display OR if there's a next node and we have dialogue text
    return this.hasMoreLines() || (content.next !== null && content.lines.length > 0 && this.state.lineIndex >= content.lines.length);
  }

  popReturnStack(): string | undefined {
    return this.returnStack.pop();
  }

  private async handleCommand(content: DialogNode) {
    if (content.command && !this.commandHandled) {
      this.commandRunning = true;
      
      // Create promise that resolves when command finishes
      const commandPromise = new Promise<void>(resolve => {
        this.currentCommandResolver = resolve;
      });
      
      const handler = this.commandHandlers[content.command.name];
      handler(content.command.args);
      this.commandHandled = true;
      
      // Wait for command to complete
      await commandPromise;
      this.commandRunning = false;
      this.currentCommandResolver = null;
    }
  }
}

function parseNodeBody(body: string, visitedNodes: Set<string>): DialogNode {
  const lines = body.split(/\r?\n/);
  const texts: string[] = [];
  const options: DialogueOption[] = [];
  let next: string | null = null;
  let command: DialogCommand | null = null;
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
      const returnMatch = trimmed.match(/<<\s*return\s*>>/);
      if (returnMatch) {
        command = { name: 'return', args: [] };
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

