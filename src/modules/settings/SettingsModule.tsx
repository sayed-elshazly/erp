import React, { useState, useEffect } from 'react';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { User, Permission, Department } from '../../types/auth.types';
import { SystemSettings } from '../../types/common.types';
import { AuditLog } from '../../types/audit.types';
import {
  Settings,
  Users,
  ShieldCheck,
  Eye,
  Database,
  Info,
  Save,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Check,
  Search,
  Flame,
  SlidersHorizontal,
  LayoutTemplate,
  DollarSign,
  Receipt,
  Percent,
  ShieldAlert
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { CustomerSettingsSubModule } from '../customerSettings/CustomerSettingsSubModule';
import { AdminAccountSecurityCard } from './AdminAccountSecurityCard';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../../components/common/SortableDraggableItem';

export const SettingsModule: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useNotifications();
  const { workspace, resetWorkspace } = useWorkspace();
  const { getOrderedItems, resetAllOrders, canReorder } = useLayoutOrder();
  const [isResetLayoutOrdersConfirmOpen, setIsResetLayoutOrdersConfirmOpen] = useState(false);

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<
    'customer_shipping' | 'general' | 'workspace' | 'users' | 'admin_account' | 'permissions' | 'audit' | 'backup' | 'about'
  >('customer_shipping');

  // General Settings State
  const [settings, setSettings] = useState<SystemSettings>(db.getSettings());

  // Users State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    username: '',
    fullName: '',
    role: 'employee',
    department: 'customers',
    jobTitle: 'موظف خدمة عملاء',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export']
  });
  const [userPasswordInput, setUserPasswordInput] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // Confirm Reset Workspace Dialog
  const [isResetWorkspaceConfirmOpen, setIsResetWorkspaceConfirmOpen] = useState(false);

  const loadData = () => {
    setSettings(db.getSettings());
    setUsersList(db.getUsers());
    setAuditLogs(db.getAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save General Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings(settings);

    db.logAction(
      { id: currentUser?.id || 'sys', name: currentUser?.fullName || 'مستخدم', role: currentUser?.role || 'user', department: 'الإعدادات' },
      'setting_change',
      'إعدادات النظام',
      'system_settings',
      'تحديث إعدادات النظام العامة والمالية',
      `اسم المنشأة: ${settings.companyName}`
    );

    showToast('success', 'تم الحفظ', 'تم حفظ إعدادات النظام بنجاح');
  };

  // Save / Update User
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username?.trim() || !userFormData.fullName?.trim()) {
      showToast('error', 'خطأ', 'يرجى إدخال اسم المستخدم والاسم الكامل');
      return;
    }

    const isEdit = !!editingUser;
    const userToSave: User = {
      ...(editingUser || {}),
      id: editingUser ? editingUser.id : 'usr_' + Date.now(),
      username: userFormData.username!.trim().toLowerCase(),
      fullName: userFormData.fullName!.trim(),
      password: userPasswordInput.trim() ? userPasswordInput.trim() : (editingUser?.password || undefined),
      role: userFormData.role || 'employee',
      department: userFormData.role === 'admin' ? undefined : userFormData.department,
      jobTitle: userFormData.jobTitle?.trim() || (userFormData.role === 'admin' ? 'مدير عام' : 'موظف'),
      isActive: userFormData.isActive !== undefined ? userFormData.isActive : true,
      permissions: userFormData.role === 'admin' ? [
        'view', 'add', 'edit', 'delete', 'print', 'export', 'manage_users', 'manage_finance', 'close_shift', 'manage_settings'
      ] : (userFormData.permissions || ['view']),
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
    };

    const success = db.saveUser(userToSave, currentUser);
    if (!success) {
      showToast('error', 'غير مصرح', 'ليس لديك الصلاحية لإنشاء أو تعديل هذا المستخدم أو ترقية الصلاحيات.');
      return;
    }

    db.logAction(
      { id: currentUser?.id || 'sys', name: currentUser?.fullName || 'مستخدم', role: currentUser?.role || 'user', department: 'الإعدادات' },
      isEdit ? 'edit' : 'add',
      'مستخدم',
      userToSave.id,
      userToSave.fullName,
      isEdit ? 'تعديل بيانات المستخدم وصلاحياته' : 'إنشاء حساب مستخدم جديد'
    );

    showToast('success', isEdit ? 'تم التعديل' : 'تم الإنشاء', `تم حفظ بيانات المستخدم ${userToSave.fullName}`);
    setIsUserModalOpen(false);
    setEditingUser(null);
    loadData();
  };

  // Delete User
  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      showToast('error', 'غير مسموح', 'لا يمكنك حذف حسابك الحالي');
      return;
    }
    const success = db.deleteUser(userId, currentUser);
    if (!success) {
      showToast('error', 'غير مصرح', 'ليس لديك الصلاحية لحذف هذا المستخدم.');
      return;
    }
    db.logAction(
      { id: currentUser?.id || 'sys', name: currentUser?.fullName || 'مستخدم', role: currentUser?.role || 'user', department: 'الإعدادات' },
      'delete',
      'مستخدم',
      userId,
      userName,
      'تم حذف حساب المستخدم'
    );
    showToast('warning', 'تم الحذف', `تم حذف حساب ${userName}`);
    loadData();
  };

  // Backup Download
  const handleDownloadBackup = () => {
    const backupJson = db.createBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NZM_JKR_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    db.logAction(
      { id: currentUser?.id || 'sys', name: currentUser?.fullName || 'مستخدم', role: currentUser?.role || 'user', department: 'الإعدادات' },
      'backup',
      'نسخة احتياطية',
      'db_backup',
      'توليد وتنزيل نسخة احتياطية',
      'تم تنزيل نسخة احتياطية كاملة لكافة بيانات النظام'
    );

    showToast('success', 'تم التنزيل', 'تم حفظ النسخة الاحتياطية بنجاح على جهازك');
  };

  // Backup Restore
  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = db.restoreBackup(content);
      if (success) {
        db.logAction(
          { id: currentUser?.id || 'sys', name: currentUser?.fullName || 'مستخدم', role: currentUser?.role || 'user', department: 'الإعدادات' },
          'restore_backup',
          'استعادة نسخة',
          'db_restore',
          'استعادة بيانات من ملف نسخة احتياطية',
          'تمت استعادة قاعدة البيانات بنجاح'
        );
        showToast('success', 'تمت الاستعادة بنجاح', 'تم استرجاع كافة بيانات النظام والمنتجات والمحافظ بنجاح! سيتم تحديث الصفحة الآن...');
        loadData();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast('error', 'فشلت الاستعادة', 'ملف النسخة الاحتياطية غير صالح أو تالف');
      }
    };
    reader.readAsText(file);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const q = auditSearchQuery.toLowerCase();
    const matchesQ =
      !q ||
      log.userName.toLowerCase().includes(q) ||
      log.entityTitle.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.department.toLowerCase().includes(q);

    const matchesAction = auditActionFilter === 'all' || log.actionType === auditActionFilter;

    return matchesQ && matchesAction;
  });

  const allAvailablePermissions: { id: Permission; label: string; desc: string }[] = [
    { id: 'view', label: 'عرض البيانات', desc: 'إمكانية تصفح واستعراض البيانات في القسم' },
    { id: 'add', label: 'إضافة سجلات', desc: 'إمكانية إنشاء زبائن أو سندات جديدة' },
    { id: 'edit', label: 'تعديل البيانات', desc: 'إمكانية تعديل وتحديث السجلات الحالية' },
    { id: 'delete', label: 'الأرشفة والحذف', desc: 'إمكانية أرشفة السجلات (Soft Delete)' },
    { id: 'print', label: 'طباعة التقارير', desc: 'إمكانية طباعة القوائم والإيصالات' },
    { id: 'export', label: 'تصدير Excel', desc: 'إمكانية تصدير الجداول لملفات إكسل' },
    { id: 'manage_finance', label: 'إدارة مالية كاملة', desc: 'صلاحية إيداع وسحب وتعديل القيود المالية' },
    { id: 'close_shift', label: 'إغلاق الورديات', desc: 'صلاحية اعتماد وتسوية الورديات' },
    { id: 'manage_users', label: 'إدارة المستخدمين', desc: 'إنشاء وتعديل حسابات الموظفين' },
    { id: 'manage_settings', label: 'إدارة الإعدادات', desc: 'تعديل إعدادات النظام والنسخ الاحتياطي' }
  ];

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { id: 'dash', label: 'لوحة التحكم' },
          { id: 'settings', label: 'إعدادات النظام وإدارة بيئة العمل', active: true }
        ]}
      />

      {/* Navigation Tabs (Drag & Drop Reorderable) */}
      <Card className="p-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
          {getOrderedItems('settings_tabs', [
            { id: 'customer_shipping', label: 'إعدادات قسم الزبائن والعملات والتسعير', icon: DollarSign, iconColor: 'text-emerald-400' },
            { id: 'general', label: 'بيانات المنشأة العامة', icon: Settings },
            { id: 'workspace', label: 'مساحة العمل (Workspace)', icon: LayoutTemplate, iconColor: 'text-amber-400' },
            { id: 'users', label: `إدارة المستخدمين (${usersList.length})`, icon: Users },
            ...(currentUser?.role === 'admin'
              ? [{ id: 'admin_account', label: 'أمان المدير وتصفير ومسح البيانات 👑', icon: ShieldAlert, isSpecial: true }]
              : []),
            { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: ShieldCheck },
            { id: 'audit', label: 'سجل المراقبة (Audit Log)', icon: Eye },
            { id: 'backup', label: 'النسخ الاحتياطي', icon: Database },
            { id: 'about', label: 'حول النظام', icon: Info }
          ]).map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isSpecial = tab.isSpecial;

            return (
              <SortableDraggableItem
                key={tab.id}
                id={tab.id}
                index={idx}
                containerId="settings_tabs"
                direction="horizontal"
                className="shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isSpecial
                      ? isActive
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/10'
                      : isActive
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.iconColor || ''}`} /> {tab.label}
                </button>
              </SortableDraggableItem>
            );
          })}
        </div>
      </Card>

      {/* Tab 0: Customer Shipping & Currency & Pricing Settings */}
      {activeTab === 'customer_shipping' && <CustomerSettingsSubModule />}

      {/* Tab 1: General & Financial Settings */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#282828]">
              <Settings className="w-4 h-4 text-orange-500" />
              <span>بيانات المنشأة وتفضيلات النظام</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="اسم النظام والمنشأة"
                value={settings.companyName}
                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
              />

              <Input
                label="رقم الهاتف والتواصل"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
              />

              <Input
                label="العنوان والفرع الرئيسي"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="رمز العملة"
                  value={settings.currencySymbol}
                  onChange={e => setSettings({ ...settings, currencySymbol: e.target.value })}
                />
                <Input
                  label="اسم العملة"
                  value={settings.currency}
                  onChange={e => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Customer & Finance Specific Rules */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#282828]">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>إعدادات الزبائن والمالية وقواعد الكاش باك</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="نسبة الكاش باك المعتمدة (%)"
                type="number"
                step="any"
                value={settings.cashbackPercentage}
                onChange={e => setSettings({ ...settings, cashbackPercentage: parseFloat(e.target.value) || 0 })}
              />

              <Input
                label="مكافأة الإحالة لكل زبون ($)"
                type="number"
                step="any"
                value={settings.referralBonusAmount}
                onChange={e => setSettings({ ...settings, referralBonusAmount: parseFloat(e.target.value) || 0 })}
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">الرصيد الافتتاحي للخزنة ({settings.currencySymbol || 'ج.م'})</label>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, vaultInitialBalance: 0 })}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
                  >
                    تصفير (0 {settings.currencySymbol || 'ج.م'})
                  </button>
                </div>
                <Input
                  type="number"
                  step="any"
                  value={settings.vaultInitialBalance}
                  onChange={e => setSettings({ ...settings, vaultInitialBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                حفظ كافة التغييرات
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Tab 2: Workspace Persistence & Reset */}
      {activeTab === 'workspace' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#282828]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-orange-500" />
                  <span>إدارة بيئة العمل والحفظ التلقائي (Workspace Persistence)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  يقوم النظام بحفظ جميع التبويبات المفتوحة، ترتيب وأحجام بطاقات الـ Dashboard، الثيم، وحجم الخط بشكل مستقل لكل مستخدم.
                </p>
              </div>

              <Badge variant="success" size="md">
                الحفظ التلقائي: نشط فوري
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828] space-y-1">
                <span className="text-zinc-400">المستخدم الحالي:</span>
                <p className="font-bold text-gray-900 dark:text-zinc-100">{currentUser?.fullName} ({currentUser?.username})</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828] space-y-1">
                <span className="text-zinc-400">عدد بطاقات KPI المخصصة:</span>
                <p className="font-bold text-orange-500 font-mono">{workspace.kpiCards.filter(c => c.isVisible).length} بطاقات نشطة</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828] space-y-1">
                <span className="text-zinc-400">آخر مزامنة لبيئة العمل:</span>
                <p className="font-mono text-zinc-300">{formatDateTime(workspace.lastSavedAt)}</p>
              </div>
            </div>

            {/* Reset Workspace Button */}
            <div className="pt-4 border-t border-gray-100 dark:border-[#282828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-rose-400">إعادة ضبط مساحة العمل (Reset Workspace Layout)</h4>
                <p className="text-[11px] text-zinc-400">
                  إرجاع ترتيب الـ Dashboard والتبويبات المفتوحة والأعمدة إلى الإعدادات الافتراضية (هذا الإجراء يخص شكل وترتيب الشاشات فقط ولا يحذف أي بيانات أو معاملات مالية). لمسح وتصفير البيانات انتقل إلى تبويب "أمان المدير وتصفير ومسح البيانات".
                </p>
              </div>

              <Button
                variant="danger"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setIsResetWorkspaceConfirmOpen(true)}
              >
                إعادة ضبط مساحة العمل
              </Button>
            </div>
          </Card>

          {/* Card 2: UI Drag & Drop Layout Customization */}
          <Card className="p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#282828]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span>تخصيص ترتيب الواجهة بالسحب والإفلات (Drag & Drop UI Layout Orders)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  يتيح النظام للمدير المالك إعادة ترتيب الأقسام الرئيسية، القوائم الجانبية، التبويبات الداخلية، وبطاقات المؤشرات بسلاسة تامة مع حفظ فوري ومستمر.
                </p>
              </div>

              <Badge variant={canReorder ? 'orange' : 'default'} size="md">
                {canReorder ? 'صلاحية الترتيب: مفعلة (Admin)' : 'عرض فقط'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828]">
                <span className="text-zinc-400 block mb-1">القائمة الجانبية:</span>
                <span className="font-bold text-emerald-400">قابلة لإعادة الترتيب بالكامل</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828]">
                <span className="text-zinc-400 block mb-1">التبويبات الداخلية:</span>
                <span className="font-bold text-emerald-400">عزل تام داخل كل قسم</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828]">
                <span className="text-zinc-400 block mb-1">بطاقات المؤشرات:</span>
                <span className="font-bold text-emerald-400">سحب وإفلات تفاعلي</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828]">
                <span className="text-zinc-400 block mb-1">الحفظ التلقائي:</span>
                <span className="font-bold text-orange-500 font-mono">LocalStorage فوري</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-[#282828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-orange-400">إعادة تعيين كافة ترتيبات الواجهة الافتراضية</h4>
                <p className="text-[11px] text-zinc-400">
                  إرجاع كافة الأقسام والتبويبات والبطاقات في جميع أنحاء النظام إلى الترتيب النظامي الافتراضي بنقرة واحدة.
                </p>
              </div>

              {canReorder && (
                <Button
                  variant="outline"
                  icon={<RotateCcw className="w-4 h-4 text-orange-500" />}
                  onClick={() => setIsResetLayoutOrdersConfirmOpen(true)}
                  className="border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                  إعادة الترتيب الافتراضي لكافة الواجهات
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">قائمة مستخدمي وموظفي النظام</h3>
            <div className="flex items-center gap-2">
              {currentUser?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
                  onClick={() => setActiveTab('admin_account')}
                  className="font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  أمان المدير ومسح البيانات 👑
                </Button>
              )}
              {(currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_users')) && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                  setEditingUser(null);
                  setUserFormData({
                    username: '',
                    fullName: '',
                    role: 'employee',
                    department: 'customers',
                    jobTitle: '',
                    isActive: true,
                    permissions: ['view', 'add', 'edit', 'print', 'export']
                  });
                  setIsUserModalOpen(true);
                }}
              >
                مستخدم جديد
              </Button>
            )}
          </div>
        </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-[#161616] border-b border-gray-200 dark:border-[#2E2E2E] text-zinc-400 text-xs font-bold">
                    <th className="py-3 px-4">اسم المستخدم</th>
                    <th className="py-3 px-4">الاسم الكامل</th>
                    <th className="py-3 px-4">الدور / الوظيفة</th>
                    <th className="py-3 px-4">القسم</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">آخر تسجيل دخول</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#262626]">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-500">{u.username}</td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-zinc-100">{u.fullName}</td>
                      <td className="py-3 px-4">
                        <Badge variant={u.role === 'admin' ? 'orange' : 'info'} size="sm">
                          {u.role === 'admin' ? '👑 مدير عام' : u.jobTitle || 'موظف'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {u.role === 'admin' ? 'كافة الأقسام' : u.department || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          u.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {u.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-xs">{formatDateTime(u.lastLogin)}</td>
                      <td className="py-3 px-4 text-center">
                        {(currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_users')) ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setUserFormData(u);
                                setIsUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10"
                              title="تعديل المستخدم"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.fullName)}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                                title="حذف المستخدم"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Admin Master Controls (Password Change & Total Factory Reset) */}
      {activeTab === 'admin_account' && currentUser?.role === 'admin' && (
        <div className="animate-fade-in space-y-4">
          <AdminAccountSecurityCard />
        </div>
      )}

      {/* Tab 4: Permissions Matrix */}
      {activeTab === 'permissions' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#282828]">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>مصفوفة الصلاحيات المرنة (Role-Based Access Control)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                تحديد دقيق ومحكم لصلاحيات كل موظف لمنع التلاعب وتطبيق مبدأ الأمان العالي.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allAvailablePermissions.map(perm => (
              <div key={perm.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#282828] flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100">{perm.label}</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{perm.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 5: Audit Log Viewer */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث في سجل الرقابة (المستخدم، نوع العملية، التفاصيل...)"
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#2E2E2E] text-xs pr-9 pl-3 py-2 text-zinc-100 outline-none"
                />
              </div>
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#2E2E2E] text-xs p-2 text-zinc-200 outline-none"
              >
                <option value="all">جميع العمليات</option>
                <option value="login">تسجيل دخول</option>
                <option value="add">إضافة</option>
                <option value="edit">تعديل</option>
                <option value="archive">أرشفة</option>
                <option value="vault_transaction">حركات الخزنة</option>
                <option value="export">تصدير</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                const data = filteredAuditLogs.map(l => ({
                  'المستخدم': l.userName,
                  'الدور': l.userRole,
                  'القسم': l.department,
                  'نوع العملية': l.actionType,
                  'الكيان': l.entityType,
                  'البيان': l.entityTitle,
                  'التفاصيل': l.details,
                  'التاريخ والوقت': formatDateTime(l.timestamp)
                }));
                exportToExcel(data, 'سجل_الرقابة_Audit_Log');
              }}
            >
              تصدير السجل
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-[#161616] border-b border-gray-200 dark:border-[#2E2E2E] text-zinc-400 font-bold">
                    <th className="py-3 px-4">نوع العملية</th>
                    <th className="py-3 px-4">المستخدم</th>
                    <th className="py-3 px-4">القسم</th>
                    <th className="py-3 px-4">البيان</th>
                    <th className="py-3 px-4">التفاصيل</th>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#262626]">
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant={log.actionType === 'login' ? 'info' : log.actionType === 'add' ? 'success' : log.actionType === 'archive' ? 'danger' : 'orange'} size="sm">
                          {log.actionType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-zinc-100">{log.userName}</td>
                      <td className="py-3 px-4 text-zinc-400">{log.department}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-zinc-200">{log.entityTitle}</td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px] max-w-xs truncate">{log.details}</td>
                      <td className="py-3 px-4 font-mono text-zinc-500">{formatDateTime(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 6: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 text-right">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-2">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">تنزيل نسخة احتياطية شاملة لكامل النظام</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                يقوم النظام بتصدير كافة بيانات البرنامج بدون استثناء (كتالوج الألعاب والمنتجات والباقات، المحافظ المخزنية وأرصدة النقاط، التذاكر، العملاء، تجار الجملة، الموردين والفواتير، الخزينة والمعاملات، الاشتراكات، الوساطة، الكوبونات، والإعدادات) في ملف JSON متكامل.
              </p>
              <Button
                variant="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownloadBackup}
              >
                تنزيل النسخة الاحتياطية الآن
              </Button>
            </Card>

            <Card className="p-6 space-y-4 text-right">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">استعادة نسخة احتياطية</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                استرجاع بيانات النظام من ملف نسخة احتياطية سابق تم تنزيله من هذا البرنامج.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>اختر ملف النسخة الاحتياطية (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackupFile}
                  className="hidden"
                />
              </label>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 7: About NZM JKR */}
      {activeTab === 'about' && (
        <Card className="p-8 text-center space-y-6 max-w-xl mx-auto animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-600 to-amber-400 p-0.5 shadow-xl shadow-orange-500/30">
            <div className="w-full h-full bg-[#121212] rounded-[22px] flex items-center justify-center">
              <Flame className="w-10 h-10 text-orange-500 fill-orange-500" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">NZM JKR Top Up ERP</h2>
            <p className="text-xs text-orange-400 font-mono">الإصدار v1.0.0 Pro • Enterprise Offline Edition</p>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            نظام متكامل لإدارة خدمات الشحن الرقمي والزبائن والحسابات المالية مصمم ليعمل بدون إنترنت وبأعلى معايير الأداء والسرعة.
          </p>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#282828] text-xs text-zinc-400 flex items-center justify-between font-mono">
            <span>بيئة التشغيل: Offline Local Engine</span>
            <span>الترخيص: Active Commercial</span>
          </div>
        </Card>
      )}

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'تعديل بيانات المستخدم' : 'إنشاء حساب مستخدم جديد'}
        subtitle="تحديد بيانات الدخول، القسم المخصص، والصلاحيات"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم المستخدم (Username) *"
              placeholder="مثال: ahmed_cust"
              value={userFormData.username || ''}
              onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
              autoFocus
            />

            <Input
              label="الاسم الكامل *"
              placeholder="مثال: أحمد السعدي"
              value={userFormData.fullName || ''}
              onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">نوع الحساب (الدور)</label>
              <select
                value={userFormData.role || 'employee'}
                onChange={e => setUserFormData({ ...userFormData, role: e.target.value as any })}
                className="w-full rounded-xl bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#2E2E2E] text-sm p-2.5 text-zinc-200 outline-none"
              >
                <option value="employee">موظف (Employee)</option>
                <option value="admin">مدير عام (Admin)</option>
              </select>
            </div>

            {userFormData.role !== 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">القسم المخصص</label>
                <select
                  value={userFormData.department || 'customers'}
                  onChange={e => setUserFormData({ ...userFormData, department: e.target.value as Department })}
                  className="w-full rounded-xl bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#2E2E2E] text-sm p-2.5 text-zinc-200 outline-none"
                >
                  <option value="customers">قسم الزبائن</option>
                  <option value="dealers">قسم التجار والموزعين</option>
                  <option value="finance">قسم المالية</option>
                  <option value="brokerage">قسم الوساطة</option>
                  <option value="subscriptions">قسم الاشتراكات</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">المسمى الوظيفي</label>
              <select
                value={userFormData.jobTitle || 'موظف خدمة عملاء'}
                onChange={e => setUserFormData({ ...userFormData, jobTitle: e.target.value })}
                className="w-full rounded-xl bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#2E2E2E] text-sm p-2.5 text-zinc-200 outline-none"
              >
                <option value="موظف خدمة عملاء">موظف خدمة عملاء</option>
                <option value="مسؤول عن قسم">مسؤول عن قسم</option>
                <option value="مشرف">مشرف</option>
                <option value="موظف شحن">موظف شحن</option>
              </select>
            </div>

            <Input
              label="كلمة المرور (اختياري للتحديث)"
              type="password"
              placeholder="افتراضية: 123456"
              value={userPasswordInput}
              onChange={e => setUserPasswordInput(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="userActive"
              checked={userFormData.isActive !== false}
              onChange={e => setUserFormData({ ...userFormData, isActive: e.target.checked })}
              className="rounded text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="userActive" className="text-xs font-semibold text-zinc-300">
              الحساب نشط ومصرح له بالدخول للنظام
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#2E2E2E]">
            <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary">
              {editingUser ? 'حفظ التعديلات' : 'إنشاء الحساب'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Reset Workspace Dialog */}
      <ConfirmDialog
        isOpen={isResetWorkspaceConfirmOpen}
        onClose={() => setIsResetWorkspaceConfirmOpen(false)}
        onConfirm={resetWorkspace}
        title="تأكيد إعادة ضبط مساحة العمل"
        message="هل أنت متأكد من رغبتك في إعادة ضبط مساحة العمل؟ سيتم إرجاع ترتيب الـ Dashboard وبطاقات KPI والتبويبات والأعمدة للوضع الافتراضي لحسابك."
        confirmText="نعم، إعادة الضبط"
        variant="warning"
      />

      {/* Confirm Reset UI Layout Orders Dialog */}
      <ConfirmDialog
        isOpen={isResetLayoutOrdersConfirmOpen}
        onClose={() => setIsResetLayoutOrdersConfirmOpen(false)}
        onConfirm={() => {
          resetAllOrders();
          showToast('info', 'تمت الاستعادة', 'تمت استعادة كافة الترتيبات الافتراضية للواجهة بنجاح');
          setIsResetLayoutOrdersConfirmOpen(false);
        }}
        title="تأكيد إعادة الترتيب الافتراضي لكافة الواجهات"
        message="هل أنت متأكد من رغبتك في إعادة تعيين كافة الترتيبات المخصصة؟ سيتم إرجاع القائمة الجانبية، والتبويبات الداخلية، والبطاقات إلى الترتيب النظامي الأصلي."
        confirmText="نعم، استعادة الترتيب الافتراضي"
        variant="warning"
      />
    </div>
  );
};
