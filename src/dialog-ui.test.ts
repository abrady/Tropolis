import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DialogManager } from './dialog-manager';

// Mock DOM elements for testing UI behavior
const mockElement = () => ({
  innerHTML: '',
  style: { display: 'none' },
  classList: {
    add: vi.fn(),
    remove: vi.fn()
  },
  appendChild: vi.fn(),
  textContent: '',
  onclick: null
});

const mockButton = () => ({
  ...mockElement(),
  click: vi.fn(),
  textContent: '',
  id: ''
});

describe('Dialog UI Rendering Tests', () => {
  const handlers = {
    loadPuzzle: vi.fn(),
    loadLevel: vi.fn(),
    return: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process line events and jump commands correctly', () => {
    const yarn = `
title: TestNode
---
Guide: First line
Guide: Second line
<<jump NextNode>>
===
title: NextNode
---
Guide: Next node
===`;

    const dm = new DialogManager(yarn, handlers);
    
    // Start dialog and get generator
    dm.start('TestNode');
    const gen = dm.advance();
    
    // Get first line
    const firstResult = gen.next();
    expect(firstResult.done).toBe(false);
    expect(firstResult.value.type).toBe('line');
    expect(firstResult.value.text).toBe('First line');
    expect(firstResult.value.speaker).toBe('Guide');

    // Get second line
    const secondResult = gen.next();
    expect(secondResult.done).toBe(false);
    expect(secondResult.value.type).toBe('line');
    expect(secondResult.value.text).toBe('Second line');
    expect(secondResult.value.speaker).toBe('Guide');

    // Should automatically jump to NextNode
    const thirdResult = gen.next();
    expect(thirdResult.done).toBe(false);
    expect(thirdResult.value.type).toBe('line');
    expect(thirdResult.value.text).toBe('Next node');
    expect(thirdResult.value.speaker).toBe('Guide');

    // Should end
    const fourthResult = gen.next();
    expect(fourthResult.done).toBe(true);
  });

  it('should handle simple dialogue flow correctly', () => {
    const yarn = `
title: Simple
---
Guide: Hello
===`;

    const dm = new DialogManager(yarn, handlers);
    
    // Start dialog and get generator
    dm.start('Simple');
    const gen = dm.advance();
    
    // Get the line
    const firstResult = gen.next();
    expect(firstResult.done).toBe(false);
    expect(firstResult.value.type).toBe('line');
    expect(firstResult.value.text).toBe('Hello');
    expect(firstResult.value.speaker).toBe('Guide');

    // Should end after single line
    const secondResult = gen.next();
    expect(secondResult.done).toBe(true);
  });

  it('should process multiple lines from same speaker', () => {
    const yarn = `
title: MultiStep
---
Guide: Step 1
Guide: Step 2
Guide: Step 3
===`;

    const dm = new DialogManager(yarn, handlers);
    
    // Start dialog and get generator
    dm.start('MultiStep');
    const gen = dm.advance();
    
    // Get first line
    const firstResult = gen.next();
    expect(firstResult.done).toBe(false);
    expect(firstResult.value.type).toBe('line');
    expect(firstResult.value.text).toBe('Step 1');
    expect(firstResult.value.speaker).toBe('Guide');

    // Get second line
    const secondResult = gen.next();
    expect(secondResult.done).toBe(false);
    expect(secondResult.value.type).toBe('line');
    expect(secondResult.value.text).toBe('Step 2');
    expect(secondResult.value.speaker).toBe('Guide');

    // Get third line
    const thirdResult = gen.next();
    expect(thirdResult.done).toBe(false);
    expect(thirdResult.value.type).toBe('line');
    expect(thirdResult.value.text).toBe('Step 3');
    expect(thirdResult.value.speaker).toBe('Guide');

    // Should end after all lines
    const fourthResult = gen.next();
    expect(fourthResult.done).toBe(true);
  });
});