import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Clock } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'action_required':
        return <Clock className="w-5 h-5 text-orange-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  const getBorderAndBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/50 bg-[#162319] dark:bg-[#121E15]';
      case 'warning':
        return 'border-amber-500/50 bg-[#251F14] dark:bg-[#1E1911]';
      case 'error':
        return 'border-rose-500/50 bg-[#261517] dark:bg-[#201012]';
      default:
        return 'border-orange-500/40 bg-[#1E1E1E] dark:bg-[#181818]';
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none" dir="rtl">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex flex-col p-4 text-white rounded-2xl border ${getBorderAndBg(
            toast.type
          )} shadow-2xl animate-fade-in relative overflow-hidden backdrop-blur-md`}
        >
          <div className="flex items-start gap-3">
            {getIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-zinc-100">{toast.title}</h4>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Animated Progress Shimmer Bar */}
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 animate-[shrink_4s_linear]" />
          </div>
        </div>
      ))}
    </div>
  );
};
