import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StoreWallet, StoreWalletTransaction } from '../../types/topup.types';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { formatCurrency, formatDateTime, isStoreWalletTxPositive } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  CreditCard,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Download,
  Search,
  CheckCircle2,
  Building,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react';

interface FinanceWalletsProps {
  onOpenDepositVoucher: () => void;
}

export const FinanceWallets: React.FC<FinanceWalletsProps> = ({
  onOpenDepositVoucher
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [wallets, setWallets] = useState<StoreWallet[]>(() => db.getStoreWallets());
  const [transactions, setTransactions] = useState<StoreWalletTransaction[]>(() =>
    db.getStoreWalletTransactions()
  );

  // Filters
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferFees, setTransferFees] = useState<string>('0');
  const [transferNotes, setTransferNotes] = useState('');

  const refreshData = () => {
    setWallets(db.getStoreWallets());
    setTransactions(db.getStoreWalletTransactions(selectedWalletId !== 'all' ? selectedWalletId : undefined));
  };

  useEffect(() => {
    refreshData();
  }, [selectedWalletId]);

  // Aggregate stats
  const totalBalance = useMemo(() => {
    return wallets.filter(w => !w.isSystemWallet).reduce((sum, w) => sum + (w.balance || 0), 0);
  }, [wallets]);

  const systemWalletsBalance = useMemo(() => {
    return wallets.filter(w => w.isSystemWallet).reduce((sum, w) => sum + (w.balance || 0), 0);
  }, [wallets]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (selectedWalletId !== 'all' && t.walletId !== selectedWalletId) {
        return false;
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWallet = t.walletName?.toLowerCase().includes(q);
        const matchesCust = t.customerName?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesRef = t.referenceNumber?.toLowerCase().includes(q);
        const matchesAmount = t.amount?.toString().includes(q);
        if (!matchesWallet && !matchesCust && !matchesDesc && !matchesRef && !matchesAmount) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedWalletId, typeFilter, searchQuery]);

  // Execute Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    const fees = parseFloat(transferFees) || 0;

    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
      showToast('error', 'بيانات غير صحيحة', 'يرجى اختيار محفظتين مختلفتين للتحويل');
      return;
    }
    if (!amt || amt <= 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ تحويل أكبر من صفر');
      return;
    }

    const fromW = wallets.find(w => w.id === fromWalletId);
    if (!fromW || fromW.balance < amt + fees) {
      showToast('error', 'رصيد غير كافٍ', 'رصيد المحفظة المصدر لا يغطي المبلغ والرسوم');
      return;
    }

    const success = db.transferWalletFunds(
      fromWalletId,
      toWalletId,
      amt,
      fees,
      transferNotes.trim() || 'تحويل داخلي بين المحافظ',
      user ? { id: user.id, name: user.fullName || user.username, role: user.role } : undefined
    );

    if (success) {
      showToast('success', 'تم التحويل بنجاح', `تم تحويل ${amt} ج.م بنجاح وتحديث الأرصدة`);
      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferFees('0');
      setTransferNotes('');
      refreshData();
    } else {
      showToast('error', 'فشل التحويل', 'حدث خطأ أثناء تنفيذ عملية التحويل بين المحافظ');
    }
  };

  const isTransactionPositive = (t: StoreWalletTransaction): boolean => {
    return isStoreWalletTxPositive(t);
  };

  const getTxBadge = (type: string, isPos: boolean) => {
    switch (type) {
      case 'deposit':
        return { variant: 'success' as const, label: '📥 إيداع' };
      case 'bond_deposit':
        return { variant: 'success' as const, label: '📦 سند إيداع بضاعة' };
      case 'transfer_in':
        return { variant: 'info' as const, label: '🔄 تحويل وارد' };
      case 'transfer_out':
        return { variant: 'warning' as const, label: '🔄 تحويل صادر' };
      case 'cashback':
        return { variant: isPos ? ('purple' as const) : ('danger' as const), label: isPos ? '✨ كاش باك' : '✨ استبدال كاش باك' };
      case 'compensation':
        return { variant: 'success' as const, label: '🛡️ تعويض مسترد' };
      case 'withdrawal':
        return { variant: 'danger' as const, label: '📤 سحب' };
      case 'purchase':
        return { variant: 'danger' as const, label: '🛒 شراء واستهلاك' };
      case 'refund':
        return { variant: 'danger' as const, label: '↩️ استرداد' };
      case 'loss':
        return { variant: 'danger' as const, label: '⚠️ خسارة' };
      case 'fee':
        return { variant: 'warning' as const, label: '🏷️ رسوم' };
      case 'freeze':
        return { variant: 'info' as const, label: '🔒 تجميد' };
      case 'adjustment':
        return { variant: isPos ? ('success' as const) : ('warning' as const), label: isPos ? '⚖️ تسوية إضافة' : '⚖️ تسوية خصم' };
      default:
        return { variant: isPos ? ('success' as const) : ('danger' as const), label: isPos ? '📥 وارد' : '📤 صادر' };
    }
  };

  const handleExport = () => {
    const data = filteredTransactions.map(t => {
      const isPos = isTransactionPositive(t);
      const badge = getTxBadge(t.type, isPos);
      const absAmount = Math.abs(t.amount || 0);
      return {
        'التاريخ': formatDateTime(t.createdAt),
        'المحفظة': t.walletName,
        'نوع الحركة': badge.label,
        'المبلغ': `${isPos ? '+' : '-'}${absAmount}`,
        'الرصيد بعد الحركة': t.balanceAfter,
        'البيان': t.description,
        'العميل / الطرف': t.customerName || '-',
        'رقم المرجع': t.referenceNumber || '-',
        'الملاحظات': t.notes || '-'
      };
    });
    exportToExcel(data, `حركات_المحافظ_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Header & Balances */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent p-4 rounded-2xl border border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-500 border border-cyan-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                إدارة المحافظ المالية والحسابات البنكية (Financial Wallets & Banking)
              </h2>
              <span className="text-xs text-zinc-400">
                رصد ومتابعة أرصدة فودافون كاش، إنستاباي، الحسابات البنكية، والتحويلات الداخلية
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs cursor-pointer"
          >
            تحديث الأرصدة
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
            className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
          >
            تحويل بين المحافظ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenDepositVoucher}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer"
          >
            سند إيداع معتمد
          </Button>
        </div>
      </div>

      {/* KPI Balances Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-cyan-500/15 via-blue-500/5 to-transparent border-cyan-500/30">
          <span className="text-xs font-bold text-zinc-400 block">إجمالي سيولة المحافظ التقديرية:</span>
          <span className="text-2xl font-black text-cyan-400 block mt-1">
            {formatCurrency(totalBalance, 'EGP')}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            المحافظ التشغيلية النشطة ({wallets.filter(w => !w.isSystemWallet).length} محفظة)
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/15 via-pink-500/5 to-transparent border-purple-500/30">
          <span className="text-xs font-bold text-zinc-400 block">محافظ النظام والأمانات:</span>
          <span className="text-2xl font-black text-purple-400 block mt-1">
            {formatCurrency(systemWalletsBalance, 'EGP')}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            كاش باك، عمولات إحالة، أمانات معلقة
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30">
          <span className="text-xs font-bold text-zinc-400 block">إجمالي حركات المحافظ المسجلة:</span>
          <span className="text-2xl font-black text-emerald-400 block mt-1">
            {transactions.length} حركة
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            إيداعات، سحوبات، وتحويلات بينية
          </span>
        </Card>
      </div>

      {/* Wallets Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-500" />
          المحافظ والحسابات المسجلة في النظام ({wallets.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {wallets.map(w => {
            const isSelected = selectedWalletId === w.id;
            return (
              <Card
                key={w.id}
                onClick={() => setSelectedWalletId(isSelected ? 'all' : w.id)}
                className={`p-3.5 transition-all cursor-pointer border relative overflow-hidden ${
                  isSelected
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/5'
                    : 'border-gray-200 dark:border-[#27272A] hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate max-w-[170px]">
                    {w.name}
                  </span>
                  <Badge
                    variant={w.isSystemWallet ? 'warning' : 'info'}
                    className="text-[9px]"
                  >
                    {w.isSystemWallet ? 'نظامي' : w.type || 'محفظة'}
                  </Badge>
                </div>

                <div className="my-2">
                  <span className="text-[10px] text-zinc-400 block">الرصيد اللحظي:</span>
                  <span className="text-lg font-black text-cyan-400">
                    {formatCurrency(w.balance || 0, w.currency || 'EGP')}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]/60 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>الحساب / الرقم:</span>
                  <span className="font-mono text-zinc-300">{w.accountNumber || '-'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ledger & Transactions Table */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-500" />
              دفتر حركات المحافظ والبنوك (Wallets Ledger)
              {selectedWalletId !== 'all' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  محدد: {wallets.find(w => w.id === selectedWalletId)?.name}
                </span>
              )}
            </h3>
            <span className="text-xs text-zinc-400">
              عدد الحركات المطابقة: {filteredTransactions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
              className="text-xs cursor-pointer"
            >
              تصدير لـ Excel
            </Button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              placeholder="بحث في حركات المحافظ: اسم المحفظة، العميل، البيان، المرجع..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pr-8 text-zinc-900 dark:text-zinc-100 outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="md:col-span-3">
            <SearchableSelect
              options={wallets.map(w => ({
                value: w.id,
                label: w.name,
                badge: `${w.balance || 0} ج.م`,
                icon: <span className="text-xs">💳</span>
              }))}
              value={selectedWalletId}
              onChange={setSelectedWalletId}
              allOptionLabel="جميع المحافظ"
              searchPlaceholder="بحث في المحافظ..."
            />
          </div>

          <div className="md:col-span-3">
            <SearchableSelect
              options={[
                { value: 'deposit', label: 'إيداعات نقدية', icon: <span className="text-xs">📥</span> },
                { value: 'bond_deposit', label: 'سندات إيداع بضاعة FIFO', icon: <span className="text-xs">📦</span> },
                { value: 'withdrawal', label: 'سحوبات نقدية', icon: <span className="text-xs">📤</span> },
                { value: 'transfer_in', label: 'تحويلات واردة', icon: <span className="text-xs">🔄</span> },
                { value: 'transfer_out', label: 'تحويلات صادرة', icon: <span className="text-xs">🔄</span> },
                { value: 'cashback', label: 'حركات كاش باك', icon: <span className="text-xs">✨</span> },
                { value: 'compensation', label: 'تعويضات مستردة', icon: <span className="text-xs">🛡️</span> },
                { value: 'adjustment', label: 'تسويات وأرصدة', icon: <span className="text-xs">⚖️</span> }
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              allOptionLabel="جميع أنواع العمليات"
              searchPlaceholder="بحث في نوع العملية..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">المحفظة</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الرصيد بعدها</th>
                <th className="p-3">البيان والملاحظات</th>
                <th className="p-3">الطرف / العميل</th>
                <th className="p-3">المرجع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    لا توجد حركات مسجلة بالمحفظة المحددة
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isPositive = isTransactionPositive(tx);
                  const badge = getTxBadge(tx.type, isPositive);
                  const displayAmount = Math.abs(tx.amount || 0);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors"
                    >
                      <td className="p-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {tx.walletName}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant={badge.variant}
                          className="text-[10px]"
                        >
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="p-3 font-black whitespace-nowrap">
                        <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                          {isPositive ? '+' : '-'}
                          {formatCurrency(displayAmount, (tx.currency as any) || 'EGP')}
                        </span>
                      </td>
                      <td className="p-3 font-black text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {tx.balanceAfter !== undefined ? formatCurrency(tx.balanceAfter, (tx.currency as any) || 'EGP') : '-'}
                      </td>
                      <td className="p-3 text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      <td className="p-3 text-zinc-400 whitespace-nowrap">
                        {tx.customerName || '-'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {tx.referenceNumber || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Between Wallets Modal */}
      {isTransferModalOpen && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title="🔄 تحويل داخلي بين المحافظ والبنوك"
          subtitle="تحويل رصيد نقدي من محفظة إلى أخرى مع إمكانية إثبات رسوم التحويل"
          maxWidth="md"
        >
          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs text-right">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">من محفظة (المصدر) *</label>
              <SearchableSelect
                options={wallets.filter(w => !w.isSystemWallet).map(w => ({
                  value: w.id,
                  label: w.name,
                  badge: `${w.balance || 0} ج.م`,
                  icon: <span className="text-xs">💳</span>
                }))}
                value={fromWalletId}
                onChange={setFromWalletId}
                allowAll={false}
                required={true}
                placeholder="-- اختر محفظة المصدر --"
                searchPlaceholder="بحث في محفظة المصدر..."
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">إلى محفظة (المستلم) *</label>
              <SearchableSelect
                options={wallets.filter(w => w.id !== fromWalletId).map(w => ({
                  value: w.id,
                  label: w.name,
                  badge: `${w.balance || 0} ج.م`,
                  icon: <span className="text-xs">💳</span>
                }))}
                value={toWalletId}
                onChange={setToWalletId}
                allowAll={false}
                required={true}
                placeholder="-- اختر محفظة المستلم --"
                searchPlaceholder="بحث في محفظة المستلم..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-400 mb-1">مبلغ التحويل (ج.م) *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  required
                  className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-400 mb-1">رسوم التحويل إن وجدت (ج.م)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={transferFees}
                  onChange={e => setTransferFees(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">ملاحظات التحويل / المرجع</label>
              <input
                type="text"
                placeholder="مثال: تغذية رصيد فودافون كاش من الحساب البنكي"
                value={transferNotes}
                onChange={e => setTransferNotes(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button variant="outline" type="button" onClick={() => setIsTransferModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                تأكيد وتنفيذ التحويل
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
