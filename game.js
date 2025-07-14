const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const spriteSheet = new Image();
spriteSheet.src = 'Overlord.png';

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
  ctx.drawImage(
    spriteSheet,
    f.x, f.y, f.w, f.h,
    0, 0, f.w, f.h
  );
  requestAnimationFrame(draw);
}

Promise.all([
  fetch('Overlord.json').then(r => r.json()),
  new Promise(resolve => spriteSheet.onload = resolve)
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
  canvas.width = frames[0].w;
  canvas.height = frames[0].h;
  requestAnimationFrame(draw);
});
