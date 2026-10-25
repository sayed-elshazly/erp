import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height
}) => {
  const variantStyles = {
    text: 'h-4 rounded-md',
    rectangular: 'rounded-xl',
    circular: 'rounded-full'
  };

  return (
    <div
      className={`relative overflow-hidden bg-gray-200/70 dark:bg-zinc-800/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 7
}) => {
  return (
    <div className="w-full space-y-3 p-4 animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#282828]">
        <Skeleton width="180px" height="32px" />
        <div className="flex gap-2">
          <Skeleton width="90px" height="32px" />
          <Skeleton width="90px" height="32px" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#161616] gap-4"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                height="20px"
                className={c === 0 ? 'w-16' : c === 1 ? 'w-40' : 'w-24'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width="100px" height="16px" />
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
      <Skeleton width="140px" height="28px" />
      <Skeleton width="80px" height="12px" />
    </div>
  );
};
