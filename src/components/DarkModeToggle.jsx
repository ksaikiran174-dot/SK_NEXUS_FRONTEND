import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import './DarkModeToggle.css';

function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="dark-mode-toggle-container">
      <button
        className="dark-mode-toggle"
        onClick={toggleDarkMode}
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span className="toggle-icon">
          {isDarkMode ? '☀️' : '🌙'}
        </span>
        <span className="toggle-label">
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </span>
      </button>
    </div>
  );
}

export default DarkModeToggle;
