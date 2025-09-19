import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import '../styles/AuthPage.css';

import Lottie from 'react-lottie';
import yourDecorativeAnimation from '../animations/wired-flat-497-truck-delivery-loop-cycle.json'; 

const AuthPage = ({ onNavigateToPasswordReset, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  const defaultOptions = {
    loop: true,           
    autoplay: true,       
    animationData: yourDecorativeAnimation, 
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice' 
    }
  };

  const handleToggle = (toLogin) => {
    setIsLogin(toLogin);
  };

  // Puedes mantener esta función si quieres que se registre el clic, pero no pausar.
  // Sin embargo, con pointerEvents="none" directo, el clic no debería ni llegar.
  const handleLottieClick = (event) => {
    // Si llegamos aquí, es que pointerEvents="none" no funcionó completamente.
    // console.log("Lottie fue clickeado (inesperadamente), pero debería continuar.");
    // event.stopPropagation(); // Podría ayudar si el evento se propaga.
  };

  return (
    <div className="auth-wrapper">
      <div className={`auth-container ${!isLogin ? 'right-panel-active' : ''}`}>

        <div className="form-container sign-up-container">
          <RegisterForm />
        </div>

        <div className="form-container sign-in-container">
          <LoginForm onNavigateToPasswordReset={onNavigateToPasswordReset} onLoginSuccess={onLoginSuccess} />
        </div>

        <div className="overlay-container">
          <div className="overlay">
            
            <div className="overlay-panel overlay-left">
              <div className="lottie-panel-icon">
                <Lottie
                  options={defaultOptions}
                  height={150}
                  width={150}
                  // CAMBIO CLAVE: Añadir pointerEvents="none" directamente
                  pointerEvents="none" 
                  // Mantener onClick por si acaso, aunque con pointerEvents="none" no debería ser necesario
                  onClick={handleLottieClick} 
                />
              </div>
              <h2>¡Bienvenido de Nuevo!</h2>
              <p>Para mantenerte conectado, por favor inicia sesión con tu información personal.</p>
              <button className="ghost-button" onClick={() => handleToggle(true)}>
                Iniciar Sesión
              </button>
            </div>

            <div className="overlay-panel overlay-right">
              <div className="lottie-panel-icon">
                <Lottie
                  options={defaultOptions}
                  height={150}
                  width={150}
                  // CAMBIO CLAVE: Añadir pointerEvents="none" directamente
                  pointerEvents="none" 
                  // Mantener onClick por si acaso
                  onClick={handleLottieClick} 
                />
              </div>
              <h2>¡Hola Amigo!</h2>
              <p>Introduce tus datos personales y comienza tu viaje con nosotros.</p>
              <button className="ghost-button" onClick={() => handleToggle(false)}>
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;