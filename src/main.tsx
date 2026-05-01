import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';

// Mitigate "This document requires 'TrustedHTML' assignment" errors
// which can be caused by certain extensions or userscripts in some environments.
const windowAny = window as any;
if (windowAny.trustedTypes && windowAny.trustedTypes.createPolicy) {
  try {
    windowAny.trustedTypes.createPolicy('default', {
      createHTML: (string: string) => string,
      createScriptURL: (string: string) => string,
      createScript: (string: string) => string,
    });
  } catch (e) {
    console.warn('TrustedTypes default policy could not be created:', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
