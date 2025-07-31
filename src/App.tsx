import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './frame-utils';
import { Overlord } from './characters';
import cryoroomImg from '../data/locations/cryoroom.png';
import cryoDialogue from './dialogue/cryoroom.yarn?raw';
import { DialogManager, CommandHandlers } from './dialog-manager';

interface LevelData {
  image: HTMLImageElement;
  dialogue: string;
  start: string;
}

const levels: Record<string, LevelData> = {
  CryoRoom: { image: new Image(), dialogue: cryoDialogue, start: 'CryoRoom_Intro' }
};

levels.CryoRoom.image.src = cryoroomImg;

function GameCanvas({ frames, background }: { frames: Frame[]; background: HTMLImageElement }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let frameIndex = 0;
    let lastSwitch = performance.now();
    function draw(ts: number) {
      const f = frames[frameIndex];
      if (ts - lastSwitch > f.duration) {
        frameIndex = (frameIndex + 1) % frames.length;
        lastSwitch = ts;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        Overlord.image,
        f.x, f.y, f.w, f.h,
        (canvas.width - f.w) / 2,
        (canvas.height / 2) - f.h,
        f.w, f.h
      );
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }, [frames, background]);

  return <canvas ref={canvasRef} width={background.width} height={background.height} />;
}

export default function App() {
  const [manager, setManager] = useState<DialogManager | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [options, setOptions] = useState<{ text: string; visited?: boolean }[]>([]);
  const [animation, setAnimation] = useState<Frame[]>(Overlord.animations.idle);
  const [background] = useState(() => levels.CryoRoom.image);

  useEffect(() => {
    const handlers: CommandHandlers = {
      loadPuzzle: () => {},
      loadLevel: () => {},
      return: () => {}
    };
    const m = new DialogManager(levels.CryoRoom.dialogue, handlers);
    m.start(levels.CryoRoom.start);
    setManager(m);
  }, []);

  useEffect(() => {
    if (!manager) return;
    const result = manager.nextLines();
    setLines(result ? result.lines : []);
    setOptions(manager.getCurrent().options);
    const speaker = result ? result.speaker : null;
    if (speaker) {
      const anim = manager.getAnimationForSpeaker(speaker);
      if (anim) setAnimation(anim);
    }
  }, [manager]);

  return (
    <div id="game-container">
      <GameCanvas frames={animation} background={background} />
      <div id="dialogue">
        {lines.map((l, i) => <p key={i}>{l}</p>)}
        {options.map((o, i) => <button key={i}>{o.text}</button>)}
      </div>
    </div>
  );
}
