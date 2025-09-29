import React, { useState, useEffect } from "react";
import AuthPage from "./pages/AuthPage"; // Importa el componente correcto
import PasswordReset from './components/PasswordReset';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('auth'); // 'auth' or 'password-reset'

  // Detect URL on mount: if someone opened /password-reset?step=... then show password-reset
  const [initialResetParams, setInitialResetParams] = useState({ step: null, email: null });

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.pathname === '/password-reset' || url.searchParams.has('step')) {
        setCurrentPage('password-reset');
        const step = url.searchParams.get('step');
        const email = url.searchParams.get('email');
        setInitialResetParams({ step, email });
      }
    } catch (e) {
      // ignore if URL parsing fails
    }
  }, []);

  const navigateToPasswordReset = () => {
    setCurrentPage('password-reset');
  };

  const navigateToAuth = () => {
    setCurrentPage('auth');
  };

  return (
    <main>
      {currentPage === 'auth' && (
        <AuthPage onNavigateToPasswordReset={navigateToPasswordReset} />
      )}
      {currentPage === 'password-reset' && (
        <div className="password-reset-container">
          <PasswordReset onNavigateToAuth={navigateToAuth} initialStepName={initialResetParams.step} initialEmail={initialResetParams.email} />
        </div>
      )}
    </main>
  );
}

export default App;