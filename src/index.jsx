import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './darkmode.css';
import App from './App';
import { DarkModeProvider } from './contexts/DarkModeContext';
import {
  BrowserRouter
} from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
      <DarkModeProvider>
        <App />
      </DarkModeProvider>
    </BrowserRouter>
);


