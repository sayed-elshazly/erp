// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Module Settings
// =============================================================

import React, { useState } from 'react';
import { SubscriptionModuleSettings, SubscriptionPaymentMethod } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Sliders,
  Save,
  RotateCcw,
  MessageSquare,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Tv,
  Printer,
  Sparkles,
  CreditCard
} from 'lucide-react';

export const SubscriptionsSettingsSubModule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [settings, setSettings] = useState<SubscriptionModuleSettings>(() => db.getSubscriptionSettings());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSubscriptionSettings(settings, {
      id: user?.id,
      name: user?.fullName || 'المدير العام',
      role: user?.role
    });
    showToast('success', 'تم الحفظ', 'تم حفظ إعدادات قسم الاشتراكات بنجاح');
  };

  const updateTemplate = (index: number, field: string, value: any) => {
    const updated = [...settings.templates];
    updated[index] = { ...updated[index], [field]: value };
    setSettings(prev => ({ ...prev, templates: updated }));
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#121215] rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-600 text-white">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              إعدادات وقواعد قسم الاشتراكات
            </h2>
            <p className="text-[11px] text-zinc-500">
              فترات السماح، قواعد التجديد التلقائي، قوالب رسائل التذكير، وإعدادات الطباعة.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>حفظ التعديلات (Ctrl+S)</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. General Operational Settings */}
        <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            <Tv className="w-4 h-4 text-pink-500" />
            <span>١. قواعد التشغيل وفترات السماح (Grace Period & Renewal Rules)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="أيام فترة السماح الافتراضية بعد الانتهاء (Grace Period)"
              type="number"
              min={0}
              max={30}
              value={settings.gracePeriodDays}
              onChange={e => setSettings(prev => ({ ...prev, gracePeriodDays: Number(e.target.value) }))}
            />

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                طريقة الدفع الافتراضية
              </label>
              <select
                value={settings.defaultPaymentMethod}
                onChange={e => setSettings(prev => ({ ...prev, defaultPaymentMethod: e.target.value as SubscriptionPaymentMethod }))}
                className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
              >
                <option value="safe_cash">نقدًا بالخزينة (Cash)</option>
                <option value="vodafone_cash">فودافون كاش</option>
                <option value="instapay">إنستاباي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="customer_wallet">محفظة العميل</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                مقاس طباعة الإيصالات الافتراضي
              </label>
              <select
                value={settings.defaultPaperFormat}
                onChange={e => setSettings(prev => ({ ...prev, defaultPaperFormat: e.target.value as any }))}
                className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
              >
                <option value="thermal_80mm">طابعة إيصالات حرارية (Thermal 80mm)</option>
                <option value="a4">ورق عادي قياسي (Standard A4)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-700/50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoExpiryCheck}
                onChange={e => setSettings(prev => ({ ...prev, autoExpiryCheck: e.target.checked }))}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
              />
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">الفحص التلقائي لانتهاء الاشتراكات</span>
                <span className="text-[10px] text-zinc-400">تحديث حالة الاشتراكات المنتهية وإرسال التنبيهات يومياً</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-700/50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableProration}
                onChange={e => setSettings(prev => ({ ...prev, enableProration: e.target.checked }))}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
              />
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">حساب الفارق النسبي (Proration) عند الترقية</span>
                <span className="text-[10px] text-zinc-400">احتساب فارق الأيام المتبقية تلقائياً عند تغيير الباقة</span>
              </div>
            </label>
          </div>
        </Card>

        {/* 2. Receipt & Invoicing Branding */}
        <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>٢. بيانات ترويسة وتذييل الإيصالات والفواتير</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="اسم المنشأة في الفاتورة"
              value={settings.companyName}
              onChange={e => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
            />

            <Input
              label="هاتف الدعم الفني"
              value={settings.companyPhone}
              onChange={e => setSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
            />

            <Input
              label="العنوان"
              value={settings.companyAddress}
              onChange={e => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
              ملاحظة تذييل الفاتورة (Footer Note)
            </label>
            <input
              type="text"
              value={settings.invoiceFooterNote}
              onChange={e => setSettings(prev => ({ ...prev, invoiceFooterNote: e.target.value }))}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
            />
          </div>
        </Card>

        {/* 3. Notification Message Templates */}
        <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span>٣. قوالب رسائل التذكير والتنبيهات (WhatsApp & Telegram Templates)</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
              <span>المتغيرات المتاحة:</span>
              <code className="px-1 py-0.5 rounded bg-pink-500/10 text-pink-500">{"{customer_name}"}</code>
              <code className="px-1 py-0.5 rounded bg-pink-500/10 text-pink-500">{"{plan_name}"}</code>
              <code className="px-1 py-0.5 rounded bg-pink-500/10 text-pink-500">{"{expiry_date}"}</code>
            </div>
          </div>

          <div className="space-y-3">
            {settings.templates.map((tpl, idx) => (
              <div key={tpl.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{tpl.title}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tpl.enabled}
                      onChange={e => updateTemplate(idx, 'enabled', e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-pink-600 focus:ring-pink-500"
                    />
                    <span className="text-[11px] text-zinc-500">تفعيل القالب</span>
                  </label>
                </div>

                <textarea
                  rows={2}
                  value={tpl.messageTemplate}
                  onChange={e => updateTemplate(idx, 'messageTemplate', e.target.value)}
                  className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 font-sans"
                />
              </div>
            ))}
          </div>
        </Card>
      </form>
    </div>
  );
};
