import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { StoreWallet } from '../../types/topup.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  FileText,
  Wallet,
  DollarSign,
  Printer,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Hash,
  ArrowDownLeft,
  Layers,
  Sparkles,
  Share2
} from 'lucide-react';

interface DepositVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedWalletId?: string;
  onSuccess?: () => void;
}

export const DepositVoucherModal: React.FC<DepositVoucherModalProps> = ({
  isOpen,
  onClose,
  preselectedWalletId,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [wallets, setWallets] = useState<StoreWallet[]>(() => db.getStoreWallets());

  const [voucherType, setVoucherType] = useState<'operating_cash' | 'fifo_goods'>('operating_cash');
  const [voucherNumber, setVoucherNumber] = useState(
    () => `DEP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  );
  const [targetWalletId, setTargetWalletId] = useState(preselectedWalletId || '');
  const [selectedNumberId, setSelectedNumberId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [costUSDT, setCostUSDT] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>(() => {
    const rate = db.getExchangeRate();
    return (rate?.rateUSD_EGP || 50).toString();
  });
  const [unitsDeposited, setUnitsDeposited] = useState<string>('');
  const [depositorName, setDepositorName] = useState('');
  const [depositorPhone, setDepositorPhone] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success view state to display the printable voucher
  const [createdVoucherData, setCreatedVoucherData] = useState<any | null>(null);

  // Reload wallets on open
  React.useEffect(() => {
    if (isOpen) {
      const all = db.getStoreWallets();
      setWallets(all);
      const available = all.filter(w => !w.isSystemWallet && w.type === 'operating');
      if (preselectedWalletId && all.some(w => w.id === preselectedWalletId)) {
        setTargetWalletId(preselectedWalletId);
      } else if (available.length > 0 && !targetWalletId) {
        setTargetWalletId(available[0].id);
      }
      setVoucherNumber(`DEP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);
      setCreatedVoucherData(null);
    }
  }, [isOpen, preselectedWalletId]);

  const selectedWallet = useMemo(() => {
    return wallets.find(w => w.id === targetWalletId);
  }, [wallets, targetWalletId]);

  const availableNumbers = useMemo(() => {
    return selectedWallet?.numbers || [];
  }, [selectedWallet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetWalletId || !selectedWallet) {
      showToast('error', 'يرجى اختيار المحفظة', 'المحفظة المودع إليها مطلوبة');
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    const numUnits = parseFloat(unitsDeposited) || 0;
    const numCostUSD = parseFloat(costUSDT) || 0;
    const numRate = parseFloat(exchangeRate) || 50;

    if (voucherType === 'operating_cash' && numAmount <= 0) {
      showToast('error', 'مبلغ الإيداع غير صالح', 'يرجى إدخال مبلغ إيداع أكبر من الصفر');
      return;
    }

    if (voucherType === 'fifo_goods' && (numUnits <= 0 || numCostUSD <= 0)) {
      showToast('error', 'بيانات البضاعة ناقصة', 'يرجى إدخال عدد الوحدات وتكلفة الوحدة بالدولار');
      return;
    }

    setIsSubmitting(true);
    try {
      const performedByUser = {
        id: user?.id || 'admin',
        name: user?.fullName || 'المسؤول',
        role: user?.role || 'admin'
      };

      if (voucherType === 'operating_cash') {
        // Record deposit in store wallet
        const success = db.depositStoreWalletFunds(
          selectedWallet.id,
          numAmount,
          `سند إيداع نقدي #${voucherNumber} — من: ${depositorName.trim() || 'إيداع مباشر'}${transferRef ? ` (حوالة: ${transferRef})` : ''}`,
          voucherNumber,
          performedByUser,
          notes.trim() || undefined,
          'manual_deposit',
          depositorName.trim() || 'إيداع نقدي',
          selectedNumberId || undefined
        );

        if (!success) {
          throw new Error('فشل تسجيل الإيداع بالمحفظة');
        }

        const voucherSnapshot = {
          voucherNumber,
          voucherType: 'operating_cash',
          walletName: selectedWallet.name,
          walletAccount: selectedWallet.accountNumber,
          currency: selectedWallet.currency || 'EGP',
          amount: numAmount,
          depositorName: depositorName.trim() || 'إيداع مباشر',
          depositorPhone: depositorPhone.trim(),
          transferRef: transferRef.trim(),
          depositDate,
          notes: notes.trim(),
          performedBy: performedByUser.name,
          createdAt: new Date().toISOString()
        };

        setCreatedVoucherData(voucherSnapshot);
      } else {
        // Record FIFO Goods Deposit
        const totalCostEGP = numUnits * numCostUSD * numRate;
        const newBond = db.addDepositBondFIFO({
          bondNumber: voucherNumber,
          walletId: selectedWallet.id,
          walletName: selectedWallet.name,
          unitsDeposited: numUnits,
          remainingUnits: numUnits,
          costUSDT: numCostUSD,
          exchangeRateAtDeposit: numRate,
          transferFeesEGP: 0,
          totalCostEGP,
          date: depositDate
        });

        const voucherSnapshot = {
          voucherNumber: newBond.bondNumber,
          voucherType: 'fifo_goods',
          walletName: selectedWallet.name,
          unitsDeposited: numUnits,
          costUSDT: numCostUSD,
          exchangeRate: numRate,
          totalCostEGP,
          depositorName: depositorName.trim() || 'توريد مخزون',
          transferRef: transferRef.trim(),
          depositDate,
          notes: notes.trim(),
          performedBy: performedByUser.name,
          createdAt: new Date().toISOString()
        };

        setCreatedVoucherData(voucherSnapshot);
      }

      showToast('success', 'تم إنشاء سند الإيداع بنجاح', `رقم السند: #${voucherNumber}`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast('error', 'خطأ في حفظ السند', err?.message || 'حدث خطأ أثناء حفظ السند');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📝 سند إيداع مالي معتمد (Deposit Voucher)"
      subtitle="إنشاء سند إيداع رسمي في دفاتر النظام وإيداع الرصيد في المحفظة فورياً"
      maxWidth={createdVoucherData ? 'xl' : 'lg'}
    >
      {createdVoucherData ? (
        /* =================================================================== */
        /* PRINTABLE VOUCHER RECEIPT VIEW                                      */
        /* =================================================================== */
        <div className="space-y-4 text-right text-xs">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#18181B] border-2 border-dashed border-orange-500/40 space-y-4 font-mono shadow-sm print:border-black">
            {/* Voucher Header */}
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                    سند إيداع مالي رسمي — NZM JKR Top Up
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-400">معتمد في السجلات المالية ودفتر الأستاذ (Ledger)</span>
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-orange-500 block">#{createdVoucherData.voucherNumber}</span>
                <span className="text-[10px] text-zinc-400">{formatDateTime(createdVoucherData.createdAt)}</span>
              </div>
            </div>

            {/* Voucher Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">المحفظة المودع إليها:</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold block mt-0.5">
                  {createdVoucherData.walletName}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">المبلغ المودع:</span>
                <strong className="text-emerald-500 font-black text-sm block mt-0.5">
                  {createdVoucherData.voucherType === 'operating_cash'
                    ? formatCurrency(createdVoucherData.amount, createdVoucherData.currency)
                    : `${createdVoucherData.unitsDeposited} وحدة ($${createdVoucherData.costUSDT})`}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">المودع / جهة الإيداع:</span>
                <strong className="text-zinc-800 dark:text-zinc-200 block mt-0.5">
                  {createdVoucherData.depositorName}
                </strong>
              </div>

              {createdVoucherData.transferRef && (
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">رقم الحوالة / المرجع:</span>
                  <strong className="text-orange-500 font-bold block mt-0.5">
                    {createdVoucherData.transferRef}
                  </strong>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">أمين الخزينة / المنفذ:</span>
                <strong className="text-zinc-700 dark:text-zinc-300 block mt-0.5">
                  {createdVoucherData.performedBy}
                </strong>
              </div>
            </div>

            {createdVoucherData.notes && (
              <div className="p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs">
                <span className="text-zinc-400 font-bold ml-1">البيان / الملاحظات:</span>
                <span className="text-zinc-800 dark:text-zinc-200">{createdVoucherData.notes}</span>
              </div>
            )}

            {/* Signature & Stamp Boxes */}
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 grid grid-cols-2 gap-4 text-center text-[10px] text-zinc-400">
              <div className="p-3 border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl h-16 flex flex-col justify-between">
                <span>توقيع أمين الصندوق / المحاسب</span>
                <strong className="text-zinc-700 dark:text-zinc-300">{createdVoucherData.performedBy}</strong>
              </div>
              <div className="p-3 border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl h-16 flex flex-col justify-between">
                <span>ختم الإدارة المالية والاعتماد</span>
                <span className="text-emerald-500 font-bold">✓ مُعتمد ومسجل بالدفاتر</span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              إغلاق
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrintVoucher}
            >
              طباعة سند الإيداع
            </Button>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* VOUCHER CREATION FORM                                               */
        /* =================================================================== */
        <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs">
          {/* Voucher Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-zinc-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setVoucherType('operating_cash')}
              className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                voucherType === 'operating_cash'
                  ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>إيداع مالي نقدي / بنكي</span>
            </button>

            <button
              type="button"
              onClick={() => setVoucherType('fifo_goods')}
              className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                voucherType === 'fifo_goods'
                  ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>سند إيداع بضاعة / كروت FIFO</span>
            </button>
          </div>

          {/* Top Info Banner */}
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="font-bold">رقم السند التلقائي: <strong>#{voucherNumber}</strong></span>
            </div>
            <Badge variant="warning" size="sm">
              توثيق فوري في Ledger
            </Badge>
          </div>

          {/* Target Wallet Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                المحفظة المودع إليها *
              </label>
              <select
                value={targetWalletId}
                onChange={e => {
                  setTargetWalletId(e.target.value);
                  setSelectedNumberId('');
                }}
                required
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
              >
                {wallets
                  .filter(w => !w.isSystemWallet)
                  .map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.category || w.type}) — الرصيد: {formatCurrency(w.balance, w.currency)}
                    </option>
                  ))}
              </select>
            </div>

            {availableNumbers.length > 0 ? (
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  الخط / الرقم المستلم (اختياري)
                </label>
                <select
                  value={selectedNumberId}
                  onChange={e => setSelectedNumberId(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                >
                  <option value="">كافة أرقام المحفظة (إيداع عام)</option>
                  {availableNumbers.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.phoneNumber} ({n.accountHolderName})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  تاريخ ووقت السند *
                </label>
                <input
                  type="datetime-local"
                  value={depositDate}
                  onChange={e => setDepositDate(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Amount Inputs for Operating Cash */}
          {voucherType === 'operating_cash' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  المبلغ المودع ({selectedWallet?.currency || 'جنيه'}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="مثال: 5000"
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-orange-500/40 p-2.5 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-sm"
                  />
                  <span className="absolute left-2.5 top-2.5 text-orange-500 font-bold">
                    {selectedWallet?.currency === 'USD' ? '$' : 'ج'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  رقم الحوالة / كود العملية المرجعية
                </label>
                <input
                  type="text"
                  value={transferRef}
                  onChange={e => setTransferRef(e.target.value)}
                  placeholder="مثال: TRX-998811 أو رقم إشعار البنك"
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
              </div>
            </div>
          ) : (
            /* FIFO Goods Inputs */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  عدد الوحدات / الكروت المودعة *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={unitsDeposited}
                  onChange={e => setUnitsDeposited(e.target.value)}
                  placeholder="مثال: 500 كود"
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  تكلفة الوحدة بالدولار (USDT) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={costUSDT}
                  onChange={e => setCostUSDT(e.target.value)}
                  placeholder="مثال: 0.85"
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  سعر الصرف المعتمد (EGP) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  placeholder="50"
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Depositor Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                اسم المودع / جهة الإيداع *
              </label>
              <input
                type="text"
                required
                value={depositorName}
                onChange={e => setDepositorName(e.target.value)}
                placeholder="اسم العميل، الشريك، أو منصة التحويل"
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                رقم هاتف المودع (اختياري)
              </label>
              <input
                type="tel"
                value={depositorPhone}
                onChange={e => setDepositorPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              البيان والملاحظات الإضافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل لتدقيق الحسابات أو سبب الإيداع..."
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              icon={<ArrowDownLeft className="w-4 h-4" />}
            >
              تأكيد وحفظ سند الإيداع
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
