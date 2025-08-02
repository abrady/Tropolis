import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './frame-utils';
import { Overlord } from './characters';
import { DialogueEvent, DialogueAdvanceParam } from './dialogue-manager';
import DialogueWidget from './DialogueWidget';
import OptionsWidget from './OptionsWidget';
import ActionMenu, { ActionType } from './ActionMenu';
import MoveMenu from './MoveMenu';
import { startTowerOfHanoi } from './puzzles';
import ExamineEditor from './ExamineEditor';
import ExamineOverlay from './ExamineOverlay';
import { GameState } from './game-state';
import { levels } from './examine/levels';
import { getRoomDialogueStart } from './dialogue/dialogues';

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

function GameCanvas({ frames, background, width, height }: { frames: Frame[] | null; background: HTMLImageElement; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let frameIndex = 0;
    let lastSwitch = performance.now();
    function draw(ts: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      
      // Only draw character if frames are provided
      if (frames && frames.length > 0) {
        const f = frames[frameIndex];
        if (ts - lastSwitch > f.duration) {
          frameIndex = (frameIndex + 1) % frames.length;
          lastSwitch = ts;
        }
        ctx.drawImage(
          Overlord.image,
          f.x, f.y, f.w, f.h,
          (canvas.width - f.w) / 2,
          (canvas.height / 2) - f.h,
          f.w, f.h
        );
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }, [frames, background, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}

interface AppProps {
  initialLevel?: keyof typeof levels;
}

export default function App({ initialLevel = 'cryoroom' }: AppProps) {
  const viewportSize = useViewportSize();
  const gameStateRef = useRef<GameState>(null);
  if (!gameStateRef.current) {
    gameStateRef.current = new GameState(levels, initialLevel);
  }
  const [dialogueGenerator, setDialogueGenerator] = useState<Generator<DialogueEvent, void, DialogueAdvanceParam> | null>(null);
  const [currentEvent, setCurrentEvent] = useState<DialogueEvent | null>(null);
  const [displayLines, setDisplayLines] = useState<string[]>([]);
  const [animation, setAnimation] = useState<Frame[] | null>(Overlord.animations.idle);
  const [background, setBackground] = useState(() => gameStateRef.current!.getBackground());
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showExamineEditor, setShowExamineEditor] = useState(false);
  const [showExamine, setShowExamine] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [examineDebugMode, setExamineDebugMode] = useState(false);
  const puzzleContainerRef = useRef<HTMLDivElement>(null);

  const handleDialogueAction = (command: string, args: string[]) => {
    if (command === 'loadPuzzle') {
      if(args[0] !== 'TowerOfHanoi') {
        throw new Error(`Unknown puzzle type: ${args[0]}`);
      }
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
    } else if (command === 'loadLevel') {
      const gs = gameStateRef.current!;
      gs.gotoLevel(args[0]);
      setBackground(gs.getBackground());
      setAnimation(null); // Clear character display when changing levels
      const gen = gs.getManager().advance();
      setDialogueGenerator(gen);
    }
    // Auto-advance after processing action
    else {
      throw new Error(`Unknown command: ${command}`);
    }
  };

  const processNextEvent = (param?: DialogueAdvanceParam) => {
    if (!dialogueGenerator) return;
    
    const result = param ?
      dialogueGenerator.next(param) :
      dialogueGenerator.next();

    if (result.done) {
      console.log('Dialogue ended');
      setCurrentEvent(null);
      setDialogueGenerator(null);
      setDisplayLines([]);
      
      setShowActionMenu(true);
      return;
    }

    const event = result.value;
    setCurrentEvent(event);
    
    const manager = gameStateRef.current!.getManager();
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
    processNextEvent({ type: 'choice', optionIndex }); 
  };

  const handleMenuAction = (action: ActionType) => {
    setShowActionMenu(false);
    console.log(`Action selected: ${action}`);
    
    switch (action) {
      case 'talk': {
        // Start main dialogue for current level
        const currentLevel = gameStateRef.current!.currentLevel;
        const startNode = getRoomDialogueStart(currentLevel);
        if (startNode) {
          // Clear current state
          setCurrentEvent(null);
          setDisplayLines([]);
          
          // Start new dialogue
          const manager = gameStateRef.current!.getManager();
          manager.start(startNode);
          const generator = manager.advance();
          setDialogueGenerator(generator);
        }
        break;
      }
      case 'examine':
        setShowExamine(true);
        break;
      case 'move':
        setShowMoveMenu(true);
        break;
    }
  };

  const handleLocationSelect = (location: string) => {
    setShowMoveMenu(false);
    const gs = gameStateRef.current!;
    gs.gotoLevel(location);
    setBackground(gs.getBackground());
    setAnimation(null); // Clear character display when changing levels
    const gen = gs.getManager().advance();
    setDialogueGenerator(gen);
  };

  const handleDialogueFromExamine = (dialogueId: string) => {
    // Clear current dialogue state first
    setCurrentEvent(null);
    setDisplayLines([]);
    
    const manager = gameStateRef.current!.getManager();
    manager.start(dialogueId);
    const generator = manager.advance();
    setDialogueGenerator(generator);
  };

  const handleOptionsEscape = () => {
    setDisplayLines([]);
    setShowActionMenu(true);
  };

  const handleNextLine = () => {
    if (currentEvent?.type === 'line') {
      processNextEvent();
    }
  };

  // our run-once effect to initialize the dialogue manager and start the dialogue
  useEffect(() => {
    const gs = gameStateRef.current!;
    const m = gs.getManager();
    setDialogueGenerator(m.advance());
  }, []);

  // call this one time once we have the dialogue manager and generator set up
  // to pump the state forward
  useEffect(() => {
    if (dialogueGenerator && !currentEvent) {
      processNextEvent(); 
    }
  }, [dialogueGenerator, processNextEvent, currentEvent]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showExamine) {
        if (event.code === 'Escape') {
          event.preventDefault();
          setShowExamine(false);
        } else if (event.code === 'KeyE') {
          event.preventDefault();
          setShowExamine(false);
          setShowExamineEditor(true);
        } else if (event.code === 'KeyD') {
          event.preventDefault();
          setExamineDebugMode(prev => !prev);
        }
        return;
      }

      // Only allow action menu when not in dialogue/options/puzzle/move menu
      if (showPuzzle || showMoveMenu || currentEvent?.type === 'choice' || displayLines.length > 0) return;

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
  }, [showPuzzle, showMoveMenu, showExamine, currentEvent?.type, displayLines.length]);


  return (
    <div id="game-container" style={{ width: viewportSize.width, height: viewportSize.height }}>
      <GameCanvas frames={animation} background={background} width={viewportSize.width} height={viewportSize.height} />
      {showExamine && (
        <ExamineOverlay
          width={viewportSize.width}
          height={viewportSize.height}
          rects={levels[gameStateRef.current!.currentLevel].examine}
          onExit={() => setShowExamine(false)}
          onDialogue={handleDialogueFromExamine}
          debugMode={examineDebugMode}
        />
      )}
      {showExamineEditor && (
        <ExamineEditor
          width={viewportSize.width}
          height={viewportSize.height}
          background={background}
          onClose={() => setShowExamineEditor(false)}
          initialRects={levels[gameStateRef.current!.currentLevel].examine}
        />
      )}
      {!showPuzzle && !showExamine && (
        <>
          <DialogueWidget
            lines={displayLines}
            showNextButton={currentEvent?.type === 'line'}
            onNext={handleNextLine}
          />
          <OptionsWidget
            options={showActionMenu || showMoveMenu ? [] : (currentEvent?.type === 'choice' ? currentEvent.options : [])}
            onChoose={handleOptionSelect}
            onEscape={handleOptionsEscape}
          />
          <ActionMenu
            isVisible={showActionMenu}
            onAction={handleMenuAction}
            onClose={() => setShowActionMenu(false)}
          />
          <MoveMenu
            isVisible={showMoveMenu}
            availableLocations={gameStateRef.current!.getAvailableLocations()}
            currentLocation={gameStateRef.current!.currentLevel}
            onLocationSelect={handleLocationSelect}
            onClose={() => setShowMoveMenu(false)}
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
      {showExamine && examineDebugMode && (
        <div className="debug-indicator">
          DEBUG [D]
        </div>
      )}
    </div>
  );
}
