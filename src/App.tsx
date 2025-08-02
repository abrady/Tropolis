import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { levels, type LevelName } from './examine/levels';
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

function GameCanvas({
  frames,
  background,
  width,
  height,
}: {
  frames: Frame[] | null;
  background: HTMLImageElement;
  width: number;
  height: number;
}) {
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
          f.x,
          f.y,
          f.w,
          f.h,
          (canvas.width - f.w) / 2,
          canvas.height / 2 - f.h,
          f.w,
          f.h
        );
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }, [frames, background, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}

interface AppProps {
  initialLevel?: LevelName;
}

export default function App({ initialLevel = 'cryoroom' }: AppProps) {
  const viewportSize = useViewportSize();
  const gameStateRef = useRef<GameState>(null);
  if (!gameStateRef.current) {
    gameStateRef.current = new GameState(levels, initialLevel);
  }
  const [dialogueGenerator, setDialogueGenerator] = useState<
    Generator<DialogueEvent, void, DialogueAdvanceParam> | undefined
  >();
  const [currentEvent, setCurrentEvent] = useState<DialogueEvent | null>(null);
  const [displayLines, setDisplayLines] = useState<string[]>([]);
  const [animation, setAnimation] = useState<Frame[] | null>(Overlord.animations.idle);
  const [background, setBackground] = useState<HTMLImageElement>(() => {
    const bg = gameStateRef.current!.getBackground();
    if (!bg) throw new Error('No background image available');
    return bg;
  });
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showExamineEditor, setShowExamineEditor] = useState(false);
  const [showExamine, setShowExamine] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [examineDebugMode, setExamineDebugMode] = useState(false);
  const puzzleContainerRef = useRef<HTMLDivElement>(null);

  const clearDialogueState = useCallback(() => {
    setCurrentEvent(null);
    setDialogueGenerator(undefined);
    setDisplayLines([]);
  }, []);

  const processNextEvent = useCallback(
    (param?: DialogueAdvanceParam) => {
      if (!dialogueGenerator) return;

      const result = param ? dialogueGenerator.next(param) : dialogueGenerator.next();

      if (result.done) {
        console.log('Dialogue ended');
        clearDialogueState();
        setShowActionMenu(true);
        return;
      }

      const event = result.value;
      setCurrentEvent(event);

      switch (event.type) {
        case 'line':
          setDisplayLines([event.text]);
          // For now, we'll skip speaker animations since we don't have a direct way to access the manager
          break;
        case 'choice':
          // Choice event handled by rendering OptionsWidget
          break;
        case 'command':
          if (event.command === 'loadPuzzle') {
            if (event.args[0] !== 'TowerOfHanoi') {
              throw new Error(`Unknown puzzle type: ${event.args[0]}`);
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
          } else if (event.command === 'loadLevel') {
            const gs = gameStateRef.current!;
            const levelName = event.args[0] as LevelName;
            if (!(levelName in levels)) {
              throw new Error(`Unknown level: ${levelName}`);
            }
            gs.gotoLevel(levelName);
            const newBg = gs.getBackground();
            if (newBg) setBackground(newBg);
            setAnimation(null); // Clear character display when changing levels
            setDialogueGenerator(gs.getDialogueGenerator());
          } else {
            throw new Error(`Unknown command: ${event.command}`);
          }
          break;
      }
    },
    [dialogueGenerator, clearDialogueState]
  );

  // Remove the separate handleDialogueAction function since it's now inline

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
          // Clear current state and start fresh
          clearDialogueState();

          // Start new dialogue
          const gameState = gameStateRef.current!;
          gameState.gotoLevel(currentLevel);
          setDialogueGenerator(gameState.getDialogueGenerator());
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

  const handleLocationSelect = (location: LevelName) => {
    setShowMoveMenu(false);
    // Clear current dialogue state first
    clearDialogueState();
    const gs = gameStateRef.current!;
    gs.gotoLevel(location);
    const newBg = gs.getBackground();
    if (newBg) setBackground(newBg);
    setAnimation(null); // Clear character display when changing levels
    setDialogueGenerator(gs.getDialogueGenerator());
  };

  const handleDialogueFromExamine = (dialogueId: string) => {
    // Clear current dialogue state and start fresh
    clearDialogueState();
    setShowExamine(false);

    const generator = gameStateRef.current!.startDialogue(dialogueId);
    setDialogueGenerator(generator);
  };

  const handleInventoryPickup = (item: string) => {
    // Add item to inventory
    gameStateRef.current!.addItem(item);
    
    // Start pickup dialogue - convert item name to dialogue node name
    const dialogueId = `Pickup${item.charAt(0).toUpperCase() + item.slice(1)}`;
    handleDialogueFromExamine(dialogueId);
  };


  const handleNextLine = () => {
    if (currentEvent?.type === 'line') {
      processNextEvent();
    }
  };

  // our run-once effect to initialize the dialogue manager and start the dialogue
  useEffect(() => {
    const gs = gameStateRef.current!;
    const generator = gs.getDialogueGenerator();
    setDialogueGenerator(generator);
  }, []);

  // call this one time once we have the dialogue manager and generator set up
  // to pump the state forward
  useEffect(() => {
    if (dialogueGenerator) {
      processNextEvent();
    }
  }, [dialogueGenerator, processNextEvent]);

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
          setExamineDebugMode((prev) => !prev);
        }
        return;
      }

      // Only prevent action menu during puzzles and move menu
      if (showPuzzle || showMoveMenu) return;

      if (event.code === 'KeyA' || event.code === 'Space') {
        event.preventDefault();
        clearDialogueState(); // Clear any dialogue state when opening action menu
        setShowActionMenu(true);
      } else if (event.code === 'Escape' || event.code === 'Backspace') {
        event.preventDefault();
        clearDialogueState(); // Clear any dialogue state when escaping
        setShowActionMenu(true);
      } else if (event.code === 'KeyE') {
        event.preventDefault();
        setShowExamineEditor((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyPress, true);
  }, [showPuzzle, showMoveMenu, showExamine, clearDialogueState]);

  return (
    <div id="game-container" style={{ width: viewportSize.width, height: viewportSize.height }}>
      <GameCanvas
        frames={animation}
        background={background}
        width={viewportSize.width}
        height={viewportSize.height}
      />
      {showExamine && (
        <ExamineOverlay
          width={viewportSize.width}
          height={viewportSize.height}
          rects={levels[gameStateRef.current!.currentLevel].examine}
          onExit={() => setShowExamine(false)}
          onDialogue={handleDialogueFromExamine}
          onInventory={handleInventoryPickup}
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
            options={
              showActionMenu || showMoveMenu
                ? []
                : currentEvent?.type === 'choice'
                  ? currentEvent.options
                  : []
            }
            onChoose={handleOptionSelect}
          />
          {showActionMenu && (
            <ActionMenu
              isVisible={showActionMenu}
              onAction={handleMenuAction}
              onClose={() => setShowActionMenu(false)}
            />
          )}
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
            zIndex: 1000,
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px' }}>Tower of Hanoi Puzzle</h2>
        </div>
      )}
      {showExamine && examineDebugMode && <div className="debug-indicator">DEBUG [D]</div>}
    </div>
  );
}
