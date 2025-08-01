import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './frame-utils';
import { Overlord } from './characters';
import cryoroomImg from '../data/locations/cryoroom.png';
import cryoDialogue from './dialogue/cryoroom.yarn?raw';
import { DialogManager, CommandHandlers, DialogueOption } from './dialog-manager';
import DialogWidget from './DialogWidget';
import OptionsWidget from './OptionsWidget';
import ActionMenu, { ActionType } from './ActionMenu';
import { startTowerOfHanoi } from './puzzles';

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
  const [options, setOptions] = useState<DialogueOption[]>([]);
  const [animation, setAnimation] = useState<Frame[]>(Overlord.animations.idle);
  const [background] = useState(() => levels.CryoRoom.image);
  const [hasMoreLines, setHasMoreLines] = useState(false);
  const [showNextButton, setShowNextButton] = useState(true);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const puzzleContainerRef = useRef<HTMLDivElement>(null);

  const handleOptionSelect = async (optionIndex: number) => {
    if (!manager) return;
    manager.choose(optionIndex);
    setOptions([]);
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
    setHasMoreLines(manager.hasMoreLines());
    setOptions(manager.getCurrent().options);
  };

  const handleAction = (action: ActionType) => {
    setShowActionMenu(false);
    console.log(`Action selected: ${action}`);
    // TODO: Implement action handlers
  };

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
    let currentManager: DialogManager | null = null;
    
    const handlers: CommandHandlers = {
      loadPuzzle: (args: string[]) => {
        const puzzleName = args[0];
        
        if (puzzleName === 'TowerOfHanoi') {
          setShowPuzzle(true);
          
          // Use setTimeout to ensure the state update and ref are ready
          setTimeout(() => {
            const container = puzzleContainerRef.current;
            if (container) {
              container.innerHTML = '';
              startTowerOfHanoi(container, 4, () => {
                setShowPuzzle(false);
                if (currentManager) {
                  currentManager.completeCommand();
                  // Continue dialogue flow by triggering a state update
                  const result = currentManager.nextLines();
                  if (result) {
                    setLines(result.lines);
                    setShowNextButton(true);
                  }
                  setHasMoreLines(currentManager.hasMoreLines());
                  setOptions(currentManager.getCurrent().options);
                }
              });
            }
          }, 100);
        }
      },
      loadLevel: (args: string[]) => {},
      return: (args: string[]) => {}
    };
    const m = new DialogManager(levels.CryoRoom.dialogue, handlers);
    currentManager = m;
    m.start(levels.CryoRoom.start);
    setManager(m);
  }, []);

  useEffect(() => {
    if (!manager) return;
    handleNext();
  }, [manager]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only allow action menu when not in dialogue/options/puzzle
      if (showPuzzle || options.length > 0 || lines.length > 0) return;
      
      if (event.code === 'KeyA' || event.code === 'Space') {
        event.preventDefault();
        setShowActionMenu(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPuzzle, options.length, lines.length]);


  return (
    <div id="game-container">
      <GameCanvas frames={animation} background={background} />
      {!showPuzzle && (
        <>
          <DialogWidget
            lines={lines}
            showNextButton={showNextButton}
            onNext={handleNext}
          />
          <OptionsWidget
            options={options}
            onSelect={handleOptionSelect}
          />
          <ActionMenu
            isVisible={showActionMenu}
            onAction={handleAction}
            onClose={() => setShowActionMenu(false)}
          />
        </>
      )}
      {showPuzzle && (
        <div 
          ref={puzzleContainerRef} 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            zIndex: 1000
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px' }}>Tower of Hanoi Puzzle</h2>
        </div>
      )}
    </div>
  );
}
