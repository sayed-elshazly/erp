import React, { useState, useMemo, useEffect } from 'react';
import { CustomerSubscription, SubscriptionStatus, SubscriptionPlan, SavedFilterPreset } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SubscriptionsSellModal } from './SubscriptionsSellModal';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { SubscriptionRenewModal } from './SubscriptionRenewModal';
import { SubscriptionUpgradeModal } from './SubscriptionUpgradeModal';
import { SubscriptionDetailsModal } from './SubscriptionDetailsModal';
import { DisasterSafetyModal } from '../../components/common/DisasterSafetyModal';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { exportToExcel } from '../../utils/excelExport';
import {
  Tv,
  Plus,
  Search,
  Filter,
  RotateCcw,
  TrendingUp,
  XCircle,
  Printer,
  Download,
  Calendar,
  MessageCircle,
  Copy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  ArrowUpRight,
  User,
  CheckSquare,
  Square,
  Bookmark,
  Trash2,
  Eye,
  Layers,
  Phone,
  ImageIcon,
  X
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { copySubscriptionInvoiceToClipboard } from '../../utils/invoiceImageGenerator';

interface SubscriptionsListProps {
  initialSelectedSubscriptionId?: string;
  initialAction?: 'renew' | 'view';
}

export const SubscriptionsList: React.FC<SubscriptionsListProps> = ({
  initialSelectedSubscriptionId,
  initialAction
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(() => db.getSubscriptions());
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => db.getSubscriptionPlans());
  const [savedFilters, setSavedFilters] = useState<SavedFilterPreset[]>(() => db.getSubscriptionSavedFilters());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newFilterName, setNewFilterName] = useState('');
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  // Multi-Selection State for Bulk Actions
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);

  // Modals
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedSubForDetails, setSelectedSubForDetails] = useState<CustomerSubscription | null>(null);
  const [selectedSubForReceipt, setSelectedSubForReceipt] = useState<CustomerSubscription | null>(null);
  const [selectedSubForRenew, setSelectedSubForRenew] = useState<CustomerSubscription | null>(null);
  const [selectedSubForUpgrade, setSelectedSubForUpgrade] = useState<CustomerSubscription | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'cancel' | 'suspend' | null>(null);

  // Auto-open subscription modal when navigated from notification
  useEffect(() => {
    if (initialSelectedSubscriptionId) {
      const found = subscriptions.find(s => s.id === initialSelectedSubscriptionId);
      if (found) {
        if (initialAction === 'renew') {
          setSelectedSubForRenew(found);
        } else {
          setSelectedSubForDetails(found);
        }
      }
    }
  }, [initialSelectedSubscriptionId, initialAction, subscriptions]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const reloadData = () => {
    setSubscriptions(db.getSubscriptions());
    setPlans(db.getSubscriptionPlans());
    setSavedFilters(db.getSubscriptionSavedFilters());
  };

  // Filtered Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      // Status Filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      // Plan Filter
      if (planFilter !== 'all' && sub.planId !== planFilter) return false;

      // Date Filter (Unified DateRangeFilter)
      const subDateStr = sub.createdAt.split('T')[0];
      if (startDate && subDateStr < startDate) return false;
      if (endDate && subDateStr > endDate) return false;

      // Search
      if (debouncedSearch) {
        const matchSubNum = sub.subscriptionNumber.toLowerCase().includes(debouncedSearch);
        const matchCust = sub.customerName.toLowerCase().includes(debouncedSearch) || sub.customerPhone.includes(debouncedSearch);
        const matchPlan = sub.planName.toLowerCase().includes(debouncedSearch);
        const matchUser = sub.serviceAccountUser?.toLowerCase().includes(debouncedSearch);
        if (!matchSubNum && !matchCust && !matchPlan && !matchUser) return false;
      }

      return true;
    });
  }, [subscriptions, statusFilter, planFilter, startDate, endDate, debouncedSearch]);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedSubIds.length === filteredSubscriptions.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(filteredSubscriptions.map(s => s.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedSubIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkExport = () => {
    const selected = subscriptions.filter(s => selectedSubIds.includes(s.id));
    const exportData = selected.map(s => ({
      'رقم الاشتراك': s.subscriptionNumber,
      'العميل': s.customerName,
      'الهاتف': s.customerPhone,
      'الباقة': s.planName,
      'تاريخ البدء': formatDate(s.startDate),
      'تاريخ الانتهاء': formatDate(s.endDate),
      'السعر المسدد': s.finalPrice,
      'الحالة': s.status
    }));
    exportToExcel(exportData, `bulk_subscriptions_${Date.now()}`);
    showToast('success', 'تم التصدير الجماعي', `تم تصدير ${selected.length} اشتراك بنجاح`);
  };

  const handleBulkWhatsApp = () => {
    const selected = subscriptions.filter(s => selectedSubIds.includes(s.id));
    selected.slice(0, 5).forEach(sub => {
      const phoneToUse = sub.customerPhone.replace(/[^0-9]/g, '');
      const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
      const msg = encodeURIComponent(
        `🎉 تحية طيبة من NZM JKR\n📌 اشتراكك في باقة: ${sub.planName} (#${sub.subscriptionNumber})\n⏳ ينتهي بتاريخ: ${formatDate(sub.endDate)}`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    });
    showToast('info', 'تم فتح المحادثات', `تم فتح رسائل واتساب للاشتراكات المحددة`);
  };

  const handleConfirmBulkAction = (reason: string) => {
    const userMeta = user ? { id: user.id, name: user.fullName, role: user.role } : undefined;

    selectedSubIds.forEach(id => {
      if (bulkActionType === 'cancel') {
        db.cancelSubscription(id, reason, userMeta);
      } else if (bulkActionType === 'suspend') {
        const sub = db.getSubscriptionById(id);
        if (sub) {
          sub.status = 'frozen';
          db.saveSubscription(sub, userMeta);
        }
      }
    });
    showToast('warning', 'تم تنفيذ الإجراء الجماعي', `تم تحديث ${selectedSubIds.length} اشتراك بنجاح`);
    setSelectedSubIds([]);
    setBulkActionType(null);
    reloadData();
  };

  // Saved Filters
  const handleSaveCurrentFilter = () => {
    if (!newFilterName.trim()) return;
    const newPreset: SavedFilterPreset = {
      id: `filter_${Date.now()}`,
      name: newFilterName.trim(),
      criteria: {
        statusFilter,
        planFilter,
        searchQuery
      },
      createdAt: new Date().toISOString()
    };
    db.saveSubscriptionSavedFilter(newPreset);
    setNewFilterName('');
    setIsSavingFilter(false);
    showToast('success', 'تم حفظ الفلتر', `تم حفظ فلتر (${newPreset.name}) بنجاح`);
    reloadData();
  };

  const handleApplySavedFilter = (preset: SavedFilterPreset) => {
    if (preset.criteria.statusFilter) setStatusFilter(preset.criteria.statusFilter as any);
    if (preset.criteria.planFilter) setPlanFilter(preset.criteria.planFilter);
    if (preset.criteria.searchQuery) setSearchQuery(preset.criteria.searchQuery);
    showToast('info', 'تم تطبيق الفلتر', preset.name);
  };

  const handleDeleteSavedFilter = (presetId: string) => {
    db.deleteSubscriptionSavedFilter(presetId);
    showToast('info', 'تم حذف الفلتر المحفوظ', '');
    reloadData();
  };

  // Single Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredSubscriptions.map(s => ({
      'رقم الاشتراك': s.subscriptionNumber,
      'العميل': s.customerName,
      'الهاتف': s.customerPhone,
      'الباقة': s.planName,
      'تاريخ البدء': formatDate(s.startDate),
      'تاريخ الانتهاء': formatDate(s.endDate),
      'السعر الأصلي': s.originalPrice,
      'الخصم': s.discountAmount,
      'السعر المسدد': s.finalPrice,
      'طريقة الدفع': s.paymentMethod,
      'الحالة': s.status,
      'عدد التجديدات': s.renewalCount,
      'المسؤول': s.createdBy,
      'تاريخ الإنشاء': formatDateTime(s.createdAt)
    }));

    exportToExcel(exportData, `subscriptions_registry_${Date.now()}`);
    showToast('success', 'تم التصدير', 'تم تصدير سجل الاشتراكات إلى Excel بنجاح');
  };

  // WhatsApp Share
  const handleWhatsApp = (sub: CustomerSubscription) => {
    const phoneToUse = sub.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
    const msg = encodeURIComponent(
      `🎉 مرحباً يا *${sub.customerName}*\n\nبيانات اشتراكك لدى *NZM JKR*:\n📌 الباقة: *${sub.planName}*\n🔢 رقم الاشتراك: *${sub.subscriptionNumber}*\n📅 ينتهي بتاريخ: *${formatDate(sub.endDate)}*\n\nإذا كنت بحاجة للتجديد أو المساعدة تواصل معنا مباشرة! ★`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const getStatusBadge = (st: SubscriptionStatus) => {
    switch (st) {
      case 'active':
        return <Badge variant="success">ساري ونشط ✓</Badge>;
      case 'expiring_soon':
        return <Badge variant="warning">قارب الانتهاء ⏳</Badge>;
      case 'expired':
        return <Badge variant="danger">منتهي ✕</Badge>;
      case 'renewed':
        return <Badge variant="info">مجدد ↺</Badge>;
      case 'cancelled':
        return <Badge variant="default">ملغي</Badge>;
      case 'frozen':
        return <Badge variant="purple">معلّق مؤقتاً</Badge>;
      default:
        return <Badge variant="default">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-[#121215] p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-full sm:max-w-xs md:max-w-sm">
          <input
            type="text"
            placeholder="بحث برقم الاشتراك، العميل، الهاتف، أو الباقة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-all font-sans"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-zinc-400 hover:text-zinc-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Saved Filters Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-amber-500/40 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>فلاتر محفوظة ({savedFilters.length})</span>
            </button>

            {/* Dropdown Menu */}
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-24px)] bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-2xl z-30 p-2 space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 px-2 py-1">الفلاتر المجهزة:</div>
              {savedFilters.length === 0 ? (
                <div className="text-center py-2 text-zinc-500 text-[11px]">لا توجد فلاتر محفوظة بعد</div>
              ) : (
                savedFilters.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleApplySavedFilter(f)}
                      className="text-right font-bold text-xs text-zinc-900 dark:text-zinc-100 flex-1 truncate"
                    >
                      {f.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedFilter(f.id)}
                      className="text-zinc-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
              <div className="pt-1 border-t border-gray-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSavingFilter(true)}
                  className="w-full text-center py-1 text-pink-600 dark:text-pink-400 font-bold text-xs hover:underline"
                >
                  + حفظ الفلتر الحالي
                </button>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500 max-w-[135px] truncate cursor-pointer"
            >
              <option value="all">كل الحالات ({subscriptions.length})</option>
              <option value="active">النشطة والسارية</option>
              <option value="expiring_soon">قاربت على الانتهاء</option>
              <option value="expired">المنتهية</option>
              <option value="frozen">المعلّقة مؤقتاً</option>
              <option value="cancelled">الملغاة</option>
            </select>
          </div>

          {/* Plan Filter (Searchable) */}
          <div className="min-w-[170px]">
            <SearchableSelect
              options={plans.map(p => ({
                value: p.id,
                label: p.name,
                badge: `${p.price} ج`
              }))}
              value={planFilter}
              onChange={setPlanFilter}
              allOptionLabel={`كل الباقات (${plans.length})`}
              placeholder="اختر الباقة..."
              searchPlaceholder="ابحث في الباقات..."
            />
          </div>

          {/* Date Filter (Unified DateRangeFilter) */}
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => { setStartDate(''); setEndDate(''); }}
            label="فترة الاشتراك"
          />

          {/* Reset Filters */}
          {(statusFilter !== 'all' || planFilter !== 'all' || startDate || endDate || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPlanFilter('all');
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
              }}
              className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs transition-colors cursor-pointer"
              title="إعادة تعيين الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-6 w-px bg-gray-200 dark:bg-[#27272A] hidden sm:block mx-0.5" />

          {/* Primary POS Button */}
          <button
            type="button"
            onClick={() => setIsSellModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ بيع اشتراك جديد</span>
          </button>

          {/* Print Report */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-pink-500 hover:border-pink-500/50 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500/50 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Save Filter Modal */}
      {isSavingFilter && (
        <div className="p-3 bg-white dark:bg-[#18181B] border border-pink-500/40 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-md">
          <div className="flex items-center gap-2 flex-1">
            <Bookmark className="w-4 h-4 text-pink-500 shrink-0" />
            <input
              type="text"
              placeholder="اكتب اسم الفلتر لحفظه (مثلاً: تنتهي هذا الشهر)..."
              value={newFilterName}
              onChange={e => setNewFilterName(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none flex-1 font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentFilter}
              className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setIsSavingFilter(false)}
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-100 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* 2. Bulk Actions Bar (When >= 1 item selected) */}
      {selectedSubIds.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent border border-pink-500/40 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-pink-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
              تم تحديد <strong className="text-pink-500 font-mono font-black">{selectedSubIds.length}</strong> اشتراك
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={handleBulkExport}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-bold text-xs text-emerald-600 flex items-center gap-1 cursor-pointer hover:bg-emerald-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير المحدد</span>
            </button>

            <button
              type="button"
              onClick={handleBulkWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-bold text-xs text-emerald-600 flex items-center gap-1 cursor-pointer hover:bg-emerald-50"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب جماعي</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkActionType('suspend')}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-bold text-xs text-purple-600 flex items-center gap-1 cursor-pointer hover:bg-purple-50"
            >
              <span>تعليق المحدد</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkActionType('cancel')}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-bold text-xs text-rose-600 flex items-center gap-1 cursor-pointer hover:bg-rose-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>إلغاء المحدد</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSubIds([])}
              className="px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 text-xs font-bold"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* 3. Subscriptions Master Table */}
      <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-3.5 text-center w-10">
                  <button type="button" onClick={handleSelectAll} className="cursor-pointer">
                    {selectedSubIds.length === filteredSubscriptions.length && filteredSubscriptions.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-pink-500" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3.5">رقم الاشتراك</th>
                <th className="py-3 px-3.5">العميل المشترك</th>
                <th className="py-3 px-3.5">الباقة المشترك بها</th>
                <th className="py-3 px-3.5 text-center">فترة السريان</th>
                <th className="py-3 px-3.5 text-center">المبلغ المسدد</th>
                <th className="py-3 px-3.5 text-center">صافي الربح</th>
                <th className="py-3 px-3.5 text-center">حالة الاشتراك</th>
                <th className="py-3 px-3.5 text-left">إجراءات وإيصالات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 space-y-2">
                    <Tv className="w-8 h-8 text-pink-500/50 mx-auto" />
                    <p className="font-bold text-sm">لا توجد اشتراكات مسجلة مطابقة للبحث</p>
                    <p className="text-[11px]">اضغط على زر "+ بيع اشتراك جديد" لتفعيل اشتراك لعميل فوراً</p>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map(sub => {
                  const isSelected = selectedSubIds.includes(sub.id);

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                        isSelected ? 'bg-pink-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <button type="button" onClick={() => handleToggleSelect(sub.id)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-pink-500" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </td>

                      {/* Subscription Number */}
                      <td className="py-3 px-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSubForDetails(sub)}
                          className="font-mono font-black text-pink-600 dark:text-pink-400 text-xs block hover:underline cursor-pointer text-right"
                        >
                          #{sub.subscriptionNumber}
                        </button>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {formatDate(sub.createdAt)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {sub.customerName}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {sub.customerPhone}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {sub.planName}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {sub.planCategory} • {sub.durationValue} {sub.durationUnit === 'months' ? 'شهر' : 'يوم'}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3.5 text-center font-mono text-[11px]">
                        <div className="text-zinc-500">
                          بدء: {formatDate(sub.startDate)}
                        </div>
                        <div className="font-bold text-rose-500">
                          انتهاء: {formatDate(sub.endDate)}
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3 px-3.5 text-center font-mono font-black text-zinc-900 dark:text-zinc-100 text-xs">
                        {formatCurrency(sub.finalPrice)} {sub.currency || 'EGP'}
                      </td>

                      {/* Net Profit */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                          +{formatCurrency(sub.netProfit)} {sub.currency || 'EGP'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details & Timeline */}
                          <button
                            type="button"
                            onClick={() => setSelectedSubForDetails(sub)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-pink-500 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="عرض ملف الاشتراك ودورة الحياة الكاملة (Timeline)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>الملف</span>
                          </button>

                          {/* Quick Copy Image */}
                          <button
                            type="button"
                            onClick={async () => {
                              showToast('info', 'جاري التقاط صورة الفاتورة...', 'يتم معالجة المستند بجودة عالية');
                              const res = await copySubscriptionInvoiceToClipboard(sub as any);
                              if (res.success) {
                                showToast('success', 'تم نسخ صورة الفاتورة 🖼️', 'تم نسخ الفاتورة للحافظة، يمكنك لصقها (Ctrl+V) في واتساب');
                              }
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="نسخ الفاتورة كـ صورة فورية للحافظة"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Receipt */}
                          <button
                            type="button"
                            onClick={() => setSelectedSubForReceipt(sub)}
                            className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="عرض / طباعة / نسخ صورة الإيصال"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Renew */}
                          <button
                            type="button"
                            onClick={() => setSelectedSubForRenew(sub)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="تجديد الاشتراك"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Upgrade */}
                          <button
                            type="button"
                            onClick={() => setSelectedSubForUpgrade(sub)}
                            className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer"
                            title="ترقية / تغيير الباقة"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(sub)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="مشاركة تفاصيل الاشتراك عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {isSellModalOpen && (
        <SubscriptionsSellModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          onSuccess={newSub => {
            reloadData();
            setSelectedSubForReceipt(newSub);
          }}
        />
      )}

      {selectedSubForDetails && (
        <SubscriptionDetailsModal
          isOpen={Boolean(selectedSubForDetails)}
          onClose={() => setSelectedSubForDetails(null)}
          subscription={selectedSubForDetails}
          onUpdated={reloadData}
        />
      )}

      {selectedSubForReceipt && (
        <SubscriptionReceiptModal
          isOpen={Boolean(selectedSubForReceipt)}
          onClose={() => setSelectedSubForReceipt(null)}
          subscription={selectedSubForReceipt}
        />
      )}

      {selectedSubForRenew && (
        <SubscriptionRenewModal
          isOpen={Boolean(selectedSubForRenew)}
          onClose={() => setSelectedSubForRenew(null)}
          subscription={selectedSubForRenew}
          onRenewSuccess={reloadData}
        />
      )}

      {selectedSubForUpgrade && (
        <SubscriptionUpgradeModal
          isOpen={Boolean(selectedSubForUpgrade)}
          onClose={() => setSelectedSubForUpgrade(null)}
          subscription={selectedSubForUpgrade}
          onUpgradeSuccess={reloadData}
        />
      )}

      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="subscriptions"
          customPayload={filteredSubscriptions}
        />
      )}

      {bulkActionType && (
        <DisasterSafetyModal
          isOpen={Boolean(bulkActionType)}
          onClose={() => setBulkActionType(null)}
          onConfirm={handleConfirmBulkAction}
          title={bulkActionType === 'cancel' ? 'تأكيد الإلغاء الجماعي' : 'تأكيد التعليق الجماعي'}
          actionType={bulkActionType}
          itemTitle={`${selectedSubIds.length} اشتراك محدد`}
          warningMessage={`أنت على وشك تنفيذ ${bulkActionType === 'cancel' ? 'إلغاء' : 'تعليق'} جماعي لعدد ${selectedSubIds.length} اشتراك دفعة واحدة. سيتم توثيق كافة العمليات في سجل الرقابة.`}
        />
      )}
    </div>
  );
};
