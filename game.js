const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const spriteSheet = new Image();
spriteSheet.src = 'Overlord.png';

const background = new Image();
background.src = '0_cryoroom.png';

let frames = [];
let frameIndex = 0;
let lastSwitch = 0;

function draw(timestamp) {
  const f = frames[frameIndex];
  if (timestamp - lastSwitch > f.duration) {
    frameIndex = (frameIndex + 1) % frames.length;
    lastSwitch = timestamp;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  const x = (canvas.width - f.w) / 2;
  const y = canvas.height - f.h;
  ctx.drawImage(
    spriteSheet,
    f.x, f.y, f.w, f.h,
    x, y, f.w, f.h
  );
  requestAnimationFrame(draw);
}

Promise.all([
  fetch('Overlord.json').then(r => r.json()),
  new Promise(resolve => spriteSheet.onload = resolve),
  new Promise(resolve => background.onload = resolve)
]).then(([data]) => {
  frames = Object.keys(data.frames).map(key => {
    const frame = data.frames[key];
    return {
      x: frame.frame.x,
      y: frame.frame.y,
      w: frame.frame.w,
      h: frame.frame.h,
      duration: frame.duration
    };
  });
  canvas.width = background.width;
  canvas.height = background.height;
  requestAnimationFrame(draw);
});
