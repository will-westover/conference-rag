import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Entry point: find <div id="root"> in index.html and hand it to React.
// StrictMode runs effects twice in development (not in production) to surface bugs early.
const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing <div id="root">');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
