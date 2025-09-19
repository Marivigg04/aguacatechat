import React from 'react';

const ProgressDots = ({ total = 4, current = 0, onDotClick }) => {
  return (
    <div className="progress-dots-container">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`progress-dot ${index === current ? 'active' : ''}`}
          onClick={() => onDotClick && onDotClick(index)}
          role="button"
          aria-label={`Ir al mensaje ${index + 1}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onDotClick) {
              e.preventDefault();
              onDotClick(index);
            }
          }}
        />
      ))}
    </div>
  );
};

export default ProgressDots;