import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './frame-utils';
import { Overlord } from './characters';
import cryoroomImg from '../data/locations/cryoroom.png';
import cryoDialogue from './dialogue/cryoroom.yarn?raw';
import { DialogManager, CommandHandlers } from './dialog-manager';
import DialogWidget from './DialogWidget';

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
  const [hasMoreLines, setHasMoreLines] = useState(false);
  const [showNextButton, setShowNextButton] = useState(true);

  const handleNext = async () => {
    if (!manager) return;
    
    if (manager.hasMoreLines()) {
      const result = manager.nextLines();
      if (result) {
        setLines(result.lines);
        const speaker = result.speaker;
        if (speaker) {
          const animName = manager.getAnimationForSpeaker(speaker);
          if (animName && Overlord.animations[animName as keyof typeof Overlord.animations]) {
            setAnimation(Overlord.animations[animName as keyof typeof Overlord.animations]);
          }
        }
      }
    } else {
      // No more lines, advance the dialogue flow and hide the next button
      setShowNextButton(false);
      await manager.follow();
      const result = manager.nextLines();
      if (result) {
        setLines(result.lines);
        setShowNextButton(true);
        const speaker = result.speaker;
        if (speaker) {
          const animName = manager.getAnimationForSpeaker(speaker);
          if (animName && Overlord.animations[animName as keyof typeof Overlord.animations]) {
            setAnimation(Overlord.animations[animName as keyof typeof Overlord.animations]);
          }
        }
      }
    }
    
    setHasMoreLines(manager.hasMoreLines());
    setOptions(manager.getCurrent().options);
  };

  useEffect(() => {
    const handlers: CommandHandlers = {
      loadPuzzle: (args: string[]) => {},
      loadLevel: (args: string[]) => {},
      return: (args: string[]) => {}
    };
    const m = new DialogManager(levels.CryoRoom.dialogue, handlers);
    m.start(levels.CryoRoom.start);
    setManager(m);
  }, []);

  useEffect(() => {
    if (!manager) return;
    handleNext();
  }, [manager]);


  return (
    <div id="game-container">
      <GameCanvas frames={animation} background={background} />
      <DialogWidget
        lines={lines}
        options={options}
        showNextButton={showNextButton}
        onNext={handleNext}
      />
    </div>
  );
}
