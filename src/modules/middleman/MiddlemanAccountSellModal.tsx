// =============================================================
// NZM JKR TOP UP ERP — Sell Account Asset Workflow Modal
// =============================================================

import React, { useState, useMemo } from 'react';
import { GameAccountAsset, AccountSaleRecord } from '../../types/middleman.types';
import { Customer } from '../../types/customer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { MiddlemanInvoiceModal } from './MiddlemanInvoiceModal';
import {
  Gamepad2,
  DollarSign,
  User,
  UserPlus,
  ShoppingBag,
  CheckCircle2,
  Search,
  Printer,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface MiddlemanAccountSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: GameAccountAsset | null;
  onSoldSuccess: (soldAccount: GameAccountAsset) => void;
}

export const MiddlemanAccountSellModal: React.FC<MiddlemanAccountSellModalProps> = ({
  isOpen,
  onClose,
  account: initialAccount,
  onSoldSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Load available accounts with positive quantity only
  const allAccounts = useMemo(() => {
    return db.getMiddlemanAccounts('available').filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold');
  }, [isOpen]);

  // Active (non-frozen) customers only
  const activeCustomers = useMemo(() => {
    return db.getMiddlemanClients().filter(c => !c.isFrozen && c.status !== 'frozen' && c.status !== 'suspended');
  }, [isOpen]);

  // Selected Account State
  const [selectedAccount, setSelectedAccount] = useState<GameAccountAsset | null>(() => {
    if (initialAccount && (initialAccount.availableQuantity === undefined || initialAccount.availableQuantity > 0) && initialAccount.status !== 'sold') {
      return initialAccount;
    }
    return allAccounts[0] || null;
  });
  const [accountSearch, setAccountSearch] = useState(
    initialAccount ? `${initialAccount.title} (${initialAccount.accountCode})` : (allAccounts[0] ? `${allAccounts[0].title} (${allAccounts[0].accountCode})` : '')
  );

  // Buyer State
  const [buyerSearch, setBuyerSearch] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<Customer | null>(null);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  // Financials State
  const [salePriceEGP, setSalePriceEGP] = useState<number>(selectedAccount?.expectedSellingPriceEGP || 2000);
  const [paymentMethod, setPaymentMethod] = useState('فودافون كاش');
  const [saleNotes, setSaleNotes] = useState('');

  // Invoice State post-sale
  const [soldAccountForInvoice, setSoldAccountForInvoice] = useState<GameAccountAsset | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Matching Accounts (Active Stock Only)
  const matchingAccounts = accountSearch && (!selectedAccount || !accountSearch.includes(selectedAccount.accountCode))
    ? allAccounts.filter(a =>
        a.title.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.accountCode.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.gameName.toLowerCase().includes(accountSearch.toLowerCase()) ||
        (a.accountIdentifier && a.accountIdentifier.includes(accountSearch))
      ).slice(0, 5)
    : [];

  // Matching Buyers (Active Customers Only)
  const matchingBuyers = buyerSearch && (!selectedBuyer || !buyerSearch.includes(selectedBuyer.name))
    ? activeCustomers.filter(c => c.name.toLowerCase().includes(buyerSearch.toLowerCase()) || c.phone.includes(buyerSearch)).slice(0, 5)
    : [];

  const handleSelectAccount = (acc: GameAccountAsset) => {
    setSelectedAccount(acc);
    setAccountSearch(`${acc.title} (${acc.accountCode})`);
    setSalePriceEGP(acc.expectedSellingPriceEGP || acc.purchaseCostEGP * 1.3);
  };

  const handleQuickCustomerSave = (custData: Partial<Customer>) => {
    const newCust = {
      ...custData,
      id: `brk_cust_${Date.now()}`,
      code: `BRK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Customer;
    db.saveMiddlemanClient(newCust, { id: user?.id, name: user?.fullName, role: user?.role });
    setSelectedBuyer(newCust);
    setBuyerSearch(`${newCust.name} (${newCust.phone})`);
    setIsQuickCustomerOpen(false);
    showToast('success', 'تم تسجيل المشتري', `تم ربط المشتري "${newCust.name}" بنجاح`);
  };

  const netProfitEGP = useMemo(() => {
    if (!selectedAccount) return 0;
    return Math.round((salePriceEGP - (selectedAccount.purchaseCostEGP || 0)) * 100) / 100;
  }, [selectedAccount, salePriceEGP]);

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      showToast('error', 'الحساب مطلوب', 'يرجى اختيار الحساب المراد بيعه');
      return;
    }

    // Strict Out-of-Stock Check
    if ((selectedAccount.availableQuantity !== undefined && selectedAccount.availableQuantity <= 0) || selectedAccount.status === 'sold') {
      showToast('error', 'غير متاح للبيع', 'هذا الحساب غير متاح للبيع (نفدت الكمية المتوفرة).');
      return;
    }

    if (!selectedBuyer) {
      showToast('error', 'المشتري مطلوب', 'يرجى تحديد المشتري من قائمة العملاء أو إضافة عميل جديد');
      return;
    }

    // Freeze check
    if (selectedBuyer.isFrozen || selectedBuyer.status === 'frozen' || selectedBuyer.status === 'suspended') {
      showToast('error', 'حساب مجمد', `حساب المشتري (${selectedBuyer.name}) مجمد أو معلق في النظام ولا يمكن البيع له.`);
      return;
    }

    if (salePriceEGP <= 0) {
      showToast('error', 'سعر البيع غير صحيح', 'سعر البيع يجب أن يكون أكبر من الصفر');
      return;
    }

    const saleRecord: AccountSaleRecord = {
      soldAt: new Date().toISOString(),
      buyerId: selectedBuyer.id,
      buyerName: selectedBuyer.name,
      buyerPhone: selectedBuyer.phone,
      salePriceEGP,
      purchaseCostEGP: selectedAccount.purchaseCostEGP,
      netProfitEGP,
      soldBy: user?.fullName || 'المدير العام',
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      paymentMethod,
      notes: saleNotes.trim() || undefined
    };

    const res = db.sellMiddlemanAccount(selectedAccount.id, saleRecord, {
      id: user?.id,
      name: user?.fullName,
      role: user?.role
    });

    if (res.success && res.account) {
      showToast('success', 'تمت عملية البيع بنجاح 🎉', res.message || `تم بيع الحساب #${selectedAccount.accountCode} وتوريد الأرباح للخزينة`);
      onSoldSuccess(res.account);
      onClose();
    } else {
      showToast('error', 'فشلت العملية', res.message || 'هذا الحساب غير متاح للبيع.');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isInvoiceOpen}
        onClose={onClose}
        title="بيع حساب وتسليم بيانات الأصل (Sell Account Asset)"
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmSale} className="space-y-4 text-right text-xs" dir="rtl">
          {/* 1. Account Selection Card */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] relative">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-amber-500" /> ١. اختيار الحساب المراد بيعه من المخزن *
              </span>
              <Badge variant="warning" size="sm">{allAccounts.length} حسابات متاحة</Badge>
            </div>

            <div className="relative">
              <Input
                placeholder="ابحث باسم الحساب، الكود (ACC-XXXX)، اللعبة، أو المعرف..."
                value={accountSearch}
                onChange={e => {
                  setAccountSearch(e.target.value);
                  if (selectedAccount && !e.target.value.includes(selectedAccount.accountCode)) {
                    setSelectedAccount(null);
                  }
                }}
                icon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
              />

              {matchingAccounts.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-[#27272A]">
                  {matchingAccounts.map(acc => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="p-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-500 font-mono text-xs">#{acc.accountCode}</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{acc.title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">{acc.gameName} • التكلفة: {formatCurrency(acc.purchaseCostEGP)}</span>
                      </div>
                      <Badge variant="warning" size="sm">اختيار</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Account Summary Preview */}
            {selectedAccount && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-zinc-900 dark:text-zinc-100 text-sm">
                    {selectedAccount.title}
                  </span>
                  <Badge variant="success" size="sm">متاح للبيع</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
                  <div className="p-1.5 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-[10px] text-zinc-400 block">اللعبة</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedAccount.gameName}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-[10px] text-zinc-400 block">تكلفة الشراء</span>
                    <span className="font-bold text-rose-500">{formatCurrency(selectedAccount.purchaseCostEGP)}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-[10px] text-zinc-400 block">المستوى / الرانك</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedAccount.accountLevel || '—'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/50 dark:bg-black/30">
                    <span className="text-[10px] text-zinc-400 block">التقييم</span>
                    <span className="font-bold text-amber-600">{selectedAccount.rating}</span>
                  </div>
                </div>

                {selectedAccount.securityDetails && (
                  <div className="text-[10px] text-zinc-500 bg-white/40 dark:bg-black/20 p-2 rounded-lg">
                    🔒 تفاصيل الأمان والروابط: {selectedAccount.securityDetails}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 2. Buyer Linkage Card */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] relative">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-500" /> ٢. تحديد المشتري المستلم *
              </span>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(true)}
                className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3 h-3" /> عميل جديد
              </button>
            </div>

            <div className="relative">
              <Input
                placeholder="ابحث باسم المشتري أو رقم الهاتف..."
                value={buyerSearch}
                onChange={e => {
                  setBuyerSearch(e.target.value);
                  if (selectedBuyer) setSelectedBuyer(null);
                }}
                icon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
              />

              {matchingBuyers.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-[#27272A]">
                  {matchingBuyers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedBuyer(c);
                        setBuyerSearch(`${c.name} (${c.phone})`);
                      }}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                      </div>
                      <Badge variant="info" size="sm">اختيار</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedBuyer && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-[11px]">
                <span className="font-bold text-blue-600 dark:text-blue-400">✓ المشتري: {selectedBuyer.name}</span>
                <span className="font-mono text-zinc-400">{selectedBuyer.phone}</span>
              </div>
            )}
          </Card>

          {/* 3. Sale Price & Net Profit */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" /> ٣. القيمة المحصلة وصافي الربح
              </span>
              <Badge variant="success" size="sm">تحصيل بالخزينة</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="سعر البيع الفعلي المحصل (ج) *"
                type="number"
                step="any"
                value={salePriceEGP}
                onChange={e => setSalePriceEGP(parseFloat(e.target.value) || 0)}
                required
              />

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">طريقة التحويل / الدفع:</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 font-bold focus:outline-none"
                >
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="إنستاباي (InstaPay)">إنستاباي (InstaPay)</option>
                  <option value="خزينة نقدية (كاش)">خزينة نقدية (كاش)</option>
                  <option value="USDT">USDT (محفظة رقمية)</option>
                  <option value="حوالة بنكية">حوالة بنكية</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="ملاحظات تسليم الحساب وفك الروابط"
                  placeholder="تم تغيير كلمة السر، تسليم الإيميل الأساسي، والتأكد من فتح الحساب..."
                  value={saleNotes}
                  onChange={e => setSaleNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Profit Card */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between font-mono">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                صافي الربح المحقق للشركة من بيع الحساب:
              </span>
              <span className="text-base font-black text-emerald-500">
                +{formatCurrency(netProfitEGP)}
              </span>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button variant="secondary" type="button" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={<ShoppingBag className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              تأكيد البيع وإصدار الفاتورة
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer */}
      {isQuickCustomerOpen && (
        <CustomerFormModal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          onSave={handleQuickCustomerSave}
          moduleContext="middleman"
        />
      )}

      {/* Invoice Modal post-sale */}
      {isInvoiceOpen && soldAccountForInvoice && (
        <MiddlemanInvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => {
            setIsInvoiceOpen(false);
            onClose();
          }}
          account={soldAccountForInvoice}
        />
      )}
    </>
  );
};
