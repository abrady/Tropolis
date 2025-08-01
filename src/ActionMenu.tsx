import React, { useState, useEffect } from 'react';

export type ActionType = 'examine' | 'talk' | 'move';

interface ActionMenuProps {
  isVisible: boolean;
  onAction: (action: ActionType) => void;
  onClose: () => void;
}

const actions: { type: ActionType; text: string }[] = [
  { type: 'examine', text: 'Examine' },
  { type: 'talk', text: 'Talk' },
  { type: 'move', text: 'Move' }
];

export default function ActionMenu({ isVisible, onAction, onClose }: ActionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setSelectedIndex(0);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : actions.length - 1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => prev < actions.length - 1 ? prev + 1 : 0);
          break;
        case 'Space':
        case 'Enter':
          event.preventDefault();
          onAction(actions[selectedIndex].type);
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, selectedIndex, onAction, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="action-menu-overlay">
      <div className="action-menu-panel">
        <div className="action-menu-title">What would you like to do?</div>
        <div className="action-menu-list">
          {actions.map((action, index) => {
            const isSelected = index === selectedIndex;
            const classes = ['action-button'];
            if (isSelected) classes.push('selected');
            
            return (
              <button
                key={action.type}
                onClick={() => onAction(action.type)}
                className={classes.join(' ')}
              >
                {action.text}
              </button>
            );
          })}
        </div>
        <div className="action-menu-hint">Use arrow keys to navigate, Enter to select, Escape to close</div>
      </div>
    </div>
  );
}