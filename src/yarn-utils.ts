export interface YarnNode {
  title: string;
  body: string;
  metadata: Record<string, string>;
}

export function parseYarn(content: string): YarnNode[] {
  const nodes: YarnNode[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    let line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('title:')) {
      const node: YarnNode = { title: line.slice(6).trim(), body: '', metadata: {} };
      i++;
      // parse metadata until ---
      let inBody = false;
      for (; i < lines.length; i++) {
        line = lines[i];
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
            node.metadata[key] = value;
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
