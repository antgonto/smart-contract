import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@elastic/eui/dist/eui_theme_amsterdam_light.json';
import '@elastic/eui/dist/eui_theme_amsterdam_dark.json';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);