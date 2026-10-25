import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet, JKRFundingSource } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import { DollarSign, ArrowDownRight, Layers, Smartphone, AlertTriangle, Landmark, Sparkles } from 'lucide-react';
import { db } from '../../../database/db';

interface JKRMainWalletFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet?: JKRWallet | null;
  onSuccess: () => void;
  department?: 'customers' | 'dealers';
}

export const JKRMainWalletFundingModal: React.FC<JKRMainWalletFundingModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onSuccess,
  department = 'customers'
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const effectiveDepartment: 'customers' | 'dealers' = 
    department || (wallet?.department === 'dealers' ? 'dealers' : 'customers');

  // Real-time Vault Summaries from Database
  const mainVaultSummary = useMemo(() => db.getMainVaultSummary(), [isOpen]);
  const dealerVaultSummary = useMemo(() => db.getDealerMainVaultSummary(), [isOpen]);
  const activeVault = effectiveDepartment === 'dealers' ? dealerVaultSummary : mainVaultSummary;

  // Decide initial defaults
  const initialSource: JKRFundingSource = useMemo(() => {
    if (activeVault.balanceUSD > 0) {
      return effectiveDepartment === 'dealers' ? 'dealer_vault_usd' : 'main_vault_usd';
    }
    if (activeVault.balanceEGP > 0) {
      return effectiveDepartment === 'dealers' ? 'dealer_vault' : 'main_vault';
    }
    return 'direct_usd_deposit';
  }, [activeVault, effectiveDepartment]);

  const initialRate = activeVault.avgUsdPurchaseRate > 0
    ? activeVault.avgUsdPurchaseRate.toFixed(2)
    : '50';

  const [amountUSD, setAmountUSD] = useState<string>('50');
  const [rateEGP, setRateEGP] = useState<string>(initialRate);
  const [source, setSource] = useState<JKRFundingSource>(initialSource);
  const [selectedOperatingWalletId, setSelectedOperatingWalletId] = useState<string>('');
  const [selectedNumberId, setSelectedNumberId] = useState<string>('');
  const [externalType, setExternalType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal opens or department/wallet changes
  useEffect(() => {
    if (isOpen && wallet) {
      const activeV = (department || wallet.department) === 'dealers'
        ? db.getDealerMainVaultSummary()
        : db.getMainVaultSummary();

      const defaultSource: JKRFundingSource =
        activeV.balanceUSD > 0
          ? ((department || wallet.department) === 'dealers' ? 'dealer_vault_usd' : 'main_vault_usd')
          : activeV.balanceEGP > 0
            ? ((department || wallet.department) === 'dealers' ? 'dealer_vault' : 'main_vault')
            : 'direct_usd_deposit';

      setSource(defaultSource);
      if (activeV.avgUsdPurchaseRate > 0) {
        setRateEGP(activeV.avgUsdPurchaseRate.toFixed(2));
      } else {
        setRateEGP('50');
      }
      setAmountUSD('50');
      setNotes('');
      setExternalType('');
    }
  }, [isOpen, wallet, department]);

  // Store operating cash wallets
  const [operatingWallets, setOperatingWallets] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('nzm_jkr_store_wallets');
      if (stored) {
        const parsed = JSON.parse(stored);
        const opList = parsed.filter(
          (w: any) =>
            !w.isSystemWallet &&
            !['w_profits', 'w_cashback', 'w_trust', 'w_referrals'].includes(w.id) &&
            w.type !== 'profits'
        );

        // Pre-compute real ledger balances for each line from transactions
        const txStored = localStorage.getItem('nzm_jkr_store_wallet_transactions');
        const allTxs: any[] = txStored ? JSON.parse(txStored) : [];

        opList.forEach((w: any) => {
          if (Array.isArray(w.numbers)) {
            w.numbers.forEach((num: any) => {
              const numTxs = allTxs.filter(t => 
                (t.walletId === w.id || t.relatedWalletId === w.id) &&
                ((t as any).walletNumberId === num.id ||
                 (t as any).walletPhoneNumber === num.phoneNumber ||
                 t.senderPhoneNumber === num.phoneNumber ||
                 t.receivingPhoneNumber === num.phoneNumber ||
                 (t.description && t.description.includes(num.phoneNumber)))
              );
              if (numTxs.length > 0) {
                const inflow = numTxs.filter(t => t.type === 'deposit' || t.type === 'transfer_in').reduce((s, t) => s + (t.amount || 0), 0);
                const outflow = numTxs.filter(t => t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund').reduce((s, t) => s + (t.amount || 0), 0);
                num.currentBalance = inflow - outflow;
              }
            });
          }
        });

        setOperatingWallets(opList);
        if (opList.length > 0) {
          setSelectedOperatingWalletId(opList[0].id);
          const activeNums = (opList[0].numbers || []).filter((n: any) => n.status !== 'frozen');
          const preferredNum = activeNums.find((n: any) => n.isPrimary) || activeNums[0];
          if (preferredNum) {
            setSelectedNumberId(preferredNum.id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const numAmountUSD = parseFloat(amountUSD) || 0;
  const numRateEGP = parseFloat(rateEGP) || 0;
  const totalCostEGP = numAmountUSD * numRateEGP;

  const selectedOpWallet = operatingWallets.find(w => w.id === selectedOperatingWalletId);
  const availableNumbers = (selectedOpWallet?.numbers || []).filter((n: any) => n.status !== 'frozen');
  const selectedLine = availableNumbers.find((n: any) => n.id === selectedNumberId) 
    || availableNumbers.find((n: any) => n.isPrimary) 
    || availableNumbers[0];

  const selectedLineBalance = selectedLine?.currentBalance !== undefined
    ? selectedLine.currentBalance
    : (selectedLine?.balance ?? selectedOpWallet?.balance ?? 0);

  // Insufficient balance flags
  const isVaultUsdInsufficient =
    (source === 'main_vault_usd' && mainVaultSummary.balanceUSD < numAmountUSD) ||
    (source === 'dealer_vault_usd' && dealerVaultSummary.balanceUSD < numAmountUSD);

  const isVaultEgpInsufficient =
    (source === 'main_vault' && mainVaultSummary.balanceEGP < totalCostEGP) ||
    (source === 'dealer_vault' && dealerVaultSummary.balanceEGP < totalCostEGP);

  const isLineBalanceInsufficient = source === 'operating_wallet' && Boolean(selectedLine && selectedLineBalance < totalCostEGP && (selectedOpWallet?.balance ?? 0) < totalCostEGP);
  const isOpWalletInsufficient = source === 'operating_wallet' && Boolean(selectedOpWallet && selectedOpWallet.balance < totalCostEGP);

  const isSubmitDisabled =
    isSubmitting ||
    numAmountUSD <= 0 ||
    numRateEGP <= 0 ||
    isVaultUsdInsufficient ||
    isVaultEgpInsufficient ||
    isLineBalanceInsufficient ||
    isOpWalletInsufficient;

  const handleWalletChange = (newWalletId: string) => {
    setSelectedOperatingWalletId(newWalletId);
    const targetWallet = operatingWallets.find(w => w.id === newWalletId);
    const activeNums = (targetWallet?.numbers || []).filter((n: any) => n.status !== 'frozen');
    const preferredNum = activeNums.find((n: any) => n.isPrimary) || activeNums[0];
    if (preferredNum) {
      setSelectedNumberId(preferredNum.id);
    } else {
      setSelectedNumberId('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet) return;

    if (numAmountUSD <= 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ بالدولار أكبر من الصفر');
      return;
    }
    if (numRateEGP <= 0) {
      showToast('error', 'سعر صرف غير صالح', 'يرجى إدخال سعر دولار صحيح');
      return;
    }

    if (source === 'main_vault_usd' && mainVaultSummary.balanceUSD < numAmountUSD) {
      showToast('error', 'رصيد الدولار غير كافٍ', `رصيد الدولار بالخزنة الرئيسية ($${mainVaultSummary.balanceUSD.toFixed(2)}) غير كافٍ لمبلغ $${numAmountUSD.toFixed(2)}`);
      return;
    }

    if (source === 'dealer_vault_usd' && dealerVaultSummary.balanceUSD < numAmountUSD) {
      showToast('error', 'رصيد الدولار غير كافٍ', `رصيد الدولار بخزنة التجار ($${dealerVaultSummary.balanceUSD.toFixed(2)}) غير كافٍ لمبلغ $${numAmountUSD.toFixed(2)}`);
      return;
    }

    if (source === 'main_vault' && mainVaultSummary.balanceEGP < totalCostEGP) {
      showToast('error', 'رصيد الخزنة غير كافٍ', `رصيد الخزنة الرئيسية (${formatCurrency(mainVaultSummary.balanceEGP)}) غير كافٍ لتمويل مبلغ ${formatCurrency(totalCostEGP)}`);
      return;
    }

    if (source === 'dealer_vault' && dealerVaultSummary.balanceEGP < totalCostEGP) {
      showToast('error', 'رصيد الخزنة غير كافٍ', `رصيد خزنة التجار (${formatCurrency(dealerVaultSummary.balanceEGP)}) غير كافٍ لتمويل مبلغ ${formatCurrency(totalCostEGP)}`);
      return;
    }

    if (source === 'operating_wallet') {
      if (!selectedOpWallet) {
        showToast('error', 'محفظة غير محددة', 'يرجى اختيار محفظة التشغيل');
        return;
      }
      if (selectedOpWallet.balance < totalCostEGP) {
        showToast('error', 'رصيد المحفظة غير كافٍ', `رصيد المحفظة (${formatCurrency(selectedOpWallet.balance)}) غير كافٍ لتمويل مبلغ ${formatCurrency(totalCostEGP)}`);
        return;
      }
      if (selectedLine && selectedLineBalance < totalCostEGP && (selectedOpWallet?.balance ?? 0) < totalCostEGP) {
        showToast(
          'error',
          'عملية مرفوضة: رصيد المحفظة غير كافٍ ⛔',
          `رصيد المحفظة والخط (${selectedLine.phoneNumber}: ${formatCurrency(selectedLineBalance)}) لا يكفي لتنفيذ التحويل (${formatCurrency(totalCostEGP)}). يرجى شحن الرصيد أولاً.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const effectiveNumberId = selectedNumberId || selectedLine?.id || undefined;
      const result = JKRWalletEngine.fundMainWallet({
        walletId: wallet.id,
        amountUSD: numAmountUSD,
        rateEGP: numRateEGP,
        source,
        operatingWalletId: source === 'operating_wallet' ? selectedOperatingWalletId : undefined,
        walletNumberId: source === 'operating_wallet' ? effectiveNumberId : undefined,
        externalType: externalType.trim() || undefined,
        notes: notes.trim() || undefined
      }, user);

      const sourceDescription =
        source === 'main_vault_usd' ? 'خصماً من رصيد الدولار بالخزنة الرئيسية' :
        source === 'dealer_vault_usd' ? 'خصماً من رصيد الدولار بخزنة التجار' :
        source === 'main_vault' ? 'خصماً من رصيد الجنيه بالخزنة الرئيسية' :
        source === 'dealer_vault' ? 'خصماً من رصيد الجنيه بخزنة التجار' :
        source === 'direct_usd_deposit' ? 'إيداع نقدي مباشر بالدولار' :
        'خصماً من محفظة التشغيل';

      showToast(
        'success',
        'تم تمويل المحفظة بنجاح',
        `تم إضافة شحنة $${result.lot.initialQuantity.toLocaleString()} بسعر ${numRateEGP} ج (${formatCurrency(totalCostEGP)}) ${sourceDescription} مع إنشاء Lot #${result.lot.lotNumber}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'فشل التمويل', err.message || 'حدث خطأ أثناء تمويل المحفظة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !wallet) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💵 تمويل المحفظة الرئيسية [${wallet?.name || ''}] (${effectiveDepartment === 'dealers' ? 'قسم التجار' : 'قسم الزبائن'})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs">
        {/* Wallet Balance Header */}
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-zinc-400 block">رصيد المحفظة الحالي:</span>
            <strong className="text-base font-black text-blue-500">
              ${(wallet.balanceUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </strong>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-zinc-400 block">التقييم بالجنيه:</span>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(wallet.balanceEGP || 0)}
            </span>
          </div>
        </div>

        {/* Inputs: Amount USD & EGP Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              المبلغ الممول بالدولار (USD) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amountUSD}
                onChange={e => setAmountUSD(e.target.value)}
                placeholder="50"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-blue-500/40 p-2.5 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-sm"
              />
              <span className="absolute left-2.5 top-2.5 text-blue-500 font-bold">$</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-zinc-800 dark:text-zinc-200">
                سعر شراء الدولار (EGP/USD) *
              </label>
              {activeVault.avgUsdPurchaseRate > 0 && (
                <button
                  type="button"
                  onClick={() => setRateEGP(activeVault.avgUsdPurchaseRate.toFixed(2))}
                  className="text-[10px] text-blue-500 hover:text-blue-600 underline font-mono flex items-center gap-0.5"
                  title="استخدام متوسط سعر الدولار المسجل بالخزنة"
                >
                  <Sparkles className="w-3 h-3" /> متوسط الخزنة: {activeVault.avgUsdPurchaseRate.toFixed(2)}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={rateEGP}
                onChange={e => setRateEGP(e.target.value)}
                placeholder="50.25"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold text-sm"
              />
              <span className="absolute left-2.5 top-2.5 text-zinc-400 font-bold text-xs">ج</span>
            </div>
          </div>
        </div>

        {/* Calculated Total EGP Box */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 text-zinc-500">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="font-bold">إجمالي تكلفة الـ Lot المحسوبة بالجنيه:</span>
          </div>
          <strong className="text-sm font-black text-emerald-500">
            {formatCurrency(totalCostEGP)}
          </strong>
        </div>

        {/* Funding Source Selection */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            طريقة ومصدر التمويل والإيداع *
          </label>
          <select
            value={source}
            onChange={e => setSource(e.target.value as JKRFundingSource)}
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
          >
            {effectiveDepartment === 'dealers' ? (
              <>
                <option value="dealer_vault_usd">
                  💵 سحب من رصيد الدولار بخزنة التجار (المتاح: ${dealerVaultSummary.balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                </option>
                <option value="dealer_vault">
                  💰 سحب من رصيد الجنيه بخزنة التجار (المتاح: {formatCurrency(dealerVaultSummary.balanceEGP)})
                </option>
              </>
            ) : (
              <>
                <option value="main_vault_usd">
                  💵 سحب من رصيد الدولار بالخزنة الرئيسية (المتاح: ${mainVaultSummary.balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                </option>
                <option value="main_vault">
                  💰 سحب من رصيد الجنيه بالخزنة الرئيسية (المتاح: {formatCurrency(mainVaultSummary.balanceEGP)})
                </option>
              </>
            )}
            <option value="direct_usd_deposit">
              📥 إيداع نقدي مباشر بالدولار (شحن فوري مباشر بدون سحب من الخزنة)
            </option>
            <option value="operating_wallet">
              📱 تمويل من محفظة التشغيل (فودافون كاش / إنستاباي)
            </option>
            <option value="external_debt">تمويل خارجي: دين / آجل (مورد أو جهة دائنة)</option>
            <option value="external_capital">تمويل خارجي: رأس مال (ضخ استثمار / شريك)</option>
            <option value="profits_wallet">تحويل من محفظة الأرباح</option>
            <option value="accounting_adjustment">تعديل محاسبي / تسوية</option>
            <option value="external_other">تمويل خارجي: أخرى</option>
          </select>
        </div>

        {/* Details for USD Vault Funding */}
        {(source === 'main_vault_usd' || source === 'dealer_vault_usd') && (
          <div className="space-y-3 bg-blue-50/70 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {source === 'main_vault_usd' ? 'الخزنة الرئيسية (كاش الدولار)' : 'خزنة التجار (كاش الدولار)'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  سيتم خصم مبلغ <strong className="text-blue-500">${numAmountUSD.toFixed(2)} USD</strong> مباشرة من رصيد الدولار بالخزنة، مع تقييم الـ Lot بسعر الصرف المحدد.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] font-mono text-xs">
              <div>
                <span className="text-[11px] text-zinc-400 block">رصيد الدولار المتاح بالخزنة:</span>
                <strong className={`text-sm font-black ${(source === 'main_vault_usd' ? mainVaultSummary.balanceUSD : dealerVaultSummary.balanceUSD) >= numAmountUSD ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ${(source === 'main_vault_usd' ? mainVaultSummary.balanceUSD : dealerVaultSummary.balanceUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">متوسط شراء الدولار بالخزنة:</span>
                <strong className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {(source === 'main_vault_usd' ? mainVaultSummary.avgUsdPurchaseRate : dealerVaultSummary.avgUsdPurchaseRate) > 0
                    ? `${(source === 'main_vault_usd' ? mainVaultSummary.avgUsdPurchaseRate : dealerVaultSummary.avgUsdPurchaseRate).toFixed(2)} ج.م`
                    : 'غير محدد'}
                </strong>
              </div>
            </div>

            {isVaultUsdInsufficient && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>⛔ <strong>رصيد غير كافٍ:</strong> رصيد الدولار بالخزنة (${(source === 'main_vault_usd' ? mainVaultSummary.balanceUSD : dealerVaultSummary.balanceUSD).toFixed(2)}) أقل من المبلغ المطلوب ($${numAmountUSD.toFixed(2)}).</span>
              </div>
            )}
          </div>
        )}

        {/* Details for EGP Vault Funding */}
        {(source === 'main_vault' || source === 'dealer_vault') && (
          <div className="space-y-3 bg-emerald-50/70 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {source === 'main_vault' ? 'الخزنة الرئيسية (كاش الجنيه)' : 'خزنة التجار (كاش الجنيه)'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  سيتم خصم القيمة الإجمالية بالجنيه ({formatCurrency(totalCostEGP)}) من رصيد الخزنة بالجنيه.
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] font-mono">
              <span className="text-xs text-zinc-500">الرصيد المتاح بالجنيه:</span>
              <strong className={`text-sm font-black ${!isVaultEgpInsufficient ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(source === 'main_vault' ? mainVaultSummary.balanceEGP : dealerVaultSummary.balanceEGP)}
              </strong>
            </div>
            {isVaultEgpInsufficient && totalCostEGP > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>⛔ <strong>رصيد غير كافٍ:</strong> رصيد الخزنة بالجنيه ({formatCurrency(source === 'main_vault' ? mainVaultSummary.balanceEGP : dealerVaultSummary.balanceEGP)}) أقل من تكلفة التمويل ({formatCurrency(totalCostEGP)}).</span>
              </div>
            )}
          </div>
        )}

        {/* Direct USD Deposit Info Box */}
        {source === 'direct_usd_deposit' && (
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-500/5 rounded-2xl border border-blue-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
              <DollarSign className="w-4 h-4" />
              <span>إيداع نقدي مباشر بالدولار للمحفظة</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              سيتم شحن رصيد المحفظة مباشرة بمبلغ <strong className="text-blue-500 font-mono font-bold">${numAmountUSD.toFixed(2)} USD</strong> وتكوين Lot بقيمة <strong className="text-emerald-500 font-mono font-bold">{formatCurrency(totalCostEGP)}</strong> دون الخصم من الخزينة أو محافظ التشغيل.
            </p>
          </div>
        )}

        {/* Operating Wallet Box */}
        {source === 'operating_wallet' && (
          <div className="space-y-3 bg-gray-50/70 dark:bg-[#141417] p-3 rounded-2xl border border-gray-200 dark:border-[#27272A]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-zinc-800 dark:text-zinc-200">
                  محفظة التشغيل للخصم منها (المصدر) *
                </label>
                {selectedOpWallet && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    الرصيد المتاح: <strong className={selectedOpWallet.balance >= totalCostEGP ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>{formatCurrency(selectedOpWallet.balance, selectedOpWallet.currency)}</strong>
                  </span>
                )}
              </div>
              <select
                value={selectedOperatingWalletId}
                onChange={e => handleWalletChange(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
              >
                {operatingWallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.category || 'تشغيل'}) — الرصيد: {formatCurrency(w.balance, w.currency)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-number / Phone line selection inside the wallet */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  رقم / خط المحفظة المسحوب منه (الخطوط المسجلة) *
                </label>
                {selectedLine && selectedLine.currentBalance !== undefined && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    رصيد الخط: <strong className={selectedLineBalance >= totalCostEGP ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>{formatCurrency(selectedLine.currentBalance)}</strong>
                  </span>
                )}
              </div>
              <select
                value={selectedNumberId || selectedLine?.id || ''}
                onChange={e => setSelectedNumberId(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold font-mono"
              >
                {availableNumbers.length > 0 ? (
                  availableNumbers.map((n: any) => (
                    <option key={n.id} value={n.id}>
                      📱 {n.phoneNumber} — {n.accountHolderName || 'بدون اسم'} {n.currentBalance !== undefined ? `(الرصيد: ${formatCurrency(n.currentBalance)})` : ''} {n.isPrimary ? '★ [المفضل]' : ''}
                    </option>
                  ))
                ) : (
                  <option value="">
                    {selectedOpWallet?.accountNumber ? `📱 ${selectedOpWallet.accountNumber} (الحساب الأساسي للمحفظة)` : 'الحساب الأساسي الافتراضي للمحفظة'}
                  </option>
                )}
              </select>

              {/* Insufficient line balance warning banner */}
              {isLineBalanceInsufficient && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>⛔ <strong>العملية مرفوضة:</strong> رصيد الخط المختار ({formatCurrency(selectedLineBalance)}) غير كافٍ لسحب ({formatCurrency(totalCostEGP)}).</span>
                </div>
              )}

              {availableNumbers.length > 0 && selectedLine && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-black/30 p-2 rounded-xl border border-gray-100 dark:border-[#27272A]">
                  <div>
                    اسم صاحب الخط: <strong className="text-zinc-800 dark:text-zinc-200">{selectedLine.accountHolderName || 'غير مسجل'}</strong>
                  </div>
                  <div>
                    المتبقي من حد الإرسال الشهري: <strong className="text-blue-500 font-mono font-bold">
                      {formatCurrency(Math.max(0, (selectedLine.monthlySendLimit || selectedLine.monthlyLimit || 0) - (selectedLine.monthlySent || selectedLine.monthlyWithdrawn || 0)))}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(source === 'external_debt' || source === 'external_capital' || source === 'external_other') && (
          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              اسم الجهة / الشخص الممول
            </label>
            <input
              type="text"
              value={externalType}
              onChange={e => setExternalType(e.target.value)}
              placeholder="مثال: المورد محمد علي أو الشريك فلان"
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            ملاحظات وسند العملية
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="رقم الحوالة، اسم منصة الشراء، أو أي تفاصيل للتدقيق..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant={isSubmitDisabled ? 'outline' : 'primary'}
            size="sm"
            disabled={isSubmitDisabled}
            icon={<ArrowDownRight className="w-4 h-4" />}
            className={isSubmitDisabled ? 'opacity-50 cursor-not-allowed text-rose-400 border-rose-500/40' : ''}
          >
            {isVaultUsdInsufficient
              ? 'رصيد الدولار بالخزنة غير كافٍ ⛔'
              : isVaultEgpInsufficient
              ? 'رصيد الجنيه بالخزنة غير كافٍ ⛔'
              : isLineBalanceInsufficient
              ? 'رصيد الخط غير كافٍ ⛔'
              : isOpWalletInsufficient
              ? 'رصيد المحفظة غير كافٍ ⛔'
              : 'تأكيد الإيداع وإنشاء Lot'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
