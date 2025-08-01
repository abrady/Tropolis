import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './frame-utils';
import { Overlord } from './characters';
import cryoroomImg from '../data/locations/cryoroom.png';
import cryoDialogue from './dialogue/cryoroom.yarn?raw';
import { DialogueManager, CommandHandlers, DialogueOption, DialogueEvent, DialogueAdvanceParam } from './dialog-manager';
import DialogueWidget from './DialogueWidget';
import OptionsWidget from './OptionsWidget';
import ActionMenu, { ActionType } from './ActionMenu';
import { startTowerOfHanoi } from './puzzles';
import ExamineEditor from './ExamineEditor';

function useViewportSize() {
  const [size, setSize] = useState(() => {
    const aspectRatio = 16 / 9;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    
    let gameWidth, gameHeight;
    if (maxWidth / maxHeight > aspectRatio) {
      gameHeight = maxHeight;
      gameWidth = gameHeight * aspectRatio;
    } else {
      gameWidth = maxWidth;
      gameHeight = gameWidth / aspectRatio;
    }
    
    return { width: gameWidth, height: gameHeight };
  });

  useEffect(() => {
    const handleResize = () => {
      const aspectRatio = 16 / 9;
      const maxWidth = window.innerWidth;
      const maxHeight = window.innerHeight;
      
      let gameWidth, gameHeight;
      if (maxWidth / maxHeight > aspectRatio) {
        gameHeight = maxHeight;
        gameWidth = gameHeight * aspectRatio;
      } else {
        gameWidth = maxWidth;
        gameHeight = gameWidth / aspectRatio;
      }
      
      setSize({ width: gameWidth, height: gameHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

interface LevelData {
  image: HTMLImageElement;
  dialogue: string;
  start: string;
}

const levels: Record<string, LevelData> = {
  CryoRoom: { image: new Image(), dialogue: cryoDialogue, start: 'CryoRoom_Intro' }
};

levels.CryoRoom.image.src = cryoroomImg;

function GameCanvas({ frames, background, width, height }: { frames: Frame[]; background: HTMLImageElement; width: number; height: number }) {
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
  }, [frames, background, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}

export default function App() {
  const viewportSize = useViewportSize();
  const [manager, setManager] = useState<DialogueManager | null>(null);
  const [dialogueGenerator, setDialogueGenerator] = useState<Generator<DialogueEvent, void, DialogueAdvanceParam> | null>(null);
  const [currentEvent, setCurrentEvent] = useState<DialogueEvent | null>(null);
  const [displayLines, setDisplayLines] = useState<string[]>([]);
  const [animation, setAnimation] = useState<Frame[]>(Overlord.animations.idle);
  const [background] = useState(() => levels.CryoRoom.image);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showExamineEditor, setShowExamineEditor] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [previousOptions, setPreviousOptions] = useState<DialogueOption[]>([]);
  const puzzleContainerRef = useRef<HTMLDivElement>(null);

  const handleDialogueAction = (command: string, args: string[]) => {
    if (command === 'loadPuzzle' && args[0] === 'TowerOfHanoi') {
      setShowPuzzle(true);
      
      setTimeout(() => {
        const container = puzzleContainerRef.current;
        if (container) {
          container.innerHTML = '';
          startTowerOfHanoi(container, 4, () => {
            setShowPuzzle(false);
            // Continue dialogue after puzzle completion
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

  const processNextEvent = () => {
    if (!dialogueGenerator) return;
    
    const result = dialogueGenerator.next();
    handleGeneratorResult(result);    
  };

  const handleGeneratorResult = (result: IteratorResult<DialogueEvent, void>) => {
    if (result.done) {
      setCurrentEvent(null);
      return;
    }

    const event = result.value;
    setCurrentEvent(event);
    
    switch (event.type) {
      case 'line':
        setDisplayLines([event.text]);
        if (event.speaker && manager) {
          const animName = manager.getAnimationForSpeaker(event.speaker);
          if (animName && Overlord.animations[animName as keyof typeof Overlord.animations]) {
            setAnimation(Overlord.animations[animName as keyof typeof Overlord.animations]);
          }
        }
        break;
      case 'choice':
        // Choice event handled by rendering OptionsWidget
        break;
      case 'command':
        handleDialogueAction(event.command, event.args);
        break;
    }
  };
    
  const handleOptionSelect = (optionIndex: number) => {
    if (!dialogueGenerator) return;
    
    const result = dialogueGenerator.next({ type: 'choice', optionIndex });
    handleGeneratorResult(result);
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
        setShowExamineEditor(true);
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
      loadPuzzle: () => {}, // Handled by dialogue action system
      loadLevel: () => {},
      return: () => {}
    };
    
    const m = new DialogueManager(levels.CryoRoom.dialogue, handlers);
    setManager(m);
    
    // Start the dialogue and get generator
    m.start(levels.CryoRoom.start);
    const generator = m.advance();
    setDialogueGenerator(generator);
    
    // Get first event
    const result = generator.next();
    if (!result.done) {
      const firstEvent = result.value;
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
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only allow action menu when not in dialogue/options/puzzle
      if (showPuzzle || currentEvent?.type === 'choice' || displayLines.length > 0) return;

      if (event.code === 'KeyA' || event.code === 'Space') {
        event.preventDefault();
        setShowActionMenu(true);
      } else if (event.code === 'KeyE') {
        event.preventDefault();
        setShowExamineEditor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPuzzle, currentEvent?.type, displayLines.length]);


  return (
    <div id="game-container" style={{ width: viewportSize.width, height: viewportSize.height }}>
      <GameCanvas frames={animation} background={background} width={viewportSize.width} height={viewportSize.height} />
      {showExamineEditor && (
        <ExamineEditor
          width={viewportSize.width}
          height={viewportSize.height}
          background={background}
          onClose={() => setShowExamineEditor(false)}
        />
      )}
      {!showPuzzle && (
        <>
          <DialogueWidget
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
