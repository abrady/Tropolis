const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const spriteSheet = new Image();
spriteSheet.src = 'Overlord.png';

const frameWidth = 256;
const frameHeight = 256;
const frames = [
  {x: 0, y: 0},
  {x: frameWidth, y: 0}
];

let frameIndex = 0;
let lastSwitch = 0;
const frameInterval = 500; // ms

function draw(timestamp) {
  if (timestamp - lastSwitch > frameInterval) {
    frameIndex = (frameIndex + 1) % frames.length;
    lastSwitch = timestamp;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const f = frames[frameIndex];
  ctx.drawImage(spriteSheet,
    f.x, f.y, frameWidth, frameHeight,
    0, 0, frameWidth, frameHeight);
  requestAnimationFrame(draw);
}

spriteSheet.onload = () => {
  requestAnimationFrame(draw);
};
