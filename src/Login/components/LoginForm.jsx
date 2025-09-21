import React, { useState } from 'react';
import Lottie from 'react-lottie'; // Importa Lottie

// Importa tu animación Lottie de login con el nombre correcto
import loginAnimation from '../animations/login.json'; // <--- Nombre de archivo corregido

import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/db';

const LoginForm = ({ onNavigateToPasswordReset, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Opciones por defecto para la animación Lottie de login
  const defaultLoginOptions = {
    loop: true,
    autoplay: true,
    animationData: loginAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await auth.signInWithPassword({ email, password });
      if (error) {
        alert(`Error al iniciar sesión: ${error.message}`);
        return;
      }
      // Login exitoso
      if (onLoginSuccess) onLoginSuccess(data?.user || null);
      navigate('/chat');
    } catch (err) {
      alert('Ocurrió un error inesperado al iniciar sesión.');
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (onNavigateToPasswordReset) {
      onNavigateToPasswordReset();
    }
  };

  return (
    <form className="auth-form login-form" onSubmit={handleSubmit}>
      {/* --- INICIO: Nuevo Contenedor para la Animación de Login --- */}
      <div className="login-lottie-icon"> {/* Clase específica para este Lottie */}
        <Lottie
          options={defaultLoginOptions}
          height={70} // Ajusta el tamaño deseado
          width={70}  // Ajusta el tamaño deseado
        />
      </div>
      {/* --- FIN: Nuevo Contenedor para la Animación de Login --- */}

      <h2>Iniciar Sesión</h2>
      <label htmlFor="login-email">Correo electrónico</label>
      <input
        type="email"
        id="login-email"
        placeholder="usuario@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="login-password">Contraseña</label>
      <div className="password-input-container">
        <input
          type={showPassword ? 'text' : 'password'}
          id="login-password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <span className="password-toggle-icon" onClick={toggleShowPassword}>
          <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
        </span>
      </div>

      <a href="#" className="forgot-password-link" onClick={handleForgotPassword}>¿Olvidaste tu contraseña?</a>

      <button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Iniciar Sesión'}</button>
    </form>
  );
};

export default LoginForm;