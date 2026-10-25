// =============================================================
// NZM JKR TOP UP ERP — Middleman Settings SubModule (V1.0)
// =============================================================

import React, { useState } from 'react';
import { MiddlemanModuleSettings } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import {
  Settings,
  Save,
  ShieldCheck,
  Percent,
  DollarSign,
  Printer,
  MessageCircle,
  Send,
  Bell,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

export const MiddlemanSettingsSubModule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [settings, setSettings] = useState<MiddlemanModuleSettings>(() => db.getMiddlemanModuleSettings());

  // Active Tab inside Settings
  const [activeTab, setActiveTab] = useState<'commission' | 'invoices' | 'templates' | 'alerts' | 'presets'>('commission');

  // New Deal Type state
  const [newDealType, setNewDealType] = useState('');

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateMiddlemanModuleSettings(settings);
    showToast('success', 'تم حفظ الإعدادات', 'تم تحديث كافة إعدادات قسم الوساطة والضمان بنجاح');
  };

  const handleAddDealType = () => {
    if (!newDealType.trim()) return;
    if (settings.customDealTypes.includes(newDealType.trim())) {
      showToast('error', 'مكرر', 'هذا النوع موجود بالفعل');
      return;
    }
    setSettings(prev => ({
      ...prev,
      customDealTypes: [...prev.customDealTypes, newDealType.trim()]
    }));
    setNewDealType('');
  };

  const handleRemoveDealType = (t: string) => {
    setSettings(prev => ({
      ...prev,
      customDealTypes: prev.customDealTypes.filter(x => x !== t)
    }));
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                إعدادات وتخصيص قسم الوساطة (Middleman Settings)
              </h1>
              <Badge variant="warning" size="sm">تحكم كامل</Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              ضبط نسب العمولات الافتراضية، قوالب رسائل واتساب وتيليجرام، تخصيص الفواتير الحرارية، وقواعد الإشعارات الذكية.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
        >
          حفظ كافة الإعدادات
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto font-bold shadow-xs">
        {[
          { id: 'commission', label: 'نسب العمولات الافتراضية', icon: Percent },
          { id: 'invoices', label: 'قوالب الفواتير والطباعة', icon: Printer },
          { id: 'templates', label: 'رسائل واتساب وتيليجرام', icon: MessageCircle },
          { id: 'alerts', label: 'التنبيهات والإشعارات', icon: Bell },
          { id: 'presets', label: 'أنواع الوساطات والمصادر', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Default Commissions */}
      {activeTab === 'commission' && (
        <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
            <Percent className="w-4 h-4 text-amber-500" />
            <span>محرك العمولات الافتراضية لصفقات الوساطة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="نسبة عمولة الشركة الافتراضية (%)"
                type="number"
                step="any"
                value={settings.defaultCompanyCommissionPercent}
                onChange={e =>
                  setSettings(p => ({
                    ...p,
                    defaultCompanyCommissionPercent: parseFloat(e.target.value) || 0
                  }))
                }
              />
            </div>

            <div>
              <Input
                label="المبلغ الثابت الافتراضي لعمولة الشركة (ج)"
                type="number"
                step="any"
                value={settings.defaultCompanyCommissionFixedEGP}
                onChange={e =>
                  setSettings(p => ({
                    ...p,
                    defaultCompanyCommissionFixedEGP: parseFloat(e.target.value) || 0
                  }))
                }
              />
            </div>

            <div>
              <Input
                label="نسبة عمولة الوسيط الخارجي الافتراضية (%)"
                type="number"
                step="any"
                value={settings.defaultExternalMiddlemanCommissionPercent}
                onChange={e =>
                  setSettings(p => ({
                    ...p,
                    defaultExternalMiddlemanCommissionPercent: parseFloat(e.target.value) || 0
                  }))
                }
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
            💡 <strong>قاعدة المحرك المالي:</strong> عند إنشاء وساطة جديدة، يتم استخدام هذه القيم تلقائياً مع إمكانية تعديلها لكل صفقة على حدة. عمولة الوسيط الخارجي تخصم دائماً من عمولة الشركة فقط ولا تزيد من المبلغ الإجمالي على المشتري.
          </div>
        </Card>
      )}

      {/* Tab 2: Invoices & Print */}
      {activeTab === 'invoices' && (
        <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
            <Printer className="w-4 h-4 text-blue-500" />
            <span>تخصيص الفواتير والإيصالات ومطبوعات الوساطة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="اسم المنشأة في ترويسة الفاتورة"
              value={settings.businessName}
              onChange={e => setSettings(p => ({ ...p, businessName: e.target.value }))}
            />
            <Input
              label="هاتف الدعم الفني بالفاتورة"
              value={settings.businessPhone}
              onChange={e => setSettings(p => ({ ...p, businessPhone: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <Input
                label="العنوان / المقر"
                value={settings.businessAddress}
                onChange={e => setSettings(p => ({ ...p, businessAddress: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="ملاحظة التذييل في أسفل الفاتورة"
                value={settings.invoiceFooterNote}
                onChange={e => setSettings(p => ({ ...p, invoiceFooterNote: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={settings.showLogoOnInvoice}
                onChange={e => setSettings(p => ({ ...p, showLogoOnInvoice: e.target.checked }))}
              />
              <span>إظهار شعار الشركة</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={settings.showPhoneOnInvoice}
                onChange={e => setSettings(p => ({ ...p, showPhoneOnInvoice: e.target.checked }))}
              />
              <span>إظهار الهاتف</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={settings.showEmployeeOnInvoice}
                onChange={e => setSettings(p => ({ ...p, showEmployeeOnInvoice: e.target.checked }))}
              />
              <span>إظهار اسم الموظف</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={settings.showExternalMiddlemanOnInvoice}
                onChange={e => setSettings(p => ({ ...p, showExternalMiddlemanOnInvoice: e.target.checked }))}
              />
              <span>إظهار الوسيط الخارجي</span>
            </label>
          </div>
        </Card>
      )}

      {/* Tab 3: Message Templates */}
      {activeTab === 'templates' && (
        <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>قوالب رسائل واتساب وتيليجرام الجاهزة للإرسال</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                قالب رسالة إشعار الوساطة عبر واتساب (WhatsApp Deal Template):
              </label>
              <textarea
                rows={5}
                value={settings.whatsappDealTemplate}
                onChange={e => setSettings(p => ({ ...p, whatsappDealTemplate: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#141417] border border-gray-300 dark:border-[#2E2E2E] rounded-xl p-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                قالب فاتورة بيع حساب عبر واتساب (WhatsApp Account Sale Template):
              </label>
              <textarea
                rows={5}
                value={settings.whatsappAccountSaleTemplate}
                onChange={e => setSettings(p => ({ ...p, whatsappAccountSaleTemplate: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#141417] border border-gray-300 dark:border-[#2E2E2E] rounded-xl p-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Alerts & Rules */}
      {activeTab === 'alerts' && (
        <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
            <Bell className="w-4 h-4 text-rose-500" />
            <span>قواعد التنبيهات الذكية ونظام المراقبة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="حد التنبيه للوساطات المعلقة (أيام)"
              type="number"
              value={settings.maxStalledDealDaysAlert}
              onChange={e =>
                setSettings(p => ({
                  ...p,
                  maxStalledDealDaysAlert: parseInt(e.target.value) || 2
                }))
              }
            />
            <Input
              label="حد التنبيه للحسابات غير المباعة في المخزن (أيام)"
              type="number"
              value={settings.maxUnsoldAccountDaysAlert}
              onChange={e =>
                setSettings(p => ({
                  ...p,
                  maxUnsoldAccountDaysAlert: parseInt(e.target.value) || 20
                }))
              }
            />
          </div>
        </Card>
      )}

      {/* Tab 5: Presets */}
      {activeTab === 'presets' && (
        <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>أنواع الوساطات المعتمدة في النظام</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="اكتب نوع وساطة جديد (مثال: بيع دومين، بيع سيرفر ديسكورد...)"
              value={newDealType}
              onChange={e => setNewDealType(e.target.value)}
            />
            <Button variant="primary" onClick={handleAddDealType} icon={<Plus className="w-3.5 h-3.5" />}>
              إضافة
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.customDealTypes.map(t => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-2"
              >
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDealType(t)}
                  className="text-zinc-400 hover:text-rose-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
