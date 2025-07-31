import { Frame } from './frame-utils';
import { Overlord } from './characters';
import cryoroomImg from '../data/locations/cryoroom.png';
import cryoDialogue from './dialogue/cryoroom.yarn?raw';
import sector7Img from '../data/locations/sector7.png';
import sector7Dialogue from './dialogue/sector7.yarn?raw';
import mallImg from '../data/mall.png';
import mallDialogue from './dialogue/mall.yarn?raw';
import bookstoreImg from '../data/bookstore.png';
import bookstoreDialogue from './dialogue/bookstore.yarn?raw';
import { DialogManager, CommandHandlers } from './dialog-manager';
import { startTowerOfHanoi } from './puzzles';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLDivElement;
const ctx = canvas.getContext('2d')!;

const spriteSheet = Overlord.image;

interface LevelData {
  image: HTMLImageElement;
  dialogue: string;
  start: string;
}

const levels: Record<string, LevelData> = {
  CryoRoom: { image: new Image(), dialogue: cryoDialogue, start: 'CryoRoom_Intro' },
  Sector7: { image: new Image(), dialogue: sector7Dialogue, start: 'Sector7_Start' },
  mall: { image: new Image(), dialogue: mallDialogue, start: 'Mall_Start' },
  bookstore: { image: new Image(), dialogue: bookstoreDialogue, start: 'Bookstore_Start' }
};

levels.CryoRoom.image.src = cryoroomImg;
levels.Sector7.image.src = sector7Img;
levels.mall.image.src = mallImg;
levels.bookstore.image.src = bookstoreImg;

let currentLevel = levels.CryoRoom;
let background = currentLevel.image;

let currentFrames: Frame[] = [];
let frameIndex = 0;
let lastSwitch = 0;
const animations: Record<string, Frame[]> = {};

function setAnimation(name: string) {
  const anim = animations[name];
  if (!anim) throw new Error(`Unknown animation ${name}`);
  currentFrames = anim;
  frameIndex = 0;
  lastSwitch = performance.now();
}

function draw(timestamp: number) {
  const f = currentFrames[frameIndex];
  if (timestamp - lastSwitch > f.duration) {
    frameIndex = (frameIndex + 1) % currentFrames.length;
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
  ...Object.values(levels).map(l => new Promise<void>(res => {
    l.image.onload = () => res();
  }))
]).then(() => {
  animations['overlordTalk'] = Overlord.animations.talk;
  animations['overlordIdle'] = Overlord.animations.idle;
  setAnimation('overlordIdle');
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
  const cheatSkipBtn = document.getElementById('cheat-skip-dialog') as HTMLButtonElement;
  let puzzleComplete: (() => void) | null = null;

  function handleLoadPuzzle(args: string[]) {
    puzzleEl.style.display = 'flex';
    dialogBox.style.display = 'none';
    updateCheatButtons();
    if (args[0] === 'TowerOfHanoi') {
      puzzleComplete = () => {
        puzzleEl.style.display = 'none';
        updateCheatButtons();
        // Tell dialog manager the command is complete
        manager.completeCommand();
        // Continue with existing dialog flow - the jump command will handle the next node
        manager.follow().then(() => {
          renderDialog();
        });
      };
      startTowerOfHanoi(puzzleEl, 4, () => {
        const cb = puzzleComplete;
        puzzleComplete = null;
        cb?.();
      });
    }
  }

  function handleLoadLevel(args: string[]) {
    dialogBox.style.display = 'none';
    updateCheatButtons();
    changeLevel(args[0]);
    // Level loading is synchronous, so complete immediately
    manager.completeCommand();
  }

  const commandHandlers: CommandHandlers = {
    loadPuzzle: handleLoadPuzzle,
    loadLevel: handleLoadLevel
  };

  function updateCheatButtons() {
    cheatSkipBtn.disabled = dialogBox.style.display === 'none';
  }

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
  cheatSkipBtn.onclick = () => {
    if (dialogBox.style.display === 'none') return;
    let content = manager.getCurrent();
    while (true) {
      manager.skipToEnd();
      if (!content.options.length && !content.command && content.next) {
        manager.follow();
        content = manager.getCurrent();
        continue;
      }
      break;
    }
    renderDialog();
    cheatMenu.style.display = 'none';
  };
  let manager = new DialogManager(currentLevel.dialogue, commandHandlers);
  manager.start(currentLevel.start);

  function changeLevel(name: string) {
    const lvl = levels[name];
    if (!lvl) return;
    currentLevel = lvl;
    background = currentLevel.image;
    canvas.width = background.width;
    canvas.height = background.height;
    resizeCanvas();
    manager = new DialogManager(lvl.dialogue, commandHandlers);
    manager.start(lvl.start);
    renderDialog();
  }

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
      updateCheatButtons();
      return;
    }

    dialogBox.style.display = 'block';
    requestAnimationFrame(() => dialogBox.classList.add('visible'));
    updateCheatButtons();

    textEl.innerHTML = '';
    optionsEl.innerHTML = '';
    overlayEl.innerHTML = '';
    overlayEl.classList.remove('visible');
    overlayEl.classList.remove('leaving');
    overlayEl.style.display = 'none';
    speakerEl.textContent = '';

    const result = manager.nextLines();
    const linesToShow: string[] = result ? result.lines : [];
    const currentSpeaker = result ? result.speaker : null;
    if (currentSpeaker) {
      speakerEl.textContent = currentSpeaker;
      const anim = manager.getAnimationForSpeaker(currentSpeaker);
      if (anim) setAnimation(anim);
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

    if (manager.hasMoreLines()) {
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

  }

  renderDialog();
});
