import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { CustomerTicket } from '../../types/customer.types';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface TicketProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CustomerTicket;
  onUpdated: () => void;
  initialTab?: 'problem' | 'fraud';
}

export const TicketProblemModal: React.FC<TicketProblemModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onUpdated,
  initialTab = 'problem'
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  // Active Tab for Admin (Problem vs Fraud)
  const [activeTab, setActiveTab] = useState<'problem' | 'fraud'>(
    ticket.status === 'fraud' ? 'fraud' : initialTab
  );

  // -------------------------------------------------------------
  // Employee / Problem Reporting State
  // -------------------------------------------------------------
  const [problemReason, setProblemReason] = useState<'wrong_product' | 'wrong_account_or_amount' | 'other'>(
    ticket.problemDetails?.reason || 'wrong_product'
  );
  const [problemDescription, setProblemDescription] = useState(ticket.problemDetails?.description || '');

  // -------------------------------------------------------------
  // Owner Problem Resolution State
  // -------------------------------------------------------------
  const [resolutionReason, setResolutionReason] = useState<'wrong_product' | 'wrong_account_or_amount' | 'other'>(
    ticket.problemDetails?.reason || 'wrong_product'
  );
  const [decision, setDecision] = useState<'coupon' | 'gift' | 'refund' | 'correction' | 'closed'>('coupon');
  const [costBearer, setCostBearer] = useState<string>('الشركة');
  const [customCostBearer, setCustomCostBearer] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [compensationCouponCode, setCompensationCouponCode] = useState('');
  const [giftDetails, setGiftDetails] = useState('');
  const [selectedRefundWalletId, setSelectedRefundWalletId] = useState<string>('');

  // -------------------------------------------------------------
  // Owner Fraud Case State
  // -------------------------------------------------------------
  const [fraudBearer, setFraudBearer] = useState<string>('الشركة');
  const [customFraudBearer, setCustomFraudBearer] = useState<string>('');
  const [fraudReasonText, setFraudReasonText] = useState(ticket.fraudDetails?.reason || '');
  const [fraudRefundWalletId, setFraudRefundWalletId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available Wallets for Refund
  const storeWallets = db.getStoreWallets();
  const operatingWallets = storeWallets.filter(
    w => w.type === 'operating' && !w.isSystemWallet
  );

  // Default refund wallet if none selected
  const activeRefundWallet = selectedRefundWalletId || operatingWallets[0]?.id || '';
  const activeFraudRefundWallet = fraudRefundWalletId || operatingWallets[0]?.id || '';

  const totalCost = ticket.totalCostAmount || ticket.costPrice || ticket.actualCostEGP || 0;
  const totalReceived = ticket.receivedAmount || ticket.requiredAmount || 0;

  // -------------------------------------------------------------
  // 1. Submit Problem Report (Employee / Owner)
  // -------------------------------------------------------------
  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) {
      showToast('error', 'التفاصيل مطلوبة', 'يرجى كتابة شرح وتفاصيل المشكلة المكتشفة');
      return;
    }

    const reasonLabel =
      problemReason === 'wrong_product'
        ? 'وصل منتج مختلف بنفس السعر'
        : problemReason === 'wrong_account_or_amount'
        ? 'شحن لحساب غلط / مبلغ غلط'
        : 'مشكلة تنفيذية';

    ticket.status = 'problem';
    ticket.problemDetails = {
      reason: problemReason,
      reasonLabel,
      description: problemDescription.trim(),
      reportedBy: user?.fullName || 'الموظف المسؤول',
      reportedAt: new Date().toISOString()
    };
    ticket.updatedAt = new Date().toISOString();

    db.updateTicketStatus(ticket.id, 'problem', user || undefined, `تسجيل مشكلة: [${reasonLabel}] - ${problemDescription}`);
    showToast('warning', 'تم تسجيل المشكلة', `تم تحويل التذكرة #${ticket.ticketNumber} إلى حالة [في مشكلة] للمراجعة`);
    onUpdated();
    onClose();
  };

  // -------------------------------------------------------------
  // 2. Submit Problem Resolution & Close Problem (Owner Only)
  // -------------------------------------------------------------
  const handleResolveProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      showToast('error', 'الملاحظات مطلوبة', 'يرجى كتابة ملاحظة القرار وتفاصيل الحل');
      return;
    }

    if (costBearer === 'نص حر' && !customCostBearer.trim()) {
      showToast('error', 'المتحمل للتكلفة مطلوب', 'يرجى كتابة اسم أو جهة المتحمل للتكلفة في الحقل المخصص');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = db.resolveTicketProblem(
        ticket.id,
        {
          problemReason: resolutionReason,
          decision,
          costBearer,
          customCostBearer: costBearer === 'نص حر' ? customCostBearer.trim() : undefined,
          notes: resolutionNotes.trim(),
          couponCode: decision === 'coupon' ? compensationCouponCode.trim() || `COMP-${ticket.ticketNumber.slice(-4)}` : undefined,
          giftDetails: decision === 'gift' ? giftDetails.trim() : undefined,
          refundWalletId: decision === 'refund' ? activeRefundWallet : undefined,
          refundAmount: decision === 'refund' ? totalReceived : undefined
        },
        user || undefined
      );

      if (res.success) {
        showToast('success', 'تم إغلاق المشكلة', res.message);
        onUpdated();
        onClose();
      } else {
        showToast('error', 'فشل الإجراء', res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Mark Ticket as Fraud (Owner Only)
  // -------------------------------------------------------------
  const handleMarkFraud = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fraudReasonText.trim()) {
      showToast('error', 'السبب مطلوب', 'يرجى كتابة ملابسات وسبب تصنيف التذكرة كاحتيال');
      return;
    }

    if (fraudBearer === 'نص حر' && !customFraudBearer.trim()) {
      showToast('error', 'المتحمل مطلوب', 'يرجى إدخال اسم أو جهة المتحمل للتكلفة');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = db.markTicketFraud(
        ticket.id,
        fraudReasonText.trim(),
        fraudBearer,
        fraudBearer === 'نص حر' ? customFraudBearer.trim() : undefined,
        user || undefined
      );

      if (res.success) {
        showToast('success', 'تم تفعيل حالة الاحتيال', res.message);
        onUpdated();
        onClose();
      } else {
        showToast('error', 'فشل الإجراء', res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 4. Refund Fraud Ticket (Owner Only)
  // -------------------------------------------------------------
  const handleRefundFraudTicket = () => {
    if (!activeFraudRefundWallet) {
      showToast('error', 'محفظة التشغيل مطلوبة', 'يرجى اختيار محفظة تشغيلية لصرف الاسترداد');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = db.refundTicket(
        ticket.id,
        activeFraudRefundWallet,
        'استرداد تذكرة احتيال (إرجاع رصيد البضاعة وخصم الفعلي من التشغيل)',
        user || undefined
      );

      if (res.success) {
        showToast('success', 'تم استرداد تذكرة الاحتيال', 'تم إرجاع رصيد البضاعة وخصم المبلغ الفعلي من محفظة التشغيل بنجاح');
        onUpdated();
        onClose();
      } else {
        showToast('error', 'فشل الاسترداد', res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`⚠️ إدارة ومعالجة مشاكل التذكرة #${ticket.ticketNumber}`}
      subtitle={`العميل: ${ticket.customerName} (${ticket.customerPhone}) — الإيراد: ${formatCurrency(totalReceived)} — تكلفة البضاعة: ${formatCurrency(totalCost)}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* ========================================================= */}
        {/* OWNER MODE SWITCHER (حالة "في مشكلة" vs حالة "الاحتيال")   */}
        {/* ========================================================= */}
        {isOwner && (
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-[#141417] rounded-xl border border-gray-200 dark:border-[#27272A]">
            <button
              type="button"
              onClick={() => setActiveTab('problem')}
              className={`flex-1 py-2 px-3 rounded-lg font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'problem'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>حالة "في مشكلة"</span>
              {ticket.status === 'problem' && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">نشطة</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fraud')}
              className={`flex-1 py-2 px-3 rounded-lg font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'fraud'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-rose-400'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>حالة "الاحتيال" (المسؤول / المالك فقط)</span>
              {ticket.status === 'fraud' && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">مسجل احتيال</span>
              )}
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: حالة "في مشكلة"                                     */}
        {/* ========================================================= */}
        {activeTab === 'problem' && (
          <div className="space-y-4">
            {/* If ticket is NOT YET marked as problem: Employee Reporting Flow */}
            {ticket.status !== 'problem' ? (
              <form onSubmit={handleReportProblem} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="block text-sm">تسجيل مشكلة بالتذكرة وتحويلها للمراجعة الإدارية</span>
                    <span className="text-[11px] font-normal text-amber-500/80">
                      يختار الموظف نوع المشكلة المكتشفة وتفاصيلها لإيقاف المعالجة واتخاذ القرار المناسب من الإدارة.
                    </span>
                  </div>
                </div>

                {/* Employee Selection: 2 Specified Problem Options */}
                <div className="space-y-2">
                  <label className="block font-black text-zinc-900 dark:text-zinc-100 text-sm">
                    اختر نوع المشكلة المكتشفة *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        problemReason === 'wrong_product'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-xs'
                          : 'border-gray-200 dark:border-[#27272A] bg-gray-50 dark:bg-[#141417] text-zinc-400 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="problemReason"
                        value="wrong_product"
                        checked={problemReason === 'wrong_product'}
                        onChange={() => setProblemReason('wrong_product')}
                        className="mt-1 accent-amber-500"
                      />
                      <div>
                        <span className="block font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          مشكلة 1: وصل منتج مختلف بنفس السعر
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          تم تسليم باقة أو منتج مختلف عن المطلوب ولكنه مساوٍ في السعر.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        problemReason === 'wrong_account_or_amount'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-xs'
                          : 'border-gray-200 dark:border-[#27272A] bg-gray-50 dark:bg-[#141417] text-zinc-400 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="problemReason"
                        value="wrong_account_or_amount"
                        checked={problemReason === 'wrong_account_or_amount'}
                        onChange={() => setProblemReason('wrong_account_or_amount')}
                        className="mt-1 accent-rose-500"
                      />
                      <div>
                        <span className="block font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          مشكلة 2: شحن لحساب غلط / مبلغ غلط
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          تم الشحن لمعرف أو حساب خاطئ أو تحويل مبلغ غير مطابق.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    شرح وتفاصيل المشكلة *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب شرحاً دقيقاً لما حدث وكيف تم اكتشاف الخطأ وما هو المعرف الخاطئ..."
                    value={problemDescription}
                    onChange={e => setProblemDescription(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                  <Button type="button" variant="outline" onClick={onClose}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" className="bg-amber-500 hover:bg-amber-600 font-black">
                    تسجيل المشكلة وإيقاف المعالجة
                  </Button>
                </div>
              </form>
            ) : (
              /* Ticket is ALREADY in "problem" status: Display details & Owner Resolution */
              <div className="space-y-4">
                {/* Active Problem Card */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <div className="flex items-center justify-between font-black text-amber-500">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">
                        نوع المشكلة المسجلة:{' '}
                        {ticket.problemDetails?.reason === 'wrong_product'
                          ? 'وصل منتج مختلف بنفس السعر'
                          : ticket.problemDetails?.reason === 'wrong_account_or_amount'
                          ? 'شحن لحساب غلط / مبلغ غلط'
                          : ticket.problemDetails?.reasonLabel || 'مشكلة تنفيذية'}
                      </span>
                    </span>
                    <span className="text-[11px] text-zinc-400 font-sans">
                      بواسطة: {ticket.problemDetails?.reportedBy || 'الموظف'}
                    </span>
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans bg-white/40 dark:bg-black/20 p-2.5 rounded-xl border border-amber-500/10">
                    {ticket.problemDetails?.description || 'لا يوجد وصف تفصيلي مسجل.'}
                  </p>
                </div>

                {/* Owner Resolution Section */}
                {isOwner ? (
                  <form onSubmit={handleResolveProblem} className="space-y-3.5 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        <span>قرار المسؤول / المالك وحل المشكلة</span>
                      </h4>
                      <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-bold">
                        الأثر المالي يُسجل تلقائياً
                      </span>
                    </div>

                    {/* Problem Reason Confirmation/Adjustment */}
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        نوع المشكلة المعتمدة في القرار *
                      </label>
                      <select
                        value={resolutionReason}
                        onChange={e => setResolutionReason(e.target.value as any)}
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                      >
                        <option value="wrong_product">مشكلة 1: وصل منتج مختلف بنفس السعر</option>
                        <option value="wrong_account_or_amount">مشكلة 2: شحن لحساب غلط / مبلغ غلط</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Decision: كوبون / هدية / استرداد / تعديل */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">القرار الإداري *</label>
                        <select
                          value={decision}
                          onChange={e => setDecision(e.target.value as any)}
                          className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-orange-500 font-black outline-none"
                        >
                          <option value="coupon">🎟️ إصدار كوبون خصم تعويضي (كوبون)</option>
                          <option value="gift">🎁 إضافة هدية / كاش باك إضافي (هدية)</option>
                          <option value="refund">💸 استرداد مالي للعميل (استرداد)</option>
                          <option value="correction">🔄 تصحيح الشحن وإكمال الطلب (تعديل)</option>
                          <option value="closed">🔒 إغلاق المشكلة مباشرة</option>
                        </select>
                      </div>

                      {/* Cost Bearer: موظف الشحن / الكاشير / الشركة / نص حر */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">من يتحمل التكلفة *</label>
                        <select
                          value={costBearer}
                          onChange={e => setCostBearer(e.target.value)}
                          className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                        >
                          <option value="موظف الشحن">موظف الشحن (خصم/مسؤولية)</option>
                          <option value="الكاشير">الكاشير (مسؤولية إدخال)</option>
                          <option value="الشركة">الشركة (تحمل المتجر)</option>
                          <option value="نص حر">نص حر (تحديد جهة مخصصة)</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Cost Bearer Input */}
                    {costBearer === 'نص حر' && (
                      <Input
                        label="اكتب اسم أو جهة المتحمل للتكلفة *"
                        placeholder="مثال: موظف التوصيل أحمد، أو مزود الخدمة..."
                        value={customCostBearer}
                        onChange={e => setCustomCostBearer(e.target.value)}
                      />
                    )}

                    {/* Dynamic Fields Based on Decision */}
                    {decision === 'coupon' && (
                      <Input
                        label="كود الكوبون التعويضي"
                        placeholder={`مثال: COMP-${ticket.ticketNumber.slice(-4)}`}
                        value={compensationCouponCode}
                        onChange={e => setCompensationCouponCode(e.target.value.toUpperCase())}
                      />
                    )}

                    {decision === 'gift' && (
                      <Input
                        label="تفاصيل الهدية أو رصيد الكاش باك الإضافي"
                        placeholder="مثال: باقة إضافية مجانية أو 50 ج.م كاش باك..."
                        value={giftDetails}
                        onChange={e => setGiftDetails(e.target.value)}
                      />
                    )}

                    {decision === 'refund' && (
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          محفظة التشغيل لصرف الاسترداد *
                        </label>
                        <select
                          value={activeRefundWallet}
                          onChange={e => setSelectedRefundWalletId(e.target.value)}
                          className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                        >
                          {operatingWallets.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} (الرصيد: {formatCurrency(w.balance)})
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-zinc-400 mt-1 block">
                          المبلغ الفعلي المسترد: <strong className="text-orange-400 font-mono">{formatCurrency(totalReceived)}</strong> يُخصم مباشرة من محفظة التشغيل.
                        </span>
                      </div>
                    )}

                    {/* Resolution Notes */}
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        ملاحظة القرار وتفاصيل التسوية *
                      </label>
                      <textarea
                        rows={2}
                        placeholder="اكتب نص القرار وكيف تمت التسوية وما تم تنفيذه مع العميل والمتحمل..."
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* Automatic Financial Impact Preview Box */}
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-[11px]">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>الأثر المالي التلقائي المسجل عند إغلاق المشكلة:</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-zinc-300 space-y-0.5">
                        {resolutionReason === 'wrong_account_or_amount' ? (
                          <>
                            <li>
                              <strong>محفظة البضاعة:</strong> تسجيل عجز وتكلفة بضاعة مفقودة بمبلغ{' '}
                              <span className="text-orange-400 font-mono">{formatCurrency(totalCost)}</span> على عهدة [
                              {costBearer === 'نص حر' ? customCostBearer || 'جهة مخصصة' : costBearer}].
                            </li>
                            {decision === 'correction' && (
                              <li>
                                <strong>تصحيح الشحن:</strong> تسجيل تسليم الشحنة الصحيحة للعميل بعد معالجة الخطأ.
                              </li>
                            )}
                          </>
                        ) : (
                          <li>
                            <strong>محفظة البضاعة:</strong> تسوية وتعديل المخزون للمنتج البديل دون مساس بالقيمة المالية نظراً لتطابق السعر.
                          </li>
                        )}
                        {decision === 'refund' && (
                          <li>
                            <strong>محفظة التشغيل:</strong> خصم مبلغ الاسترداد الفعلي ({formatCurrency(totalReceived)}) من المحفظة التشغيلية المحددة.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                      <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 font-black"
                      >
                        إغلاق المشكلة
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#141417] text-zinc-400 text-center font-bold">
                    🔒 التذكرة قيد المراجعة الإدارية من قبل المسؤول / المالك لاتخاذ القرار وإغلاق المشكلة.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: حالة "الاحتيال" (المسؤول أو المالك فقط)              */}
        {/* ========================================================= */}
        {activeTab === 'fraud' && isOwner && (
          <div className="space-y-4">
            {/* Rules Golden Table Card */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-500 font-black text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>جدول القواعد المحاسبية المعتمدة لحالة الاحتيال</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-rose-500/20 bg-black/20 text-[11px]">
                <table className="w-full text-right divide-y divide-rose-500/20">
                  <thead className="bg-rose-500/20 text-rose-300 font-black">
                    <tr>
                      <th className="py-1.5 px-3">البند</th>
                      <th className="py-1.5 px-3">التفاصيل المعتمدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-500/10 font-medium text-zinc-200">
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-rose-400">من يفعّلها</td>
                      <td className="py-1.5 px-3">المسؤول أو المالك فقط ✓</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-rose-400">من يتحمل التكلفة</td>
                      <td className="py-1.5 px-3">المالك يختار: موظف الشحن / الكاشير / الشركة / نص حر</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-rose-400">الأثر على البضاعة</td>
                      <td className="py-1.5 px-3 text-amber-300 font-bold">تُخصم تكلفة المنتج ({formatCurrency(totalCost)})</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-rose-400">الأثر على التشغيل</td>
                      <td className="py-1.5 px-3 text-rose-300 font-bold">لا تُضاف (مستبعدة من أرباح ودخل التشغيل)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-rose-400">في حالة الاسترداد</td>
                      <td className="py-1.5 px-3 text-emerald-300 font-bold">
                        رصيد البضاعة يرجع + المبلغ الفعلي يُخصم من التشغيل
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* If Ticket is ALREADY marked as Fraud: Show details & Refund Option */}
            {ticket.status === 'fraud' ? (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 space-y-1.5">
                  <div className="flex items-center justify-between font-black">
                    <span>🚨 التذكرة مسجلة كحالة احتيال</span>
                    <span className="text-xs text-zinc-400 font-sans">
                      المتحمل: <strong className="text-white">{ticket.fraudDetails?.costBearer || 'الشركة'}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 bg-black/25 p-2 rounded-lg">
                    السبب: {ticket.fraudDetails?.reason || 'لا يوجد سبب مسجل'}
                  </p>
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                    <span>بواسطة: {ticket.fraudDetails?.markedBy || 'المدير'}</span>
                    <span>تكلفة البضاعة المخصومة: {formatCurrency(totalCost)}</span>
                  </div>
                </div>

                {/* Refund Flow on Fraud Ticket */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-emerald-400 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استرداد تذكرة الاحتيال وعكس التأثير المالي</span>
                    </h5>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      {formatCurrency(totalReceived)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    وفقاً للقاعدة: <strong>رصيد البضاعة يرجع للمحفظة + المبلغ الفعلي يُخصم من محفظة التشغيل</strong>.
                  </p>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      محفظة التشغيل لخصم مبلغ الاسترداد *
                    </label>
                    <select
                      value={activeFraudRefundWallet}
                      onChange={e => setFraudRefundWalletId(e.target.value)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                    >
                      {operatingWallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} (الرصيد: {formatCurrency(w.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-700 font-black"
                      onClick={handleRefundFraudTicket}
                      disabled={isSubmitting}
                      icon={<RotateCcw className="w-4 h-4" />}
                    >
                      استرداد تذكرة الاحتيال (إرجاع البضاعة + خصم التشغيل)
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Ticket is NOT marked as Fraud: Form to Mark as Fraud */
              <form onSubmit={handleMarkFraud} className="space-y-3.5">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    من يتحمل تكلفة الاحتيال؟ *
                  </label>
                  <select
                    value={fraudBearer}
                    onChange={e => setFraudBearer(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                  >
                    <option value="موظف الشحن">موظف الشحن</option>
                    <option value="الكاشير">الكاشير</option>
                    <option value="الشركة">الشركة</option>
                    <option value="نص حر">نص حر (تحديد جهة مخصصة)</option>
                  </select>
                </div>

                {fraudBearer === 'نص حر' && (
                  <Input
                    label="اكتب اسم أو جهة المتحمل للتكلفة *"
                    placeholder="مثال: وسيط خارجي، موظف محدد..."
                    value={customFraudBearer}
                    onChange={e => setCustomFraudBearer(e.target.value)}
                  />
                )}

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    سبب وتفاصيل الاحتيال *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب شرح ملابسات الاحتيال، إيصال مزيف، تلاعب بالمعرف أو سحب بدون سداد..."
                    value={fraudReasonText}
                    onChange={e => setFraudReasonText(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-rose-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium">
                  ⚠️ <strong>تنبيه مالي:</strong> عند الضغط على الزر أدناه، ستتحول التذكرة إلى حالة [احتيال] وسيتم خصم تكلفة المنتج ({formatCurrency(totalCost)}) فوراً من محفظة البضاعة واستبعاد مبالغها من دخل وأرباح التشغيل.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-rose-600 hover:bg-rose-700 font-black"
                    disabled={isSubmitting}
                    icon={<ShieldAlert className="w-4 h-4" />}
                  >
                    تفعيل حالة الاحتيال وخصم تكلفة البضاعة
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
