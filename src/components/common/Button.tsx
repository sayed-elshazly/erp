import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] gap-2 select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs sm:text-sm',
    lg: 'px-6 py-2.5 text-sm sm:text-base'
  };

  const variantStyles = {
    primary:
      'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-sm shadow-orange-500/25 focus:ring-orange-500 border border-transparent',
    secondary:
      'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 focus:ring-zinc-500',
    danger:
      'bg-[#EF4444] hover:bg-red-600 text-white shadow-sm shadow-red-500/25 focus:ring-red-500 border border-transparent',
    success:
      'bg-[#22C55E] hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 focus:ring-emerald-500 border border-transparent',
    outline:
      'border border-gray-300 dark:border-[#2E2E2E] hover:bg-gray-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-[#18181B] focus:ring-orange-500',
    ghost:
      'hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-zinc-500'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
