import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

interface CharacterDef {
  image?: string;
  animations: string[];
}

function parseDef(content: string): CharacterDef {
  const lines = content.split(/\r?\n/);
  const def: CharacterDef = { animations: [] };
  let current: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const keyMatch = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyMatch) {
      current = keyMatch[1];
      const value = keyMatch[2].trim();
      if (current === 'image' && value) {
        def.image = value;
      } else if (current === 'animations' && value.startsWith('-')) {
        def.animations.push(value.slice(1).trim());
      }
      continue;
    }
    if (trimmed.startsWith('-') && current === 'animations') {
      def.animations.push(trimmed.slice(1).trim());
    }
  }
  return def;
}

describe('character asset validation', () => {
  const base = path.join(process.cwd(), 'data', 'characters');
  if (!fs.existsSync(base)) return;
  for (const char of fs.readdirSync(base)) {
    const folder = path.join(base, char);
    if (!fs.statSync(folder).isDirectory()) continue;
    const defPath = path.join(folder, `${char}.def`);
    it(`has valid assets for ${char}`, () => {
      expect(fs.existsSync(defPath)).toBe(true);
      const def = parseDef(fs.readFileSync(defPath, 'utf8'));
      const referenced = new Set<string>();
      if (def.image) {
        const imgPath = path.join(folder, def.image);
        referenced.add(def.image);
        expect(fs.existsSync(imgPath)).toBe(true);
      }
      for (const anim of def.animations) {
        const animPath = path.join(folder, anim);
        referenced.add(anim);
        expect(fs.existsSync(animPath)).toBe(true);
      }
      const files = fs.readdirSync(folder).filter(f => f !== `${char}.def`);
      for (const file of files) {
        if (!referenced.has(file)) {
          console.warn(`Unreferenced file in ${char}: ${file}`);
        }
      }
    });
  }
});
