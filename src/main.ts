import { parseFrames, Frame } from './frame-utils';
import overlordData from './data/Overlord.json';
import overlordImg from './data/Overlord.png';
import cryoroomImg from './data/0_cryoroom.png';
import cryoDialogue from './dialogue/0_cryoroom.yarn?raw';
import cryoAfterPuzzleDialogue from './dialogue/0_cryoroom_afterpuzzle.yarn?raw';
import { DialogManager } from './dialog-manager';
import { startTowerOfHanoi } from './puzzles';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLDivElement;
const ctx = canvas.getContext('2d')!;

const spriteSheet = new Image();
spriteSheet.src = overlordImg;

const background = new Image();

background.src = cryoroomImg;

let frames: Frame[] = [];
let frameIndex = 0;
let lastSwitch = 0;

function draw(timestamp: number) {
  const f = frames[frameIndex];
  if (timestamp - lastSwitch > f.duration) {
    frameIndex = (frameIndex + 1) % frames.length;
    lastSwitch = timestamp;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  const x = (canvas.width - f.w) / 2;
  const y = (canvas.height / 2) - f.h;
  ctx.drawImage(
    spriteSheet,
    f.x, f.y, f.w, f.h,
    x, y, f.w, f.h
  );
  requestAnimationFrame(draw);
}

Promise.all([
  new Promise<void>(resolve => {
    spriteSheet.onload = () => resolve();
  }),
  new Promise<void>(resolve => {
    background.onload = () => resolve();
  })
]).then(() => {
  frames = parseFrames(overlordData);
  canvas.width = background.width;
  canvas.height = background.height;
  function resizeCanvas() {
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const scale = Math.min(
      vw / canvas.width,
      vh / canvas.height
    );
    const w = Math.floor(canvas.width * scale);
    const h = Math.floor(canvas.height * scale);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    container.style.width = w + 'px';
    container.style.height = h + 'px';
  }
  window.addEventListener('resize', resizeCanvas);
  window.visualViewport?.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(draw);

  const dialogBox = document.getElementById('dialogue') as HTMLDivElement;
  const textEl = document.getElementById('dialogue-text') as HTMLDivElement;
  const optionsEl = document.getElementById('dialogue-options') as HTMLDivElement;
  const overlayEl = document.getElementById('choice-overlay') as HTMLDivElement;
  const puzzleEl = document.getElementById('puzzle-container') as HTMLDivElement;
  const speakerEl = document.getElementById('dialogue-speaker') as HTMLDivElement;
  const cheatButton = document.getElementById('cheat-toggle') as HTMLButtonElement;
  const cheatMenu = document.getElementById('cheat-menu') as HTMLDivElement;
  const cheatCompleteBtn = document.getElementById('cheat-complete-puzzle') as HTMLButtonElement;
  let puzzleComplete: (() => void) | null = null;

  cheatButton.onclick = () => {
    cheatMenu.style.display = cheatMenu.style.display === 'block' ? 'none' : 'block';
  };
  cheatCompleteBtn.onclick = () => {
    if (puzzleComplete) {
      const cb = puzzleComplete;
      puzzleComplete = null;
      cb();
      cheatMenu.style.display = 'none';
    }
  };
  let manager = new DialogManager(cryoDialogue);
  manager.start('CryoRoom_Intro');
  let lineIndex = 0;

  let nextKeyHandler: ((ev: KeyboardEvent) => void) | null = null;

  async function renderDialog() {
    if (nextKeyHandler) {
      window.removeEventListener('keydown', nextKeyHandler);
      nextKeyHandler = null;
    }
    const content = manager.getCurrent();
    if (content.lines.length === 0 && !content.next && content.options.length === 0) {
      dialogBox.classList.remove('visible');
      dialogBox.style.display = 'none';
      return;
    }

    dialogBox.style.display = 'block';
    requestAnimationFrame(() => dialogBox.classList.add('visible'));

    textEl.innerHTML = '';
    optionsEl.innerHTML = '';
    overlayEl.innerHTML = '';
    overlayEl.classList.remove('visible');
    overlayEl.classList.remove('leaving');
    overlayEl.style.display = 'none';
    speakerEl.textContent = '';

    const linesToShow: string[] = [];
    if (lineIndex < content.lines.length) {
      let currentSpeaker: string | null = null;
      const first = content.lines[lineIndex];
      const firstMatch = first.match(/^(.*?):\s*(.*)$/);
      if (firstMatch) currentSpeaker = firstMatch[1];
      for (; lineIndex < content.lines.length; lineIndex++) {
        const l = content.lines[lineIndex];
        const m = l.match(/^(.*?):\s*(.*)$/);
        if (linesToShow.length > 0 && m && currentSpeaker && m[1] !== currentSpeaker) {
          break;
        }
        linesToShow.push(l);
        if (m && linesToShow.length === 1) currentSpeaker = m[1];
      }
      if (currentSpeaker) speakerEl.textContent = currentSpeaker;
    }

    for (const line of linesToShow) {
      let text = line;
      const m = line.match(/^(.*?):\s*(.*)$/);
      if (m) {
        text = m[2];
      }
      const p = document.createElement('p');
      p.textContent = text;
      textEl.appendChild(p);
      // allow CSS transition
      requestAnimationFrame(() => p.classList.add('visible'));
      await new Promise(res => setTimeout(res, 600));
    }

    if (lineIndex < content.lines.length) {
      const btn = document.createElement('button');
      btn.textContent = 'Next';
      btn.onclick = () => {
        renderDialog();
      };
      optionsEl.appendChild(btn);
      nextKeyHandler = (ev: KeyboardEvent) => {
        if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          btn.click();
        }
      };
      window.addEventListener('keydown', nextKeyHandler);
      return;
    }

    const lastLine = textEl.lastElementChild?.textContent ?? '';

    if (content.options.length > 0) {
      overlayEl.classList.remove('leaving');
      overlayEl.style.display = 'block';
      requestAnimationFrame(() => overlayEl.classList.add('visible'));
      if (lastLine) {
        const p = document.createElement('p');
        p.textContent = lastLine;
        overlayEl.appendChild(p);
      }
      const buttons: HTMLButtonElement[] = [];
      content.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.textContent = opt.text;
        if (opt.visited) {
          btn.classList.add('visited');
        }
        btn.onclick = () => {
          btn.classList.add('selected');
          overlayEl.classList.add('leaving');
          setTimeout(() => {
            overlayEl.classList.remove('visible');
            overlayEl.classList.remove('leaving');
            overlayEl.style.display = 'none';
            lineIndex = 0;
            manager.choose(idx);
            renderDialog();
          }, 200);
        };
        overlayEl.appendChild(btn);
        buttons.push(btn);
      });
      let selected = 0;
      const firstUnvisited = content.options.findIndex(o => !o.visited);
      if (firstUnvisited >= 0) {
        selected = firstUnvisited;
      }
      const updateSelected = () => {
        buttons.forEach((b, i) => {
          if (i === selected) {
            b.classList.add('selected');
            b.focus();
          } else {
            b.classList.remove('selected');
          }
        });
      };
      updateSelected();
      nextKeyHandler = (ev: KeyboardEvent) => {
        if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          selected = (selected + buttons.length - 1) % buttons.length;
          updateSelected();
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          selected = (selected + 1) % buttons.length;
          updateSelected();
        } else if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          buttons[selected].click();
        }
      };
      window.addEventListener('keydown', nextKeyHandler);
    } else if (content.next) {
      const btn = document.createElement('button');
      btn.textContent = 'Next';
      btn.id = 'dialogue-next';
      btn.onclick = () => {
        lineIndex = 0;
        manager.follow();
        renderDialog();
      };
      optionsEl.appendChild(btn);
      nextKeyHandler = (ev: KeyboardEvent) => {
        if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          btn.click();
        }
      };
      window.addEventListener('keydown', nextKeyHandler);
    }

    if (content.command) {
      if (content.command.name === 'loadPuzzle') {
        puzzleEl.style.display = 'flex';
        dialogBox.style.display = 'none';
        if (content.command.args[0] === 'TowerOfHanoi') {
          puzzleComplete = () => {
            puzzleEl.style.display = 'none';
            dialogBox.style.display = 'block';
            manager = new DialogManager(cryoAfterPuzzleDialogue);
            manager.start('CryoRoom_AfterPuzzle_Start');
            lineIndex = 0;
            renderDialog();
          };
          startTowerOfHanoi(puzzleEl, 4, () => {
            const cb = puzzleComplete;
            puzzleComplete = null;
            cb?.();
          });
        }
      }
    }
  }

  renderDialog();
});
