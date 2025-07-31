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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'transparent',
        padding: '20px',
        borderRadius: '8px',
        minWidth: '300px',
        maxWidth: '80%'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isVisited = option.visited;
            
            return (
              <button
                key={index}
                onClick={() => onSelect(index)}
                style={{
                  padding: '10px 15px',
                  fontSize: '14px',
                  border: isSelected ? '2px solid #007acc' : '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: isVisited 
                    ? (isSelected ? '#d0d0d0' : '#888') 
                    : (isSelected ? '#e6f3ff' : 'white'),
                  color: isVisited ? '#555' : 'black',
                  cursor: 'pointer',
                  opacity: isVisited ? 0.7 : 1
                }}
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