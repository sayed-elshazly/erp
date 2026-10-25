export const getDisplayCurrency = (): 'EGP' | 'USD' => {
  try {
    const raw = localStorage.getItem('nzm_jkr_customer_module_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.defaultCurrencyDisplay || 'EGP';
    }
  } catch {
    // fallback
  }
  return 'EGP';
};

export const getDailyExchangeRateValue = (): number => {
  try {
    const rateRaw = localStorage.getItem('nzm_jkr_daily_exchange_rate');
    if (rateRaw) {
      const rateParsed = JSON.parse(rateRaw);
      if (rateParsed.rateUSD_EGP && rateParsed.rateUSD_EGP > 0) {
        return rateParsed.rateUSD_EGP;
      }
    }
  } catch {
    // fallback
  }
  return 50.0;
};

export const formatCurrency = (amount: number | undefined | null, forcedCurrency?: 'EGP' | 'USD'): string => {
  const curr = forcedCurrency || getDisplayCurrency();
  const rate = getDailyExchangeRateValue();

  if (amount === undefined || amount === null || isNaN(amount)) {
    return curr === 'USD' ? '$0.00' : '0.00 ج.م';
  }

  if (curr === 'USD') {
    // Convert base EGP amount to USD based on the daily exchange rate
    const amountInUSD = amount / rate;
    const formattedNum = amountInUSD.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `$${formattedNum}`;
  }

  const formattedNum = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${formattedNum} ج.م`;
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })} ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
};

export const getTierLabel = (tier: string): { label: string; bg: string; text: string; border: string } => {
  switch (tier) {
    case 'vip':
      return { label: 'VIP ملكي', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'gold':
      return { label: 'ذهبي', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'silver':
      return { label: 'فضي', bg: 'bg-slate-400/15', text: 'text-slate-300', border: 'border-slate-400/30' };
    case 'bronze':
    default:
      return { label: 'برونزي', bg: 'bg-orange-700/15', text: 'text-orange-400', border: 'border-orange-700/30' };
  }
};

export const getStatusLabel = (status: string): { label: string; bg: string; text: string } => {
  switch (status) {
    case 'active':
      return { label: 'نشط', bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
    case 'inactive':
      return { label: 'غير نشط', bg: 'bg-zinc-500/15', text: 'text-zinc-400' };
    case 'suspended':
      return { label: 'موقوف', bg: 'bg-rose-500/15', text: 'text-rose-400' };
    case 'open':
      return { label: 'مفتوحة', bg: 'bg-amber-500/15', text: 'text-amber-400' };
    case 'in_progress':
      return { label: 'قيد المعالجة', bg: 'bg-blue-500/15', text: 'text-blue-400' };
    case 'resolved':
      return { label: 'تم الحل', bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
    case 'closed':
      return { label: 'مغلقة', bg: 'bg-zinc-600/15', text: 'text-zinc-400' };
    case 'paid':
      return { label: 'مدفوع بالكامل', bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
    case 'partially_paid':
      return { label: 'مدفوع جزئياً', bg: 'bg-amber-500/15', text: 'text-amber-400' };
    case 'unpaid':
      return { label: 'غير مدفوع', bg: 'bg-rose-500/15', text: 'text-rose-400' };
    case 'overdue':
      return { label: 'متأخر', bg: 'bg-red-600/20', text: 'text-red-400' };
    default:
      return { label: status, bg: 'bg-zinc-500/15', text: 'text-zinc-300' };
  }
};

/**
 * Checks if actual time is delayed by 1 hour (60+ minutes) past expected time.
 * Handles format: "09:00", "09:00 ص", "10:30 م", "14:15", etc.
 */
export const isTimeLateByHour = (actualTimeStr?: string, expectedTimeStr?: string): boolean => {
  if (!actualTimeStr || !expectedTimeStr) return false;
  const parseToMinutes = (str: string): number | null => {
    try {
      const clean = str.trim();
      const isPM = clean.includes('م') || clean.toLowerCase().includes('pm');
      const isAM = clean.includes('ص') || clean.toLowerCase().includes('am');
      const numbers = clean.replace(/[^0-9:]/g, '').split(':');
      if (numbers.length < 2) return null;
      let hours = parseInt(numbers[0], 10);
      const minutes = parseInt(numbers[1], 10);
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours * 60 + minutes;
    } catch {
      return null;
    }
  };

  const actualMinutes = parseToMinutes(actualTimeStr);
  const expectedMinutes = parseToMinutes(expectedTimeStr);
  if (actualMinutes === null || expectedMinutes === null) return false;

  return actualMinutes - expectedMinutes >= 60;
};

/**
 * Checks if check-out time is earlier than expected by 1 hour (60+ minutes).
 */
export const isTimeEarlyByHour = (actualTimeStr?: string, expectedTimeStr?: string): boolean => {
  if (!actualTimeStr || !expectedTimeStr) return false;
  const parseToMinutes = (str: string): number | null => {
    try {
      const clean = str.trim();
      const isPM = clean.includes('م') || clean.toLowerCase().includes('pm');
      const isAM = clean.includes('ص') || clean.toLowerCase().includes('am');
      const numbers = clean.replace(/[^0-9:]/g, '').split(':');
      if (numbers.length < 2) return null;
      let hours = parseInt(numbers[0], 10);
      const minutes = parseInt(numbers[1], 10);
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours * 60 + minutes;
    } catch {
      return null;
    }
  };

  const actualMinutes = parseToMinutes(actualTimeStr);
  const expectedMinutes = parseToMinutes(expectedTimeStr);
  if (actualMinutes === null || expectedMinutes === null) return false;
  return expectedMinutes - actualMinutes >= 60;
};

/**
 * Returns the exact number of days in a given month (28, 29, 30, or 31).
 * Accepts 'YYYY-MM', 'YYYY-MM-DD', Date object, or undefined (defaults to current date).
 * Automatically accounts for leap years (e.g. Feb 2024 = 29, Feb 2025/2026 = 28).
 */
export const getDaysInMonth = (monthStrOrDate?: string | Date | number, optionalMonth?: number): number => {
  let year: number;
  let month: number;

  if (typeof monthStrOrDate === 'number' && typeof optionalMonth === 'number') {
    year = monthStrOrDate;
    month = optionalMonth;
  } else if (!monthStrOrDate) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  } else if (typeof monthStrOrDate === 'string') {
    const parts = monthStrOrDate.split('-');
    if (parts.length >= 2) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    } else {
      const d = new Date(monthStrOrDate);
      if (isNaN(d.getTime())) {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      } else {
        year = d.getFullYear();
        month = d.getMonth() + 1;
      }
    }
  } else if (monthStrOrDate instanceof Date) {
    year = monthStrOrDate.getFullYear();
    month = monthStrOrDate.getMonth() + 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  return new Date(year, month, 0).getDate();
};

/**
 * Calculates employee daily wage rate based on the actual days in the target month.
 * Formula: Daily Rate = Base Salary / Days In Month
 */
export const calculateDailyRate = (
  baseSalary: number | undefined | null,
  monthStrOrDate?: string | Date | number,
  optionalMonth?: number
): number => {
  const salary = Number(baseSalary) || 0;
  const days = getDaysInMonth(monthStrOrDate, optionalMonth);
  if (days <= 0) return 0;
  return Math.round((salary / days) * 100) / 100;
};

