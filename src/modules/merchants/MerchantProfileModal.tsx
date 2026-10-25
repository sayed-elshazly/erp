import React, { useState, useEffect } from 'react';
import {
  Merchant,
  MerchantInvoice,
  MerchantReminder,
  MerchantTransaction,
  MerchantProductRule,
  MerchantNote,
  MerchantFile
} from '../../types/merchant.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { Modal } from '../../components/common/Modal';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MerchantPerformanceCard } from '../../components/merchants/MerchantPerformanceCard';
import { TrustScoreCard } from '../../components/merchants/TrustScoreCard';
import { ReminderTimeline } from '../../components/merchants/ReminderTimeline';
import { MerchantInvoiceModal } from './MerchantInvoiceModal';
import { MerchantReminderModal } from './MerchantReminderModal';
import {
  Building2,
  Phone,
  MessageSquare,
  Send,
  Mail,
  MapPin,
  Globe,
  DollarSign,
  Receipt,
  FileText,
  Clock,
  Award,
  Package,
  Paperclip,
  History,
  Plus,
  Printer,
  Download,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Upload,
  Trophy,
  Gift
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';

interface MerchantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: Merchant | null;
  onMerchantUpdated: () => void;
}

export const MerchantProfileModal: React.FC<MerchantProfileModalProps> = ({
  isOpen,
  onClose,
  merchant: initialMerchant,
  onMerchantUpdated
}) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'statement' | 'invoices' | 'products' | 'reminders' | 'competitions' | 'trust' | 'performance' | 'notes' | 'files' | 'audit'
  >('overview');

  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(initialMerchant);
  const [isStatementReportOpen, setIsStatementReportOpen] = useState(false);
  const [invoices, setInvoices] = useState<MerchantInvoice[]>([]);
  const [reminders, setReminders] = useState<MerchantReminder[]>([]);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [productRules, setProductRules] = useState<MerchantProductRule[]>([]);
  const [notes, setNotes] = useState<MerchantNote[]>([]);
  const [files, setFiles] = useState<MerchantFile[]>([]);

  // Sub Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState<MerchantNote['color']>('orange');

  // Quick Product Rule State
  const [newProdName, setNewProdName] = useState('');
  const [newProdStdPrice, setNewProdStdPrice] = useState('');
  const [newProdSpecPrice, setNewProdSpecPrice] = useState('');

  const loadMerchantData = () => {
    if (!initialMerchant) return;
    const fresh = db.getMerchantById(initialMerchant.id);
    if (fresh) {
      setCurrentMerchant(fresh);
      setInvoices(db.getMerchantInvoices(fresh.id));
      setReminders(db.getMerchantReminders(fresh.id));
      setTransactions(db.getMerchantTransactions(fresh.id));
      setProductRules(db.getMerchantProductRules(fresh.id));
      setNotes(db.getMerchantNotes(fresh.id));
      setFiles(db.getMerchantFiles(fresh.id));
    }
  };

  useEffect(() => {
    if (isOpen && initialMerchant) {
      loadMerchantData();
    }
  }, [isOpen, initialMerchant]);

  if (!currentMerchant) return null;

  // Save Invoice
  const handleSaveInvoice = (inv: MerchantInvoice) => {
    db.saveMerchantInvoice(inv, user?.fullName || 'المستخدم');
    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'التجار' },
      'add',
      'فاتورة تاجر',
      inv.id,
      inv.invoiceNumber,
      `إصدار فاتورة ${inv.type} بمبلغ ${inv.totalAmount}$ للتاجر ${currentMerchant.name}`
    );
    eventBus.publish(SYSTEM_EVENTS.MERCHANT_INVOICE_CREATED, inv);
    showToast('success', 'تم إصدار الفاتورة', `تم تسجيل الفاتورة ${inv.invoiceNumber} بنجاح`);
    loadMerchantData();
    onMerchantUpdated();
  };

  // Save Reminder
  const handleSaveReminder = (rem: MerchantReminder) => {
    db.saveMerchantReminder(rem);
    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'التجار' },
      'add',
      'تذكير تاجر',
      rem.id,
      rem.title,
      `جدولة تذكير للتاجر ${currentMerchant.name} بتاريخ ${rem.dueDate}`
    );
    eventBus.publish(SYSTEM_EVENTS.MERCHANT_REMINDER_ADDED, rem);
    showToast('success', 'تم حفظ التذكير', 'تمت جدولة المتابعة بنجاح');
    loadMerchantData();
    onMerchantUpdated();
  };

  // Complete Reminder
  const handleCompleteReminder = (id: string) => {
    db.completeMerchantReminder(id);
    showToast('success', 'تم الإنجاز', 'تم تحديد التذكير كمكتمل');
    loadMerchantData();
  };

  // Delete Reminder
  const handleDeleteReminder = (id: string) => {
    db.deleteMerchantReminder(id);
    showToast('warning', 'تم الحذف', 'تم حذف التذكير');
    loadMerchantData();
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    db.addMerchantNote({
      merchantId: currentMerchant.id,
      content: newNoteContent.trim(),
      color: newNoteColor,
      isPinned: false,
      createdBy: user?.fullName || 'المستخدم'
    });

    setNewNoteContent('');
    showToast('success', 'تمت الإضافة', 'تم إضافة الملاحظة لحساب التاجر');
    loadMerchantData();
    onMerchantUpdated();
  };

  // Add Custom Price Rule
  const handleAddProductRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSpecPrice) return;

    db.saveMerchantProductRule({
      id: 'p_rule_' + Date.now(),
      merchantId: currentMerchant.id,
      productId: 'prod_' + Date.now(),
      productName: newProdName.trim(),
      category: 'عام',
      standardPrice: parseFloat(newProdStdPrice) || parseFloat(newProdSpecPrice),
      specialPrice: parseFloat(newProdSpecPrice),
      specialDiscountPercent: 5.0,
      customCommission: 0.5,
      minOrderQuantity: 1,
      maxOrderQuantity: 1000,
      isFavorite: true
    });

    setNewProdName('');
    setNewProdStdPrice('');
    setNewProdSpecPrice('');
    showToast('success', 'تمت إضافة السعر الخاص', 'تم تفعيل قاعدة التسعير للتاجر');
    loadMerchantData();
  };

  // File Upload Simulator
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    db.addMerchantFile({
      merchantId: currentMerchant.id,
      fileName: file.name,
      fileType: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.xlsx') ? 'excel' : 'contract',
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileUrl: '#',
      uploadedBy: user?.fullName || 'المستخدم'
    });

    showToast('success', 'تم رفع الملف', `تم حفظ الملف ${file.name} في بروفايل التاجر`);
    loadMerchantData();
    onMerchantUpdated();
  };

  // Export Statement to Excel
  const handleExportStatement = () => {
    const data = transactions.map(t => ({
      'نوع العملية': t.type,
      'البيان': t.description,
      'المبلغ ($)': t.amount,
      'الاتجاه': t.direction === 'in' ? 'له' : 'عليه',
      'الرصيد بعد العملية ($)': t.balanceAfter,
      'طريقة الدفع': t.paymentMethod,
      'المسؤول': t.performedBy,
      'التاريخ': formatDateTime(t.createdAt)
    }));

    exportToExcel(data, `كشف_حساب_${currentMerchant.code}_${currentMerchant.name}`);
    showToast('info', 'تم التصدير', 'تم تصدير كشف الحساب بنجاح');
  };

  const isOverCreditLimit = currentMerchant.balance > currentMerchant.creditLimit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ملف التاجر: ${currentMerchant.name}`}
      subtitle={`${currentMerchant.companyName} • كود: ${currentMerchant.code}`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right">
        {/* Over Credit Limit Warning Banner */}
        {isOverCreditLimit && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-500 animate-pulse">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              تنبيه حرج: رصيد التاجر ({formatCurrency(currentMerchant.balance)}) تجاوز الحد الائتماني المسموح به ({formatCurrency(currentMerchant.creditLimit)})!
            </span>
            <Button
              variant="danger"
              size="sm"
              icon={<DollarSign className="w-3.5 h-3.5" />}
              onClick={() => setIsInvoiceModalOpen(true)}
            >
              تسوية وسداد فوري
            </Button>
          </div>
        )}

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-gray-100 dark:border-[#27272A] text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> البيانات الأساسية
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'statement'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" /> كشف الحساب ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'invoices'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-400" /> الفواتير ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'products'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-purple-400" /> الأسعار الخاصة ({productRules.length})
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'reminders'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" /> التذكيرات ({reminders.length})
          </button>
          <button
            onClick={() => setActiveTab('competitions')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'competitions'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> المسابقات والمكافآت 🎯
          </button>
          <button
            onClick={() => setActiveTab('trust')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'trust'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> درجة الثقة ({currentMerchant.trustScore?.score || 90})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'performance'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-yellow-500" /> تقييم الأداء
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notes'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> الملاحظات ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'files'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" /> الملفات ({files.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* Quick Balances Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A]">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">الرصيد الصافي الحالي</span>
                <span className={`text-xl font-black font-mono block mt-1 ${currentMerchant.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(currentMerchant.balance)}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 block">
                  {currentMerchant.balance >= 0 ? 'مستحق لنا (Receivable)' : 'التزام علينا للمورد (Payable)'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A]">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">الحد الائتماني</span>
                <span className="text-xl font-black font-mono text-orange-500 block mt-1">
                  {formatCurrency(currentMerchant.creditLimit)}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 block">أقصى حد ديون مسموح</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A]">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">إجمالي التعاملات والمبيعات</span>
                <span className="text-xl font-black font-mono text-blue-500 block mt-1">
                  {formatCurrency(currentMerchant.totalPurchases + currentMerchant.totalSales)}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 block">{currentMerchant.totalOrdersCount} طلب منفذ</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A]">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">الأرباح المحققة من التاجر</span>
                <span className="text-xl font-black font-mono text-emerald-500 block mt-1">
                  {formatCurrency(currentMerchant.totalProfits)}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 block">صافي أرباح العمليات</span>
              </div>
            </div>

            {/* Profile Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <Card className="p-4 space-y-3">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-[#27272A]">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span>معلومات النشاط والترخيص</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-zinc-500">اسم المنشأة:</span><span className="font-bold text-zinc-900 dark:text-zinc-100">{currentMerchant.companyName}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">نوع الحساب:</span><Badge variant="orange" size="sm">{currentMerchant.type}</Badge></div>
                  <div className="flex justify-between"><span className="text-zinc-500">التصنيف:</span><span className="font-semibold text-zinc-700 dark:text-zinc-300">{currentMerchant.categoryTag}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">السجل التجاري:</span><span className="font-mono text-zinc-700 dark:text-zinc-300">{currentMerchant.commercialRegister || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">الرقم الضريبي:</span><span className="font-mono text-zinc-700 dark:text-zinc-300">{currentMerchant.taxNumber || '—'}</span></div>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-[#27272A]">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span>وسائل التواصل المعتمدة</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-zinc-500">الهاتف:</span><span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{currentMerchant.phone}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">واتساب:</span><span className="font-mono text-emerald-500">{currentMerchant.whatsapp || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">تيليجرام:</span><span className="font-mono text-blue-400">{currentMerchant.telegram || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">البريد:</span><span className="text-zinc-700 dark:text-zinc-300">{currentMerchant.email || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">العنوان:</span><span className="text-zinc-700 dark:text-zinc-300">{currentMerchant.country} - {currentMerchant.city} ({currentMerchant.address || '—'})</span></div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Account Statement */}
        {activeTab === 'statement' && (
          <div className="space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100">سجل حركات الحساب والقيود</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportStatement}>
                  تصدير Excel
                </Button>
                <Button variant="outline" size="sm" icon={<Printer className="w-3.5 h-3.5 text-orange-500" />} onClick={() => setIsStatementReportOpen(true)}>
                  🖨️ طباعة كشف الحساب
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-3">نوع الحركة</th>
                    <th className="p-3">البيان</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">الرصيد بعد الحركة</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                      <td className="p-3">
                        <Badge variant={t.direction === 'in' ? 'success' : 'danger'} size="sm">
                          {t.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{t.description}</td>
                      <td className={`p-3 font-mono font-bold ${t.direction === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.direction === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(t.balanceAfter)}
                      </td>
                      <td className="p-3 text-zinc-400">{t.performedBy}</td>
                      <td className="p-3 font-mono text-zinc-500">{formatDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Tab 3: Invoices */}
        {activeTab === 'invoices' && (
          <div className="space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100">فواتير التاجر الصادرة والواردة</h4>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsInvoiceModalOpen(true)}
              >
                إنشاء فاتورة جديدة
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {invoices.map(inv => (
                <Card key={inv.id} className="p-4 space-y-3 border border-gray-200 dark:border-[#27272A]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-orange-500" />
                      <span className="font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100">{inv.invoiceNumber}</span>
                    </div>
                    <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'} size="sm">
                      {inv.status === 'paid' ? 'مدفوعة بالكامل' : inv.status === 'overdue' ? 'متأخرة السداد' : 'جزئية / غير مسددة'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                    <div>تاريخ الإصدار: <strong className="text-zinc-700 dark:text-zinc-300">{formatDate(inv.issueDate)}</strong></div>
                    <div>الاستحقاق: <strong className="text-zinc-700 dark:text-zinc-300">{formatDate(inv.dueDate)}</strong></div>
                    <div>طريقة الدفع: <strong className="text-zinc-700 dark:text-zinc-300">{inv.paymentMethod}</strong></div>
                    <div>عدد البنود: <strong className="text-zinc-700 dark:text-zinc-300">{inv.items.length} منتجات</strong></div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between font-mono">
                    <span className="text-xs text-zinc-500">إجمالي الفاتورة:</span>
                    <span className="text-base font-black text-orange-500">{formatCurrency(inv.totalAmount)}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Custom Products & Pricing Rules */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <Card className="p-4">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-orange-500" />
                <span>إضافة سعر خاص مخصص لهذا التاجر</span>
              </h4>
              <form onSubmit={handleAddProductRule} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="اسم المنتج (مثال: PUBG 660 UC)"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                  required
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="السعر القياسي ($)"
                  value={newProdStdPrice}
                  onChange={e => setNewProdStdPrice(e.target.value)}
                  className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="السعر الخاص المخفض ($)"
                  value={newProdSpecPrice}
                  onChange={e => setNewProdSpecPrice(e.target.value)}
                  className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-orange-500/40 p-2 text-orange-500 font-bold outline-none"
                  required
                />
                <Button type="submit" variant="primary" size="sm">
                  تفعيل السعر الخاص
                </Button>
              </form>
            </Card>

            <Card className="overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-3">المنتج</th>
                    <th className="p-3">السعر القياسي</th>
                    <th className="p-3">السعر الخاص للتاجر</th>
                    <th className="p-3">نسبة التخفيض</th>
                    <th className="p-3">الحد الأدنى للطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {productRules.map(r => (
                    <tr key={r.id}>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{r.productName}</td>
                      <td className="p-3 font-mono text-zinc-400 line-through">{formatCurrency(r.standardPrice)}</td>
                      <td className="p-3 font-mono font-black text-orange-500">{formatCurrency(r.specialPrice)}</td>
                      <td className="p-3"><Badge variant="success" size="sm">خصم {r.specialDiscountPercent}%</Badge></td>
                      <td className="p-3 font-mono text-zinc-500">{r.minOrderQuantity} قطع</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Tab 5: Reminders Timeline */}
        {activeTab === 'reminders' && (
          <div className="animate-fade-in">
            <ReminderTimeline
              reminders={reminders}
              onAddReminder={() => setIsReminderModalOpen(true)}
              onCompleteReminder={handleCompleteReminder}
              onDeleteReminder={handleDeleteReminder}
            />
          </div>
        )}

        {/* Tab: Competitions & Rewards */}
        {activeTab === 'competitions' && (() => {
          const participations = db.getCompetitionParticipants().filter(p => p.entityId === currentMerchant.id);
          const merchantRewards = db.getCompetitionRewards().filter(r => r.entityId === currentMerchant.id || (r as any).winnerId === currentMerchant.id);
          const wonCount = participations.filter(p => p.isWinner).length;
          const pendingRewards = merchantRewards.filter(r => r.status === 'pending');
          const deliveredRewards = merchantRewards.filter(r => r.status === 'delivered');
          const totalRewardsVal = merchantRewards.reduce((s, r) => s + (r.prizeValue || 0), 0);
          const totalMarketingExpense = deliveredRewards.reduce((s, r) => s + (r.costEGP || 0), 0);

          return (
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Stats Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                  <span className="text-[10px] text-zinc-400 block font-bold">المسابقات المشارك بها</span>
                  <strong className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {participations.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 block font-bold">المسابقات الفائز بها</span>
                  <strong className="text-base font-black text-amber-500 mt-1 block">
                    {wonCount} 🏆
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 block font-bold">مكافآت قيد التسليم</span>
                  <strong className="text-base font-black text-amber-500 mt-1 block">
                    {pendingRewards.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-500 block font-bold">مكافآت تم تسليمها</span>
                  <strong className="text-base font-black text-emerald-500 mt-1 block">
                    {deliveredRewards.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <span className="text-[10px] text-orange-500 block font-bold">إجمالي قيمة المكافآت</span>
                  <strong className="text-base font-black text-orange-500 mt-1 block">
                    {totalRewardsVal}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] text-rose-500 block font-bold">التكلفة التسويقية</span>
                  <strong className="text-base font-black text-rose-500 mt-1 block">
                    {formatCurrency(totalMarketingExpense)}
                  </strong>
                </div>
              </div>

              {/* Rewards List */}
              <div className="rounded-xl border border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-[#27272A] font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                  <span>سجل الجوائز والمكافآت الخاصة بالتاجر ({merchantRewards.length})</span>
                  <Gift className="w-4 h-4 text-orange-500" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-900/50 text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                      <tr>
                        <th className="p-3">المكافأة</th>
                        <th className="p-3">المسابقة</th>
                        <th className="p-3 text-center">القيمة</th>
                        <th className="p-3 text-center">المحفظة المصدر</th>
                        <th className="p-3 text-center">التكلفة التسويقية</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">تاريخ التسليم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#27272A]">
                      {merchantRewards.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-400">
                            لا توجد جوائز مسجلة لهذا التاجر حتى الآن
                          </td>
                        </tr>
                      ) : (
                        merchantRewards.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-[#18181B]/50">
                            <td className="p-3">
                              <div className="font-bold text-orange-500">{r.prizeName}</div>
                              <span className="text-[10px] text-zinc-400">{r.prizeType}</span>
                            </td>
                            <td className="p-3">{r.competitionTitle}</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-500">
                              {r.prizeValue} {r.currency}
                            </td>
                            <td className="p-3 text-center text-zinc-400">{r.sourceWalletName || '—'}</td>
                            <td className="p-3 text-center font-mono text-rose-400">
                              {formatCurrency(r.costEGP)}
                            </td>
                            <td className="p-3 text-center">
                              {r.status === 'delivered' ? (
                                <Badge variant="success">تم التسليم</Badge>
                              ) : r.status === 'pending' ? (
                                <Badge variant="warning">قيد الانتظار</Badge>
                              ) : (
                                <Badge variant="danger">{r.status}</Badge>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono text-[11px] text-zinc-400">
                              {r.snapshot?.deliveryDate ? formatDateTime(r.snapshot.deliveryDate) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tab: Trust Score */}
        {activeTab === 'trust' && (
          <div className="animate-fade-in">
            <TrustScoreCard
              trustScore={currentMerchant.trustScore || db.calculateMerchantTrustScore(currentMerchant)}
              merchantName={currentMerchant.name}
            />
          </div>
        )}

        {/* Tab 6: Performance & Smart Rating */}
        {activeTab === 'performance' && (
          <div className="animate-fade-in">
            <MerchantPerformanceCard
              performance={currentMerchant.performance}
              merchantName={currentMerchant.name}
            />
          </div>
        )}

        {/* Tab 7: Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                placeholder="أضف ملاحظة إدارية أو مالية خاصة بهذا التاجر..."
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                className="flex-1 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none"
              />
              <Button type="submit" variant="primary" icon={<Plus className="w-4 h-4" />}>
                إضافة
              </Button>
            </form>

            <div className="space-y-2">
              {notes.map(n => (
                <div key={n.id} className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-start justify-between">
                  <div>
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold">{n.content}</p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">بواسطة: {n.createdBy} • {formatDateTime(n.createdAt)}</span>
                  </div>
                  <button onClick={() => { db.deleteMerchantNote(n.id); loadMerchantData(); }} className="text-zinc-400 hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 8: Attached Files */}
        {activeTab === 'files' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#27272A] bg-gray-50/50 dark:bg-[#141417]/50">
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">إرفاق عقود، صور، أو فواتير رسمية</h4>
                <p className="text-[11px] text-zinc-400">يدعم PDF, Excel, Word, والصور</p>
              </div>
              <label className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs cursor-pointer hover:bg-orange-600 transition-colors flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>اختيار ملف</span>
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {files.map(f => (
                <div key={f.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Paperclip className="w-4 h-4 text-orange-500" />
                    <div>
                      <h5 className="font-bold text-zinc-900 dark:text-zinc-100">{f.fileName}</h5>
                      <span className="text-[10px] text-zinc-400">{f.fileSize} • {formatDate(f.uploadedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => { db.deleteMerchantFile(f.id); loadMerchantData(); }} className="text-zinc-400 hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Creator Modal */}
      <MerchantInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSave={handleSaveInvoice}
        merchant={currentMerchant}
      />

      {/* Reminder Scheduler Modal */}
      <MerchantReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSave={handleSaveReminder}
        merchant={currentMerchant}
      />

      {/* 🖨️ Professional Statement Report Modal */}
      {isStatementReportOpen && (
        <ReportGeneratorModal
          isOpen={isStatementReportOpen}
          onClose={() => setIsStatementReportOpen(false)}
          defaultTemplateType="merchants_statement"
          customPayload={currentMerchant}
        />
      )}
    </Modal>
  );
};
