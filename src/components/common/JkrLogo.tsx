import React from 'react';

interface JkrLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showSubtitle?: boolean;
}

export const JkrLogo: React.FC<JkrLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    hero: 'w-44 h-44'
  };

  const dimensionClass = className.includes('w-') || className.includes('h-') ? '' : sizeMap[size];

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`} dir="ltr">
      <img
        src="/jkr-logo.png"
        alt="JKR TOP UP"
        className={`${dimensionClass} object-contain rounded-xl bg-black`}
        loading="eager"
      />
    </div>
  );
};
