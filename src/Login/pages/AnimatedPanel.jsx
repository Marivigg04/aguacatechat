import React, { useState, useEffect } from 'react';
import { Mail, Phone, Shield, Check } from 'lucide-react';
import ProgressDots from '../components/common/ProgressDots';
import { ANIMATION_CONTENTS } from '../utils/constants';

// Array de iconos que se pueden cambiar fácilmente
const ANIMATION_ICONS = [Shield, Mail, Phone, Check];

const AnimatedPanel = () => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % ANIMATION_CONTENTS.length);
    }, 4000); // Aumentado a 4 segundos para mejor lectura
    return () => clearInterval(interval);
  }, []);

  const getCurrentContent = () => {
    return ANIMATION_CONTENTS[animationStep];
  };

  const handleDotClick = (index) => {
    setAnimationStep(index);
  };

  const CurrentIcon = ANIMATION_ICONS[animationStep];

  return (
    <div className="animated-panel">
      {/* Background animation */}
      <div className="background-animation">
        <div className="floating-circle-1"></div>
        <div className="floating-circle-2"></div>
      </div>
      
      <div className="relative z-10 text-center max-w-md">
        <div className="mb-8 transform transition-all duration-1000 ease-in-out">
          <div className="icon-container">
            <CurrentIcon size={48} className="text-white animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold mb-4 transition-all duration-500">
            {getCurrentContent().title}
          </h2>
          <p className="text-lg opacity-90 leading-relaxed transition-all duration-500">
            {getCurrentContent().desc}
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="progress-dots-wrapper">
          <ProgressDots 
            total={ANIMATION_CONTENTS.length} 
            current={animationStep}
            onDotClick={handleDotClick}
          />
        </div>
      </div>
    </div>
  );
};

export default AnimatedPanel;