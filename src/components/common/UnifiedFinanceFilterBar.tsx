// =============================================================
// NZM JKR TOP UP ERP — Unified Finance & Dashboard Filter Bar
// Enterprise Level Filter System (Single Source of Truth)
// =============================================================

import React, { useMemo, useState } from 'react';
import {
  UnifiedFinanceFilter,
  UnifiedFinanceDatePreset,
  UnifiedFinanceDepartment,
  UnifiedFinanceTxType
} from '../../types/finance.types';
import { db } from '../../database/db';
import { getGameBadgeStyle } from '../../utils/gameBadgeColors';
import {
  Calendar,
  Filter,
  Layers,
  Gamepad2,
  Package,
  User,
  UserCheck,
  RotateCcw,
  Search,
  ChevronDown,
  X,
  Sparkles
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { DateRangeFilter } from './DateRangeFilter';
import { SearchableSelect, SearchableSelectOption } from './SearchableSelect';

interface UnifiedFinanceFilterBarProps {
  filter: UnifiedFinanceFilter;
  onChange: (newFilter: UnifiedFinanceFilter) => void;
  onReset?: () => void;
  showDepartmentFilter?: boolean;
  showGameFilter?: boolean;
  showPlanFilter?: boolean;
  compact?: boolean;
}

export const UnifiedFinanceFilterBar: React.FC<UnifiedFinanceFilterBarProps> = ({
  filter,
  onChange,
  onReset,
  showDepartmentFilter = true,
  showGameFilter = true,
  showPlanFilter = true,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  // 1. Games list (deduplicated)
  const availableGames = useMemo(() => {
    const rawGames: string[] = [];
    const tree = db.getGameTree();
    tree.forEach(g => {
      if (g.name) rawGames.push(g.name);
    });
    db.getTickets().forEach(t => {
      const g = t.gameName;
      if (g) rawGames.push(g);
    });
    db.getMiddlemanDeals(true).forEach(d => {
      if (d.gameName) rawGames.push(d.gameName);
    });
    db.getMiddlemanAccounts().forEach(a => {
      if (a.gameName) rawGames.push(a.gameName);
    });
    return Array.from(new Set(rawGames)).filter(Boolean).sort();
  }, []);

  // 2. Subscription Plans list
  const availablePlans = useMemo(() => {
    return db.getSubscriptionPlans().filter(p => p.status === 'active');
  }, []);

  // 3. Employees / Users list
  const availableEmployees = useMemo(() => {
    return db.getUsers().filter(u => u.isActive);
  }, []);

  // 4. Wallets list
  const availableWallets = useMemo(() => {
    return db.getStoreWallets();
  }, []);

  const handleUpdate = (updates: Partial<UnifiedFinanceFilter>) => {
    onChange({
      ...filter,
      ...updates
    });
  };

  const handleReset = () => {
    const defaultFilter: UnifiedFinanceFilter = {
      datePreset: 'all',
      customStartDate: '',
      customEndDate: '',
      department: 'all',
      gameName: 'all',
      planId: 'all',
      personQuery: '',
      searchQuery: '',
      employeeId: 'all',
      transactionType: 'all',
      walletId: 'all',
      status: 'all',
      minAmount: undefined,
      maxAmount: undefined
    };
    if (onReset) onReset();
    else onChange(defaultFilter);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filter.datePreset !== 'all') count++;
    if (filter.department !== 'all') count++;
    if (filter.gameName && filter.gameName !== 'all') count++;
    if (filter.planId && filter.planId !== 'all') count++;
    if ((filter.personQuery && filter.personQuery.trim() !== '') || (filter.searchQuery && filter.searchQuery.trim() !== '')) count++;
    if (filter.employeeId && filter.employeeId !== 'all') count++;
    if (filter.transactionType !== 'all') count++;
    if (filter.walletId && filter.walletId !== 'all') count++;
    if (filter.status && filter.status !== 'all') count++;
    if (filter.minAmount !== undefined && filter.minAmount !== ('' as any)) count++;
    if (filter.maxAmount !== undefined && filter.maxAmount !== ('' as any)) count++;
    return count;
  }, [filter]);

  const departmentOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'customers', label: 'الزبائن والشحن' },
    { value: 'dealers', label: 'التجار والموزعين' },
    { value: 'middleman', label: 'الوساطة والمخزن' },
    { value: 'subscriptions', label: 'الاشتراكات الرقمية' },
    { value: 'wallets', label: 'المحافظ والبنوك' },
    { value: 'treasury', label: 'الخزينة والمصروفات' }
  ], []);

  const transactionTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'sale', label: 'عمليات البيع والتوزيع', icon: <span className="text-xs">🟢</span> },
    { value: 'purchase', label: 'مشتريات وتوريد بضاعة', icon: <span className="text-xs">📦</span> },
    { value: 'refund', label: 'استرداد مالي (Refunds)', icon: <span className="text-xs">↩️</span> },
    { value: 'transfer', label: 'تحويل بين الخزائن والمحافظ', icon: <span className="text-xs">🔄</span> },
    { value: 'wallet_deposit', label: 'إيداع بمحفظة إلكترونية', icon: <span className="text-xs">📥</span> },
    { value: 'wallet_withdrawal', label: 'سحب من محفظة إلكترونية', icon: <span className="text-xs">📤</span> },
    { value: 'wallet_transfer', label: 'تحويل بين المحافظ والبنوك', icon: <span className="text-xs">🔁</span> },
    { value: 'bond_deposit', label: 'سند إيداع مالي معتمد', icon: <span className="text-xs">📝</span> },
    { value: 'cashback', label: 'مكافآت الكاش باك', icon: <span className="text-xs">🎁</span> },
    { value: 'referral', label: 'عمولات نظام الإحالة', icon: <span className="text-xs">🤝</span> },
    { value: 'middleman', label: 'صفقات الوساطة والضمان', icon: <span className="text-xs">🛡️</span> },
    { value: 'subscription', label: 'اشتراكات رقمية جديدة', icon: <span className="text-xs">💎</span> },
    { value: 'renewal', label: 'تجديد الاشتراكات', icon: <span className="text-xs">🔁</span> },
    { value: 'expense', label: 'مصروفات تشغيلية', icon: <span className="text-xs">💸</span> },
    { value: 'debt_payment', label: 'تحصيل وسداد ديون', icon: <span className="text-xs">⚖️</span> }
  ], []);

  const walletSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return availableWallets.map(w => ({
      value: w.id,
      label: w.name,
      badge: `${w.balance || 0} ${w.currency || 'EGP'}`,
      icon: <span className="text-xs">💳</span>
    }));
  }, [availableWallets]);

  const statusSelectOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'completed', label: 'مكتملة بنجاح', icon: <span className="text-xs">🟢</span> },
    { value: 'refunded', label: 'مستردة (Refunded)', icon: <span className="text-xs">↩️</span> },
    { value: 'pending', label: 'معلقة قيد المعالجة', icon: <span className="text-xs">⏳</span> },
    { value: 'canceled', label: 'ملغاة', icon: <span className="text-xs">❌</span> }
  ], []);

  const gameSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return availableGames.map(g => ({
      value: g,
      label: g,
      icon: <span className="text-xs">🎮</span>
    }));
  }, [availableGames]);

  const planSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return availablePlans.map(p => ({
      value: p.id,
      label: p.name,
      badge: `${p.price} ج`,
      icon: <span className="text-xs">💎</span>
    }));
  }, [availablePlans]);

  const employeeSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return availableEmployees.map(u => ({
      value: u.id,
      label: u.fullName || u.username,
      badge: u.role === 'admin' ? 'مدير' : 'موظف',
      icon: <span className="text-xs">👤</span>
    }));
  }, [availableEmployees]);

  const currentSearchText = filter.searchQuery || filter.personQuery || '';

  return (
    <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-sm p-4 space-y-3.5 transition-all text-right">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-gray-100 dark:border-[#27272A]/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              نظام البحث والفلاتر المالي الشامل
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white animate-pulse">
                  {activeFiltersCount} نشط
                </span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400 block font-medium">
              بحث فوري وتصفية دقيقة لكافة العمليات المالية، المحافظ، والتفاصيل المحاسبية
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-[11px] h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer"
              icon={<RotateCcw className="w-3 h-3" />}
            >
              إلغاء وتفريغ الفلاتر
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] h-7 px-2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            icon={<ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
          >
            {isExpanded ? 'طي الفلاتر' : 'توسيع الفلاتر'}
          </Button>
        </div>
      </div>

      {/* Primary Search Bar + Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Universal Search Input */}
        <div className="md:col-span-6 relative">
          <input
            type="text"
            placeholder="🔍 بحث سريع: اسم العميل، الهاتف، رقم التذكرة، الفاتورة، السند، المحفظة، الملاحظات..."
            value={currentSearchText}
            onChange={e => handleUpdate({ searchQuery: e.target.value, personQuery: e.target.value })}
            className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pr-8 pl-8 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 transition-all placeholder:text-zinc-400"
          />
          <Search className="w-4 h-4 text-orange-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {currentSearchText && (
            <button
              type="button"
              onClick={() => handleUpdate({ searchQuery: '', personQuery: '' })}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 p-1 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter via DateRangeFilter */}
        <div className="md:col-span-6 flex items-center">
          <DateRangeFilter
            startDate={filter.customStartDate || ''}
            endDate={filter.customEndDate || ''}
            onStartDateChange={val => handleUpdate({ customStartDate: val, datePreset: val ? 'custom' : 'all' })}
            onEndDateChange={val => handleUpdate({ customEndDate: val, datePreset: val ? 'custom' : 'all' })}
            onReset={() => handleUpdate({ customStartDate: '', customEndDate: '', datePreset: 'all' })}
            label="الفترة الزمنية"
          />
        </div>
      </div>

      {/* Expanded Filter Controls */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-gray-100 dark:border-[#27272A]/40 animate-fade-in">
          {/* Department Filter */}
          {showDepartmentFilter && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-orange-400" />
                <span>القسم / الوحدة:</span>
              </label>
              <SearchableSelect
                options={departmentOptions}
                value={filter.department}
                onChange={val => handleUpdate({ department: val as UnifiedFinanceDepartment })}
                allOptionLabel="جميع الأقسام والوحدات"
                searchPlaceholder="بحث في الأقسام..."
              />
            </div>
          )}

          {/* Transaction Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>نوع العملية المالية:</span>
            </label>
            <SearchableSelect
              options={transactionTypeOptions}
              value={filter.transactionType}
              onChange={val => handleUpdate({ transactionType: val as UnifiedFinanceTxType })}
              allOptionLabel="جميع أنواع العمليات"
              searchPlaceholder="بحث في أنواع العمليات..."
            />
          </div>

          {/* Wallet Selector Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <span className="text-xs">💳</span>
              <span>المحفظة / الحساب المالي:</span>
            </label>
            <SearchableSelect
              options={walletSelectOptions}
              value={filter.walletId || 'all'}
              onChange={val => handleUpdate({ walletId: val })}
              allOptionLabel="جميع المحافظ والحسابات البنكية"
              searchPlaceholder="بحث في المحافظ والبنوك..."
            />
          </div>

          {/* Transaction Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <span className="text-xs">⚡</span>
              <span>حالة العملية:</span>
            </label>
            <SearchableSelect
              options={statusSelectOptions}
              value={filter.status || 'all'}
              onChange={val => handleUpdate({ status: val })}
              allOptionLabel="جميع الحالات"
              searchPlaceholder="بحث في حالات العمليات..."
            />
          </div>

          {/* Game Filter */}
          {showGameFilter && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                <Gamepad2 className="w-3 h-3 text-emerald-400" />
                <span>اللعبة / الخدمة:</span>
              </label>
              <SearchableSelect
                options={gameSelectOptions}
                value={filter.gameName || 'all'}
                onChange={val => handleUpdate({ gameName: val })}
                allOptionLabel="جميع الألعاب والخدمات"
                searchPlaceholder="بحث في الألعاب والخدمات..."
              />
            </div>
          )}

          {/* Subscription Plan Filter */}
          {showPlanFilter && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                <Package className="w-3 h-3 text-pink-400" />
                <span>باقة الاشتراك الرقمي:</span>
              </label>
              <SearchableSelect
                options={planSelectOptions}
                value={filter.planId || 'all'}
                onChange={val => handleUpdate({ planId: val })}
                allOptionLabel="جميع باقات الاشتراكات"
                searchPlaceholder="بحث في باقات الاشتراكات..."
              />
            </div>
          )}

          {/* Employee Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-purple-400" />
              <span>الموظف / المسؤول:</span>
            </label>
            <SearchableSelect
              options={employeeSelectOptions}
              value={filter.employeeId || 'all'}
              onChange={val => handleUpdate({ employeeId: val })}
              allOptionLabel="جميع الموظفين والمدراء"
              searchPlaceholder="بحث في الموظفين والمدراء..."
            />
          </div>

          {/* Amount Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
              <span className="text-xs">💵</span>
              <span>نطاق المبلغ (ج.م):</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="من"
                value={filter.minAmount !== undefined ? filter.minAmount : ''}
                onChange={e => handleUpdate({ minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-1/2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 text-center"
              />
              <span className="text-zinc-400 text-xs">-</span>
              <input
                type="number"
                placeholder="إلى"
                value={filter.maxAmount !== undefined ? filter.maxAmount : ''}
                onChange={e => handleUpdate({ maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-1/2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
