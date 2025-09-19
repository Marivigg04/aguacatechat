import React, { useState, useEffect, useRef } from 'react';
import { Mail, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import Lottie from 'react-lottie';
import LoadingSpinner from '../common/LoadingSpinner'; // Asegúrate de que esta ruta sea correcta
import { STEPS, CONTACT_METHODS } from '../../utils/constants'; // Asegúrate de que esta ruta sea correcta y los objetos existan
import escudoGif from '../../assets/escudo.gif'; // Asegúrate de que esta ruta sea correcta
import successAnimation from '../../animations/Success.json'; // Asegúrate de que esta ruta sea correcta

const FormPanel = ({
  step,
  setStep,
  contactMethod, // No usado directamente en este renderizado, pero mantenido por si lo necesitas
  setContactMethod, // No usado directamente en este renderizado, pero mantenido por si lo necesitas
  contactValue,
  setContactValue,
  verificationCode, // No usado directamente en este renderizado, pero mantenido por si lo necesitas
  handleCodeInput, // No usado directamente en este renderizado, pero mantenido por si lo necesitas
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
  onSendCode,
  onVerifyCode, // No usado directamente en este renderizado, pero mantenido por si lo necesitas
  onResetPassword,
  onResendCode, // No usado directamente en este renderizado, pero mantenido por si lo necesitas
  onNavigateToAuth
}) => {
  // Password strength states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('none');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Animation states for password feedback
  const [showFeedbackDiv, setShowFeedbackDiv] = useState(false);
  const [animateFeedback, setAnimateFeedback] = useState(false);
  const [showMatchErrorDiv, setShowMatchErrorDiv] = useState(false);
  const [animateMatchError, setAnimateMatchError] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  // Nuevos estados para controlar la animación de transición entre pasos
  const [currentRenderedStep, setCurrentRenderedStep] = useState(step); // El paso que actualmente está en el DOM
  const [isAnimating, setIsAnimating] = useState(false); // Para controlar el estado de la animación (entrada/salida)

  // Refs for timeouts
  const strengthTimeoutRef = useRef(null);
  const matchErrorTimeoutRef = useRef(null);
  const checkmarkTimeoutRef = useRef(null);
  const animationTimeoutRef = useRef(null); // Ref para el timeout de la animación de paso

  // Lottie options for success animation
  const defaultCheckmarkOptions = {
    loop: false,
    autoplay: true,
    animationData: successAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  // Password strength calculation function
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

  // Password change handlers
  const handleNewPasswordChange = (e) => {
    const newPasswordValue = e.target.value;
    setNewPassword(newPasswordValue);
    const { level } = getPasswordStrengthInfo(newPasswordValue);
    setPasswordStrength(level);

    if (confirmPassword.length > 0) {
      setPasswordMatchError(newPasswordValue !== confirmPassword);
    } else {
      setPasswordMatchError(false);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    const doMatch = newPassword === newConfirmPassword && newConfirmPassword.length > 0;
    setPasswordMatchError(!doMatch);
  };

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true);
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
  };

  const toggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const currentStrengthInfo = getPasswordStrengthInfo(newPassword);

  // Cleanup effect for timeouts
  useEffect(() => {
    return () => {
      if (strengthTimeoutRef.current) clearTimeout(strengthTimeoutRef.current);
      if (matchErrorTimeoutRef.current) clearTimeout(matchErrorTimeoutRef.current);
      if (checkmarkTimeoutRef.current) clearTimeout(checkmarkTimeoutRef.current);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current); // Limpiar también el timeout de la animación de paso
    };
  }, []);

  // Password strength feedback animation effect
  useEffect(() => {
    const shouldShowStrengthFeedback = newPassword.length > 0 && isPasswordFocused;

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
  }, [newPassword.length, isPasswordFocused]);

  // Password match error animation effect
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

  // Checkmark animation effect
  useEffect(() => {
    const shouldShowCheckmark = !passwordMatchError && confirmPassword.length > 0 && newPassword === confirmPassword;

    if (shouldShowCheckmark) {
      setShowCheckmark(true);
    } else {
      setShowCheckmark(false);
    }
  }, [passwordMatchError, confirmPassword.length, newPassword, confirmPassword]);

  // Effect para manejar la transición de pasos
  useEffect(() => {
    if (step !== currentRenderedStep) {
      setIsAnimating(true); // Activar la animación de salida para el paso actual
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setCurrentRenderedStep(step); // Cambiar al nuevo paso después de la animación de salida
        setIsAnimating(false); // Desactivar la animación (el nuevo paso estará "entrando")
      }, 300); // Duración de tu animación CSS de salida (ej. 300ms)
    } else {
      setIsAnimating(false); // Si el paso es el mismo, asegurar que no haya animación activa
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [step, currentRenderedStep]); // Dependencia del efecto: 'step' y 'currentRenderedStep'


  const getStepTitle = () => {
    switch (step) {
      case STEPS.CONTACT_METHOD:
        return "Restablecer Contraseña";
      case STEPS.VERIFICATION:
        return "Verificar Código";
      case STEPS.NEW_PASSWORD:
        return "Nueva Contraseña";
      default:
        return "Restablecer Contraseña";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case STEPS.CONTACT_METHOD:
        return "Ingresa tu correo electrónico para restablecer tu contraseña";
      case STEPS.VERIFICATION:
        return `Hemos enviado un código a ${contactValue}. Ingresa el código aquí.`;
      case STEPS.NEW_PASSWORD:
        return "Crea una nueva contraseña segura";
      default:
        return "Ingresa tu correo electrónico para restablecer tu contraseña";
    }
  };

  // Función para obtener el contenido del paso basado en currentRenderedStep
  const getStepContent = (currentStep) => {
    switch (currentStep) {
      case STEPS.CONTACT_METHOD:
        return (
          <div key={STEPS.CONTACT_METHOD} className={`form-step ${currentRenderedStep === STEPS.CONTACT_METHOD && !isAnimating ? 'active-step' : 'inactive-step'}`}>
            {/* Contenido del Paso 1: Email Input */}
            <div className="input-container">
              <div className="input-icon">
                <Mail size={20} className="text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="Ingresa tu correo electrónico"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                className="input-field-with-icon"
                required
              />
            </div>
            <button
              onClick={onSendCode}
              disabled={!contactValue || isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <span>Continuar</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        );
      case STEPS.NEW_PASSWORD:
        return (
          <div key={STEPS.NEW_PASSWORD} className={`form-step ${currentRenderedStep === STEPS.NEW_PASSWORD && !isAnimating ? 'active-step' : 'inactive-step'}`}>
            {/* Contenido del Paso 2: Nueva Contraseña */}
            <button
              onClick={() => setStep(STEPS.CONTACT_METHOD)} // Vuelve al paso de correo electrónico
              className="back-step-btn"
            >
              <ArrowLeft size={20} />
              <span>Volver</span>
            </button>

            {/* New Password Input */}
            <div className="password-input-container">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={handleNewPasswordChange}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                className={`input-field password-input ${currentStrengthInfo.level !== 'none' ? `password-strength-border-${currentStrengthInfo.level}` : ''}`}
                required
              />
              <span className="password-toggle-icon" onClick={toggleShowNewPassword}>
                <i className={showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </span>

              {/* Password Strength Feedback */}
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

            {/* Confirm Password Input */}
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="input-field password-input"
                required
              />
              <span
                className={`password-toggle-icon ${showCheckmark ? 'hidden' : ''}`}
                onClick={toggleShowConfirmPassword}
              >
                <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </span>

              {/* Password Match Error */}
              {showMatchErrorDiv && (
                <p className={`password-error-message ${animateMatchError ? 'active' : ''}`}>
                  Las contraseñas no coinciden.
                </p>
              )}

              {/* Success Checkmark (Muestra Lottie cuando las contraseñas coinciden y no hay error) */}
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

            <button
              onClick={onResetPassword}
              disabled={passwordStrength !== 'very-strong' || passwordMatchError || isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <span>Restablecer Contraseña</span>
                  <Check size={20} />
                </>
              )}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="form-panel">
      {/* Botón de volver solo visible en step 1 (CONTACT_METHOD) */}
      {step === STEPS.CONTACT_METHOD && (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (onNavigateToAuth) {
              onNavigateToAuth();
            }
          }}
          className="back-to-login-btn"
          title="Volver al inicio de sesión"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <div className="form-content">
        {/* Header */}
        <div className="form-header">
          <div className="header-icon">
            <img
              src={escudoGif}
              alt="Escudo de seguridad"
              className="shield-gif"
            />
          </div>
          <h1 className="form-title">
            {getStepTitle()}
          </h1>
          <p className="form-description">
            {getStepDescription()}
          </p>
        </div>

        {/* Contenedor de los pasos con animación */}
        <div className="step-transition-container">
          {getStepContent(currentRenderedStep)}
        </div>
      </div>
    </div>
  );
};

export default FormPanel;