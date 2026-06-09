import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

// 🎯 Bro, pass your active user/auth state into this provider so we can isolate it!
export const DarkModeProvider = ({ children, currentUser }) => {
  // Extract a unique identifier if user is logged in (e.g., id or username)
  const userId = currentUser?.id || currentUser?.username || null;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 🔒 If no user is logged in yet, default strictly to light mode (false)
    if (!userId) return false;
    
    // Otherwise, fetch this specific user's isolated dark mode preference
    const saved = localStorage.getItem(`darkMode_${userId}`);
    return saved ? JSON.parse(saved) : false;
  });

  // 🔄 Sync theme when the active user changes (e.g., logging in or out)
  useEffect(() => {
    if (!userId) {
      // 🛡️ NO USER = Force light mode on login/register pages
      setIsDarkMode(false);
      document.documentElement.removeAttribute('data-theme');
    } else {
      // USER IS LOGGED IN = Load their saved choice
      const saved = localStorage.getItem(`darkMode_${userId}`);
      setIsDarkMode(saved ? JSON.parse(saved) : false);
    }
  }, [userId]);

  // 🔄 Apply changes to HTML attributes and storage when theme state alters
  useEffect(() => {
    if (userId) {
      // Only save to storage if we actually have an active user profile
      localStorage.setItem(`darkMode_${userId}`, JSON.stringify(isDarkMode));
    }

    if (isDarkMode && userId) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode, userId]);

  const toggleDarkMode = () => {
    // Prevent toggling if there's no logged-in user session
    if (!userId) return; 
    setIsDarkMode(prev => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};