import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { DailyClosureReport } from '../../../types/finance.types';
import { formatCurrency } from '../../../utils/formatters';
import {
  CalendarCheck,
  Printer,
  ShieldCheck
} from 'lucide-react';

interface DealerDailySettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettlementSaved?: () => void;
}

export const DealerDailySettlementModal: React.FC<DealerDailySettlementModalProps> = ({
  isOpen,
  onClose,
  onSettlementSaved
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [notes, setNotes] = useState('');
  const [actualCashEGP, setActualCashEGP] = useState<string>('');
  const [actualCashUSD, setActualCashUSD] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];
  const summary = useMemo(() => db.getDealerMainVaultSummary(), [isOpen]);
  const safeTxs = useMemo(() => db.getDealerSafeTransactions(), [isOpen]);

  // Today's dealer transactions
  const todaysTxs = useMemo(() => {
    return safeTxs.filter(t => t.createdAt.startsWith(today));
  }, [safeTxs, today]);

  const todayIncomeEGP = useMemo(() => {
    return todaysTxs
      .filter(t => t.currency !== 'USD' && (t.type === 'cash_in' || (t.type === 'settlement' && t.amount >= 0)))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [todaysTxs]);

  const todayExpensesEGP = useMemo(() => {
    return todaysTxs
      .filter(t => t.currency !== 'USD' && (t.type === 'cash_out' || (t.type === 'settlement' && t.amount < 0)))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [todaysTxs]);

  const todayUSDIn = useMemo(() => {
    return todaysTxs
      .filter(t => t.currency === 'USD' && t.type === 'cash_in')
      .reduce((sum, t) => sum + (t.usdAmount || t.amount), 0);
  }, [todaysTxs]);

  const todayUSDOut = useMemo(() => {
    return todaysTxs
      .filter(t => t.currency === 'USD' && t.type === 'cash_out')
      .reduce((sum, t) => sum + (t.usdAmount || t.amount), 0);
  }, [todaysTxs]);

  const todayExchangeEGPNet = useMemo(() => {
    return todaysTxs
      .filter(t => t.type === 'exchange')
      .reduce((sum, t) => {
        const egp = t.egpAmount || t.amount;
        return t.exchangeType === 'sell_usd' ? sum + egp : sum - egp;
      }, 0);
  }, [todaysTxs]);

  const todayExchangeUSDNet = useMemo(() => {
    return todaysTxs
      .filter(t => t.type === 'exchange')
      .reduce((sum, t) => {
        const usd = t.usdAmount || 0;
        return t.exchangeType === 'buy_usd' ? sum + usd : sum - usd;
      }, 0);
  }, [todaysTxs]);

  const handleSaveSettlement = (e: React.FormEvent) => {
    e.preventDefault();

    const report: DailyClosureReport = {
      id: `dealer_closure_${Date.now()}`,
      date: today,
      closedAt: new Date().toISOString(),
      closedBy: user?.fullName || user?.username || 'مسؤول حسابات التجار',
      openingBalanceEGP: summary.balanceEGP - (todayIncomeEGP - todayExpensesEGP + todayExchangeEGPNet),
      closingBalanceEGP: summary.balanceEGP,
      totalIncomeEGP: todayIncomeEGP,
      totalExpensesEGP: todayExpensesEGP,
      netEGP: todayIncomeEGP - todayExpensesEGP,
      openingBalanceUSD: summary.balanceUSD - (todayUSDIn - todayUSDOut + todayExchangeUSDNet),
      closingBalanceUSD: summary.balanceUSD,
      avgUsdPurchaseRate: summary.avgUsdPurchaseRate,
      totalTransactionsCount: todaysTxs.length,
      notes: notes.trim()
        ? notes + (actualCashEGP ? ` | النقد الفعلي المدخل: ${actualCashEGP} ج.م` : '')
        : actualCashEGP
        ? `النقد الفعلي المدخل: ${actualCashEGP} ج.م`
        : undefined
    };

    db.saveDealerDailyClosure(report, user);
    showToast('success', 'تم الإغلاق بنجاح', `تم اعتماد التسوية وحفظ تقرير إغلاق قسم التجار لتاريخ ${today}`);

    if (onSettlementSaved) onSettlementSaved();
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📑 التسوية اليومية وإغلاق خزينة التجار (24 ساعة)"
      maxWidth="2xl"
    >
      <form onSubmit={handleSaveSettlement} className="space-y-4 text-right" dir="rtl">
        {/* Header Alert */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-700 dark:text-amber-400">
              تقرير التسوية والإقفال المحاسبي لخزينة التجار
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              مطابقة الرصيد الدفتري المسجل بخزينة قطاع التجار مع النقدية الفعلية لليوم: {today}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 block">إيرادات اليوم (جنيه)</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
              +{formatCurrency(todayIncomeEGP)}
            </span>
          </Card>

          <Card className="p-3 bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 block">مصروفات اليوم (جنيه)</span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 block mt-1">
              -{formatCurrency(todayExpensesEGP)}
            </span>
          </Card>

          <Card className="p-3 bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 block">صافي حركة اليوم</span>
            <span
              className={`text-sm font-bold block mt-1 ${
                todayIncomeEGP - todayExpensesEGP >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(todayIncomeEGP - todayExpensesEGP)}
            </span>
          </Card>

          <Card className="p-3 bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 block">حركات اليوم</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 block mt-1">
              {todaysTxs.length} حركة
            </span>
          </Card>
        </div>

        {/* Closing Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/25">
            <span className="text-xs text-zinc-500 block">الرصيد الدفتري الحالي (جنيه مصري)</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 block mt-1">
              {formatCurrency(summary.balanceEGP)}
            </span>
            <div className="mt-3">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                النقد الفعلي بالخزينة (ج.م) لمطابقة العجز/الزيادة:
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder={summary.balanceEGP.toString()}
                value={actualCashEGP}
                onChange={e => setActualCashEGP(e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/25">
            <span className="text-xs text-zinc-500 block">الرصيد الدفتري الحالي (دولار أمريكي)</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 block mt-1">
              ${summary.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-1">
              متوسط الشراء: {summary.avgUsdPurchaseRate.toFixed(2)} ج.م / $
            </span>
            <div className="mt-3">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                النقد الفعلي بالدولار ($):
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder={summary.balanceUSD.toString()}
                value={actualCashUSD}
                onChange={e => setActualCashUSD(e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
            ملاحظات الإقفال والتسوية:
          </label>
          <textarea
            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            rows={3}
            placeholder="أدخل أي ملاحظات حول تسوية الوردية لخزنة التجار أو مطابقة الجرد..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            طباعة مسودة التقرير
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<CalendarCheck className="w-4 h-4" />}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              اعتماد وإغلاق الوردية
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DealerDailySettlementModal;
