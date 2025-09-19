import React, { useState } from "react";
import AuthPage from "./pages/AuthPage"; // Importa el componente correcto
import PasswordReset from './components/PasswordReset';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('auth'); // 'auth' or 'password-reset'

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
          <PasswordReset onNavigateToAuth={navigateToAuth} />
        </div>
      )}
    </main>
  );
}

export default App;