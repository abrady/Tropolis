import { parseFrames, Frame } from './frame-utils';
import overlordData from './data/Overlord.json';
import overlordImg from './data/Overlord.png';
import cryoroomImg from './data/0_cryoroom.png';
import cryoDialogue from './dialogue/0_cryoroom.yarn?raw';
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
  const manager = new DialogManager(cryoDialogue);
  manager.start('CryoRoom_Intro');

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

    for (const line of content.lines) {
      let text = line;
      const m = line.match(/^(.*?):\s*(.*)$/);
      if (m) {
        speakerEl.textContent = m[1];
        text = m[2];
      }
      const p = document.createElement('p');
      p.textContent = text;
      textEl.appendChild(p);
      // allow CSS transition
      requestAnimationFrame(() => p.classList.add('visible'));
      await new Promise(res => setTimeout(res, 600));
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
            manager.choose(idx);
            renderDialog();
          }, 200);
        };
        overlayEl.appendChild(btn);
        buttons.push(btn);
      });
      let selected = 0;
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
      btn.onclick = () => {
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
          startTowerOfHanoi(puzzleEl, 5);
        }
      }
    }
  }

  renderDialog();
});
