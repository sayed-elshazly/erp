// =============================================================
// NZM JKR TOP UP ERP — Dealers & Wholesale Settings Module V3.0
// Comprehensive Wholesale Financial Engine, Simulator & Invoicing
// =============================================================

import React, { useState, useEffect } from 'react';
import { DealerModuleSettings, DealerPricingAuditLog } from '../../types/dealer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { DealerPricingSimulator } from '../../components/pricing/DealerPricingSimulator';
import {
  Settings,
  DollarSign,
  RefreshCw,
  Printer,
  History,
  ShieldCheck,
  Building2,
  Sliders,
  CheckCircle2,
  Percent,
  Gamepad2,
  Receipt,
  Sparkles,
  Save,
  Clock,
  Phone,
  MapPin,
  HelpCircle,
  Calculator,
  Layers,
  FileText,
  TrendingUp,
  Store,
  CreditCard,
  Zap,
  Lock
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const DealerSettingsSubModule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  // Sub-tabs: 'pricing_engine' | 'simulator' | 'audit_log' | 'general_invoices'
  const [activeSubTab, setActiveSubTab] = useState<'pricing_engine' | 'simulator' | 'audit_log' | 'general_invoices'>(
    'pricing_engine'
  );

  const [settings, setSettings] = useState<DealerModuleSettings>(db.getDealerModuleSettings());
  const [auditLogs, setAuditLogs] = useState<DealerPricingAuditLog[]>(db.getDealerPricingAuditLogs());

  // General & Invoices State
  const [businessName, setBusinessName] = useState(settings.businessName || 'NZM JKR Top Up — قسم تجار الجملة والموزعين');
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone || '01012345678');
  const [businessAddress, setBusinessAddress] = useState(
    settings.businessAddress || 'المنصورة، جمهورية مصر العربية - مجمع تجار الجملة'
  );
  const [commercialRegistrationNumber, setCommercialRegistrationNumber] = useState(
    settings.commercialRegistrationNumber || 'CR-98241-W'
  );
  const [invoicePaperFormat, setInvoicePaperFormat] = useState<'thermal_80mm' | 'a4' | 'thermal_58mm'>(
    settings.invoicePaperFormat || 'thermal_80mm'
  );
  const [showLogo, setShowLogo] = useState(settings.showLogoOnInvoice ?? true);
  const [showPhone, setShowPhone] = useState(settings.showPhoneOnInvoice ?? true);
  const [showEmployee, setShowEmployee] = useState(settings.showEmployeeOnInvoice ?? true);
  const [showCashback, setShowCashback] = useState(settings.showCashbackOnInvoice ?? true);
  const [showCommercialId, setShowCommercialId] = useState(settings.showCommercialIdOnInvoice ?? true);
  const [showDealerTier, setShowDealerTier] = useState(settings.showDealerTierOnInvoice ?? true);
  const [invoiceFooter, setInvoiceFooter] = useState(
    settings.invoiceFooterNote || 'شكراً لتعاملكم مع قطاع تجار الجملة والموزعين المعتمدين — NZM JKR TOP UP 💼'
  );

  // Wholesale Pricing Engine State
  const [rateUSD, setRateUSD] = useState<number>(settings.rateUSD_EGP || 39.25);
  const [defaultMargin, setDefaultMargin] = useState<number>(settings.defaultWholesaleProfitMarginPercent ?? 3.5);
  const [fixedMode, setFixedMode] = useState<'auto' | 'manual'>(settings.fixedCostMode || 'manual');
  const [manualFixedCost, setManualFixedCost] = useState<number>(settings.manualFixedCostEGP ?? 2.5);
  const [targetOrders, setTargetOrders] = useState<number>(settings.monthlyBreakEvenTargetOrders || 1500);

  // Wholesale B% Deductions State
  const [cashbackPercent, setCashbackPercent] = useState<number>(settings.defaultCashbackPercent ?? 0.5);
  const [partnerCommissionPercent, setPartnerCommissionPercent] = useState<number>(
    settings.defaultPartnerCommissionPercent ?? 1.5
  );
  const [reservePercent, setReservePercent] = useState<number>(settings.reservePercent ?? 0.5);
  const [developmentPercent, setDevelopmentPercent] = useState<number>(settings.developmentPercent ?? 0.5);
  const [offersPercent, setOffersPercent] = useState<number>(settings.offersPercent ?? 0.5);
  const [minCashback, setMinCashback] = useState<number>(settings.minCashbackAmountEGP ?? 10);
  const [auditReason, setAuditReason] = useState<string>('');

  const loadData = () => {
    const s = db.getDealerModuleSettings();
    setSettings(s);
    setAuditLogs(db.getDealerPricingAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBenefitsPercent =
    cashbackPercent + partnerCommissionPercent + reservePercent + developmentPercent + offersPercent;

  // Auto fixed cost calculation
  const autoCalculatedFixedCost = (() => {
    const allExpenses = db.getExpenses();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlySum = allExpenses.filter(e => e.createdAt.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
    return Math.max(1, Math.round(((monthlySum * 0.4) / (targetOrders || 1500)) * 100) / 100);
  })();

  // 1. Save General & Invoice Settings
  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'صلاحيات غير كافية', 'المدير العام فقط هو المخول بتعديل إعدادات قطاع التجار');
      return;
    }

    const updated = db.updateDealerModuleSettings({
      ...settings,
      businessName,
      businessPhone,
      businessAddress,
      commercialRegistrationNumber,
      invoicePaperFormat,
      showLogoOnInvoice: showLogo,
      showPhoneOnInvoice: showPhone,
      showEmployeeOnInvoice: showEmployee,
      showCashbackOnInvoice: showCashback,
      showCommercialIdOnInvoice: showCommercialId,
      showDealerTierOnInvoice: showDealerTier,
      invoiceFooterNote: invoiceFooter
    });
    setSettings(updated);
    showToast('success', 'تم حفظ الإعدادات العامة', 'تم تحديث بيانات قطاع الجملة وقوالب الفواتير بنجاح');
  };

  // 2. Save Wholesale Pricing Engine Config & Audit Log
  const handleSavePricingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'صلاحيات غير كافية', 'المدير العام فقط هو المخول بتعديل إعدادات تسعير الجملة');
      return;
    }

    if (totalBenefitsPercent >= 80) {
      showToast('error', 'خطأ في النسب', 'إجمالي استقطاعات الجملة (B%) لا يمكن أن يتجاوز 80%');
      return;
    }

    const oldSettings = { ...settings };

    const updatedSettings: DealerModuleSettings = {
      ...settings,
      rateUSD_EGP: rateUSD,
      defaultWholesaleProfitMarginPercent: defaultMargin,
      fixedCostMode: fixedMode,
      manualFixedCostEGP: manualFixedCost,
      monthlyBreakEvenTargetOrders: targetOrders,
      defaultCashbackPercent: cashbackPercent,
      defaultPartnerCommissionPercent: partnerCommissionPercent,
      reservePercent,
      developmentPercent,
      offersPercent,
      minCashbackAmountEGP: minCashback
    };

    db.saveDealerModuleSettings(updatedSettings);
    setSettings(updatedSettings);

    // Generate Audit Trail
    const settingLabels: Record<string, string> = {
      rateUSD_EGP: 'سعر صرف USDT المعتمد للجملة',
      defaultWholesaleProfitMarginPercent: 'هامش ربح الجملة للتجار (P%)',
      fixedCostMode: 'طريقة حساب التكلفة الثابتة للجملة (F)',
      manualFixedCostEGP: 'التكلفة التشغيلية الثابتة للجملة (F)',
      monthlyBreakEvenTargetOrders: 'تارجت طلبات الجملة الشهري',
      defaultCashbackPercent: 'نسبة كاش باك تاجر الجملة (%)',
      defaultPartnerCommissionPercent: 'نسبة عمولة إحالات وتوزيع الشركاء (%)',
      reservePercent: 'نسبة صندوق احتياطي وطوارئ الجملة (%)',
      developmentPercent: 'نسبة صندوق تطوير منصة الموزعين (%)',
      offersPercent: 'نسبة صندوق حوافز وتخفيضات تجار VIP (%)',
      minCashbackAmountEGP: 'الحد الأدنى لاستخدام كاش باك الجملة'
    };

    const keys = Object.keys(settingLabels) as (keyof DealerModuleSettings)[];
    keys.forEach(k => {
      if (oldSettings[k] !== updatedSettings[k]) {
        db.addDealerPricingAuditLog({
          userId: user?.id || 'admin',
          userName: user?.fullName || 'المدير العام (Owner)',
          userRole: user?.role || 'admin',
          settingKey: String(k),
          settingLabelArabic: settingLabels[String(k)] || String(k),
          oldValue: oldSettings[k] ?? '—',
          newValue: updatedSettings[k] ?? '—',
          reason: auditReason || 'تعديل شامل لإعدادات محرك تسعير الجملة V3.0',
          deviceInfo: navigator.userAgent.slice(0, 80)
        });
      }
    });

    setAuditLogs(db.getDealerPricingAuditLogs());
    setAuditReason('');

    // Force recalculate catalog wholesale prices
    FinancialEngine.recalculateAllCatalogProducts();

    showToast(
      'success',
      'تم حفظ إعدادات تسعير الجملة',
      'تم تحديث إعدادات تسعير الجملة وإعادة احتساب أسعار التجار لكافة المنتجات تلقائياً مع تسجيل العملية في سجل التدقيق.'
    );
  };

  // 3. Force Recalculate Catalog Wholesale Prices
  const handleForceRecalculateAll = () => {
    if (!isOwner) return;
    FinancialEngine.recalculateAllCatalogProducts();
    showToast('success', 'تمت المزامنة', 'تمت إعادة احتساب أسعار الجملة لجميع الألعاب والباقات بنجاح وفق محرك التسعير المركزي.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in text-right text-xs pb-10" dir="rtl">
      {/* Top Banner Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                إعدادات قسم التجار والمحرك المالي لأسعار الجملة (Wholesale Financial Engine V3.0)
              </h2>
              <Badge variant="warning" size="sm">Wholesale Source of Truth</Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              المصدر المركزي الوحيد لحساب أسعار الجملة للموزعين، هوامش ربح التجار، حوافز الكميات، حاسبة المحاكاة، وقوالب الفواتير التجارية.
            </p>
          </div>
        </div>

        {isOwner && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            onClick={handleForceRecalculateAll}
            className="cursor-pointer"
          >
            إعادة احتساب أسعار الجملة
          </Button>
        )}
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto text-xs font-bold shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('pricing_engine')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pricing_engine'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>محرك تسعير الجملة (Wholesale Engine)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'simulator'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>حاسبة ومحاكي صفقات الجملة (Simulator)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audit_log')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'audit_log'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <History className="w-4 h-4 text-cyan-400" />
          <span>سجل تدقيق ورقابة تسعير الجملة ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('general_invoices')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'general_invoices'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Printer className="w-4 h-4 text-purple-400" />
          <span>الإعدادات العامة وقوالب فواتير الجملة</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* SUB-TAB 1: WHOLESALE PRICING ENGINE SETTINGS */}
      {/* ============================================================= */}
      {activeSubTab === 'pricing_engine' && (
        <form onSubmit={handleSavePricingConfig} className="space-y-4 animate-fade-in">
          {/* Formula Display Card */}
          <Card className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-500 text-xs sm:text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4" /> معادلة تسعير الجملة والتوزيع المالي القياسية:
              </span>
              <Badge variant="warning" size="sm">Wholesale Formula V3.0</Badge>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-center font-mono text-xs sm:text-sm text-zinc-200 dir-ltr flex items-center justify-center gap-2">
              <span>S_wholesale = </span>
              <div className="inline-flex flex-col items-center">
                <span className="border-b border-zinc-600 px-2 pb-0.5">C × (1 + P_wholesale%) + F_wholesale</span>
                <span className="pt-0.5">1 - B_wholesale% ({totalBenefitsPercent.toFixed(1)}%)</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Column 1: Core Formula Inputs */}
            <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" /> ١. معاملات معادلة الجملة الأساسية (Wholesale Inputs)
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">C, P%, F, USDT</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      سعر صرف USDT المعتمد (جنيه) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      disabled={!isOwner}
                      value={rateUSD}
                      onChange={e => setRateUSD(parseFloat(e.target.value) || 1)}
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">يحدث أسعار الجملة بالكتالوج فوراً</span>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-600 dark:text-amber-400 mb-1">
                      هامش ربح الجملة الافتراضي للتجار (P%) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      disabled={!isOwner}
                      value={defaultMargin}
                      onChange={e => setDefaultMargin(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">
                      هامش الموزعين (الافتراضي 3.5%)
                    </span>
                  </div>
                </div>

                {/* Fixed Cost Mode (Auto vs Manual) */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                      طريقة حساب التكلفة التشغيلية للجملة (F):
                    </span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">
                      {fixedMode === 'auto'
                        ? `محسوبة تلقائياً: ${autoCalculatedFixedCost} ج`
                        : `يدوية: ${manualFixedCost} ج`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setFixedMode('manual')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        fixedMode === 'manual'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                      }`}
                    >
                      وضع يدوي ثابت
                    </button>
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setFixedMode('auto')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        fixedMode === 'auto'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                      }`}
                    >
                      وضع تلقائي (حصة الجملة ÷ التارجت)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Input
                      label="التكلفة الثابتة اليدوية (F) بالجنيه"
                      type="number"
                      step="any"
                      disabled={!isOwner || fixedMode === 'auto'}
                      value={manualFixedCost}
                      onChange={e => setManualFixedCost(parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      label="تارجت طلبات الجملة الشهري للتعادل"
                      type="number"
                      disabled={!isOwner}
                      value={targetOrders}
                      onChange={e => setTargetOrders(parseInt(e.target.value) || 1500)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Column 2: Wholesale B% Deductions & Liabilities Matrix */}
            <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-purple-400" /> ٢. مصفوفة نسب استقطاعات وحوافز التجار (Wholesale B% Matrix)
                </h3>
                <span className="text-[10px] font-mono font-bold text-purple-400">
                  إجمالي B = {totalBenefitsPercent.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-amber-500 mb-1">
                    كاش باك تاجر الجملة (Cashback %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={cashbackPercent}
                    onChange={e => setCashbackPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">حافز كميات لصالح التاجر</span>
                </div>

                <div>
                  <label className="block font-bold text-blue-400 mb-1">
                    عمولة إحالة وتوزيع الشركاء (%):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={partnerCommissionPercent}
                    onChange={e => setPartnerCommissionPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">عمولة وكيل أو موزع رئيسي</span>
                </div>

                <div>
                  <label className="block font-bold text-emerald-400 mb-1">
                    صندوق احتياطي ومخاطر الجملة (%):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={reservePercent}
                    onChange={e => setReservePercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">مخصص مخاطر تذبذب العملة</span>
                </div>

                <div>
                  <label className="block font-bold text-cyan-400 mb-1">
                    صندوق تطوير منصة الموزعين (Dev %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={developmentPercent}
                    onChange={e => setDevelopmentPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">مخصص السيرفرات والربط البرمجي</span>
                </div>

                <div>
                  <label className="block font-bold text-rose-400 mb-1">
                    حوافز وتخفيضات تجار VIP (%):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={offersPercent}
                    onChange={e => setOffersPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">مخصص تخفيضات الحيتان</span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    الحد الأدنى لكاش باك الجملة (ج.م):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={minCashback}
                    onChange={e => setMinCashback(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">أقل رصيد مسموح بخصمه</span>
                </div>
              </div>

              {/* Audit Reason Input */}
              {isOwner && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]">
                  <Input
                    label="سبب التعديل لسجل الرقابة والتدقيق (Wholesale Audit Reason)"
                    placeholder="مثال: تعديل هوامش ربح الموزعين وتحديث سعر صرف الدولار"
                    value={auditReason}
                    onChange={e => setAuditReason(e.target.value)}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Action Bar */}
          {isOwner && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>إعادة احتساب وتحديث كامل لأسعار الجملة لجميع المنتجات تلقائياً فور الحفظ.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                icon={<Save className="w-4 h-4" />}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                حفظ واعتماد إعدادات تسعير الجملة (Audit Log)
              </Button>
            </div>
          )}
        </form>
      )}

      {/* ============================================================= */}
      {/* SUB-TAB 2: WHOLESALE PRICING SIMULATOR SANDBOX */}
      {/* ============================================================= */}
      {activeSubTab === 'simulator' && <DealerPricingSimulator />}

      {/* ============================================================= */}
      {/* SUB-TAB 3: WHOLESALE PRICING AUDIT LOG TABLE */}
      {/* ============================================================= */}
      {activeSubTab === 'audit_log' && (
        <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                سجل تدقيق ورقابة تعديلات تسعير الجملة (Wholesale Pricing Audit Trail)
              </h3>
            </div>
            <Badge variant="info" size="sm">{auditLogs.length} سجل مراقبة</Badge>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-2xl">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">المستخدم والوظيفة</th>
                  <th className="py-2.5 px-3">الإعداد المعدل</th>
                  <th className="py-2.5 px-3 text-center">القيمة القديمة</th>
                  <th className="py-2.5 px-3 text-center">القيمة الجديدة</th>
                  <th className="py-2.5 px-3">سبب التعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      لا توجد سجلات تدقيق مسجلة لقسم الجملة بعد
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-zinc-800 dark:text-zinc-200">
                        {log.userName} ({log.userRole})
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-500">
                        {log.settingLabelArabic}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-500 font-bold">
                        {String(log.oldValue ?? '—')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-500 font-bold">
                        {String(log.newValue ?? '—')}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {log.reason || 'تحديث ضبط تسعير الجملة'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================= */}
      {/* SUB-TAB 4: GENERAL SETTINGS & INVOICE TEMPLATES */}
      {/* ============================================================= */}
      {activeSubTab === 'general_invoices' && (
        <form onSubmit={handleSaveGeneralSettings} className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* General Info Card */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <Building2 className="w-4 h-4 text-amber-500" /> بيانات قطاع الجملة والمركز التجاري
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const updated = db.updateDealerModuleSettings({ defaultCurrencyDisplay: 'EGP' });
                    setSettings(updated);
                    showToast('info', 'تم التعيين', 'تم اختيار الجنيه المصري (EGP) لقطاع الجملة');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                    settings.defaultCurrencyDisplay === 'EGP'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🇪🇬 جنيه مصري (EGP)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = db.updateDealerModuleSettings({ defaultCurrencyDisplay: 'USD' });
                    setSettings(updated);
                    showToast('info', 'تم التعيين', 'تم اختيار الدولار (USDT) لقطاع الجملة');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                    settings.defaultCurrencyDisplay === 'USD'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🇺🇸 دولار / USDT
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <Input
                  label="اسم قطاع الجملة بالفاتورة *"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  required
                />
                <Input
                  label="هاتف الدعم الفني المخصص للتجار *"
                  value={businessPhone}
                  onChange={e => setBusinessPhone(e.target.value)}
                  required
                />
                <Input
                  label="عنوان مركز التوزيع الرئيسي"
                  value={businessAddress}
                  onChange={e => setBusinessAddress(e.target.value)}
                  required
                />
                <Input
                  label="رقم السجل التجاري / البطاقة الضريبية لقطاع الجملة"
                  value={commercialRegistrationNumber}
                  onChange={e => setCommercialRegistrationNumber(e.target.value)}
                />
              </div>
            </Card>

            {/* Invoices Template Card */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <Printer className="w-4 h-4 text-amber-500" /> خيارات وتنسيق فواتير الجملة المطبوعة
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInvoicePaperFormat('thermal_80mm')}
                  className={`p-2 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                    invoicePaperFormat === 'thermal_80mm'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🧾 حراري (80mm)
                </button>

                <button
                  type="button"
                  onClick={() => setInvoicePaperFormat('a4')}
                  className={`p-2 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                    invoicePaperFormat === 'a4'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  📄 رسمي (A4 / A5)
                </button>

                <button
                  type="button"
                  onClick={() => setInvoicePaperFormat('thermal_58mm')}
                  className={`p-2 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                    invoicePaperFormat === 'thermal_58mm'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🧾 حراري (58mm)
                </button>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={e => setShowLogo(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>إظهار شعار المنشأة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={e => setShowPhone(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>إظهار هاتف الدعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showEmployee}
                    onChange={e => setShowEmployee(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>إظهار اسم الموظف / الوكيل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showCashback}
                    onChange={e => setShowCashback(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>إظهار كاش باك الجملة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showCommercialId}
                    onChange={e => setShowCommercialId(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>إظهار السجل التجاري</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showDealerTier}
                    onChange={e => setShowDealerTier(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>إظهار تصنيف وحد ائتمان التاجر</span>
                </label>
              </div>

              <Input
                label="الرسالة الترحيبية في ذيل فاتورة الجملة (Footer Note)"
                value={invoiceFooter}
                onChange={e => setInvoiceFooter(e.target.value)}
                required
              />
            </Card>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
            <span className="text-xs text-zinc-500">حفظ إعدادات هوية فواتير الجملة والمطبوعات التجارية</span>
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              حفظ الإعدادات العامة
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
