import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ensureMockDataCleared } from './utils/dataManagement';
import './index.css';

// Automatically purge old mock pre-records once so admin tests with fresh records
ensureMockDataCleared();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
