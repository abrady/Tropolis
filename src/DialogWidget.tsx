import React from 'react';

interface DialogWidgetProps {
  lines: string[];
  options: { text: string; visited?: boolean }[];
  showNextButton: boolean;
  onNext: () => void;
  onOptionClick?: (index: number) => void;
}

export default function DialogWidget({ 
  lines, 
  options, 
  showNextButton, 
  onNext, 
  onOptionClick 
}: DialogWidgetProps) {
  return (
    <div id="dialogue">
      {lines.map((l, i) => <p key={i}>{l}</p>)}
      {showNextButton && (
        <button onClick={onNext}>Next (Space)</button>
      )}
      {options.map((o, i) => (
        <button key={i} onClick={() => onOptionClick?.(i)}>
          {o.text}
        </button>
      ))}
    </div>
  );
}