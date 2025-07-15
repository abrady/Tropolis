import { parseFrames, Frame } from './frame-utils';
import overlordData from './data/Overlord.json';
import overlordImg from './data/Overlord.png';
import cryoroomImg from './data/0_cryoroom.png';
import cryoDialogue from './dialogue/0_cryoroom.yarn?raw';
import { DialogManager } from './dialog-manager';

const canvas = document.getElementById('game') as HTMLCanvasElement;
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
    const scale = Math.min(
      window.innerWidth / canvas.width,
      window.innerHeight / canvas.height
    );
    canvas.style.width = canvas.width * scale + 'px';
    canvas.style.height = canvas.height * scale + 'px';
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(draw);

  const dialogBox = document.getElementById('dialogue') as HTMLDivElement;
  const textEl = document.getElementById('dialogue-text') as HTMLDivElement;
  const optionsEl = document.getElementById('dialogue-options') as HTMLDivElement;
  const manager = new DialogManager(cryoDialogue);
  manager.start('CryoRoom_Intro');

  function renderDialog() {
    const content = manager.getCurrent();
    textEl.innerHTML = content.lines.map(l => `<p>${l}</p>`).join('');
    optionsEl.innerHTML = '';
    if (content.options.length > 0) {
      content.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.textContent = opt.text;
        btn.onclick = () => {
          manager.choose(idx);
          renderDialog();
        };
        optionsEl.appendChild(btn);
      });
    } else if (content.next) {
      const btn = document.createElement('button');
      btn.textContent = 'Next';
      btn.onclick = () => {
        manager.follow();
        renderDialog();
      };
      optionsEl.appendChild(btn);
    }
    dialogBox.style.display = content.lines.length === 0 && !content.next && content.options.length === 0 ? 'none' : 'block';
  }

  renderDialog();
});
