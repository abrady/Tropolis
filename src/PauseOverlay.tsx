import React from 'react';

export interface PauseOverlayProps {
  duration?: number;
  onComplete?: () => void;
}

export function PauseOverlay({ duration = 1000, onComplete }: PauseOverlayProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="pause-overlay">
      <div className="pause-indicator">
        <div className="pause-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      </div>
    </div>
  );
}