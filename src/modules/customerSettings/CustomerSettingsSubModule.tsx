import React, { useState, useEffect } from 'react';
import { CustomerModuleSettings, DailyExchangeRate } from '../../types/topup.types';
import { PricingConfig, PricingAuditLog } from '../../types/pricing.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { PricingSimulator } from '../../components/pricing/PricingSimulator';
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
  Gift,
  Users,
  Zap,
  Lock,
  Share2
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const CustomerSettingsSubModule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  // Sub-tabs: 'general_invoices' | 'pricing_engine' | 'simulator' | 'audit_log'
  const [activeSubTab, setActiveSubTab] = useState<'general_invoices' | 'pricing_engine' | 'simulator' | 'audit_log'>('pricing_engine');

  const [settings, setSettings] = useState<CustomerModuleSettings>(db.getCustomerModuleSettings());
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(FinancialEngine.getPricingConfig());
  const [auditLogs, setAuditLogs] = useState<PricingAuditLog[]>(FinancialEngine.getPricingAuditLogs());

  // General Settings
  const [departmentName, setDepartmentName] = useState('قسم الزبائن وشحن الألعاب');
  const [businessName, setBusinessName] = useState(settings.businessName || 'NZM JKR TOP UP');
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone || '01012345678');
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress || 'المنصورة - جمهورية مصر العربية');

  // Pricing Engine Formula Inputs
  const [rateUSD, setRateUSD] = useState<number>(pricingConfig.rateUSD_EGP || 39.25);
  const [defaultMargin, setDefaultMargin] = useState<number>(pricingConfig.defaultProfitMarginPercent || 7);
  const [fixedMode, setFixedMode] = useState<'auto' | 'manual'>(pricingConfig.fixedCostMode || 'manual');
  const [manualFixedCost, setManualFixedCost] = useState<number>(pricingConfig.manualFixedCostEGP || 5);
  const [targetOrders, setTargetOrders] = useState<number>(pricingConfig.monthlyBreakEvenTargetOrders || 1500);

  // B% Benefits Inputs
  const [cashbackPercent, setCashbackPercent] = useState<number>(pricingConfig.cashbackPercent ?? 1);
  const [referralPercent, setReferralPercent] = useState<number>(pricingConfig.referralPercent ?? 2);
  const [reservePercent, setReservePercent] = useState<number>(pricingConfig.reservePercent ?? 0);
  const [developmentPercent, setDevelopmentPercent] = useState<number>(pricingConfig.developmentPercent ?? 0);
  const [offersPercent, setOffersPercent] = useState<number>(pricingConfig.offersPercent ?? 0);
  const [minCashback, setMinCashback] = useState<number>(pricingConfig.minCashbackAmountEGP ?? 2);
  const [auditReason, setAuditReason] = useState<string>('');

  // Invoice Options
  const [paperFormat, setPaperFormat] = useState<'thermal_80mm' | 'a4'>(settings.invoicePaperFormat || 'thermal_80mm');
  const [showLogo, setShowLogo] = useState(settings.showLogoOnInvoice ?? true);
  const [showPhone, setShowPhone] = useState(settings.showPhoneOnInvoice ?? true);
  const [showEmployee, setShowEmployee] = useState(settings.showEmployeeOnInvoice ?? true);
  const [showCashback, setShowCashback] = useState(settings.showCashbackOnInvoice ?? true);
  const [invoiceFooter, setInvoiceFooter] = useState(
    settings.invoiceFooterNote || 'شكراً لتعاملكم مع NZM JKR — متجر شحن ألعاب الإلكترونية الأول ★'
  );
  const [couponTemplate, setCouponTemplate] = useState(
    settings.couponWhatsAppMessageTemplate ||
      `🎮 مرحباً بك يا {{اسم_العميل}}! ✨
يسعدنا تقديم كوبون تعويض حصري لك:
🎁 كود الكوبون: {{كود_الكوبون}}
💰 قيمة الخصم: {{قيمة_الخصم}} ج
🌟 صالح للاستخدام في شحن جميع ألعابك مباشرة لدينا!
━━━━━━━━━━━━━━━
NZM JKR Top Up 🌟`
  );
  const [referralTemplate, setReferralTemplate] = useState(
    settings.referralCodeMessageTemplate ||
      `مرحبًا،

استخدم كود الإحالة التالي للحصول على المزايا والخصومات الحصرية:

{code}

شكرًا لاستخدام خدماتنا.`
  );

  const loadData = () => {
    const s = db.getCustomerModuleSettings();
    setSettings(s);
    if (s.couponWhatsAppMessageTemplate) {
      setCouponTemplate(s.couponWhatsAppMessageTemplate);
    }
    if (s.referralCodeMessageTemplate) {
      setReferralTemplate(s.referralCodeMessageTemplate);
    }
    const pCfg = FinancialEngine.getPricingConfig();
    setPricingConfig(pCfg);
    setRateUSD(pCfg.rateUSD_EGP ?? 39.25);
    setDefaultMargin(pCfg.defaultProfitMarginPercent ?? 7);
    setFixedMode(pCfg.fixedCostMode || 'manual');
    setManualFixedCost(pCfg.manualFixedCostEGP ?? 5);
    setTargetOrders(pCfg.monthlyBreakEvenTargetOrders ?? 1500);
    setCashbackPercent(pCfg.cashbackPercent ?? 1);
    setReferralPercent(pCfg.referralPercent ?? 2);
    setReservePercent(pCfg.reservePercent ?? 0);
    setDevelopmentPercent(pCfg.developmentPercent ?? 0);
    setOffersPercent(pCfg.offersPercent ?? 0);
    setMinCashback(pCfg.minCashbackAmountEGP ?? 2);
    setAuditLogs(FinancialEngine.getPricingAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBenefitsPercent =
    cashbackPercent + referralPercent + reservePercent + developmentPercent + offersPercent;

  // Auto fixed cost calculation
  const autoCalculatedFixedCost = (() => {
    const allExpenses = db.getExpenses();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlySum = allExpenses.filter(e => e.createdAt.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
    return Math.max(1, Math.round((monthlySum / (targetOrders || 1500)) * 100) / 100);
  })();

  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = db.updateCustomerModuleSettings({
      ...settings,
      businessName,
      businessPhone,
      businessAddress,
      invoiceFooterNote: invoiceFooter,
      invoicePaperFormat: paperFormat,
      showLogoOnInvoice: showLogo,
      showPhoneOnInvoice: showPhone,
      showEmployeeOnInvoice: showEmployee,
      showCashbackOnInvoice: showCashback,
      couponWhatsAppMessageTemplate: couponTemplate,
      referralCodeMessageTemplate: referralTemplate
    });
    setSettings(updated);
    showToast('success', 'تم حفظ الإعدادات العامة', 'تم تحديث بيانات المنشأة وقوالب رسائل الكوبونات والإحالة بنجاح');
  };

  const handleSavePricingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'صلاحيات غير كافية', 'المدير العام فقط هو المخول بتعديل إعدادات التسعير');
      return;
    }

    try {
      const updated = FinancialEngine.updatePricingConfig(
        {
          rateUSD_EGP: rateUSD,
          defaultProfitMarginPercent: defaultMargin,
          fixedCostMode: fixedMode,
          manualFixedCostEGP: manualFixedCost,
          monthlyBreakEvenTargetOrders: targetOrders,
          cashbackPercent,
          referralPercent,
          reservePercent,
          developmentPercent,
          offersPercent,
          minCashbackAmountEGP: minCashback
        },
        user,
        auditReason || 'تعديل شامل لإعدادات محرك التسعير V3.0'
      );

      setPricingConfig(updated);
      setAuditLogs(FinancialEngine.getPricingAuditLogs());
      setAuditReason('');
      showToast('success', 'تم حفظ إعدادات التسعير', 'تم تحديث إعدادات التسعير وإعادة احتساب أسعار كافة المنتجات تلقائياً مع تسجيل العملية في سجل التدقيق.');
    } catch (err: any) {
      showToast('error', 'خطأ في الحساب', err?.message || 'حدث خطأ أثناء حفظ التسعير');
    }
  };

  const handleForceRecalculateAll = () => {
    if (!isOwner) return;
    FinancialEngine.recalculateAllCatalogProducts();
    showToast('success', 'تمت المزامنة', 'تمت إعادة احتساب أسعار جميع الألعاب والباقات بنجاح وفق محرك التسعير المركزي.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in text-right text-xs pb-10">
      {/* Top Banner Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                إعدادات قسم الزبائن والمحرك المالي المركزي (Financial Engine V3.0)
              </h2>
              <Badge variant="orange" size="sm">Single Source of Truth</Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              المصدر المركزي الوحيد لحساب تكاليف المنتجات، أسعار البيع، هوامش الأرباح، الكاش باك، وحاسبة المحاكاة.
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
          >
            إعادة احتساب الكتالوج
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
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>محرك التسعير المركزي (Pricing Engine)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'simulator'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>حاسبة ومحاكي السيناريوهات (Simulator)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audit_log')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'audit_log'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <History className="w-4 h-4 text-cyan-400" />
          <span>سجل تدقيق ورقابة التسعير ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('general_invoices')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'general_invoices'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Printer className="w-4 h-4 text-purple-400" />
          <span>الإعدادات العامة وقوالب الفواتير</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* SUB-TAB 1: CENTRAL PRICING ENGINE SETTINGS */}
      {/* ============================================================= */}
      {activeSubTab === 'pricing_engine' && (
        <form onSubmit={handleSavePricingConfig} className="space-y-4 animate-fade-in">
          {/* Formula Header Display Card */}
          <Card className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-orange-500 text-xs sm:text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4" /> معادلة التسعير والتوزيع المالي القياسية:
              </span>
              <Badge variant="orange" size="sm">Central Formula V3.0</Badge>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-center font-mono text-xs sm:text-sm text-zinc-200 dir-ltr flex items-center justify-center gap-2">
              <span>S = </span>
              <div className="inline-flex flex-col items-center">
                <span className="border-b border-zinc-600 px-2 pb-0.5">C × (1 + P%) + F</span>
                <span className="pt-0.5">1 - B% ({totalBenefitsPercent}%)</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Column 1: Core Formula Inputs */}
            <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-500" /> ١. معاملات المعادلة الأساسية (Core Inputs)
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
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">يحدث أسعار الكتالوج فوراً</span>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      هامش الربح الافتراضي المستهدف (P%) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      disabled={!isOwner}
                      value={defaultMargin}
                      onChange={e => setDefaultMargin(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">يُطبق عند عدم تخصيص هامش للباقة</span>
                  </div>
                </div>

                {/* Fixed Cost Mode (Auto vs Manual) */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                      طريقة حساب التكلفة التشغيلية الثابتة (F):
                    </span>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">
                      {fixedMode === 'auto' ? `محسوبة تلقائياً: ${autoCalculatedFixedCost} ج` : `يدوية: ${manualFixedCost} ج`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setFixedMode('manual')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        fixedMode === 'manual'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                          : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                      }`}
                    >
                      وضع يدوي ثابت
                    </button>
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setFixedMode('auto')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        fixedMode === 'auto'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                          : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                      }`}
                    >
                      وضع تلقائي (المصروفات ÷ التارجت)
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
                      label="تارجت الطلبات الشهري لنقطة التعادل"
                      type="number"
                      disabled={!isOwner}
                      value={targetOrders}
                      onChange={e => setTargetOrders(parseInt(e.target.value) || 1500)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Column 2: B% Deductions & Liabilities Matrix */}
            <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-purple-400" /> ٢. مصفوفة نسب الاستقطاعات والمزايا (B% Matrix)
                </h3>
                <span className="text-[10px] font-mono font-bold text-purple-400">
                  إجمالي B = {totalBenefitsPercent}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-amber-500 mb-1">
                    كاش باك العميل (Cashback %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={cashbackPercent}
                    onChange={e => setCashbackPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">التزام مالي لصالح العميل</span>
                </div>

                <div>
                  <label className="block font-bold text-blue-400 mb-1">
                    عمولة الإحالة والشريك (Referral %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={referralPercent}
                    onChange={e => setReferralPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">التزام مالي لصالح المُحيل</span>
                </div>

                <div>
                  <label className="block font-bold text-emerald-400 mb-1">
                    صندوق الاحتياطي والطوارئ (Reserve %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={reservePercent}
                    onChange={e => setReservePercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">مخصص مخاطر وتقلبات الصرف</span>
                </div>

                <div>
                  <label className="block font-bold text-cyan-400 mb-1">
                    صندوق التطوير والتقنية (Dev %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={developmentPercent}
                    onChange={e => setDevelopmentPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">مخصص صيانة وتطوير السيرفرات</span>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-rose-400 mb-1">
                    صندوق العروض والجوائز والتسويق (Offers %):
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!isOwner}
                    value={offersPercent}
                    onChange={e => setOffersPercent(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Audit Reason Input */}
              {isOwner && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]">
                  <Input
                    label="سبب التعديل لسجل الرقابة والتدقيق (Audit Reason)"
                    placeholder="مثال: تعديل سعر صرف السوق اليومي وتحديث هوامش الربح"
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
                <span>إعادة احتساب وتحديث كامل لأسعار جميع الألعاب والباقات تلقائياً فور الحفظ.</span>
              </div>

              <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                حفظ واعتماد إعدادات التسعير (Audit Log)
              </Button>
            </div>
          )}
        </form>
      )}

      {/* ============================================================= */}
      {/* SUB-TAB 2: PRICING SIMULATOR SANDBOX */}
      {/* ============================================================= */}
      {activeSubTab === 'simulator' && <PricingSimulator />}

      {/* ============================================================= */}
      {/* SUB-TAB 3: PRICING AUDIT LOG TABLE */}
      {/* ============================================================= */}
      {activeSubTab === 'audit_log' && (
        <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                سجل تدقيق ورقابة تعديلات التسعير المركزي (Pricing Audit Trail)
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
                      لا توجد سجلات تدقيق مسجلة بعد
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
                      <td className="py-2.5 px-3 font-bold text-orange-500">
                        {log.settingLabelArabic}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-500 font-bold">
                        {String(log.oldValue ?? '—')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-500 font-bold">
                        {String(log.newValue ?? '—')}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {log.reason || 'تحديث ضبط التسعير'}
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
                <Building2 className="w-4 h-4 text-orange-500" /> بيانات المنشأة وطريقة عرض العملة
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const updated = db.updateCustomerModuleSettings({ defaultCurrencyDisplay: 'EGP' });
                    setSettings(updated);
                    showToast('info', 'تم التعيين', 'تم اختيار الجنيه المصري (EGP)');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                    settings.defaultCurrencyDisplay === 'EGP'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🇪🇬 جنيه مصري (EGP)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = db.updateCustomerModuleSettings({ defaultCurrencyDisplay: 'USD' });
                    setSettings(updated);
                    showToast('info', 'تم التعيين', 'تم اختيار الدولار (USDT)');
                  }}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                    settings.defaultCurrencyDisplay === 'USD'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🇺🇸 دولار / USDT
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <Input
                  label="اسم المنشأة *"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
                <Input
                  label="رقم الهاتف والتواصل *"
                  value={businessPhone}
                  onChange={e => setBusinessPhone(e.target.value)}
                />
                <Input
                  label="العنوان وبيانات الفاتورة"
                  value={businessAddress}
                  onChange={e => setBusinessAddress(e.target.value)}
                />
              </div>
            </Card>

            {/* Invoices Template Card */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <Printer className="w-4 h-4 text-orange-500" /> خيارات وتنسيق الفاتورة المطبوعة
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaperFormat('thermal_80mm')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                    paperFormat === 'thermal_80mm'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🧾 حراري (80mm)
                </button>

                <button
                  type="button"
                  onClick={() => setPaperFormat('a4')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                    paperFormat === 'a4'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  📄 ورق قياسي (A4 / A5)
                </button>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={e => setShowLogo(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>إظهار الشعار</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={e => setShowPhone(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>إظهار الهاتف</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showEmployee}
                    onChange={e => setShowEmployee(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>إظهار اسم الموظف</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showCashback}
                    onChange={e => setShowCashback(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>إظهار الكاش باك</span>
                </label>
              </div>

              <Input
                label="الرسالة الترحيبية في ذيل الفاتورة"
                value={invoiceFooter}
                onChange={e => setInvoiceFooter(e.target.value)}
              />
            </Card>

            {/* 🎁 WhatsApp Coupon Message Template Card */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] lg:col-span-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" /> 💬 قالب رسالة إرسال الكوبون للعميل (WhatsApp Coupon Message)
                </h3>
                <span className="text-[10px] text-purple-400 font-bold">
                  تُنسخ الرسالة المخصصة تلقائياً مع كود الكوبون وقيمته
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400 font-mono">
                  <span className="font-bold text-zinc-300">المتغيرات المتاحة:</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    {'{{اسم_العميل}}'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    {'{{كود_الكوبون}}'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    {'{{قيمة_الخصم}}'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    {'{{سبب_التعويض}}'}
                  </span>
                </div>

                <textarea
                  rows={5}
                  value={couponTemplate}
                  onChange={e => setCouponTemplate(e.target.value)}
                  placeholder="اكتب نص الرسالة التي ستصل للعميل عند إنشاء ونسخ كوبون التعويض..."
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-3 text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500 font-mono text-xs leading-relaxed"
                />

                <span className="text-[10px] text-zinc-400 block">
                  عند الضغط على "نسخ الكوبون مع الرسالة" في بروفايل العميل، سيتم استبدال المتغيرات تلقائياً بنسق جميل وجاهز للإرسال في واتساب.
                </span>
              </div>
            </Card>

            {/* 🤝 WhatsApp Referral Code Message Template Card */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] lg:col-span-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-400" /> 💬 قالب رسالة كود الإحالة (Referral Code Share Message)
                </h3>
                <span className="text-[10px] text-blue-400 font-bold">
                  مستقل تماماً عن رسالة كوبون التعويض وتُنسخ بالكامل عند نسخ كود الإحالة
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400 font-mono">
                  <span className="font-bold text-zinc-300">المتغيرات المتاحة:</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                    {'{code}'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                    {'{{كود_الإحالة}}'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                    {'{name}'}
                  </span>
                </div>

                <textarea
                  rows={5}
                  value={referralTemplate}
                  onChange={e => setReferralTemplate(e.target.value)}
                  placeholder="اكتب نص الرسالة التي ستُنسخ بالكامل عند الضغط على 'نسخ كود الإحالة'..."
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-3 text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 font-mono text-xs leading-relaxed"
                />

                <span className="text-[10px] text-zinc-400 block">
                  عند الضغط على "نسخ كود الإحالة" في قائمة العملاء أو التجار أو البروفايل، سيتم نسخ هذه الرسالة كاملة تلقائياً مع استبدال الكود.
                </span>
              </div>
            </Card>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
            <span className="text-xs text-zinc-500">حفظ إعدادات الهوية وقوالب رسائل الكوبونات والفواتير المطبوعة</span>
            <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
              حفظ الإعدادات العامة
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
