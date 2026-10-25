import React, { useState } from 'react';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Flame,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const AdminAccountSecurityCard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useNotifications();

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Wipe All Data State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeAdminPass, setWipeAdminPass] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  // Wipe Finance Only State
  const [isWipeFinanceModalOpen, setIsWipeFinanceModalOpen] = useState(false);
  const [wipeFinanceAdminPass, setWipeFinanceAdminPass] = useState('');
  const [isWipingFinance, setIsWipingFinance] = useState(false);

  // Only allow admin/owner
  if (currentUser?.role !== 'admin') {
    return null;
  }

  const currentAdminUser = db.getUsers().find(u => u.role === 'admin') || currentUser;

  // Handle Change Admin Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Verify Current Password
    const effectiveStoredPass = currentAdminUser.password || 'admin123';
    const isCurrentValid =
      currentPassword === effectiveStoredPass ||
      (!currentAdminUser.password && (currentPassword === 'admin' || currentPassword === '123456'));

    if (!isCurrentValid) {
      showToast('error', 'خطأ في كلمة المرور الحالية', 'كلمة المرور الحالية التي أدخلتها غير صحيحة');
      return;
    }

    // 2. Validate New Password
    if (newPassword.length < 4) {
      showToast('error', 'كلمة مرور ضعيفة', 'يجب أن تتكون كلمة المرور الجديدة من 4 أحرف أو أرقام على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'عدم تطابق كلمة المرور', 'كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (newPassword === currentPassword) {
      showToast('warning', 'تنبيه', 'كلمة المرور الجديدة مطابقة لكلمة المرور الحالية');
      return;
    }

    setIsChangingPass(true);
    try {
      // 3. Update Admin in Database
      const updatedAdmin = {
        ...currentAdminUser,
        password: newPassword,
        updatedAt: new Date().toISOString()
      };
      db.saveUser(updatedAdmin);

      // Update current session user in localStorage
      localStorage.setItem('nzm_jkr_current_user', JSON.stringify(updatedAdmin));

      // 4. Log Action in Audit Trail
      db.logAction(
        {
          id: updatedAdmin.id,
          name: updatedAdmin.fullName,
          role: 'admin',
          department: 'الإدارة العامة'
        },
        'setting_change',
        'أمان المدير',
        updatedAdmin.id,
        'تغيير كلمة مرور المدير العام',
        'تم تحديث كلمة المرور الخاصة بحساب المدير العام بنجاح.'
      );

      showToast('success', 'تم تغيير كلمة المرور', 'تم تحديث كلمة المرور الخاصة بالمدير العام بنجاح وتفعيلها فوراً');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'فشل التحديث', err?.message || 'حدث خطأ أثناء حفظ كلمة المرور');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handle Wipe All Data
  const handleWipeAllData = () => {
    const effectiveStoredPass = currentAdminUser.password || 'admin123';
    const isPassValid =
      wipeAdminPass === effectiveStoredPass ||
      (!currentAdminUser.password && (wipeAdminPass === 'admin' || wipeAdminPass === '123456'));

    if (!isPassValid) {
      showToast('error', 'كلمة المرور غير صحيحة', 'كلمة مرور المدير غير صحيحة، تم إلغاء العملية');
      return;
    }

    setIsWiping(true);
    try {
      // Execute total database wipe while preserving admin with current password
      db.wipeAllData(currentAdminUser.password);

      showToast('success', 'تم مسح كافة البيانات بنجاح', 'تم مسح وتصفير جميع بيانات النظام بالكامل بنجاح وتصفير الخزينة (0.00 ج.م)');
      setIsWipeModalOpen(false);

      // Reload page to reinitialize all React contexts and clean cache
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast('error', 'فشل في المسح', err?.message || 'حدث خطأ أثناء مسح البيانات');
      setIsWiping(false);
    }
  };

  // Handle Wipe Finance Only Data
  const handleWipeFinanceData = () => {
    const effectiveStoredPass = currentAdminUser.password || 'admin123';
    const isPassValid =
      wipeFinanceAdminPass === effectiveStoredPass ||
      (!currentAdminUser.password && (wipeFinanceAdminPass === 'admin' || wipeFinanceAdminPass === '123456'));

    if (!isPassValid) {
      showToast('error', 'كلمة المرور غير صحيحة', 'كلمة مرور المدير غير صحيحة، تم إلغاء العملية');
      return;
    }

    setIsWipingFinance(true);
    try {
      db.wipeFinanceData();

      showToast('success', 'تم تصفير قسم المالية بنجاح', 'تم مسح وتصفير كافة بيانات الخزينة، المصروفات، الديون، المرتبات، والموظفين وإعادة الرصيد إلى 0.00 ج.م');
      setIsWipeFinanceModalOpen(false);
      setWipeFinanceAdminPass('');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast('error', 'فشل في التصفير', err?.message || 'حدث خطأ أثناء تصفير بيانات المالية');
      setIsWipingFinance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: CHANGE ADMIN PASSWORD */}
      <Card className="p-6 border-orange-500/20 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                  تغيير كلمة المرور لحساب المدير العام (Admin Password)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  صلاحية المالك فقط 👑
                </span>
              </div>
              <span className="text-zinc-500 text-xs mt-0.5 block">
                تحديث كلمة المرور المستخدمة لتسجيل دخول المدير والتحكم الكامل في النظام.
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-zinc-400 bg-gray-50 dark:bg-[#141417] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#27272A]">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>المستخدم: @{currentAdminUser.username}</span>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl text-right text-xs">
          {/* Current Password */}
          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
              كلمة المرور الحالية للمدير *
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية (الافتراضية: admin123 أو 123456)"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pl-10 pr-3 text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-orange-500/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password & Confirm Password in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                كلمة المرور الجديدة *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pl-10 pr-3 text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-orange-500/50 font-bold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                تأكيد كلمة المرور الجديدة *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pl-10 pr-3 text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-orange-500/50 font-bold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4" />}
              disabled={isChangingPass || !currentPassword || !newPassword || !confirmPassword}
              className="px-6 py-2.5 font-bold shadow-xs"
            >
              {isChangingPass ? 'جاري الحفظ والتحديث...' : 'حفظ وتحديث كلمة المرور'}
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: DANGER ZONE - WIPE ALL DATA ACROSS ALL MODULES */}
      <Card className="p-6 border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-500">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-rose-600 dark:text-rose-400">
                  منطقة الخطر القصوى: مسح جميع بيانات البرنامج بالكامل (Factory Reset)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-500 border border-rose-500/30">
                  حذف شامل لا رجعة فيه ⚠️
                </span>
              </div>
              <span className="text-zinc-500 text-xs mt-0.5 block">
                حذف ومسح كافة البيانات المدخلة في جميع أقسام البرنامج وإعادة النظام لحالته الأولية النظيفة.
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              setWipeAdminPass('');
              setIsWipeModalOpen(true);
            }}
            className="px-5 py-2.5 font-bold shadow-xs shrink-0"
          >
            مسح جميع داتا البرنامج الآن
          </Button>
        </div>

        {/* Warning Checklist */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#18181B]/80 border border-rose-500/20 text-xs space-y-2">
          <strong className="block text-rose-500 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            تنبيه شديد الأهمية: الضغط على هذا الخيار سيؤدي إلى مسح نهائي لما يلي:
          </strong>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400 text-[11px] list-disc list-inside">
            <li>كافة طلبات وتذاكر الشحن في قسم الزبائن والتجار.</li>
            <li>كافة العملاء والتجار وبياناتهم وحساباتهم.</li>
            <li>جميع المحافظ (الرئيسية والفرعية) وسجلات الـ FIFO وحركات النقاط.</li>
            <li>جميع المنتجات، الباقات، الألعاب، وقوائم الكوبونات.</li>
            <li>جميع المعاملات المالية، الخزينة (تصفير رصيد الخزنة لـ 0.00 ج.م و 0.00 دولار)، المصروفات، والديون.</li>
            <li>كافة سجلات الموظفين والمرتبات والحضور والسلف في قسم المالية.</li>
            <li>جميع تداولات الوساطة والاشتراكات والشركاء.</li>
            <li>جميع سجلات المراقبة والـ Audit Logs.</li>
            <li>يبقى فقط حسابك كمدير عام بكلمة المرور الحالية لتسجيل الدخول مجدداً.</li>
          </ul>
        </div>
      </Card>

      {/* SECTION 3: FINANCE & TREASURY RESET ONLY */}
      <Card className="p-6 border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-500">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-amber-600 dark:text-amber-400">
                  تصفير ومسح بيانات قسم المالية والخزينة فقط (Finance & Safe Reset)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  تصفير مالي 💰
                </span>
              </div>
              <span className="text-zinc-500 text-xs mt-0.5 block">
                تصفير رصيد الخزنة الرئيسية إلى 0.00 ج.م ومسح كافة حركات الإيداع والصرف، المصروفات، الديون، وسجلات الموظفين والمرتبات دون المساس بالزبائن أو الألعاب.
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              setWipeFinanceAdminPass('');
              setIsWipeFinanceModalOpen(true);
            }}
            className="px-5 py-2.5 font-bold shadow-xs shrink-0 bg-amber-600 hover:bg-amber-500 text-white"
          >
            تصفير قسم المالية والخزينة الآن
          </Button>
        </div>

        <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#18181B]/80 border border-amber-500/20 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <p className="font-bold text-amber-500">ما الذي سيتم تصفيره في قسم المالية فقط؟</p>
          <p className="text-[11px] leading-relaxed">
            1. تصفير رصيد الخزنة بالكامل لتبدأ من 0.00 ج.م و 0.00 دولار ومسح سجل حركات الخزينة.
            <br />
            2. مسح كافة المصروفات وسندات الديون وسجلات الإغلاق اليومي (24 ساعة).
            <br />
            3. تفريغ كشوف المرتبات والحضور وبيانات موظفي المالية.
            <br />
            4. الحفاظ على بيانات العملاء، طلبات الشحن، التذاكر، والمنتجات كما هي دون مساس.
          </p>
        </div>
      </Card>

      {/* CONFIRMATION MODAL FOR WIPING ALL DATA */}
      {isWipeModalOpen && (
        <Modal
          isOpen={isWipeModalOpen}
          onClose={() => !isWiping && setIsWipeModalOpen(false)}
          title="🚨 تأكيد مسح جميع بيانات البرنامج بالكامل (حذف نهائي)"
          maxWidth="lg"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>تحذير أمني أخير — هذا الإجراء لا يمكن التراجع عنه مطلقاً!</span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                أنت على وشك مسح وتفريغ قاعدة بيانات النظام بالكامل عبر جميع الأقسام. سيتم حذف كل تذكرة، عميل، محفظة، رصيد، وتصفير الخزينة (0.00)، وسيعود النظام لحالته المصنعية النظيفة تماماً.
              </p>
            </div>

            <div className="space-y-3 font-bold">
              <div>
                <label className="block text-zinc-800 dark:text-zinc-200 mb-1.5 text-xs">
                  أدخل كلمة مرور المدير العام لتأكيد مسح كافة بيانات النظام:
                </label>
                <input
                  type="password"
                  value={wipeAdminPass}
                  onChange={e => setWipeAdminPass(e.target.value)}
                  placeholder="كلمة مرور المدير العام..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/40 p-3 text-zinc-900 dark:text-zinc-100 outline-none text-center font-mono font-bold text-sm focus:border-rose-500 shadow-xs"
                  autoFocus
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isWiping}
                onClick={() => setIsWipeModalOpen(false)}
              >
                إلغاء وتراجع
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                disabled={isWiping || !wipeAdminPass}
                onClick={handleWipeAllData}
                className="px-6 py-2 font-black shadow-xs cursor-pointer"
              >
                {isWiping ? 'جاري مسح النظام وإعادة التهيئة...' : 'تأكيد مسح كافة البيانات نهائياً 🗑️'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL FOR WIPING FINANCE ONLY */}
      {isWipeFinanceModalOpen && (
        <Modal
          isOpen={isWipeFinanceModalOpen}
          onClose={() => !isWipingFinance && setIsWipeFinanceModalOpen(false)}
          title="💰 تأكيد تصفير ومسح بيانات قسم المالية والخزينة فقط"
          maxWidth="lg"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>تنبيه: سيتم مسح البيانات المالية وتصفير رصيد الخزينة</span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                سيؤدي هذا الإجراء إلى تصفير الخزينة المركزية (0.00 ج.م و 0.00 دولار)، مسح كافة حركات الخزينة والمصروفات والديون ومرتبات الموظفين. لن تتأثر حسابات الزبائن أو تذاكر الشحن أو الكتالوج.
              </p>
            </div>

            <div className="space-y-3 font-bold">
              <div>
                <label className="block text-zinc-800 dark:text-zinc-200 mb-1.5 text-xs">
                  أدخل كلمة مرور المدير العام لتأكيد تصفير قسم المالية:
                </label>
                <input
                  type="password"
                  value={wipeFinanceAdminPass}
                  onChange={e => setWipeFinanceAdminPass(e.target.value)}
                  placeholder="كلمة مرور المدير العام..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-amber-500/40 p-3 text-zinc-900 dark:text-zinc-100 outline-none text-center font-mono font-bold text-sm focus:border-amber-500 shadow-xs"
                  autoFocus
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isWipingFinance}
                onClick={() => setIsWipeFinanceModalOpen(false)}
              >
                إلغاء وتراجع
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                disabled={isWipingFinance || !wipeFinanceAdminPass}
                onClick={handleWipeFinanceData}
                className="px-6 py-2 font-black shadow-xs cursor-pointer bg-amber-600 hover:bg-amber-500 text-white"
              >
                {isWipingFinance ? 'جاري تصفير المالية والخزينة...' : 'تأكيد تصفير قسم المالية الآن 💰'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
