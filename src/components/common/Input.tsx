import React, { useState, useEffect } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  type,
  step,
  value,
  onChange,
  onFocus,
  ...props
}) => {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const isNumberType = type === 'number';

  // Local string state to handle natural decimal typing (e.g. "2.", "2.2")
  // and backspacing "0" without browser integer snapping or resetting to 0.
  const [displayVal, setDisplayVal] = useState<string>(() => {
    if (value === undefined || value === null) return '';
    return String(value);
  });

  useEffect(() => {
    if (!isNumberType) return;
    if (value === undefined || value === null) {
      setDisplayVal('');
      return;
    }
    const propStr = String(value);
    const propNum = typeof value === 'number' ? value : parseFloat(propStr);
    const currentNum = parseFloat(displayVal);

    // If user backspaced to empty string and parent state updated to 0 or NaN, keep it empty
    if (displayVal === '' && (propNum === 0 || isNaN(propNum))) {
      return;
    }

    // Only update if numerical value actually changed from outside
    if (!isNaN(propNum)) {
      if (isNaN(currentNum) || currentNum !== propNum) {
        setDisplayVal(propStr);
      }
    } else if (propStr === '' && displayVal !== '') {
      setDisplayVal('');
    }
  }, [value, isNumberType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumberType) {
      let val = e.target.value.replace(/,/g, '.');
      // Only allow digits, single dot, optional leading minus
      if (val !== '' && val !== '-' && val !== '.' && !/^-?\d*\.?\d*$/.test(val)) {
        return;
      }
      setDisplayVal(val);
      if (onChange) {
        e.target.value = val;
        onChange(e);
      }
    } else {
      if (onChange) onChange(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isNumberType && (e.target.value === '0' || e.target.value === '0.00')) {
      e.target.select();
    }
    if (onFocus) onFocus(e);
  };

  return (
    <div className="w-full text-right">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-xs">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          type={isNumberType ? 'text' : type}
          inputMode={isNumberType ? 'decimal' : props.inputMode}
          value={isNumberType ? displayVal : value}
          onChange={handleChange}
          onFocus={handleFocus}
          className={`w-full rounded-xl bg-white dark:bg-[#151515] border ${
            error
              ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
              : 'border-gray-200 dark:border-[#2E2E2E] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]'
          } text-gray-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-3.5 py-2.5 transition-all outline-none ${
            icon ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-zinc-400">{helperText}</p>
      ) : null}
    </div>
  );
};
