export interface GabNode {
  title: string;
  body: string;
  metadata: Record<string, string>;
}

export interface GabParseError {
  line: number;
  message: string;
}

function stripComment(line: string): string {
  const commentIndex = line.indexOf('#');
  if (commentIndex === -1) return line;
  return line.slice(0, commentIndex);
}

export function parseGab(content: string, errors?: GabParseError[]): GabNode[] {
  const nodes: GabNode[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  const validFields = new Set(['tags', 'position']);

  while (i < lines.length) {
    let line = stripComment(lines[i]).trim();
    if (!line) { i++; continue; }
    if (line.startsWith('title:')) {
      const node: GabNode = { title: line.slice(6).trim(), body: '', metadata: {} };
      i++;
      // parse metadata until ---
      let inBody = false;
      for (; i < lines.length; i++) {
        const rawLine = lines[i];
        line = stripComment(rawLine);
        const trimmed = line.trim();
        if (!inBody) {
          if (trimmed === '---') {
            inBody = true;
            continue;
          }
          const sep = line.indexOf(':');
          if (sep !== -1) {
            const key = line.slice(0, sep).trim();
            const value = line.slice(sep + 1).trim();
            if (validFields.has(key)) {
              node.metadata[key] = value;
            } else {
              const msg = `Unknown field '${key}' in node '${node.title}'`;
              if (errors) {
                errors.push({ line: i, message: msg });
              } else {
                throw new Error(`${msg} (line ${i + 1})`);
              }
            }
            continue;
          }
        }
        if (trimmed === '===') {
          break;
        }
        if (inBody) {
          if (node.body) node.body += '\n';
          node.body += line;
        }
      }
      nodes.push(node);
      // skip until next line after ===
      while (i < lines.length && lines[i].trim() !== '===') i++;
      if (i < lines.length) i++; // skip the === line
    } else {
      i++;
    }
  }
  return nodes;
}

export interface Speaker {
  talkAnim?: string;
}

export interface GabFile {
  nodes: GabNode[];
  speakers: Record<string, Speaker>;
}

export function parseGabFile(content: string): GabFile {
  const speakers: Record<string, Speaker> = {};
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = stripComment(lines[i]).trim();
    if (line.startsWith('title:')) break;
    if (line.startsWith('speaker:')) {
      const name = line.slice('speaker:'.length).trim();
      const data: Speaker = {};
      i++;
      if (i < lines.length && stripComment(lines[i]).trim() === '---') i++;
      while (i < lines.length && stripComment(lines[i]).trim() !== '===') {
        const l = stripComment(lines[i]).trim();
        if (l) {
          const sep = l.indexOf(':');
          if (sep !== -1) {
            const key = l.slice(0, sep).trim();
            const value = l.slice(sep + 1).trim();
            if (key === 'talkAnim') data.talkAnim = value;
          }
        }
        i++;
      }
      if (i < lines.length && stripComment(lines[i]).trim() === '===') i++;
      speakers[name] = data;
      continue;
    }
    i++;
  }
  const nodes = parseGab(lines.slice(i).join('\n'));
  return { nodes, speakers };
}

interface NodeEdges {
  targets: { target: string; detour: boolean }[];
  command: string | null;
}

function parseEdges(body: string): NodeEdges {
  const lines = body.split(/\r?\n/);
  const targets: { target: string; detour: boolean }[] = [];
  let command: string | null = null;
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('->')) break;
    const cmdMatch = trimmed.match(/<<\s*(jump|detour)\s+([A-Za-z0-9_]+)\s*>>/);
    if (cmdMatch) {
      targets.push({ target: cmdMatch[2], detour: cmdMatch[1] === 'detour' });
      i++;
      continue;
    }
    const puzzleMatch = trimmed.match(/<<\s*loadPuzzle\s+([A-Za-z0-9_]+)\s*>>/);
    if (puzzleMatch) {
      command = 'loadPuzzle';
      i++;
      continue;
    }
    const levelMatch = trimmed.match(/<<\s*loadLevel\s+([A-Za-z0-9_]+)\s*>>/);
    if (levelMatch) {
      command = 'loadLevel';
      i++;
      continue;
    }
    i++;
  }

  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('->')) {
      if (i + 1 < lines.length) {
        const nextCmd = lines[i + 1].trim().match(/<<\s*(jump|detour)\s+([A-Za-z0-9_]+)\s*>>/);
        if (nextCmd) {
          targets.push({ target: nextCmd[2], detour: nextCmd[1] === 'detour' });
          i++;
        }
      }
    }
  }
  return { targets, command };
}

