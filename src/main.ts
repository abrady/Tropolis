import { parseFrames, Frame } from './frame-utils';
import overlordData from './data/Overlord.json';
import overlordImg from './data/Overlord.png';
import cryoroomImg from './data/0_cryoroom.png';

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
});
