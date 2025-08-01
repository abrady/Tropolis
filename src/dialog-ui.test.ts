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
    
    // Start and get first line
    const firstEvent = dm.start('TestNode');
    expect(firstEvent.type).toBe('line');
    expect(firstEvent.text).toBe('First line');
    expect(firstEvent.speaker).toBe('Guide');

    // Get second line
    const secondEvent = dm.advance();
    expect(secondEvent.type).toBe('line');
    expect(secondEvent.text).toBe('Second line');
    expect(secondEvent.speaker).toBe('Guide');

    // Should automatically jump to NextNode
    const thirdEvent = dm.advance();
    expect(thirdEvent.type).toBe('line');
    expect(thirdEvent.text).toBe('Next node');
    expect(thirdEvent.speaker).toBe('Guide');

    // Should end
    const fourthEvent = dm.advance();
    expect(fourthEvent.type).toBe('end');
  });

  it('should handle simple dialogue flow correctly', () => {
    const yarn = `
title: Simple
---
Guide: Hello
===`;

    const dm = new DialogManager(yarn, handlers);
    
    // Start and get the line
    const firstEvent = dm.start('Simple');
    expect(firstEvent.type).toBe('line');
    expect(firstEvent.text).toBe('Hello');
    expect(firstEvent.speaker).toBe('Guide');

    // Should end after single line
    const secondEvent = dm.advance();
    expect(secondEvent.type).toBe('end');
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
    
    // Start and get first line
    const firstEvent = dm.start('MultiStep');
    expect(firstEvent.type).toBe('line');
    expect(firstEvent.text).toBe('Step 1');
    expect(firstEvent.speaker).toBe('Guide');

    // Get second line
    const secondEvent = dm.advance();
    expect(secondEvent.type).toBe('line');
    expect(secondEvent.text).toBe('Step 2');
    expect(secondEvent.speaker).toBe('Guide');

    // Get third line
    const thirdEvent = dm.advance();
    expect(thirdEvent.type).toBe('line');
    expect(thirdEvent.text).toBe('Step 3');
    expect(thirdEvent.speaker).toBe('Guide');

    // Should end after all lines
    const fourthEvent = dm.advance();
    expect(fourthEvent.type).toBe('end');
  });
});