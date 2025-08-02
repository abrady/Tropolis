import React, { useState, useEffect } from 'react';

interface MoveMenuProps {
  isVisible: boolean;
  availableLocations: string[];
  currentLocation: string;
  onLocationSelect: (location: string) => void;
  onClose: () => void;
}

export default function MoveMenu({ isVisible, availableLocations, currentLocation, onLocationSelect, onClose }: MoveMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter out current location from available options
  const locations = availableLocations.filter(location => location !== currentLocation);

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
          setSelectedIndex(prev => prev > 0 ? prev - 1 : locations.length - 1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => prev < locations.length - 1 ? prev + 1 : 0);
          break;
        case 'Space':
        case 'Enter':
          event.preventDefault();
          if (locations.length > 0) {
            onLocationSelect(locations[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, selectedIndex, locations, onLocationSelect, onClose]);

  if (!isVisible) {
    return null;
  }

  if (locations.length === 0) {
    return (
      <div className="action-menu-overlay">
        <div className="action-menu-panel">
          <div className="action-menu-title">Where would you like to go?</div>
          <div className="action-menu-list">
            <div className="action-button">No other locations available</div>
          </div>
          <div className="action-menu-hint">Press Escape to close</div>
        </div>
      </div>
    );
  }

  return (
    <div className="action-menu-overlay">
      <div className="action-menu-panel">
        <div className="action-menu-title">Where would you like to go?</div>
        <div className="action-menu-list">
          {locations.map((location, index) => {
            const isSelected = index === selectedIndex;
            const classes = ['action-button'];
            if (isSelected) classes.push('selected');
            
            return (
              <button
                key={location}
                onClick={() => onLocationSelect(location)}
                className={classes.join(' ')}
              >
                {location}
              </button>
            );
          })}
        </div>
        <div className="action-menu-hint">Use arrow keys to navigate, Enter to select, Escape to close</div>
      </div>
    </div>
  );
}