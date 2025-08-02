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
      drawImage: () => {},
    }),
  });
  // Prevent requestAnimationFrame loop from running indefinitely
  globalThis.requestAnimationFrame = vi.fn();
  globalThis.cancelAnimationFrame = vi.fn();
});

describe('Game boot', () => {
  it('follows detour and jump choices', async () => {
    await act(async () => {
      ReactDOM.createRoot(document.getElementById('root')!).render(<App initialLevel="test" />);
    });

    // Wait for initial effects
    await new Promise((resolve) => setTimeout(resolve, 0));

    let dialogueText = document.querySelector('#dialogue p')?.textContent;
    expect(dialogueText).toBe('Choose an option');

    // advance to choice
    await act(async () => {
      (document.querySelector('#dialogue button') as HTMLButtonElement).click();
    });
    await new Promise((r) => setTimeout(r, 0));

    let options = document.querySelectorAll('.option-button');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toBe('Option 1');

    // select first option
    await act(async () => {
      (options[0] as HTMLButtonElement).click();
    });
    await new Promise((r) => setTimeout(r, 0));

    dialogueText = document.querySelector('#dialogue p')?.textContent;
    expect(dialogueText).toBe('You chose option 1');

    // advance back to choice
    await act(async () => {
      (document.querySelector('#dialogue button') as HTMLButtonElement).click();
    });
    await new Promise((r) => setTimeout(r, 0));

    options = document.querySelectorAll('.option-button');
    expect(options.length).toBe(2);
    expect(options[1].textContent).toBe('Option 2');
    expect(options[0].classList.contains('visited')).toBe(true);

    // select second option
    await act(async () => {
      (options[1] as HTMLButtonElement).click();
    });
    await new Promise((r) => setTimeout(r, 0));

    dialogueText = document.querySelector('#dialogue p')?.textContent;
    expect(dialogueText).toBe('You chose option 2');
  });

  it('hides options when the action menu is opened with Backspace', async () => {
    await act(async () => {
      ReactDOM.createRoot(document.getElementById('root')!).render(<App initialLevel="test" />);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // advance to choice
    await act(async () => {
      (document.querySelector('#dialogue button') as HTMLButtonElement).click();
    });
    await new Promise((r) => setTimeout(r, 0));

    // open action menu via Backspace
    await act(async () => {
      const evt = new KeyboardEvent('keydown', { code: 'Backspace' });
      window.dispatchEvent(evt);
    });
    await new Promise((r) => setTimeout(r, 0));

    const options = document.querySelectorAll('.option-button');
    expect(options.length).toBe(0);
    const actions = document.querySelectorAll('.action-button');
    expect(actions.length).toBe(3);
  });

  it('hides options when the action menu is opened with Escape', async () => {
    await act(async () => {
      ReactDOM.createRoot(document.getElementById('root')!).render(<App initialLevel="test" />);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // advance to choice
    await act(async () => {
      (document.querySelector('#dialogue button') as HTMLButtonElement).click();
    });
    await new Promise((r) => setTimeout(r, 0));

    // open action menu via Escape
    await act(async () => {
      const evt = new KeyboardEvent('keydown', { code: 'Escape' });
      window.dispatchEvent(evt);
    });
    await new Promise((r) => setTimeout(r, 0));

    const options = document.querySelectorAll('.option-button');
    expect(options.length).toBe(0);
    const actions = document.querySelectorAll('.action-button');
    expect(actions.length).toBe(3);
  });
});