export interface GabValidationResult {
  unreachable: string[];
  nonterminating: string[];
}

export interface SpeakerValidationResult {
  undefinedSpeakers: { speaker: string; node: string; line: string }[];
}


export function validateSpeakers(gabFile: GabFile): SpeakerValidationResult {
  const undefinedSpeakers: { speaker: string; node: string; line: string }[] = [];
  const definedSpeakers = Object.keys(gabFile.speakers);
  
  for (const node of gabFile.nodes) {
    const lines = node.body.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const speakerMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*.+$/);
      if (speakerMatch) {
        const speaker = speakerMatch[1];
        if (!definedSpeakers.includes(speaker)) {
          undefinedSpeakers.push({
            speaker,
            node: node.title,
            line: trimmed
          });
        }
      }
    }
  }
  
  return { undefinedSpeakers };
}

export function validateGab(nodes: GabNode[], start: string, terminatingCommands: string[] = ['loadPuzzle', 'loadLevel']): GabValidationResult {
  const nodeMap = new Map<string, GabNode>();
  for (const n of nodes) nodeMap.set(n.title, n);

  const edges = new Map<string, string[]>();
  const finalNodes = new Set<string>();
  const examineStarts: string[] = [];

  const addEdge = (from: string, to: string) => {
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from)!.push(to);
  };

  for (const n of nodes) {
    const { targets, command } = parseEdges(n.body);
    const tags = n.metadata['tags']?.split(',').map(s => s.trim()) ?? [];
    if (command && terminatingCommands.includes(command)) {
      finalNodes.add(n.title);
    }
    if (targets.length === 0 && !command) {
      finalNodes.add(n.title);
    }
    for (const t of targets) {
      addEdge(n.title, t.target);
      if (t.detour) addEdge(t.target, n.title);
    }
    if (tags.includes('examine')) examineStarts.push(n.title);
    if (tags.includes('final')) finalNodes.add(n.title);
  }

  const reachable = new Set<string>();
  const queue: string[] = [];
  if (nodeMap.has(start)) queue.push(start);
  for (const s of examineStarts) queue.push(s);
  while (queue.length) {
    const cur = queue.shift()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    for (const to of edges.get(cur) ?? []) {
      if (!reachable.has(to)) queue.push(to);
    }
  }

  const unreachable: string[] = [];
  for (const n of nodes) {
    const tags = n.metadata['tags']?.split(',').map(s => s.trim()) ?? [];
    if (!reachable.has(n.title) && !tags.includes('disabled') && !tags.includes('examine')) {
      unreachable.push(n.title);
    }
  }

  const reverse = new Map<string, string[]>();
  for (const [from, tos] of edges) {
    for (const to of tos) {
      if (!reverse.has(to)) reverse.set(to, []);
      reverse.get(to)!.push(from);
    }
  }

  const canReachFinal = new Set<string>(finalNodes);
  const q = Array.from(finalNodes);
  while (q.length) {
    const cur = q.shift()!;
    for (const prev of reverse.get(cur) ?? []) {
      if (!canReachFinal.has(prev)) {
        canReachFinal.add(prev);
        q.push(prev);
      }
    }
  }

  const nonterminating: string[] = [];
  for (const n of reachable) {
    const node = nodeMap.get(n);
    const tags = node?.metadata['tags']?.split(',').map(s => s.trim()) ?? [];
    if (!canReachFinal.has(n) && !tags.includes('examine')) nonterminating.push(n);
  }

  return { unreachable, nonterminating };
}