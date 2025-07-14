const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const spriteSheet = new Image();
spriteSheet.src = '/Overlord.png';

const background = new Image();
background.src = '/0_cryoroom.png';

type Frame = { x: number; y: number; w: number; h: number; duration: number };

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
  fetch('/Overlord.json').then(r => r.json()),
  new Promise<void>(resolve => {
    spriteSheet.onload = () => resolve();
  }),
  new Promise<void>(resolve => {
    background.onload = () => resolve();
  })
]).then(([data]) => {
  frames = Object.keys(data.frames).map(key => {
    const frame = data.frames[key];
    return {
      x: frame.frame.x,
      y: frame.frame.y,
      w: frame.frame.w,
      h: frame.frame.h,
      duration: frame.duration
    } as Frame;
  });
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
