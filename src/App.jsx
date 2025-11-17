
// Externas
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Componentes internos
import LoadingScreen from './components/loading/LoadingScreen.jsx';
import ChatSkeleton from './components/skeletons/ChatSkeleton.jsx';
import ChatShell from './components/chat/ChatShell.jsx';

// Utilidades y hooks
import { withMinDelay } from './utils/js/withMinDelay.js';
import { useAuth } from './context/AuthContext.jsx';
import { ensurePushRegistered } from './services/pushNotifications.js';
import useAuthDelay from './hooks/useAuthDelay';

// Lazy imports
const AguacateChat = lazy(() => withMinDelay(import('./AguacateChat')));
const AuthContainer = lazy(() => withMinDelay(import('./components/common/AuthContainer.jsx')));

// Estilos
import './Login/styles/AuthPage.css';

function App() {
  // Autenticación derivada del contexto global
  const { isAuthenticated, loading } = useAuth();
  // Forzar que la pantalla de carga de auth dure al menos 600ms
  const authDelayDone = useAuthDelay(loading, 600);

  // Registro de notificaciones push cuando el usuario se autentica.
  useEffect(() => {
    if (isAuthenticated) {
      // Pequeño timeout para garantizar que el contexto y user estén listos
      const t = setTimeout(() => {
        ensurePushRegistered();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

  // La navegación y transiciones entre AuthPage y PasswordReset
  // ahora están encapsuladas en `AuthContainer`.

  // While loading auth state (e.g., after refresh), avoid routing redirects.
  if (loading || !authDelayDone) return <LoadingScreen message="Verificando sesión…" />;

  return (
    <Router>
  <Suspense fallback={<LoadingScreen message="Cargando interfaz…" /> }>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              <Suspense fallback={<LoadingScreen message="Cargando interfaz…" />}>
                <AuthContainer onLoginSuccess={() => { /* obsoleto: ahora escuchamos sesión */ }} />
              </Suspense>
            )
          }
        />
        <Route
          path="/chat"
          element={
            isAuthenticated ? (
              <ChatShell>
                <AguacateChat />
              </ChatShell>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;