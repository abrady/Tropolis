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

export interface DialogueCommand {
  name: keyof CommandHandlers;
  args: string[];
}

export type DialogueNodeTag = 'examine';

export interface DialogueNode {
  title: string;
  tags: Set<DialogueNodeTag>;
  lines: string[];
  options: DialogueOption[];
  next: string | null;
  command?: DialogueCommand | null;
}

export type DialogueEvent =
  | { type: 'line'; text: string; speaker: string | null; node: DialogueNode }
  | { type: 'choice'; options: DialogueOption[]; node: DialogueNode }
  // | { type: 'pause'; duration?: number; node: DialogueNode }
  | { type: 'command'; command: string; args: string[]; node: DialogueNode };

export type DialogueAdvanceParam = { type: 'choice'; optionIndex: number };

interface DialogueState {
  currentNode: string;
  content?: DialogueNode;
  lineIndex: number;
  variables: Record<string, string>; // e.g. { "$hasKey": true, "$score": 10 }
  flags: Record<string, boolean>; // e.g. { "saw_dialog_Intro": true }
}

export interface DialogueLines {
  lines: string[];
  speaker: string | null;
}

import { parseGabFile, GabNode, Speaker } from './gab-utils';

export type DialogueGenerator = Generator<DialogueEvent, void, DialogueAdvanceParam>;

// The DialogueManager class manages has:
// - state: the current state of the dialogue including the current node, line index, speaker, variables, flags, and whether a command has been processed.
// - an advance() to move to the next state if possible.
export class DialogueManager {
  private nodes: Record<string, GabNode> = {};
  private state: DialogueState = {
    currentNode: '',
    lineIndex: 0,
    variables: {},
    flags: {},
  };
  private speakerInfo: Record<string, Speaker> = {};
  private visited = new Set<string>();
  private returnStack: string[] = [];
  private currentEvent: DialogueEvent | null = null;
  private currentGenerator?: DialogueGenerator;

  private commandHandlers: CommandHandlers;

  constructor(gabText: string, handlers: CommandHandlers) {
    const { nodes, speakers } = parseGabFile(gabText);
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

  isCurrentNodeExamine(): boolean {
    return this.state.content?.tags.has('examine') || false;
  }

  getCurrenGenerator(): DialogueGenerator | undefined {
    return this.currentGenerator;
  }

  start(startNode: string): void {
    this.goto(startNode); // set the initial state

    this.currentGenerator = this.advance();
  }

  public *advance(): DialogueGenerator {
    while (true) {
      // advance through any dialogue to show.
      while (this.state.content && this.state.lineIndex < this.state.content.lines?.length) {
        const text = this.state.content.lines[this.state.lineIndex] || 'ERROR: Empty line';
        // extract the speaker from the text if it starts with a speaker name
        const speakerMatch = text.match(/^(.+?):\s*(.*)$/);
        if (!speakerMatch) {
          throw new Error(`Invalid line format: ${text}`);
        }
        const speaker = speakerMatch[1];
        const textOnly = speakerMatch[2];
        this.currentEvent = {
          type: 'line',
          text: textOnly,
          speaker: speaker,
          node: this.state.content,
        };
        yield this.currentEvent;
        this.state.lineIndex++;
      }

      // next, check if we have options
      if (this.state.content?.options && this.state.content.options.length > 0) {
        this.currentEvent = {
          type: 'choice',
          options: this.state.content.options,
          node: this.state.content,
        };
        const result = yield this.currentEvent;
        if (result && result.type === 'choice') {
          const index = result.optionIndex;
          const opt = this.currentEvent.options[index];
          if (!opt) {
            throw new Error(`Invalid option index ${index}`);
          }

          if (opt.detour && this.state.currentNode) {
            this.returnStack.push(this.state.currentNode);
          }

          this.currentEvent = null; // Clear choice state
          this.goto(opt.target);
          continue; // Restart the loop to process the next node
        } else {
          throw new Error('Expected choice result ' + JSON.stringify(result));
        }
      }

      // if we have a command, run it
      if (this.state.content?.command) {
        this.currentEvent = {
          type: 'command',
          command: this.state.content.command.name,
          args: this.state.content.command.args,
          node: this.state.content,
        };
        yield this.currentEvent;
      }

      // If we have a next node, go to it
      if (this.state.content?.next) {
        this.goto(this.state.content.next);
      } else if (this.returnStack.length > 0) {
        // If we have a return stack, pop the last node and go there
        const returnNode = this.returnStack.pop();
        if (returnNode) {
          this.goto(returnNode, true);
        } else {
          // No more nodes to return to, end dialogue
          break;
        }
      } else {
        // No more nodes to process, end dialogue
        break;
      }
    }
    this.currentEvent = null;
  }

  private goto(nodeName: string | null, skipToChoices: boolean = false) {
    if (!nodeName) {
      throw new Error('Cannot goto null or undefined node');
    }
    if (!this.nodes[nodeName]) {
      throw new Error(`Node '${nodeName}' does not exist`);
    }

    // If skipToChoices is true, set lineIndex to skip all lines
    const content = parseNodeBody(this.nodes[nodeName], this.visited);
    const lineIndex = skipToChoices ? content.lines.length : 0;

    this.state = {
      currentNode: nodeName,
      content,
      lineIndex,
      variables: this.state.variables,
      flags: this.state.flags,
    };
    this.visited.add(nodeName);
    this.currentEvent = null; // Reset current event
  }
}

function parseNodeBody(gabNode: GabNode, visitedNodes: Set<string>): DialogueNode {
  const body = gabNode.body;
  const title = gabNode.title;
  const tagString = gabNode.metadata['tags'] || '';
  const tags = new Set<DialogueNodeTag>();

  if (tagString) {
    const tagArray = tagString.split(',').map((s) => s.trim());
    for (const tag of tagArray) {
      if (tag === 'examine') {
        tags.add(tag);
      }
    }
  }

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
      const returnMatch = trimmed.match(/<<\s*return\s*>>/);
      if (returnMatch) {
        command = { name: 'return', args: [] };
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (trimmed) {
      const gateMatch = trimmed.match(/^\{(!?)([^}]+)\}\s*(.*)/);
      if (gateMatch) {
        const negate = gateMatch[1] === '!';
        const condition = gateMatch[2];
        const lineText = gateMatch[3];
        const visited = visitedNodes.has(condition);
        const shouldShow = negate ? !visited : visited;
        if (shouldShow && lineText) {
          texts.push(lineText);
        }
      } else {
        texts.push(lines[i]);
      }
    }
    i++;
  }

  // parse options
  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('->')) {
      let text = trimmed.slice(2).trim();
      // check for gating condition {Node} or {!Node}
      const gateMatch = text.match(/^\{(!?)([^}]+)\}\s*(.*)/);
      if (gateMatch) {
        const negate = gateMatch[1] === '!';
        const condition = gateMatch[2];
        text = gateMatch[3].trim();
        const visited = visitedNodes.has(condition);
        const shouldShow = negate ? !visited : visited;
        if (!shouldShow) {
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
  return { title, tags, lines: texts, options, next, command };
}
