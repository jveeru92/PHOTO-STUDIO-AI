import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler to prevent blank screen on unhandled errors
window.addEventListener('error', (event) => {
  console.error('Photo Studio AI - Unhandled error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Photo Studio AI - Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Photo Studio AI - No #root element found in HTML');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
