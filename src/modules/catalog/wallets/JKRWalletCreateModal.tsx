import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet, JKRWalletType } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { Wallet, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface JKRWalletCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (wallet: JKRWallet) => void;
  mainWallets: JKRWallet[];
  department?: 'customers' | 'dealers';
}

export const JKRWalletCreateModal: React.FC<JKRWalletCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  mainWallets,
  department = 'customers'
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  // Filter only active MAIN wallets as funding sources
  const activeMainWallets = mainWallets.filter(w => w.type === 'MAIN' && (w.isActive !== false));

  const [walletType, setWalletType] = useState<JKRWalletType>('SUB');
  const [name, setName] = useState('');
  const [pointType, setPointType] = useState('Free Fire');
  const [parentWalletId, setParentWalletId] = useState('');
  const [alertThreshold, setAlertThreshold] = useState<number>(1000);
  const [safetyLimit, setSafetyLimit] = useState<number>(-500);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Synchronize parentWalletId whenever modal opens or mainWallets change
  useEffect(() => {
    if (isOpen) {
      if (activeMainWallets.length > 0) {
        if (!parentWalletId || !activeMainWallets.some(w => w.id === parentWalletId)) {
          setParentWalletId(activeMainWallets[0].id);
        }
      } else {
        setParentWalletId('');
      }
    }
  }, [isOpen, mainWallets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'خطأ في البيانات', 'يرجى إدخال اسم المحفظة');
      return;
    }

    const effectiveParentId = walletType === 'SUB'
      ? (parentWalletId || (activeMainWallets.length > 0 ? activeMainWallets[0].id : ''))
      : undefined;

    if (walletType === 'SUB' && !effectiveParentId) {
      showToast('error', 'المحفظة الرئيسية مطلوبة', 'يرجى اختيار المحفظة الرئيسية الممولة لهذه المحفظة الفرعية');
      return;
    }

    try {
      // Rule 6: Initial balance is ALWAYS 0. No points or exchange rates in creation!
      const created = JKRWalletEngine.createWallet({
        name: name.trim(),
        type: walletType,
        currency: walletType === 'MAIN' ? 'EGP' : 'USD',
        pointType: walletType === 'SUB' ? pointType : undefined,
        parentWalletId: effectiveParentId,
        alertThreshold: alertThreshold > 0 ? alertThreshold : undefined,
        safetyLimit: walletType === 'SUB' ? safetyLimit : undefined,
        notes: notes.trim() || undefined,
        isActive,
        department
      }, user);

      showToast('success', 'تم إنشاء المحفظة', `تم إنشاء محفظة [${created.name}] برصيد افتتاحي 0 بنجاح. يمكنك الآن تمويلها أو إيداع الرصيد.`);
      onCreated(created);
      onClose();
    } catch (err: any) {
      showToast('error', 'فشل الإنشاء', err.message || 'حدث خطأ أثناء حفظ المحفظة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="➕ إنشاء محفظة جديدة (JKR Wallets)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs">
        {/* Wallet Type Selection */}
        <div>
          <label className="block font-black text-zinc-900 dark:text-zinc-100 mb-2">
            اختر نوع المحفظة *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWalletType('MAIN')}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                walletType === 'MAIN'
                  ? 'bg-blue-500/10 border-blue-500 shadow-xs ring-1 ring-blue-500'
                  : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-blue-500/40'
              }`}
            >
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <strong className="block font-black text-zinc-900 dark:text-zinc-100 text-xs">
                  محفظة رئيسية (MAIN)
                </strong>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  محفظة مالية (بالدولار والجنيه) لتمويل المحافظ الفرعية بـ FIFO دولاري.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setWalletType('SUB')}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                walletType === 'SUB'
                  ? 'bg-orange-500/10 border-orange-500 shadow-xs ring-1 ring-orange-500'
                  : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/40'
              }`}
            >
              <div className="p-2 rounded-xl bg-orange-500/15 text-orange-500 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <strong className="block font-black text-zinc-900 dark:text-zinc-100 text-xs">
                  محفظة فرعية (SUB)
                </strong>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  محفظة مخزون نقاط (Free Fire, PUBG...) ممولة من الرئيسية بـ FIFO نقاط مستقل.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Informational Banner: Rule #6 */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold flex items-center gap-2">
          <span>💡</span>
          <span>
            تنبيه: يتم إنشاء المحفظة دائماً برصيد صفري (Balance = 0). يتم تمويل الأموال أو شراء النقاط لاحقاً عبر زر الإيداع.
          </span>
        </div>

        {/* Common: Wallet Name */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            اسم المحفظة *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={walletType === 'MAIN' ? 'مثال: المحفظة الرئيسية لتمويل الشحن' : 'مثال: Free Fire #1'}
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
          />
        </div>

        {/* MAIN Form Fields */}
        {walletType === 'MAIN' && (
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                العملة الأساسية
              </label>
              <input
                type="text"
                disabled
                value="EGP (جنيه مصري) + دولار أمريكي (USD)"
                className="w-full rounded-xl bg-gray-100 dark:bg-zinc-800/60 border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-500 font-mono font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                حد التنبيه للرصيد المالي (جنيه - اختياري)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={alertThreshold}
                onChange={e => setAlertThreshold(parseFloat(e.target.value) || 0)}
                placeholder="10000"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* SUB Form Fields */}
        {walletType === 'SUB' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  نوع الرصيد / الخدمة *
                </label>
                <select
                  value={pointType}
                  onChange={e => setPointType(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                >
                  <option value="Free Fire">Free Fire (جواهر فري فاير)</option>
                  <option value="PUBG">PUBG (شدات ببجي)</option>
                  <option value="Roblox">Roblox (روبلوكس)</option>
                  <option value="Valorant">Valorant</option>
                  <option value="Google Play">Google Play Cards</option>
                  <option value="iTunes">iTunes Apple</option>
                  <option value="PlayStation">PlayStation Network</option>
                  <option value="أخرى">أخرى (Other Points)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  المحفظة الرئيسية (مصدر التمويل) *
                </label>
                <select
                  value={parentWalletId || (activeMainWallets[0]?.id ?? '')}
                  onChange={e => setParentWalletId(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                  required={walletType === 'SUB'}
                >
                  {activeMainWallets.length === 0 ? (
                    <option value="">لا توجد محفظة رئيسية نشطة (يرجى إنشاء وتفعيل رئيسية أولاً)</option>
                  ) : (
                    activeMainWallets.map(mw => (
                      <option key={mw.id} value={mw.id}>
                        {mw.name} (رصيد متاح: ${mw.balanceUSD || 0})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  حد التنبيه (Alert Threshold) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={alertThreshold}
                  onChange={e => setAlertThreshold(parseFloat(e.target.value) || 0)}
                  placeholder="مثال: 1000 نقطة"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
                <span className="text-[10px] text-zinc-400">
                  يظهر تنبيه للمالك عند وصول الرصيد لهذه النقطة أو أقل.
                </span>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  حد الأمان السالب (Safety Limit) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={safetyLimit}
                  onChange={e => setSafetyLimit(parseFloat(e.target.value) || 0)}
                  placeholder="-500"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-mono text-purple-400 font-bold"
                />
                <span className="text-[10px] text-zinc-400">
                  أقصى حد مسموح بالاستهلاك بالسالب قبل التحويل للبدائل.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            ملاحظات وتفاصيل إضافية (اختياري)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="أي تعليمات أو ملاحظات خاصة بالمحفظة..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>

        {/* Active Toggle */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <strong className="block text-zinc-900 dark:text-zinc-100">حالة تشغيل المحفظة</strong>
            <span className="text-[10px] text-zinc-400">المحفظة المعطلة لا تستهلك أي نقاط في التذاكر</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-500 rounded"
            />
            <span className={isActive ? 'text-emerald-500' : 'text-zinc-400'}>
              {isActive ? 'مفعّلة ونشطة 🟢' : 'معطّلة ⚪'}
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />}>
            تأكيد وإنشاء المحفظة
          </Button>
        </div>
      </form>
    </Modal>
  );
};
