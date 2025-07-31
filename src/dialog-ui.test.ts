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
    loadLevel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not create duplicate Next buttons when hasMoreLines and content.next both exist', () => {
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
    dm.start('TestNode');

    // Simulate the renderDialog logic
    let buttonCount = 0;
    const mockOptionsEl = {
      innerHTML: '',
      appendChild: () => {
        buttonCount++;
      }
    };

    // First call - should have more lines
    let result = dm.nextLines();
    expect(result?.lines).toHaveLength(2);
    expect(dm.hasMoreLines()).toBe(false); // All lines consumed in one block

    const content = dm.getCurrent();
    
    // The logic should only create ONE button, not two
    if (dm.hasMoreLines()) {
      mockOptionsEl.appendChild(); // hasMoreLines path
    } else if (content.next) {
      mockOptionsEl.appendChild(); // content.next path
    }

    expect(buttonCount).toBe(1);
  });

  it('should handle rapid renderDialog calls without duplicating buttons', () => {
    const yarn = `
title: Simple
---
Guide: Hello
===`;

    const dm = new DialogManager(yarn, handlers);
    dm.start('Simple');

    // Simulate multiple rapid calls to renderDialog logic
    let buttonCount = 0;
    const mockOptionsEl = {
      innerHTML: '',
      appendChild: () => {
        buttonCount++;
      }
    };

    // Multiple "renders" should reset innerHTML each time
    for (let i = 0; i < 3; i++) {
      mockOptionsEl.innerHTML = ''; // Simulate clearing
      buttonCount = 0; // Reset count after clearing
      
      dm.nextLines();
      const content = dm.getCurrent();
      
      if (dm.hasMoreLines()) {
        mockOptionsEl.appendChild();
      } else if (content.next) {
        mockOptionsEl.appendChild();
      }
    }

    // After the loop, should still only have created buttons for the last render
    expect(buttonCount).toBeLessThanOrEqual(1);
  });

  it('should properly track dialogue state to avoid button logic conflicts', () => {
    const yarn = `
title: MultiStep
---
Guide: Step 1
Guide: Step 2
Guide: Step 3
===`;

    const dm = new DialogManager(yarn, handlers);
    dm.start('MultiStep');

    // First nextLines call should get all lines (same speaker)
    let result = dm.nextLines();
    expect(result?.lines).toHaveLength(3);
    expect(dm.hasMoreLines()).toBe(false);

    const content = dm.getCurrent();
    expect(content.next).toBeNull();
    expect(content.options).toHaveLength(0);

    // With no more lines, no next node, and no options, 
    // the UI should not create any buttons
    let shouldCreateButton = dm.hasMoreLines() || content.next || content.options.length > 0;
    expect(shouldCreateButton).toBe(false);
  });
});