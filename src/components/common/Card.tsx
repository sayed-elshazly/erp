import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  bordered = true,
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#18181B] ${
        bordered ? 'border border-gray-200/80 dark:border-[#27272A]' : ''
      } rounded-2xl shadow-xs text-zinc-900 dark:text-zinc-100 ${
        hoverEffect ? 'hover:shadow-md hover:border-orange-500/50 transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
