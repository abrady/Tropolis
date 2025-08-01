import React from 'react';

export interface LineDisplayerProps {
  text: string;
  speaker?: string;
  onNext?: () => void;
}

export function LineDisplayer({ text, speaker, onNext }: LineDisplayerProps) {
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && onNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onNext]);

  return (
    <div className="line-displayer">
      {speaker && <div className="speaker">{speaker}:</div>}
      <div className="text">{text}</div>
      <div className="hint">Press SPACE to continue</div>
    </div>
  );
}