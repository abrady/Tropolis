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

export type DialogEvent = 
  | { type: 'line'; text: string; speaker: string | null }
  | { type: 'choice'; options: DialogueOption[] }
  | { type: 'pause'; duration?: number }
  | { type: 'action'; command: string; args: string[] }
  | { type: 'end' };

interface DialogState {
  currentNode: string;
  lineIndex: number;
  currentSpeaker: string | null;
  variables: Record<string, any>;   // e.g. { "$hasKey": true, "$score": 10 }
  flags: Record<string, boolean>;   // e.g. { "saw_dialog_Intro": true }
  commandProcessed: boolean;
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
    commandProcessed: false,
  };
  private speakerInfo: Record<string, Speaker> = {};
  private visited = new Set<string>();
  private returnStack: string[] = [];
  private currentEvent: DialogEvent | null = null;
  private eventQueue: DialogEvent[] = [];

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

  start(startNode: string): DialogEvent {
    this.goto(startNode);
    return this.advance();
  }

  advance(): DialogEvent {
    if (this.currentEvent && this.currentEvent.type === 'choice') {
      throw new Error('Cannot advance while waiting for choice selection');
    }

    if (this.eventQueue.length > 0) {
      this.currentEvent = this.eventQueue.shift()!;
      return this.currentEvent;
    }

    this.generateNextEvents();
    
    if (this.eventQueue.length > 0) {
      this.currentEvent = this.eventQueue.shift()!;
      return this.currentEvent;
    }

    // If we have no events but need to navigate, try navigation (with stack protection)
    let navigationDepth = 0;
    while (navigationDepth < 10) { // Prevent stack overflow
      const content = parseNodeBody(this.nodes[this.state.currentNode].body, this.visited);
      if (content.next) {
        this.goto(content.next);
        this.generateNextEvents();
        if (this.eventQueue.length > 0) {
          this.currentEvent = this.eventQueue.shift()!;
          return this.currentEvent;
        }
        navigationDepth++;
      } else if (this.returnStack.length > 0) {
        const ret = this.returnStack.pop();
        if (ret) {
          this.goto(ret, true);
          this.generateNextEvents();
          if (this.eventQueue.length > 0) {
            this.currentEvent = this.eventQueue.shift()!;
            return this.currentEvent;
          }
          navigationDepth++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    this.currentEvent = { type: 'end' };
    return this.currentEvent;
  }

  choose(index: number): DialogEvent {
    if (!this.currentEvent || this.currentEvent.type !== 'choice') {
      throw new Error('No choice currently available');
    }
    
    const opt = this.currentEvent.options[index];
    if (!opt) {
      throw new Error(`Invalid option index ${index}`);
    }
    
    if (opt.detour && this.state.currentNode) {
      this.returnStack.push(this.state.currentNode);
    }
    
    this.currentEvent = null; // Clear choice state
    this.goto(opt.target);
    return this.advance();
  }

  private goto(nodeName: string | null, skipToChoices: boolean = false) {
    if (!nodeName) {
      throw new Error('Cannot goto null or undefined node');
    }
    if (!this.nodes[nodeName]) {
      throw new Error(`Node '${nodeName}' does not exist`);
    }
    
    // If skipToChoices is true, set lineIndex to skip all lines
    const lineIndex = skipToChoices ? 
      parseNodeBody(this.nodes[nodeName].body, this.visited).lines.length : 0;
    
    this.state = {
      currentNode: nodeName,
      lineIndex,
      currentSpeaker: null,
      variables: this.state.variables,
      flags: this.state.flags,
      commandProcessed: skipToChoices // If skipping to choices, mark command as processed too
    }
    this.visited.add(nodeName);
    this.eventQueue = [];
  }

  private generateNextEvents() {
    if (!this.state.currentNode) {
      return;
    }

    const content = parseNodeBody(this.nodes[this.state.currentNode].body, this.visited);
    
    // Generate line events if we haven't processed them yet
    while (this.state.lineIndex < content.lines.length) {
      const line = content.lines[this.state.lineIndex];
      const match = line.match(/^(.*?):\s*(.*)$/);
      
      if (match) {
        const speaker = match[1];
        const text = match[2];
        this.eventQueue.push({ type: 'line', text, speaker });
        this.state.currentSpeaker = speaker;
      } else {
        this.eventQueue.push({ type: 'line', text: line, speaker: this.state.currentSpeaker || null });
      }
      
      this.state.lineIndex++;
    }

    // Handle command only if we haven't processed it yet and all lines are consumed
    if (content.command && !this.state.commandProcessed && this.state.lineIndex >= content.lines.length && this.eventQueue.length === 0) {
      this.eventQueue.push({ 
        type: 'action', 
        command: content.command.name, 
        args: content.command.args 
      });
      // Mark command as processed
      this.state.commandProcessed = true;
    }

    // Handle choices only if we've processed everything else and have no events queued
    if (this.eventQueue.length === 0 && content.options.length > 0) {
      this.eventQueue.push({ type: 'choice', options: content.options });
    }
  }

  getCurrentEvent(): DialogEvent | null {
    return this.currentEvent;
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

