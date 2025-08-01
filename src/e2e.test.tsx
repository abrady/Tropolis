// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Provide minimal canvas and animation stubs
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  // Stub canvas context methods used in GameCanvas
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({
      clearRect: () => {},
      drawImage: () => {}
    })
  });
  // Prevent requestAnimationFrame loop from running indefinitely
  globalThis.requestAnimationFrame = vi.fn();
  globalThis.cancelAnimationFrame = vi.fn();
});

describe('Game boot', () => {
  it('shows wake up line on initial load', async () => {
    await act(async () => {
      ReactDOM.createRoot(document.getElementById('root')!).render(
        <App />
      );
    });

    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0));

    const dialogueText = document.querySelector('#dialogue p')?.textContent?.toLowerCase();
    expect(dialogueText).toContain('wake up');
  });
});
