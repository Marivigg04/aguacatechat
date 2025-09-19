import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AguacateChat from './AguacateChat';
import AuthPage from './Login/pages/AuthPage.jsx';

function App() {
  // Simulación de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Puedes conectar esto con tu lógica real de login
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthPage onNavigateToPasswordReset={() => {}} onLoginSuccess={handleLoginSuccess} />} />
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