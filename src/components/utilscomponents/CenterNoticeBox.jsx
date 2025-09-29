import React from 'react';
import Lottie from 'react-lottie';

/*
  Componente: CenterNoticeBox
  Uso: Mostrar un cuadro informativo centrado en el área de chat.

  Props:
  - title: string opcional (titulo principal)
  - message: string (texto principal o children)
  - icon: ReactNode opcional (SVG, Lottie, imagen). Si se pasa lottieOptions se renderiza Lottie.
  - lottieOptions: objeto de configuración para Lottie (excluye autoplay por defecto).
  - actions: array de objetos { label, onClick, variant }
      variant: 'primary' | 'secondary' | 'danger' | 'outline'
  - variant: estilo semántico 'info' | 'warning' | 'success' | 'error' | 'neutral'
  - className: clases extra
  - children: contenido JSX alternativo si se requiere algo más complejo que message
*/

const variantStyles = {
  info: {
    ring: 'ring-teal-500/30',
    bg: 'bg-teal-500/10',
    accent: 'text-teal-500',
    border: 'border-teal-500/30'
  },
  warning: {
    ring: 'ring-amber-500/30',
    bg: 'bg-amber-500/10',
    accent: 'text-amber-500',
    border: 'border-amber-500/30'
  },
  success: {
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-500/10',
    accent: 'text-emerald-500',
    border: 'border-emerald-500/30'
  },
  error: {
    ring: 'ring-rose-500/30',
    bg: 'bg-rose-500/10',
    accent: 'text-rose-500',
    border: 'border-rose-500/30'
  },
  neutral: {
    ring: 'ring-gray-500/20',
    bg: 'bg-gray-500/10',
    accent: 'text-gray-500',
    border: 'border-gray-500/30'
  }
};

const actionVariant = {
  primary: 'bg-gradient-to-r from-teal-primary to-teal-secondary text-white hover:opacity-90',
  secondary: 'theme-bg-chat theme-text-primary hover:opacity-90',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  outline: 'border theme-border theme-text-primary hover:bg-white/5'
};

export default function CenterNoticeBox({
  title,
  message,
  icon,
  lottieOptions,
  actions = [],
  variant = 'neutral',
  className = '',
  messageClassName = '',
  children
}) {
  const v = variantStyles[variant] || variantStyles.neutral;
  const showLottie = lottieOptions && !icon;

  return (
    <div className={`w-full h-full flex items-center justify-center p-6 ${className}`}>
      <div className={`max-w-md w-full rounded-2xl px-8 py-10 theme-border border ${v.border} backdrop-blur-sm ${v.bg} relative overflow-hidden anim-fade-in`}
        style={{ boxShadow: '0 8px 32px -8px rgba(0,0,0,0.35), 0 4px 12px -4px rgba(0,0,0,0.25)' }}>
        <div className={`absolute inset-0 pointer-events-none opacity-40 rounded-2xl ring-1 ${v.ring}`} />
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          {showLottie && (
            <div className="w-28 h-28 -mt-2">
              <Lottie options={{ ...lottieOptions, autoplay: true }} height={112} width={112} />
            </div>
          )}
          {!showLottie && icon && (
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-white/10 text-teal-400">
              {icon}
            </div>
          )}
          {title && <h2 className={`text-2xl font-bold tracking-tight ${v.accent}`}>{title}</h2>}
          {message && !children && (
            <p
              className={`text-[15px] leading-relaxed tracking-[0.15px] theme-text-secondary whitespace-pre-line max-w-[42ch] mx-auto selection:text-white selection:bg-teal-500/70 ${messageClassName}`}
              style={{ lineHeight: '1.55' }}
            >
              {message}
            </p>
          )}
          {children}
          {actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              {actions.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={a.onClick}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${actionVariant[a.variant || 'primary']} focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-teal-500/50`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
