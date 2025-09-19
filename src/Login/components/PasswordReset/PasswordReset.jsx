import React, { useState } from 'react';
import FormPanel from './FormPanel';
import AnimatedPanel from '../../pages/AnimatedPanel';
import { STEPS, CONTACT_METHODS } from '../../utils/constants';
import '../../styles/PasswordReset.css';

const PasswordReset = ({ onNavigateToAuth }) => {
  const [step, setStep] = useState(STEPS.CONTACT_METHOD);
  const [contactMethod, setContactMethod] = useState(CONTACT_METHODS.EMAIL);
  const [contactValue, setContactValue] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = () => {
    if (!contactValue) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(STEPS.NEW_PASSWORD); // Ir directamente a nueva contraseña
    }, 2000);
  };

  const handleVerifyCode = () => {
    const code = verificationCode.join('');
    if (code.length !== 6) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(STEPS.NEW_PASSWORD);
    }, 1500);
  };

  const handleResetPassword = () => {
    // Validate password match
    if (newPassword !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    
    // Validate password strength using the same logic as RegisterForm
    const getPasswordStrengthLevel = (pwd) => {
      let strength = 0;
      if (pwd.length === 0) return 'none';
      
      strength = 1;
      if (pwd.length >= 6) strength++;
      if (pwd.length >= 8 && /[A-Z]/.test(pwd)) strength++;
      if (pwd.length >= 10 && /[0-9]/.test(pwd)) strength++;
      if (pwd.length >= 12 && /[^A-Za-z0-9]/.test(pwd)) strength++;
      
      if (strength === 1) return 'low';
      if (strength === 2) return 'medium';
      if (strength === 3) return 'strong';
      if (strength >= 4) return 'very-strong';
      return 'none';
    };
    
    const passwordStrength = getPasswordStrengthLevel(newPassword);
    if (passwordStrength !== 'very-strong') {
      alert('La contraseña debe ser "Muy Fuerte" para continuar.');
      return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('¡Contraseña restablecida exitosamente! Serás redirigido al inicio de sesión.');
      // Reset form
      setStep(STEPS.CONTACT_METHOD);
      setContactValue('');
      setVerificationCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      // Navigate back to login
      if (onNavigateToAuth) {
        onNavigateToAuth();
      }
    }, 2000);
  };

  const handleCodeInput = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleResendCode = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
      <div className="main-card">
        <div className="panels-container">
          {/* Panel del Formulario - Ahora a la izquierda */}
          <FormPanel
            step={step}
            setStep={setStep}
            contactMethod={contactMethod}
            setContactMethod={setContactMethod}
            contactValue={contactValue}
            setContactValue={setContactValue}
            verificationCode={verificationCode}
            handleCodeInput={handleCodeInput}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            isLoading={isLoading}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
            onResetPassword={handleResetPassword}
            onResendCode={handleResendCode}
            onNavigateToAuth={onNavigateToAuth}
          />
          
          {/* Panel Animado - Ahora a la derecha */}
          <AnimatedPanel />
        </div>
      </div>
  );
};

export default PasswordReset;