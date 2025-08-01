import { useState, useCallback, useRef } from 'react';
import { DialogManager, DialogEvent, CommandHandlers } from './dialog-manager';

export interface UseDialogResult {
  event: DialogEvent | null;
  busy: boolean;
  pump: () => void;
  choose: (index: number) => void;
}

export interface UseDialogOptions {
  onAction?: (command: string, args: string[]) => void | Promise<void>;
}

export function useDialog(
  yarnText: string, 
  commandHandlers: CommandHandlers,
  options: UseDialogOptions = {}
): UseDialogResult {
  const managerRef = useRef<DialogManager | null>(null);
  const [event, setEvent] = useState<DialogEvent | null>(null);
  const [busy, setBusy] = useState(false);

  // Initialize manager on first render
  if (!managerRef.current) {
    managerRef.current = new DialogManager(yarnText, commandHandlers);
  }

  const handleAction = useCallback(async (command: string, args: string[]) => {
    if (options.onAction) {
      setBusy(true);
      try {
        await options.onAction(command, args);
      } finally {
        setBusy(false);
      }
    }
  }, [options.onAction]);

  const pump = useCallback(() => {
    if (!managerRef.current || busy) return;

    const nextEvent = managerRef.current.advance();
    
    if (nextEvent.type === 'action') {
      handleAction(nextEvent.command, nextEvent.args).then(() => {
        // After action completes, pump again to get next event
        pump(); // Recursively pump to get the next event after action
      });
      return;
    }

    setEvent(nextEvent);
  }, [busy, handleAction]);

  const choose = useCallback((index: number) => {
    if (!managerRef.current || busy) return;

    const nextEvent = managerRef.current.choose(index);
    
    if (nextEvent.type === 'action') {
      handleAction(nextEvent.command, nextEvent.args).then(() => {
        // After action completes, pump again to get next event
        if (managerRef.current) {
          const followingEvent = managerRef.current.advance();
          setEvent(followingEvent);
        }
      });
      return;
    }

    setEvent(nextEvent);
  }, [busy, handleAction]);

  // Start dialog on first render
  const start = useCallback((startNode: string) => {
    if (!managerRef.current) return;
    
    const initialEvent = managerRef.current.start(startNode);
    
    if (initialEvent.type === 'action') {
      handleAction(initialEvent.command, initialEvent.args).then(() => {
        // After action completes, pump again to get next event
        if (managerRef.current) {
          const followingEvent = managerRef.current.advance();
          setEvent(followingEvent);
        }
      });
      return;
    }

    setEvent(initialEvent);
  }, [handleAction]);

  return {
    event,
    busy,
    pump,
    choose,
    start
  } as UseDialogResult & { start: (startNode: string) => void };
}