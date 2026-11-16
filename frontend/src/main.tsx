import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler to prevent blank screen on unhandled errors
window.addEventListener('error', (event) => {
  console.error('Photo Studio AI - Unhandled error:', event.error || event.message, event.filename, event.lineno, event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Photo Studio AI - Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Photo Studio AI - No #root element found in HTML');
  document.body.innerHTML = '<div style="padding:2rem;text-align:center;color:#dc2626;"><h2>Application Error</h2><p>No #root element found in HTML.</p></div>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (err) {
    console.error('Photo Studio AI - React mount error:', err);
    rootElement.innerHTML = '<div style="padding:2rem;text-align:center;color:#dc2626;"><h2>Application Error</h2><p>Failed to mount React application.</p><pre style="text-align:left;font-size:0.875rem;background:#f3f4f6;padding:1rem;border-radius:0.375rem;margin-top:1rem;">' + String(err) + '</pre></div>';
  }
}
