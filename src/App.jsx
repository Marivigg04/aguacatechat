// React hooks y utilidades en una sola importación
import './Login/styles/AuthPage.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import LoadingScreen from './components/LoadingScreen.jsx';
import ChatSkeleton from './components/ChatSkeleton.jsx';
import { withMinDelay } from './utils/withMinDelay.js';
const AguacateChat = lazy(() => withMinDelay(import('./AguacateChat')));
const AuthPage = lazy(() => withMinDelay(import('./Login/pages/AuthPage.jsx')));
const PasswordReset = lazy(() => withMinDelay(import('./Login/components/PasswordReset/PasswordReset.jsx')));
import { useAuth } from './context/AuthContext.jsx';

function App() {
  // Autenticación derivada del contexto global
  const { isAuthenticated, loading } = useAuth();
  // Forzar que la pantalla de carga de auth dure al menos 600ms
  const [authDelayDone, setAuthDelayDone] = useState(false);
  useEffect(() => {
    setAuthDelayDone(false);
    const t = setTimeout(() => setAuthDelayDone(true), 600);
    return () => clearTimeout(t);
  }, [loading]);

  // Navegación entre login y password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [fadeState, setFadeState] = useState('in'); // 'in' | 'out'
  const fadeTimeoutRef = useRef(null);

  // Transiciones de UI (se mantienen, ya no suscribe a supabase directamente)

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

  // While loading auth state (e.g., after refresh), avoid routing redirects.
  if (loading || !authDelayDone) return <LoadingScreen message="Verificando sesión…" />;

  return (
    <Router>
  <Suspense fallback={<LoadingScreen message="Cargando interfaz…" /> }>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? (
            <Navigate to="/chat" replace />
          ) : (
            <div className={`fade-transition ${fadeState === 'in' ? 'fade-in' : 'fade-out'}`}>
              {showPasswordReset ? (
                <PasswordReset onNavigateToAuth={handleNavigateToLogin} />
              ) : (
                <AuthPage onNavigateToPasswordReset={handleNavigateToPasswordReset} onLoginSuccess={() => { /* obsoleto: ahora escuchamos sesión */ }} />
              )}
            </div>
          )
        } />
  <Route path="/password-reset" element={<PasswordReset onNavigateToAuth={handleNavigateToLogin} />} />
        <Route
          path="/chat"
          element={
            isAuthenticated ? (
              <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
                <Suspense fallback={<ChatSkeleton /> }>
                  <AguacateChat />
                </Suspense>
              </div>
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