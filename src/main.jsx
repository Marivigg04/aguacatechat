import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './utils/css/index.css'
// Initialize Supabase client globally once
import './services/supabaseClient.js'
import { AuthProvider } from './context/AuthContext.jsx'

// Aplicar tema desde el inicio leyendo cookie 'darkMode'
try {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };
  const dark = getCookie('darkMode') === 'true';
  document.body.className = dark
    ? 'dark-mode theme-bg-primary theme-text-primary'
    : 'light-mode theme-bg-primary theme-text-primary';
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)