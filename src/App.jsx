// React hooks y utilidades en una sola importación
import './Login/styles/AuthPage.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import LoadingScreen from './components/LoadingScreen.jsx';
import ChatSkeleton from './components/ChatSkeleton.jsx';
import { withMinDelay } from './utils/withMinDelay.js';
const AguacateChat = lazy(() => withMinDelay(import('./AguacateChat')));
const AuthContainer = lazy(() => withMinDelay(import('./components/AuthContainer.jsx')));
import { useAuth } from './context/AuthContext.jsx';
import useAuthDelay from './hooks/useAuthDelay';
import ChatShell from './components/ChatShell.jsx';

function App() {
  // Autenticación derivada del contexto global
  const { isAuthenticated, loading } = useAuth();
  // Forzar que la pantalla de carga de auth dure al menos 600ms
  const authDelayDone = useAuthDelay(loading, 600);

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