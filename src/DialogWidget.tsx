import React, { useState, useEffect } from 'react';

interface DialogWidgetProps {
  lines: string[];
  showNextButton: boolean;
  onNext: () => void;
}

export default function DialogWidget({ 
  lines, 
  showNextButton, 
  onNext
}: DialogWidgetProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    setCurrentLineIndex(0);
  }, [lines]);

  const handleNext = () => {
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1);
    } else {
      onNext();
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNext]);

  const currentLine = lines[currentLineIndex];
  const hasMoreLinesToShow = currentLineIndex < lines.length - 1;

  return (
    <div id="dialogue">
      {currentLine && <p>{currentLine}</p>}
      {(hasMoreLinesToShow || showNextButton) && (
        <button onClick={handleNext}>Next</button>
      )}
    </div>
  );
}