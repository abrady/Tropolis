import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './frame-utils';
import { Overlord } from './characters';
import cryoroomImg from '../data/locations/cryoroom.png';
import cryoDialogue from './dialogue/cryoroom.yarn?raw';
import { DialogManager, CommandHandlers, DialogueOption, DialogEvent } from './dialog-manager';
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
  const [pump, setPump] = useState<Generator<DialogEvent | null> | null>(null);
  const [currentEvent, setCurrentEvent] = useState<DialogEvent | null>(null);
  const [displayLines, setDisplayLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [animation, setAnimation] = useState<Frame[]>(Overlord.animations.idle);
  const [background] = useState(() => levels.CryoRoom.image);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [previousOptions, setPreviousOptions] = useState<DialogueOption[]>([]);
  const puzzleContainerRef = useRef<HTMLDivElement>(null);

  const processNextEvent = () => {
    if (!manager) return;
    
    const event = pump?.next().value;
    setCurrentEvent(event);
    
    switch (event.type) {
      case 'line':
        setDisplayLines(prev => [...prev, event.text]);
        if (event.speaker) {
          const animName = manager.getAnimationForSpeaker(event.speaker);
          if (animName && Overlord.animations[animName as keyof typeof Overlord.animations]) {
            setAnimation(Overlord.animations[animName as keyof typeof Overlord.animations]);
          }
        }
        break;
      case 'choice':
        // Choice event handled by rendering OptionsWidget
        break;
      case 'action':
        handleDialogAction(event.command, event.args);
        break;
      case 'end':
        // Dialog ended
        break;
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (!manager) return;
    
    const event = manager.choose(optionIndex);
    setCurrentEvent(event);
    
    // Process the event after choice
    if (event.type === 'line') {
      setDisplayLines([event.text]);
      if (event.speaker) {
        const animName = manager.getAnimationForSpeaker(event.speaker);
        if (animName && Overlord.animations[animName as keyof typeof Overlord.animations]) {
          setAnimation(Overlord.animations[animName as keyof typeof Overlord.animations]);
        }
      }
    } else if (event.type === 'action') {
      handleDialogAction(event.command, event.args);
    }
  };

  const handleDialogAction = (command: string, args: string[]) => {
    if (command === 'loadPuzzle' && args[0] === 'TowerOfHanoi') {
      setShowPuzzle(true);
      
      setTimeout(() => {
        const container = puzzleContainerRef.current;
        if (container) {
          container.innerHTML = '';
          startTowerOfHanoi(container, 4, () => {
            setShowPuzzle(false);
            // Continue dialog after puzzle completion
            processNextEvent();
          });
        }
      }, 100);
    }
    // Auto-advance after processing action
    else {
      processNextEvent();
    }
  };

  const handleMenuAction = (action: ActionType) => {
    setShowActionMenu(false);
    console.log(`Action selected: ${action}`);
    
    switch (action) {
      case 'talk':
        if (previousOptions.length > 0 && currentEvent?.type === 'choice') {
          // Restore previous choice options
        }
        break;
      case 'examine':
        // TODO: Implement examine functionality
        break;
      case 'move':
        // TODO: Implement move functionality
        break;
    }
  };

  const handleOptionsEscape = () => {
    if (currentEvent?.type === 'choice') {
      setPreviousOptions(currentEvent.options);
    }
    setDisplayLines([]);
    setShowActionMenu(true);
  };

  const handleNext = () => {
    processNextEvent();
  };

  useEffect(() => {
    const handlers: CommandHandlers = {
      loadPuzzle: () => {}, // Handled by dialog action system
      loadLevel: () => {},
      return: () => {}
    };
    
    const m = new DialogManager(levels.CryoRoom.dialogue, handlers);
    setManager(m);
    
    // Start the dialog and get first event
    const firstEvent = m.start(levels.CryoRoom.start);
    setCurrentEvent(firstEvent);
    
    if (firstEvent.type === 'line') {
      setDisplayLines([firstEvent.text]);
      if (firstEvent.speaker) {
        const animName = m.getAnimationForSpeaker(firstEvent.speaker);
        if (animName && Overlord.animations[animName as keyof typeof Overlord.animations]) {
          setAnimation(Overlord.animations[animName as keyof typeof Overlord.animations]);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only allow action menu when not in dialogue/options/puzzle
      if (showPuzzle || currentEvent?.type === 'choice' || displayLines.length > 0) return;
      
      if (event.code === 'KeyA' || event.code === 'Space') {
        event.preventDefault();
        setShowActionMenu(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPuzzle, currentEvent?.type, displayLines.length]);


  return (
    <div id="game-container">
      <GameCanvas frames={animation} background={background} />
      {!showPuzzle && (
        <>
          <DialogWidget
            lines={displayLines}
            showNextButton={currentEvent?.type === 'line'}
            onNext={handleNext}
          />
          <OptionsWidget
            options={currentEvent?.type === 'choice' ? currentEvent.options : []}
            onChoose={handleOptionSelect}
            onEscape={handleOptionsEscape}
          />
          <ActionMenu
            isVisible={showActionMenu}
            onAction={handleMenuAction}
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
