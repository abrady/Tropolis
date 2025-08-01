import React, { useState, useEffect } from 'react';
import { DialogueOption } from './dialog-manager';

interface OptionsWidgetProps {
  options: DialogueOption[];
  onSelect: (index: number) => void;
}

export default function OptionsWidget({ options, onSelect }: OptionsWidgetProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
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
          onSelect(selectedIndex);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [options, selectedIndex, onSelect]);

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
                onClick={() => onSelect(index)}
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