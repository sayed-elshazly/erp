import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StoreWallet, StoreWalletType, WalletNumberItem } from '../../types/topup.types';
import { Wallet, Plus, Trash2, ShieldCheck, DollarSign, Phone, Sparkles, Lock, Unlock } from 'lucide-react';

interface WalletFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: StoreWallet | null;
  onSaved: () => void;
}

export const WalletFormModal: React.FC<WalletFormModalProps> = ({
  isOpen,
  onClose,
  walletToEdit,
  onSaved
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [name, setName] = useState(walletToEdit?.name || '');
  const [type, setType] = useState<StoreWalletType>(walletToEdit?.type || 'operating');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>(walletToEdit?.currency || 'EGP');
  const [balance, setBalance] = useState<number>(walletToEdit?.balance || 0);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(walletToEdit?.monthlyLimit || 200000);
  const [dailyLimit, setDailyLimit] = useState<number>(walletToEdit?.dailyLimit || 30000);
  const [category, setCategory] = useState(walletToEdit?.category || 'محفظة تشغيل كاش');
  const [accountNumber, setAccountNumber] = useState(walletToEdit?.accountNumber || '');
  const [notes, setNotes] = useState(walletToEdit?.notes || '');

  // Numbers list
  const [numbers, setNumbers] = useState<Omit<WalletNumberItem, 'id' | 'walletId' | 'createdAt'>[]>(
    walletToEdit?.numbers?.map(n => ({
      phoneNumber: n.phoneNumber,
      accountHolderName: n.accountHolderName,
      dailyLimit: n.dailyLimit || 30000,
      dailyReceived: n.dailyReceived || 0,
      monthlyLimit: n.monthlyLimit || 200000,
      monthlyReceived: n.monthlyReceived || 0,
      dailySendLimit: n.dailySendLimit || 30000,
      dailySent: n.dailySent || 0,
      monthlySendLimit: n.monthlySendLimit || 200000,
      monthlySent: n.monthlySent || 0,
      totalReceived: n.totalReceived || 0,
      totalSent: n.totalSent || 0,
      operationsCount: n.operationsCount || 0,
      monthlyWithdrawn: n.monthlyWithdrawn || 0,
      currentBalance: n.currentBalance || 0,
      status: n.status,
      isPrimary: n.isPrimary,
      notes: n.notes
    })) || [
      {
        phoneNumber: '01012345678',
        accountHolderName: '',
        dailyLimit: 30000,
        dailyReceived: 0,
        monthlyLimit: 200000,
        monthlyReceived: 0,
        dailySendLimit: 30000,
        dailySent: 0,
        monthlySendLimit: 200000,
        monthlySent: 0,
        totalReceived: 0,
        totalSent: 0,
        operationsCount: 0,
        monthlyWithdrawn: 0,
        currentBalance: 0,
        status: 'active',
        isPrimary: true
      }
    ]
  );

  // New Number input
  const [newPhone, setNewPhone] = useState('');
  const [newHolderName, setNewHolderName] = useState('');
  const [newDailyReceiveLimit, setNewDailyReceiveLimit] = useState<number>(30000);
  const [newMonthlyReceiveLimit, setNewMonthlyReceiveLimit] = useState<number>(200000);
  const [newDailySendLimit, setNewDailySendLimit] = useState<number>(30000);
  const [newMonthlySendLimit, setNewMonthlySendLimit] = useState<number>(200000);

  const handleAddNumber = () => {
    if (!newPhone.trim()) {
      showToast('error', 'رقم الهاتف مطلوب', 'يرجى إدخال رقم الهاتف أو المعرف');
      return;
    }
    setNumbers([
      ...numbers,
      {
        phoneNumber: newPhone.trim(),
        accountHolderName: newHolderName.trim() || `خط استقبال ${numbers.length + 1}`,
        dailyLimit: newDailyReceiveLimit > 0 ? newDailyReceiveLimit : 30000,
        dailyReceived: 0,
        monthlyLimit: newMonthlyReceiveLimit > 0 ? newMonthlyReceiveLimit : 200000,
        monthlyReceived: 0,
        dailySendLimit: newDailySendLimit > 0 ? newDailySendLimit : 30000,
        dailySent: 0,
        monthlySendLimit: newMonthlySendLimit > 0 ? newMonthlySendLimit : 200000,
        monthlySent: 0,
        totalReceived: 0,
        totalSent: 0,
        operationsCount: 0,
        monthlyWithdrawn: 0,
        currentBalance: 0,
        status: 'active',
        isPrimary: numbers.length === 0
      }
    ]);
    setNewPhone('');
    setNewHolderName('');
    setNewDailyReceiveLimit(30000);
    setNewMonthlyReceiveLimit(200000);
    setNewDailySendLimit(30000);
    setNewMonthlySendLimit(200000);
    showToast('success', 'تمت إضافة الرقم', 'تمت إضافة الخط إلى قائمة أرقام المحفظة');
  };

  const handleRemoveNumber = (index: number) => {
    setNumbers(numbers.filter((_, idx) => idx !== index));
  };

  const handleToggleFreezeNumber = (index: number) => {
    const updated = [...numbers];
    const current = updated[index].status;
    updated[index].status = current === 'frozen' ? 'active' : 'frozen';
    setNumbers(updated);
    showToast('info', updated[index].status === 'frozen' ? 'تم تجميد الخط 🔒' : 'تم تفعيل الخط 🟢', 'تم تحديث حالة الخط بنجاح');
  };

  const handleDeleteWallet = () => {
    if (!walletToEdit) return;
    if (
      walletToEdit.isSystemWallet ||
      ['w_cashback', 'w_referrals', 'w_trust', 'w_profits'].includes(walletToEdit.id) ||
      walletToEdit.type === 'profits' ||
      (walletToEdit as any).systemType
    ) {
      showToast('error', 'محفظة نظام محمية', 'لا يمكن حذف محافظ النظام الأساسية لضمان سلامة السجلات المالية');
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف محفظة "${walletToEdit.name}" نهائياً؟\n\nتنبيه: سيتم إزالة المحفظة وكافة أرقامها وبياناتها من النظام. هذه العملية لا يمكن التراجع عنها.`
    );
    if (!confirmed) return;

    const success = db.deleteStoreWallet(walletToEdit.id);
    if (success) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المستخدم', role: user?.role || 'user', department: 'التذاكر والمحافظ' },
        'delete',
        'محفظة تشغيل',
        walletToEdit.id,
        `حذف محفظة: ${walletToEdit.name}`,
        `تم حذف المحفظة نهائياً من شاشة التعديل`
      );
      showToast('success', 'تم حذف المحفظة بنجاح', `تم إزالة محفظة "${walletToEdit.name}" من النظام`);
      onSaved();
      onClose();
    } else {
      showToast('error', 'فشل الحذف', 'تعذر حذف المحفظة، يرجى المحاولة مرة أخرى');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'الاسم مطلوب', 'يرجى كتابة اسم المحفظة');
      return;
    }

    const walletId = walletToEdit?.id || 'w_' + Date.now();
    const formattedNumbers: WalletNumberItem[] = numbers.map((n, idx) => ({
      id: walletToEdit?.numbers?.[idx]?.id || `wnum_${Date.now()}_${idx}`,
      walletId,
      phoneNumber: n.phoneNumber,
      accountHolderName: n.accountHolderName,
      dailyLimit: n.dailyLimit || 30000,
      dailyReceived: n.dailyReceived || 0,
      monthlyLimit: n.monthlyLimit || 200000,
      monthlyReceived: n.monthlyReceived || 0,
      dailySendLimit: n.dailySendLimit || 30000,
      dailySent: n.dailySent || 0,
      monthlySendLimit: n.monthlySendLimit || 200000,
      monthlySent: n.monthlySent || 0,
      totalReceived: n.totalReceived || 0,
      totalSent: n.totalSent || 0,
      operationsCount: n.operationsCount || 0,
      monthlyWithdrawn: n.monthlyWithdrawn || 0,
      currentBalance: n.currentBalance || 0,
      status: n.status || 'active',
      isPrimary: n.isPrimary,
      notes: n.notes,
      createdAt: walletToEdit?.numbers?.[idx]?.createdAt || new Date().toISOString()
    }));

    const primaryNumber = formattedNumbers.find(n => n.isPrimary)?.phoneNumber || formattedNumbers[0]?.phoneNumber || accountNumber;

    const walletData: StoreWallet = {
      id: walletId,
      name: name.trim(),
      type,
      currency,
      balance: Number(balance) || 0,
      monthlyLimit: Number(monthlyLimit) || 200000,
      dailyLimit: Number(dailyLimit) || 30000,
      monthlyIncome: walletToEdit?.monthlyIncome || 0,
      monthlyWithdrawn: walletToEdit?.monthlyWithdrawn || 0,
      totalReceived: walletToEdit?.totalReceived || 0,
      totalWithdrawn: walletToEdit?.totalWithdrawn || 0,
      category: category.trim(),
      accountNumber: primaryNumber || accountNumber.trim() || undefined,
      controlledBy: 'employee_manager',
      allowWithdrawal: type !== 'inventory',
      isFrozen: walletToEdit?.isFrozen || false,
      numbers: formattedNumbers,
      notes: notes.trim() || undefined,
      createdAt: walletToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.saveStoreWallet(
      walletData,
      user ? { id: user.id, name: user.fullName || user.username, role: user.role } : undefined,
      walletToEdit ? 'تعديل بيانات ورصيد المحفظة من إدارة المحافظ' : 'إنشاء محفظة جديدة ورصيد افتتاحي'
    );

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'المستخدم', role: user?.role || 'user', department: 'التذاكر والمحافظ' },
      walletToEdit ? 'edit' : 'add',
      'محفظة تشغيل',
      walletData.id,
      `${walletToEdit ? 'تعديل بيانات' : 'إنشاء'} محفظة: ${walletData.name}`,
      `النوع: ${walletData.type} • الليمت الشهري: ${walletData.monthlyLimit} ${walletData.currency} • عدد الأرقام: ${formattedNumbers.length}`
    );

    showToast('success', walletToEdit ? 'تم تحديث المحفظة' : 'تم إنشاء المحفظة', `تم حفظ بيانات ${walletData.name} بنجاح`);
    onSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={walletToEdit ? `⚙️ تعديل بيانات المحفظة: ${walletToEdit.name}` : '➕ إضافة محفظة استقبال وتشغيل جديدة'}
      subtitle="إدارة بيانات المحفظة والحدود الشهرية واليومية وخطوط الأرقام المعتمدة"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-zinc-400 font-bold mb-1">اسم المحفظة *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: فودافون كاش - تشغيل 2 أو إنستاباي بنك مصر"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-bold mb-1">نوع المحفظة *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as StoreWalletType)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold"
            >
              <option value="operating">🟢 محفظة تشغيل (إرسال واستقبال وسحب)</option>
              <option value="operating">📥 محفظة استقبال (استقبال دفعات التذاكر والعملاء)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-zinc-400 font-bold mb-1">العملة *</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as any)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold font-mono"
            >
              <option value="EGP">EGP (جنيه مصري)</option>
              <option value="USD">USD (دولار أمريكي / USDT)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-bold mb-1">الرصيد الافتتاحي *</label>
            <Input
              type="number"
              value={balance}
              onChange={e => setBalance(Number(e.target.value))}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-bold mb-1">الحد الشهري العام للمحفظة *</label>
            <Input
              type="number"
              value={monthlyLimit}
              onChange={e => setMonthlyLimit(Number(e.target.value))}
              placeholder="200000"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-zinc-400 font-bold mb-1">الحد اليومي العام للمحفظة</label>
            <Input
              type="number"
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              placeholder="30000"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-bold mb-1">تصنيف أو مزود الخدمة</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="مثال: فودافون كاش / إنستاباي / أورنج كاش"
            />
          </div>
        </div>

        {/* Multi Numbers Sub-Section with 4 Independent Limits */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-orange-500" />
              أرقام وخطوط الاستقبال والإرسال ({numbers.length})
            </span>
            <span className="text-[10px] text-zinc-400">تحديد حدود الإرسال والاستقبال اليومية والشهرية لكل رقم</span>
          </div>

          {/* Quick Add Number Form */}
          <div className="space-y-2 bg-white dark:bg-[#18181B] p-3 rounded-xl border border-gray-200 dark:border-[#27272A]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="رقم الهاتف (010... / InstaPay ID)"
              />
              <Input
                value={newHolderName}
                onChange={e => setNewHolderName(e.target.value)}
                placeholder="اسم صاحب الخط (مثال: حسين - خط 1)"
              />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-emerald-500 font-bold mb-0.5">حد استقبال يومي</label>
                <Input
                  type="number"
                  value={newDailyReceiveLimit}
                  onChange={e => setNewDailyReceiveLimit(Number(e.target.value))}
                  placeholder="30000"
                />
              </div>
              <div>
                <label className="block text-[10px] text-emerald-500 font-bold mb-0.5">حد استقبال شهري</label>
                <Input
                  type="number"
                  value={newMonthlyReceiveLimit}
                  onChange={e => setNewMonthlyReceiveLimit(Number(e.target.value))}
                  placeholder="200000"
                />
              </div>
              <div>
                <label className="block text-[10px] text-blue-500 font-bold mb-0.5">حد إرسال يومي</label>
                <Input
                  type="number"
                  value={newDailySendLimit}
                  onChange={e => setNewDailySendLimit(Number(e.target.value))}
                  placeholder="30000"
                />
              </div>
              <div>
                <label className="block text-[10px] text-blue-500 font-bold mb-0.5">حد إرسال شهري</label>
                <Input
                  type="number"
                  value={newMonthlySendLimit}
                  onChange={e => setNewMonthlySendLimit(Number(e.target.value))}
                  placeholder="200000"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddNumber}
              >
                + إضافة الخط للقائمة
              </Button>
            </div>
          </div>

          {/* Numbers List */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {numbers.map((num, idx) => {
              const isFrozen = num.status === 'frozen';
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    isFrozen
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <strong className={`font-mono font-bold ${isFrozen ? 'text-rose-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {num.phoneNumber}
                      </strong>
                      <span className="text-zinc-400 font-sans text-[11px]">({num.accountHolderName})</span>
                      {num.isPrimary && (
                        <span className="px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-500 text-[10px] font-sans font-bold">
                          رئيسي
                        </span>
                      )}
                      {isFrozen && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-sans font-bold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> مجمد
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleFreezeNumber(idx)}
                        className={`p-1 rounded transition-colors ${
                          isFrozen ? 'text-amber-500 hover:bg-amber-500/10' : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title={isFrozen ? 'إلغاء التجميد' : 'تجميد الخط'}
                      >
                        {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveNumber(idx)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="حذف الرقم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Limits Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-[#27272A] text-[10px] font-mono">
                    <div className="bg-emerald-500/5 p-1 rounded border border-emerald-500/20">
                      <span className="text-emerald-500 block font-bold">استقبال يومي</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{num.dailyLimit || 30000} ج</span>
                    </div>
                    <div className="bg-emerald-500/5 p-1 rounded border border-emerald-500/20">
                      <span className="text-emerald-500 block font-bold">استقبال شهري</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{num.monthlyLimit || 200000} ج</span>
                    </div>
                    <div className="bg-blue-500/5 p-1 rounded border border-blue-500/20">
                      <span className="text-blue-500 block font-bold">إرسال يومي</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{num.dailySendLimit || 30000} ج</span>
                    </div>
                    <div className="bg-blue-500/5 p-1 rounded border border-blue-500/20">
                      <span className="text-blue-500 block font-bold">إرسال شهري</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{num.monthlySendLimit || 200000} ج</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 font-bold mb-1">ملاحظات داخلية</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none resize-none"
            placeholder="أي تعليمات أو ملاحظات خاصة بالاستقبال والتحويل..."
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          {walletToEdit && !walletToEdit.isSystemWallet && !['w_cashback', 'w_referrals', 'w_trust', 'w_profits'].includes(walletToEdit.id) && walletToEdit.type !== 'profits' ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDeleteWallet}
              title="حذف المحفظة نهائياً من النظام"
            >
              حذف المحفظة
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" icon={<ShieldCheck className="w-4 h-4" />}>
              {walletToEdit ? 'حفظ التعديلات' : 'إنشاء المحفظة'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
