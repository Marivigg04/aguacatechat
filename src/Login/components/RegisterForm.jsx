import React, { useState, useEffect, useRef } from 'react';
import Lottie from 'react-lottie';

import registerAnimation from '../animations/Register.json'; // Asegúrate de que esta ruta sea correcta
import successAnimation from '../animations/Success.json'; // Asegúrate de que esta ruta y nombre de archivo sean correctos (case-sensitive)
import { auth } from '../../services/db';

const RegisterForm = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  // State for strength: 'none', 'low', 'medium', 'strong', 'very-strong'
  const [passwordStrength, setPasswordStrength] = useState('none');
  const [loading, setLoading] = useState(false);

  // --- ESTADO PARA CONTROLAR EL FOCO DEL CAMPO DE CONTRASEÑA ---
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Estados y Refs para la animación de feedback de fortaleza
  const [showFeedbackDiv, setShowFeedbackDiv] = useState(false);
  const [animateFeedback, setAnimateFeedback] = useState(false);
  const strengthTimeoutRef = useRef(null);

  // --- ESTADOS Y REFS PARA LA ANIMACIÓN DEL MENSAJE DE ERROR DE COINCIDENCIA ---
  const [showMatchErrorDiv, setShowMatchErrorDiv] = useState(false);
  const [animateMatchError, setAnimateMatchError] = useState(false);
  const matchErrorTimeoutRef = useRef(null);

  // --- NUEVO ESTADO Y REF PARA LA ANIMACIÓN DEL CHECKMARK/SUCCESS ---
  const [showCheckmark, setShowCheckmark] = useState(false);
  const checkmarkTimeoutRef = useRef(null);


  // Opciones por defecto para la animación Lottie de registro
  const defaultRegisterOptions = {
    loop: true,
    autoplay: true,
    animationData: registerAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  // Opciones por defecto para la animación Lottie del checkmark/success
  const defaultCheckmarkOptions = {
    loop: false,
    autoplay: true,
    animationData: successAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  const getPasswordStrengthInfo = (pwd) => {
    let strength = 0;
    let text = '';
    let level = 'none';

    if (pwd.length === 0) {
      return { text: '', level: 'none' };
    }

    strength = 1;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8 && /[A-Z]/.test(pwd)) strength++;
    if (pwd.length >= 10 && /[0-9]/.test(pwd)) strength++;
    if (pwd.length >= 12 && /[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength === 1) {
      text = 'Débil';
      level = 'low';
    } else if (strength === 2) {
      text = 'Normal';
      level = 'medium';
    } else if (strength === 3) {
      text = 'Fuerte';
      level = 'strong';
    } else if (strength >= 4) {
      text = 'Muy Fuerte';
      level = 'very-strong';
    }

    return { text, level };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    const { level } = getPasswordStrengthInfo(newPassword);
    setPasswordStrength(level);

    if (confirmPassword.length > 0) {
      setPasswordMatchError(newPassword !== confirmPassword);
    } else {
      setPasswordMatchError(false);
    }
  };

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true);
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
  };

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    const doMatch = password === newConfirmPassword && newConfirmPassword.length > 0;
    setPasswordMatchError(!doMatch);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      return;
    }

    if (passwordStrength !== 'very-strong') {
      alert('La contraseña debe ser "Muy Fuerte" para registrarse.');
      return;
    }

    setPasswordMatchError(false);

    try {
      setLoading(true);
      // Registro con Supabase, guardando el nombre como metadata "fullName"
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          // Guardamos tanto fullName como username (usando el mismo valor por ahora)
          data: { fullName, username: fullName },
          emailRedirectTo: window?.location?.origin ? `${window.location.origin}/login` : undefined,
        },
      });

      if (error) {
        // Manejo de errores de registro
        alert('Error en el registro: ' + error.message);
        return;
      }

      // Registro exitoso
      alert('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
      // Opcional: limpiar campos o redirigir
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert('Ocurrió un error inesperado: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const currentStrengthInfo = getPasswordStrengthInfo(password);

  useEffect(() => {
    return () => {
      if (strengthTimeoutRef.current) {
        clearTimeout(strengthTimeoutRef.current);
      }
      if (matchErrorTimeoutRef.current) {
        clearTimeout(matchErrorTimeoutRef.current);
      }
      if (checkmarkTimeoutRef.current) {
        clearTimeout(checkmarkTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const shouldShowStrengthFeedback = password.length > 0 && isPasswordFocused;

    if (shouldShowStrengthFeedback) {
      setShowFeedbackDiv(true);
      if (strengthTimeoutRef.current) clearTimeout(strengthTimeoutRef.current);
      strengthTimeoutRef.current = setTimeout(() => {
        setAnimateFeedback(true);
      }, 50);
    } else {
      setAnimateFeedback(false);
      if (strengthTimeoutRef.current) clearTimeout(strengthTimeoutRef.current);
      strengthTimeoutRef.current = setTimeout(() => {
        setShowFeedbackDiv(false);
      }, 300);
    }
  }, [password.length, isPasswordFocused]);

  useEffect(() => {
    if (passwordMatchError) {
      setShowMatchErrorDiv(true);
      if (matchErrorTimeoutRef.current) clearTimeout(matchErrorTimeoutRef.current);
      matchErrorTimeoutRef.current = setTimeout(() => {
        setAnimateMatchError(true);
      }, 50);
    } else {
      setAnimateMatchError(false);
      if (matchErrorTimeoutRef.current) clearTimeout(matchErrorTimeoutRef.current);
      matchErrorTimeoutRef.current = setTimeout(() => {
        setShowMatchErrorDiv(false);
      }, 300);
    }
  }, [passwordMatchError]);

  useEffect(() => {
    const shouldShowCheckmark = !passwordMatchError && confirmPassword.length > 0;

    if (shouldShowCheckmark) {
      setShowCheckmark(true);
      if (checkmarkTimeoutRef.current) clearTimeout(checkmarkTimeoutRef.current);
      checkmarkTimeoutRef.current = setTimeout(() => {
      }, 50);
    } else {
      if (checkmarkTimeoutRef.current) clearTimeout(checkmarkTimeoutRef.current);
      checkmarkTimeoutRef.current = setTimeout(() => {
        setShowCheckmark(false);
      }, 0);
    }
  }, [passwordMatchError, confirmPassword.length]);

  return (
    <form className="auth-form register-form" onSubmit={handleSubmit}>
      <div className="register-lottie-icon">
        <Lottie
          options={defaultRegisterOptions}
          height={70}
          width={70}
          // ¡Eliminadas estas líneas! No son necesarias si loop y autoplay son true
          // isStopped={false}
          // isPaused={false}
        />
      </div>

      <h2>Registrarse</h2>
      <label htmlFor="register-fullname">Nombre completo</label>
      <input
        type="text"
        id="register-fullname"
        placeholder="Tu nombre"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <label htmlFor="register-email">Correo electrónico</label>
      <input
        type="email"
        id="register-email"
        placeholder="usuario@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="register-password">Contraseña</label>
      <div className="password-input-container">
        <input
          type={showPassword ? 'text' : 'password'}
          id="register-password"
          placeholder="********"
          value={password}
          onChange={handlePasswordChange}
          onFocus={handlePasswordFocus}
          onBlur={handlePasswordBlur}
          required
          className={`password-input ${currentStrengthInfo.level !== 'none' ? `password-strength-border-${currentStrengthInfo.level}` : ''}`}
        />
        <span className="password-toggle-icon" onClick={toggleShowPassword}>
          <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
        </span>

        {showFeedbackDiv && (
          <div className={`password-strength-feedback ${animateFeedback ? 'active' : ''}`}>
            <div className={`password-strength-text password-strength-text-${currentStrengthInfo.level}`}>
              {currentStrengthInfo.text}
            </div>
            <div className="password-strength-bar-container">
              <div className={`password-strength-bar password-strength-bar-${currentStrengthInfo.level}`}></div>
            </div>
          </div>
        )}
      </div>

      <label htmlFor="register-confirm-password">Confirmar Contraseña</label>
      <div className="password-input-container">
        <input
          type={showConfirmPassword ? 'text' : 'password'}
          id="register-confirm-password"
          placeholder="********"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          required
        />
        <span
          className={`password-toggle-icon ${showCheckmark ? 'hidden' : ''}`}
          onClick={toggleShowConfirmPassword}
        >
          <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
        </span>

        {showMatchErrorDiv && (
          <p className={`password-error-message ${animateMatchError ? 'active' : ''}`}>
            Las contraseñas no coinciden.
          </p>
        )}

        {showCheckmark && (
          <div className="checkmark-icon-container">
            <Lottie
              options={defaultCheckmarkOptions}
              height={25}
              width={25}
            />
          </div>
        )}
      </div>

      <button type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear cuenta'}</button>
    </form>
  );
};

export default RegisterForm;