import React, { useEffect, useState } from 'react';
import { useRef } from 'react';
import './Login/styles/AuthPage.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AguacateChat from './AguacateChat';
import AuthPage from './Login/pages/AuthPage.jsx';
import PasswordReset from './Login/components/PasswordReset/PasswordReset.jsx';
import { supabase } from './services/supabaseClient';

function App() {
  // Autenticación real basada en la sesión de Supabase
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Navegación entre login y password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [fadeState, setFadeState] = useState('in'); // 'in' | 'out'
  const fadeTimeoutRef = useRef(null);

  // Sincroniza el estado de la app con la sesión de Supabase
  useEffect(() => {
    let isMounted = true;
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setIsAuthenticated(!!data.session);
    });

    // Suscribirse a cambios de sesión
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleNavigateToPasswordReset = () => {
    setFadeState('out');
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => {
      setShowPasswordReset(true);
      setFadeState('in');
    }, 350); // Duración de la animación
  };

  const handleNavigateToLogin = () => {
    setFadeState('out');
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => {
      setShowPasswordReset(false);
      setFadeState('in');
    }, 350);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <div className={`fade-transition ${fadeState === 'in' ? 'fade-in' : 'fade-out'}`}>
            {showPasswordReset ? (
              <PasswordReset onNavigateToAuth={handleNavigateToLogin} />
            ) : (
              <AuthPage onNavigateToPasswordReset={handleNavigateToPasswordReset} onLoginSuccess={() => { /* obsoleto: ahora escuchamos sesión */ }} />
            )}
          </div>
        } />
        <Route path="/password-reset" element={<PasswordReset onNavigateToAuth={handleNavigateToLogin} />} />
        <Route path="/chat" element={isAuthenticated ? (
          <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
            <AguacateChat />
          </div>
        ) : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;