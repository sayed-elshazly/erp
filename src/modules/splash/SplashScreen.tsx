import React, { useEffect, useState, useRef } from 'react';
import { JkrLogo } from '../../components/common/JkrLogo';

interface SplashScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, isReady }) => {
  const [fade, setFade] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleFinish = () => {
    setFade(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 200);
  };

  useEffect(() => {
    // If isReady is explicitly managed by the hydration barrier
    if (isReady !== undefined) {
      if (isReady) {
        // Small aesthetic delay so splash renders smoothly
        const timer = setTimeout(() => {
          handleFinish();
        }, 250);
        return () => clearTimeout(timer);
      }
      // Safety timeout: dismiss after 3.5s even if offline/slow network
      const safetyTimer = setTimeout(() => {
        handleFinish();
      }, 3500);
      return () => clearTimeout(safetyTimer);
    }

    // Default standalone splash duration
    const timer = setTimeout(() => {
      handleFinish();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isReady]);

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] text-white transition-all duration-300 select-none cursor-pointer ${
        fade ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      dir="ltr"
      title="اضغط للتخطي والدخول الفوري"
    >
      {/* Dynamic Ambient Glow Behind Logo */}
      <div className="absolute w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Logo Container */}
      <div className="relative flex flex-col items-center z-10 text-center space-y-8 animate-fade-in">
        {/* Official JKR TOP UP Brand Logo */}
        <div className="p-6 rounded-3xl bg-[#000000]/80 border border-zinc-800/60 shadow-2xl shadow-orange-500/20 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
          <JkrLogo size="hero" showSubtitle={true} />
        </div>

        {/* English Splash Welcome Message */}
        <div className="space-y-2.5 pt-2">
          <h2 className="text-2xl font-bold text-white tracking-wider font-sans">
            Welcome Back
          </h2>
          <p className="text-sm text-orange-400/90 font-medium tracking-wide flex items-center justify-center gap-2.5 font-sans">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            Preparing Your Workspace...
          </p>
        </div>

        {/* Loading Progress Shimmer Line */}
        <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent w-full h-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
};
