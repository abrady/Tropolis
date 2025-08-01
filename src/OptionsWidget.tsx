import React, { useState, useEffect } from 'react';
import { DialogueOption } from './dialog-manager';

export interface OptionsWidgetProps {
  options: DialogueOption[];
  onChoose: (index: number) => void;
  onEscape?: () => void;
}

export default function OptionsWidget({ options, onChoose, onEscape }: OptionsWidgetProps) {
  const getFirstUnvisited = (opts: DialogueOption[]) => {
    const idx = opts.findIndex(o => !o.visited);
    return idx === -1 ? 0 : idx;
  };

  const [selectedIndex, setSelectedIndex] = useState(() => getFirstUnvisited(options));

  useEffect(() => {
    setSelectedIndex(getFirstUnvisited(options));
  }, [options]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (options.length === 0) return;

      switch (event.code) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : options.length - 1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => prev < options.length - 1 ? prev + 1 : 0);
          break;
        case 'Space':
        case 'Enter':
          event.preventDefault();
          onChoose(selectedIndex);
          break;
        case 'Backspace':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [options, selectedIndex, onChoose, onEscape]);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="options-overlay">
      <div className="options-panel">
        <div className="options-list">
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const classes = ['option-button'];
            if (isSelected) classes.push('selected');
            if (option.visited) classes.push('visited');
            return (
              <button
                key={index}
                onClick={() => onChoose(index)}
                className={classes.join(' ')}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
