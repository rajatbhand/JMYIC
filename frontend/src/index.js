import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AudienceDisplay from './AudienceDisplay';

const isAudience = window.location.search.includes('audience');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isAudience ? <AudienceDisplay /> : <App />}
  </React.StrictMode>
);
