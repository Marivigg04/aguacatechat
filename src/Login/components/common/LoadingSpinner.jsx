import React from 'react';

const LoadingSpinner = ({ size = 6, color = 'white' }) => {
  const sizeClass = `w-${size} h-${size}`;
  const borderColor = color === 'white' ? 'border-white border-t-transparent' : 'border-blue-500 border-t-transparent';
  
  return (
    <div className={`${sizeClass} border-2 ${borderColor} rounded-full animate-spin`} />
  );
};

export default LoadingSpinner;