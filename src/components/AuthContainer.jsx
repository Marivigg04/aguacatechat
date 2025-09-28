import React, { useState } from 'react';
import PasswordReset from '../Login/components/PasswordReset/PasswordReset.jsx';
import AuthPage from '../Login/pages/AuthPage.jsx';
import useFadeSwitcher from '../hooks/useFadeSwitcher';

export default function AuthContainer({ onLoginSuccess }) {
  const { fadeState, fadeOutThen } = useFadeSwitcher(350);
  // local state for switching between views
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleNavigateToPasswordReset = () => {
    fadeOutThen(() => setShowPasswordReset(true));
  };

  const handleNavigateToLogin = () => {
    fadeOutThen(() => setShowPasswordReset(false));
  };

  return (
    <div className={`fade-transition ${fadeState === 'in' ? 'fade-in' : 'fade-out'}`}>
      {showPasswordReset ? (
        <PasswordReset onNavigateToAuth={handleNavigateToLogin} />
      ) : (
        <AuthPage onNavigateToPasswordReset={handleNavigateToPasswordReset} onLoginSuccess={onLoginSuccess} />
      )}
    </div>
  );
}
