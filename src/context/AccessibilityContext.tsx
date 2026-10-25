import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSizeScale = 'sm' | 'md' | 'lg' | 'xl';

interface AccessibilityContextType {
  fontSize: FontSizeScale;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = useState<FontSizeScale>(() => {
    const saved = localStorage.getItem('nzm_jkr_font_size');
    return (saved as FontSizeScale) || 'md';
  });

  useEffect(() => {
    localStorage.setItem('nzm_jkr_font_size', fontSize);
    const root = document.documentElement;
    root.classList.remove('text-scale-sm', 'text-scale-md', 'text-scale-lg', 'text-scale-xl');
    root.classList.add(`text-scale-${fontSize}`);
  }, [fontSize]);

  const increaseFontSize = () => {
    setFontSize(prev => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'xl'));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => (prev === 'xl' ? 'lg' : prev === 'lg' ? 'md' : 'sm'));
  };

  const resetFontSize = () => {
    setFontSize('md');
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
