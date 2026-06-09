import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// 1. Import your Dark Mode Provider (Adjust this path to match your file layout!)
import { DarkModeProvider } from './context/DarkModeContext.jsx'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. Wrap your entire application inside the Provider context */}
      <DarkModeProvider> 
        <App />
      </DarkModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);