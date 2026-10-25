import React, { useState, useEffect, useMemo } from 'react';
import {
  Dealer,
  DealerNote,
  DealerReferral,
  DealerProfileType,
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier
} from '../../types/dealer.types';
import { CustomerTicket, UnifiedWalletTransaction } from '../../types/customer.types';
import { Coupon } from '../../types/topup.types';
import { db } from '../../database/db';
import { DealerStatisticsService } from '../../services/dealer/dealerStatisticsService';
import { DealerPerformanceService } from '../../services/dealer/dealerPerformanceService';
import { WalletExpirationService } from '../../services/wallet/walletExpirationService';
import { ExpiredBalanceManagementModal } from '../../components/common/ExpiredBalanceManagementModal';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../../components/common/SortableDraggableItem';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import {
  Wallet,
  Share2,
  Ticket,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  Award,
  Lock,
  Unlock,
  Printer,
  Receipt,
  MessageSquare,
  Activity,
  Settings,
  Search,
  Copy,
  Check,
  MapPin,
  ShieldCheck,
  ImageIcon,
  Edit2,
  Eye,
  Gift,
  Gamepad2,
  Globe,
  Trophy
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { copyTicketInvoiceToClipboard } from '../../utils/invoiceImageGenerator';
import { PrintInvoiceModal } from '../../components/common/PrintInvoiceModal';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { DealerFormModal } from './DealerFormModal';
import { TicketDetailsModal } from '../tickets/TicketDetailsModal';
import { BalanceWithdrawal } from '../../types/finance.types';
import { NewWithdrawalTicketModal } from '../../components/finance/NewWithdrawalTicketModal';
import { WithdrawalInvoiceModal } from '../../components/finance/WithdrawalInvoiceModal';
import { CustomerCashbackTransferModal } from '../customers/CustomerCashbackTransferModal';

interface DealerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealer: Dealer | null;
  onDealerUpdated: () => void;
  onOpenNewTicket?: (dealer: Dealer) => void;
}

interface DealerProfileModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  dealer: Dealer;
  onDealerUpdated: () => void;
  onOpenNewTicket?: (dealer: Dealer) => void;
}

const DealerProfileModalContent: React.FC<DealerProfileModalContentProps> = ({
  isOpen,
  onClose,
  dealer,
  onDealerUpdated,
  onOpenNewTicket
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { getOrderedItems } = useLayoutOrder();
  const isOwner = user?.role === 'admin';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'wallet' | 'referrals' | 'coupons' | 'commercial' | 'notes' | 'activity' | 'withdrawals' | 'competitions'>('overview');
  const [isStatementReportOpen, setIsStatementReportOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isCashbackTransferModalOpen, setIsCashbackTransferModalOpen] = useState(false);
  const [selectedWithdrawalForInvoice, setSelectedWithdrawalForInvoice] = useState<BalanceWithdrawal | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const dealerWithdrawals = useMemo(() => {
    return db.getDealerBalanceWithdrawals(dealer.id);
  }, [dealer.id, refreshTrigger, isOpen]);

  const dealerRewards = useMemo(() => {
    return db.getCompetitionRewards().filter(
      r => r.entityId === dealer.id || (r as any).winnerId === dealer.id || (r.entityPhone && dealer.phone && r.entityPhone === dealer.phone)
    );
  }, [dealer.id, dealer.phone, refreshTrigger, isOpen]);

  const dealerCompetitions = useMemo(() => {
    return db.getCompetitions().filter(
      c => c.targetAudience?.type === 'merchants' || c.targetAudience?.type === 'selected_merchants' || c.targetAudience?.type === 'both' || c.targetAudience?.type === 'all' || (c.targetAudience as any) === 'dealers' || (c.targetAudience as any) === 'all'
    );
  }, [refreshTrigger, isOpen]);

  // Sub-data
  const [notes, setNotes] = useState<DealerNote[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [referrals, setReferrals] = useState<DealerReferral[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<UnifiedWalletTransaction[]>([]);
  const [dealerCoupons, setDealerCoupons] = useState<Coupon[]>([]);

  // Dealer Coupon Creation Modal
  const [isCompCouponModalOpen, setIsCompCouponModalOpen] = useState(false);
  const [compAmount, setCompAmount] = useState<number>(50);
  const [compDiscountType, setCompDiscountType] = useState<'percentage' | 'fixed_amount'>('fixed_amount');
  const [compReason, setCompReason] = useState<string>('كوبون خصم وتخفيض خاص لتاجر الجملة');
  const [compGameId, setCompGameId] = useState<string>('all');
  const games = useMemo(() => db.getGameTree().filter(g => g.isActive !== false), []);

  // Print Invoice Modal
  const [printingTicket, setPrintingTicket] = useState<CustomerTicket | null>(null);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<CustomerTicket | null>(null);

  // Ticket Search & Filters
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');

  // Wallet Filter
  const [walletFilter, setWalletFilter] = useState<'all' | 'cashback' | 'referral' | 'account_balance'>('all');

  // Owner Debt Clearance State
  const [isClearDebtModalOpen, setIsClearDebtModalOpen] = useState(false);
  const [isClearingDebt, setIsClearingDebt] = useState(false);

  // New Note
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<DealerNote['type']>('general');

  // Rates & Target Modal
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editFirstMonthRate, setEditFirstMonthRate] = useState(dealer.firstMonthCommissionRate || 3.0);
  const [editLifetimeRate, setEditLifetimeRate] = useState(dealer.lifetimeCommissionRate || 1.0);
  const [editMonthlyTarget, setEditMonthlyTarget] = useState(dealer.monthlyTargetCount || 10);
  const [editCreditLimit, setEditCreditLimit] = useState(dealer.creditLimitEGP || 10000);
  const [editCashbackRate, setEditCashbackRate] = useState(dealer.cashbackRate || 0.5);

  // Manual Credit Adjustment Modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Full Dealer Edit Modal (Admin Only)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Expired Balance Management Modal (Modification #6)
  const [isExpiredBalanceModalOpen, setIsExpiredBalanceModalOpen] = useState(false);
  const [expiredModalWalletType, setExpiredModalWalletType] = useState<'cashback' | 'referral'>('cashback');

  // Copy helper
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = async (text: string, field: string, label?: string) => {
    const success = await copyToClipboard(text, label || text, showToast);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCopyReferralWhatsApp = async (referralCode: string) => {
    const settings = db.getCustomerModuleSettings();
    const tpl =
      settings.referralCodeMessageTemplate ||
      `مرحبًا،

استخدم كود الإحالة التالي للحصول على المزايا والخصومات الحصرية:

{code}

شكرًا لاستخدام خدماتنا.`;

    const formattedMsg = tpl
      .replace(/{code}/g, referralCode)
      .replace(/{{كود_الإحالة}}/g, referralCode)
      .replace(/{name}/g, dealer.name)
      .replace(/{{اسم_العميل}}/g, dealer.name);

    await copyToClipboard(formattedMsg, 'رسالة كود الإحالة للمشاركة', showToast);
  };

  // Load Sub-Data
  const loadSubData = () => {
    db.recalculateDealerProfile(dealer.id);
    const dNotes = db.getDealerNotes(dealer.id);
    setNotes(dNotes);

    const allTickets = [...db.getTickets(), ...db.getDealerTickets()];
    const dTickets = allTickets.filter(
      t => t.customerId === dealer.id || (dealer.phone && t.customerPhone === dealer.phone)
    );
    setTickets(dTickets);

    const dRefs = db.getDealerReferrals(dealer.id);
    setReferrals(dRefs);

    const dTx = db.getDealerUnifiedWalletTransactions(dealer.id);
    setWalletTransactions(dTx);

    const allCoupons = db.getCoupons();
    const dCoupons = allCoupons.filter(
      c => (c.targetDealerId && c.targetDealerId === dealer.id) ||
           (c.targetCustomerId && c.targetCustomerId === dealer.id) ||
           (c.targetDealerPhone && dealer.phone && c.targetDealerPhone === dealer.phone) ||
           (c.targetCustomerPhone && dealer.phone && c.targetCustomerPhone === dealer.phone)
    );
    setDealerCoupons(dCoupons);
  };

  const handleCreateDealerCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = `DLR-${(dealer.code || 'VIP').replace(/[^A-Z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const selectedGame = games.find(g => g.id === compGameId);

    const payload: Coupon = {
      id: 'cpn_dlr_' + Date.now(),
      code,
      title: compGameId !== 'all' && selectedGame
        ? `كوبون خصم تاجر الجملة ${dealer.name} (لعبة ${selectedGame.name})`
        : `كوبون خصم تاجر الجملة ${dealer.name}`,
      type: 'customer_specific',
      discountType: compDiscountType,
      discountValue: compAmount,
      targetDealerId: dealer.id,
      targetDealerName: dealer.name,
      targetDealerPhone: dealer.phone,
      targetCustomerId: dealer.id,
      targetCustomerName: dealer.name,
      targetCustomerPhone: dealer.phone,
      targetAudience: 'dealers',
      applicableGameId: compGameId !== 'all' ? compGameId : undefined,
      applicableGameName: compGameId !== 'all' && selectedGame ? selectedGame.name : undefined,
      compensationReason: compReason.trim(),
      maxUsageTotal: 1,
      currentUsageCount: 0,
      maxUsagePerCustomer: 1,
      usedByPlayerGameIds: [],
      isActive: true,
      isAutoDeactivated: false,
      createdAt: new Date().toISOString()
    };

    db.saveCoupon(payload);

    const gameNotePart = compGameId !== 'all' && selectedGame ? ` مخصص حصرياً للعبة [${selectedGame.name}]` : ' متاح لكافة الألعاب';
    db.addDealerNote({
      dealerId: dealer.id,
      authorName: user?.fullName || 'المدير المالك',
      authorRole: 'إدارة النظام',
      content: `🎁 تم إصدار كوبون خصم تاجر جملة بقيمة (${compAmount} ${compDiscountType === 'percentage' ? '%' : 'ج'})${gameNotePart}. الكود: [${code}]. السبب: ${compReason.trim()}`,
      type: 'financial'
    });

    showToast('success', 'تم إنشاء الكوبون للتاجر', `كود الكوبون: ${code}`);
    setIsCompCouponModalOpen(false);
    setCompGameId('all');
    loadSubData();
    onDealerUpdated();
  };

  const handleCopyDealerCouponWhatsApp = async (cpn: Coupon) => {
    const gameRestrictionText = cpn.applicableGameName
      ? `🎮 مخصص حصرياً لشحن لعبة: ${cpn.applicableGameName} فقط!`
      : `🌟 صالح للاستخدام في شحن كافة ألعاب الجملة مباشرة!`;

    const formattedMsg = `🏪 مرحباً بشريكنا التاجر ${dealer.name}! ✨
يسعدنا تزويدك بكوبون خصم خاص لعمليات شحن الجملة:
🎁 كود الكوبون: ${cpn.code}
💰 قيمة الخصم: ${cpn.discountValue} ${cpn.discountType === 'percentage' ? '%' : 'ج.م'}
${gameRestrictionText}
📝 البيان: ${cpn.compensationReason || 'خصم خاص'}
━━━━━━━━━━━━━━━
NZM JKR Wholesale System 🌟`;

    await copyToClipboard(formattedMsg, 'رسالة الكوبون للتاجر', showToast);
  };

  useEffect(() => {
    loadSubData();
  }, [dealer.id]);

  // Performance Summary
  const perfSummary = useMemo(() => {
    const allDealers = db.getDealers(true);
    return DealerPerformanceService.evaluateDealer(dealer, allDealers);
  }, [dealer]);

  // Expiration & Breakage Summary (Modification #6)
  const dealerExpirySummary = useMemo(() => {
    return WalletExpirationService.getDealerExpirySummary(dealer, walletTransactions);
  }, [dealer, walletTransactions]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch =
        !ticketSearch ||
        t.ticketNumber.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.gameName.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.playerGameId.toLowerCase().includes(ticketSearch.toLowerCase());

      const matchStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [tickets, ticketSearch, ticketStatusFilter]);

  // Filtered Wallet Transactions
  const filteredWalletTx = useMemo(() => {
    if (walletFilter === 'all') return walletTransactions;
    return walletTransactions.filter(t => t.walletType === walletFilter);
  }, [walletTransactions, walletFilter]);

  // Save Rates & Target
  const handleSaveRatesAndTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Dealer = {
      ...dealer,
      firstMonthCommissionRate: Number(editFirstMonthRate),
      lifetimeCommissionRate: Number(editLifetimeRate),
      monthlyTargetCount: Number(editMonthlyTarget),
      creditLimitEGP: Number(editCreditLimit),
      cashbackRate: Number(editCashbackRate),
      updatedAt: new Date().toISOString()
    };
    db.saveDealer(updated);
    showToast('success', 'تم التحديث', 'تم حفظ وتحديث نسب العمولات والحد الائتماني بنجاح');
    setIsRatesModalOpen(false);
    onDealerUpdated();
  };

  // Toggle Freeze Status
  const handleToggleFreeze = () => {
    const isNowFrozen = !dealer.isFrozen;
    const updated: Dealer = {
      ...dealer,
      isFrozen: isNowFrozen,
      freezeReason: isNowFrozen ? 'تجميد إداري مؤقت بواسطة الإدارة' : undefined,
      updatedAt: new Date().toISOString()
    };
    db.saveDealer(updated);
    showToast(
      isNowFrozen ? 'warning' : 'success',
      isNowFrozen ? 'تم تجميد الحساب' : 'تم تنشيط الحساب',
      `حساب التاجر ${dealer.name} أصبح الآن ${isNowFrozen ? 'مجمداً' : 'نشطاً'}`
    );
    onDealerUpdated();
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    db.addDealerNote({
      dealerId: dealer.id,
      authorName: user?.fullName || 'المدير المسؤول',
      authorRole: user?.role || 'admin',
      content: noteContent.trim(),
      type: noteType
    });

    setNoteContent('');
    loadSubData();
    onDealerUpdated();
    showToast('success', 'تمت الإضافة', 'تم تسجيل الملاحظة في ملف التاجر');
  };

  // Delete Note
  const handleDeleteNote = (noteId: string) => {
    db.deleteDealerNote(noteId);
    loadSubData();
    onDealerUpdated();
    showToast('info', 'تم الحذف', 'تم حذف الملاحظة من سجل التاجر');
  };

  // Handle Manual Credit Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentAmount || adjustmentAmount <= 0) {
      showToast('error', 'المبلغ غير صالح', 'يرجى إدخال مبلغ أكبر من الصفر');
      return;
    }

    const before = dealer.accountBalance || 0;
    const finalAmount = adjustmentType === 'credit' ? adjustmentAmount : -adjustmentAmount;
    const newBal = before + finalAmount;
    const updated: Dealer = {
      ...dealer,
      accountBalance: newBal,
      updatedAt: new Date().toISOString()
    };
    db.saveDealer(updated);

    db.addDealerUnifiedWalletTransaction({
      customerId: dealer.id,
      walletType: 'account_balance',
      type: adjustmentType === 'credit' ? 'credit' : 'debit',
      operationName: `تسوية رصيد يدوي: ${adjustmentReason || (adjustmentType === 'credit' ? 'إضافة رصيد دائن' : 'خصم رصيد مدين')}`,
      amount: adjustmentAmount,
      balanceAfter: newBal
    });

    setIsAdjustmentModalOpen(false);
    setAdjustmentAmount(0);
    setAdjustmentReason('');
    loadSubData();
    onDealerUpdated();
    showToast('success', 'تمت التسوية', `تم تحديث رصيد التاجر بمبلغ ${adjustmentAmount} ج`);
  };

  // Owner Primary Debt Clearance (تصفية وشطب العجز المالي للتاجر بقرار المالك)
  const handleConfirmClearDebt = () => {
    if (!isOwner || (dealer.accountBalance || 0) >= 0) return;
    setIsClearingDebt(true);
    try {
      const res = db.clearDealerPrimaryDebt(dealer.id, user?.fullName || 'المالك');
      if (res.success) {
        showToast('success', 'تم شطب العجز', res.message);
        setIsClearDebtModalOpen(false);
        loadSubData();
        onDealerUpdated();
      } else {
        showToast('error', 'فشلت التصفية', res.message);
      }
    } catch (err: any) {
      showToast('error', 'خطأ أثناء التصفية', err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsClearingDebt(false);
    }
  };

  // Helper Labels
  const getProfileTypeBadge = (type: DealerProfileType) => {
    switch (type) {
      case 'distributor':
        return <Badge variant="orange">موزع معتمد (Distributor)</Badge>;
      case 'vip_dealer':
        return <Badge variant="warning">تاجر VIP (VIP Dealer)</Badge>;
      case 'shop':
        return <Badge variant="info">متجر / كشك (Shop)</Badge>;
      case 'agent':
        return <Badge variant="success">وكيل شحن (Agent)</Badge>;
      default:
        return <Badge variant="default">تاجر عادي (Regular)</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="4xl"
    >
      <div className="space-y-6 text-right" dir="rtl">
        {/* Profile Header Banner */}
        <div className="relative p-6 rounded-3xl bg-linear-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20 shrink-0">
                {dealer.name[0]}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100">{dealer.name}</h2>
                  {getProfileTypeBadge(dealer.profileType)}
                  {dealer.isFrozen && <Badge variant="danger">حساب مجمد ❄️</Badge>}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <button
                    type="button"
                    onClick={() => handleCopy(dealer.code, 'code', `كود التاجر (${dealer.code})`)}
                    className="flex items-center gap-1 hover:text-amber-500 transition-colors font-mono cursor-pointer"
                  >
                    <span>كود: {dealer.code}</span>
                    {copiedField === 'code' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(dealer.phone, 'phone', `رقم هاتف التاجر (${dealer.phone})`)}
                    className="flex items-center gap-1 hover:text-amber-500 transition-colors font-mono cursor-pointer"
                    dir="ltr"
                  >
                    <span>{dealer.phone}</span>
                    {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>

                  {dealer.businessName && (
                    <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      {dealer.businessName}
                    </span>
                  )}

                  {dealer.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {dealer.city}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {onOpenNewTicket && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Ticket className="w-4 h-4" />}
                  onClick={() => {
                    onClose();
                    onOpenNewTicket(dealer);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  طلب جملة جديد 🛒
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                icon={<Receipt className="w-4 h-4 text-amber-500" />}
                onClick={() => setIsStatementReportOpen(true)}
              >
                كشف حساب PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<Settings className="w-4 h-4 text-zinc-400" />}
                onClick={() => setIsRatesModalOpen(true)}
              >
                إعدادات الجملة
              </Button>

              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit2 className="w-4 h-4 text-amber-500" />}
                  onClick={() => setIsEditModalOpen(true)}
                  className="border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white"
                >
                  تعديل البيانات ✏️
                </Button>
              )}

              <Button
                variant={dealer.isFrozen ? 'success' : 'outline'}
                size="sm"
                icon={dealer.isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4 text-rose-500" />}
                onClick={handleToggleFreeze}
              >
                {dealer.isFrozen ? 'إلغاء التجميد' : 'تجميد الحساب'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Drag & Drop Reorderable) */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 dark:border-[#232328] pb-1 no-scrollbar">
          {getOrderedItems('dealer_profile_tabs', [
            { id: 'overview', label: '1. نظرة عامة والملخص', icon: Activity },
            { id: 'tickets', label: `2. تذاكر الجملة (${tickets.length})`, icon: Ticket },
            { id: 'wallet', label: `3. الحساب المالي والمحافظ`, icon: Wallet },
            { id: 'referrals', label: `4. الإحالات والشراكة (${referrals.length})`, icon: Share2 },
            { id: 'coupons', label: `5. الكوبونات والخصومات (${dealerCoupons.length})`, icon: Gift },
            { id: 'commercial', label: '6. النشاط والعقود', icon: Building2 },
            { id: 'notes', label: `7. الملاحظات (${notes.length})`, icon: MessageSquare },
            { id: 'activity', label: '8. سجل الرقابة', icon: ShieldCheck },
            { id: 'withdrawals', label: `9. السحوبات (${dealerWithdrawals.length})`, icon: Receipt },
            { id: 'competitions', label: `10. المسابقات والمكافآت (${dealerRewards.length})`, icon: Trophy }
          ]).map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <SortableDraggableItem
                key={tab.id}
                id={tab.id}
                index={idx}
                containerId="dealer_profile_tabs"
                direction="horizontal"
                className="shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              </SortableDraggableItem>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-linear-to-br from-amber-500/5 to-transparent border-amber-500/20">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">إجمالي مشتريات الجملة</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(dealer.totalSpent)}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-1">عدد الطلبيات: {dealer.totalOrders}</span>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-bold">المحفظة الأساسية (الرصيد)</span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsAdjustmentModalOpen(true)}
                      className="text-amber-500 hover:text-amber-400 font-bold underline cursor-pointer text-[10px]"
                      title="تسوية رصيد المحفظة الأساسية يدوياً"
                    >
                      تعديل ⚙️
                    </button>
                  )}
                </div>
                <span className={`text-xl font-black block ${(dealer.accountBalance || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(dealer.accountBalance || 0)}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-1">
                  {(dealer.accountBalance || 0) >= 0 ? 'رصيد دائن متاح' : 'عجز سداد مدين ⚠️'}
                </span>
                {isOwner && (dealer.accountBalance || 0) < 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearDebtModalOpen(true)}
                    className="mt-2 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black cursor-pointer shadow-xs block w-full text-center transition-all animate-pulse"
                  >
                    ⚠️ تصفية وشطب العجز ({dealer.accountBalance} ج)
                  </button>
                )}
              </Card>

              <Card className={`p-4 transition-all ${
                dealerExpirySummary.cashbackExpired > 0 ? 'border-amber-500/50 bg-amber-500/5' : ''
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-bold">رصيد كاش باك الجملة</span>
                  {dealerExpirySummary.cashbackExpired > 0 && (
                    <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold font-mono px-1 rounded animate-pulse" title="يوجد رصيد منتهي الصلاحية">
                      ⚠️ {formatCurrency(dealerExpirySummary.cashbackExpired)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-cyan-500 block">
                    {formatCurrency(dealer.cashbackBalance || 0)}
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsCashbackTransferModalOpen(true)}
                      className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold hover:bg-cyan-500 hover:text-white transition-all text-[9px] flex items-center gap-0.5 cursor-pointer"
                      title="إصدار تذكرة تحويل واستبدال كاش باك تاجر رسمي"
                    >
                      تحويل رسمي ⇄
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                  <span>{dealerExpirySummary.cashbackExpired > 0 ? `صالح: ${formatCurrency(dealerExpirySummary.cashbackValid)}` : `نسبة الحافز: ${dealer.cashbackRate || 0.5}%`}</span>
                  {isOwner && dealerExpirySummary.cashbackExpired > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpiredModalWalletType('cashback');
                        setIsExpiredBalanceModalOpen(true);
                      }}
                      className="text-amber-500 hover:text-amber-400 font-black cursor-pointer underline text-[10px] animate-pulse"
                      title="إدارة كاش باك التاجر منتهي الصلاحية"
                    >
                      إدارة المنتهي ⚠️
                    </button>
                  )}
                </div>
              </Card>

              <Card className={`p-4 transition-all ${
                dealerExpirySummary.referralExpired > 0 ? 'border-amber-500/50 bg-amber-500/5' : ''
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-bold">رصيد عمولات الإحالة</span>
                  {dealerExpirySummary.referralExpired > 0 && (
                    <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold font-mono px-1 rounded animate-pulse" title="يوجد رصيد منتهي الصلاحية">
                      ⚠️ {formatCurrency(dealerExpirySummary.referralExpired)}
                    </span>
                  )}
                </div>
                <span className="text-xl font-black text-purple-500 block">
                  {formatCurrency(dealer.referralWalletBalance || 0)}
                </span>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                  <span>{dealerExpirySummary.referralExpired > 0 ? `صالح: ${formatCurrency(dealerExpirySummary.referralValid)}` : `المكتسب: ${formatCurrency(dealer.totalReferralCommissionEarned || 0)}`}</span>
                  {isOwner && dealerExpirySummary.referralExpired > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpiredModalWalletType('referral');
                        setIsExpiredBalanceModalOpen(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 font-black cursor-pointer underline text-[10px] animate-pulse"
                      title="إدارة عمولات إحالة التاجر منتهية الصلاحية"
                    >
                      إدارة المنتهي ⚠️
                    </button>
                  )}
                </div>
              </Card>
            </div>

            {/* Profile Statistics & Classification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-zinc-100 border-b border-gray-100 dark:border-[#232328] pb-3">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>تصنيف التاجر وقوة الشراء</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">مستوى الولاء (Loyalty Tier):</span>
                    <Badge variant={dealer.loyaltyTier === 'vip' ? 'warning' : 'orange'}>
                      {dealer.loyaltyTier === 'vip' ? '👑 VIP (+100 طلبية)' : dealer.loyaltyTier === 'gold' ? '🥇 ذهبي (30-99)' : dealer.loyaltyTier === 'silver' ? '🥈 فضي (10-29)' : 'عادي'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">القوة الشرائية بالجملة:</span>
                    <Badge variant={dealer.purchasingPower === 'whale' ? 'success' : 'info'}>
                      {dealer.purchasingPower === 'whale' ? '🐋 حوت (Whale +10,000 ج)' : dealer.purchasingPower === 'strong' ? '💪 قوي (5,000-9,999 ج)' : dealer.purchasingPower === 'medium' ? 'متوسط (2,000-4,999 ج)' : 'عادي'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">الحد الأقصى لطلبية واحدة:</span>
                    <span className="font-bold text-gray-900 dark:text-zinc-100">
                      {formatCurrency(dealer.maxSingleOrderAmount || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">الحد الائتماني للدين (Credit Limit):</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(dealer.creditLimitEGP || 10000)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">اللعبة الأكثر طلباً:</span>
                    <span className="font-bold text-gray-900 dark:text-zinc-100">
                      {dealer.favoriteGame || 'Free Fire'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Partnership & Referral Summary */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-zinc-100 border-b border-gray-100 dark:border-[#232328] pb-3">
                  <Share2 className="w-4 h-4 text-amber-500" />
                  <span>برنامج الإحالة والشراكة</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">كود الإحالة الخاص بالتاجر:</span>
                    <span className="font-mono font-bold text-amber-500">{dealer.referralCode}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">المُحيل (Referred By):</span>
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">
                      {dealer.referredByName || dealer.referredByCode || 'تسجيل مباشر'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">التارجت الشهري:</span>
                    <span className="font-bold text-gray-900 dark:text-zinc-100">
                      {perfSummary.monthlyNewReferredCount} / {perfSummary.monthlyTarget} تجار ({perfSummary.achievementPercentage}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">عمولة أول 30 يوماً / مدى الحياة:</span>
                    <span className="font-bold text-emerald-500">
                      {dealer.firstMonthCommissionRate || 3.0}% / {dealer.lifetimeCommissionRate || 1.0}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">حالة الشراكة:</span>
                    <Badge variant={perfSummary.status === 'active' ? 'success' : 'danger'}>
                      {perfSummary.statusText}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Tickets */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="بحث برقم التذكرة أو اللعبة أو معرف اللاعب..."
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] rounded-xl pr-9 pl-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={ticketStatusFilter}
                onChange={e => setTicketStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="all">جميع الحالات ({tickets.length})</option>
                <option value="completed">مكتملة</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="problem">مشكلة</option>
                <option value="refunded">مستردة</option>
              </select>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
                <p className="text-sm font-semibold">لا توجد طلبيات تطابق الفلتر</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-[#27272A] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#151519] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">رقم التذكرة</th>
                      <th className="p-3">اللعبة والباقات</th>
                      <th className="p-3">المعرف (Player ID)</th>
                      <th className="p-3">المبلغ بالجملة</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A] bg-white dark:bg-[#101014]">
                    {filteredTickets.map(t => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicketForDetails(t)}
                        className="hover:bg-gray-50 dark:hover:bg-[#18181D] transition-colors cursor-pointer group/dealer-ticket"
                        title="انقر لعرض تفاصيل التذكرة بالكامل"
                      >
                        <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400 underline decoration-dotted underline-offset-2">
                          #{t.ticketNumber}
                        </td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-zinc-100">
                          {t.gameProductName || t.gameName}
                          {t.items && t.items.length > 1 && (
                            <span className="text-[10px] text-zinc-400 mr-1">({t.items.length} باقات)</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-zinc-400">{t.playerGameId || '-'}</td>
                        <td className="p-3 font-bold text-gray-900 dark:text-zinc-100">
                          {formatCurrency(t.receivedAmount || t.requiredAmount || 0)}
                        </td>
                        <td className="p-3">
                          <Badge variant={t.status === 'completed' ? 'success' : t.status === 'problem' ? 'danger' : 'warning'}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-zinc-400">{formatDate(t.createdAt)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5 text-blue-500" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketForDetails(t);
                              }}
                              title="عرض تفاصيل التذكرة بالكامل"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<ImageIcon className="w-3.5 h-3.5 text-amber-500" />}
                              onClick={async (e) => {
                                e.stopPropagation();
                                showToast('info', 'جاري تجهيز صورة الفاتورة...', 'يتم التقاط الفاتورة بدقة عالية');
                                const res = await copyTicketInvoiceToClipboard(t, db.getCustomerModuleSettings());
                                if (res.success) {
                                  showToast('success', 'تم نسخ صورة الفاتورة 🖼️', 'يمكنك الآن لصقها (Ctrl+V) في واتساب');
                                }
                              }}
                              title="نسخ الفاتورة كـ صورة (Ctrl+V في واتساب)"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Printer className="w-3.5 h-3.5" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintingTicket(t);
                              }}
                              title="طباعة وتصدير الفاتورة"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Wallet & Financial Ledger */}
        {activeTab === 'wallet' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">حساب الرصيد الدائن والمديونيات</h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  الرصيد الحالي: <span className="font-bold font-mono text-amber-500">{formatCurrency(dealer.accountBalance || 0)}</span> • الحد الائتماني: {formatCurrency(dealer.creditLimitEGP || 10000)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isOwner && (dealer.accountBalance || 0) < 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsClearDebtModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold animate-pulse cursor-pointer"
                  >
                    ⚠️ تصفية وشطب العجز ({dealer.accountBalance} ج)
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsAdjustmentModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  تسوية رصيد يدوي
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<Receipt className="w-3.5 h-3.5 text-amber-500" />}
                  onClick={() => setIsStatementReportOpen(true)}
                >
                  كشف حساب PDF
                </Button>
              </div>
            </div>

            {/* 3 Isolated Dealer Wallets Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Primary Wallet (المحفظة الأساسية) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                (dealer.accountBalance || 0) < 0
                  ? 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/20 shadow-xs'
                  : (dealer.accountBalance || 0) > 0
                  ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-950/20 shadow-xs'
                  : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <span>المحفظة الأساسية</span>
                  </span>
                  <Badge
                    variant={(dealer.accountBalance || 0) < 0 ? 'danger' : (dealer.accountBalance || 0) > 0 ? 'info' : 'default'}
                    size="sm"
                  >
                    {(dealer.accountBalance || 0) < 0
                      ? '⚠️ عجز سداد مدين'
                      : (dealer.accountBalance || 0) > 0
                      ? 'رصيد دائن متاح'
                      : 'رصيد متزن 0 ج'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    (dealer.accountBalance || 0) < 0
                      ? 'text-rose-500'
                      : (dealer.accountBalance || 0) > 0
                      ? 'text-blue-500'
                      : 'text-zinc-400'
                  }`}>
                    {formatCurrency(dealer.accountBalance || 0)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isOwner && (dealer.accountBalance || 0) < 0 && (
                      <button
                        type="button"
                        onClick={() => setIsClearDebtModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1 animate-pulse"
                        title="شطب العجز وتصفية المحفظة بأمر المالك"
                      >
                        <span>تصفية المحفظة ⚠️</span>
                      </button>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setIsAdjustmentModalOpen(true)}
                        className="text-xs text-blue-500 hover:underline cursor-pointer font-bold px-1"
                      >
                        تعديل ⚙️
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  تستقبل إيداعات التاجر وعجز السداد السالب أو الفائض. تسوية العجز تتم تلقائياً مع أي زيادة لاحقة.
                </p>
              </div>

              {/* 2. Cashback Wallet (محفظة الكاش باك) */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 dark:bg-emerald-950/10 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    <span>كاش باك تاجر الجملة</span>
                  </span>
                  <Badge variant="success" size="sm">
                    {dealer.cashbackRate ?? 0.5}% حافز كاش باك
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
                  <span className="text-2xl font-black font-mono text-emerald-500">
                    {formatCurrency(dealer.cashbackBalance || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                  <span>منفصلة تماماً (حوافز مبيعات الجملة)</span>
                  <span>المكتسب: {formatCurrency(dealer.totalCashbackEarned || 0)}</span>
                </div>
                {dealerExpirySummary.cashbackExpired > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[10px] animate-fade-in">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <span>⚠️ رصيد منتهي (6 شهور):</span>
                      <span className="font-mono text-rose-400 font-black">{formatCurrency(dealerExpirySummary.cashbackExpired)}</span>
                      <span className="text-zinc-400 font-normal">(صالح: {formatCurrency(dealerExpirySummary.cashbackValid)})</span>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpiredModalWalletType('cashback');
                          setIsExpiredBalanceModalOpen(true);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-zinc-900 font-black cursor-pointer shadow-xs transition-all"
                      >
                        إدارة الرصيد ⚙️
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Referral Wallet (محفظة الإحالة) */}
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 dark:bg-purple-950/10 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <span>عمولات الإحالة والتوزيع</span>
                  </span>
                  <Badge variant="purple" size="sm">
                    {referrals.length} شريك محال
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
                  <span className="text-2xl font-black font-mono text-purple-400">
                    {formatCurrency(dealer.referralWalletBalance || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                  <span>منفصلة تماماً (عمولات توزيع الشركاء)</span>
                  <span>المكتسب: {formatCurrency(dealer.totalReferralCommissionEarned || 0)}</span>
                </div>
                {dealerExpirySummary.referralExpired > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-[10px] animate-fade-in">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <span>⚠️ رصيد منتهي (12 شهر):</span>
                      <span className="font-mono text-rose-400 font-black">{formatCurrency(dealerExpirySummary.referralExpired)}</span>
                      <span className="text-zinc-400 font-normal">(صالح: {formatCurrency(dealerExpirySummary.referralValid)})</span>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpiredModalWalletType('referral');
                          setIsExpiredBalanceModalOpen(true);
                        }}
                        className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer shadow-xs transition-all"
                      >
                        إدارة الرصيد ⚙️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expiry Warning Banner if any */}
            {(dealerExpirySummary.cashbackExpired > 0 || dealerExpirySummary.referralExpired > 0) && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-amber-600 dark:text-amber-400">تنبيه: توجد أرصدة منتهية الصلاحية للتاجر</h5>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                      {dealerExpirySummary.cashbackExpired > 0 && (
                        <span>كاش باك منتهي: <strong className="text-rose-500 font-mono">{formatCurrency(dealerExpirySummary.cashbackExpired)}</strong></span>
                      )}
                      {dealerExpirySummary.referralExpired > 0 && (
                        <span>إحالة منتهية: <strong className="text-rose-500 font-mono">{formatCurrency(dealerExpirySummary.referralExpired)}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-2">
                    {dealerExpirySummary.cashbackExpired > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExpiredModalWalletType('cashback');
                          setIsExpiredBalanceModalOpen(true);
                        }}
                        className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 text-xs font-bold"
                      >
                        إدارة كاش باك المنتهي ⚙️
                      </Button>
                    )}
                    {dealerExpirySummary.referralExpired > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExpiredModalWalletType('referral');
                          setIsExpiredBalanceModalOpen(true);
                        }}
                        className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 text-xs font-bold"
                      >
                        إدارة إحالة المنتهية ⚙️
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">تصفية السجل:</span>
              {(['all', 'account_balance', 'cashback', 'referral'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setWalletFilter(w)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    walletFilter === w
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {w === 'all' ? 'الكل' : w === 'account_balance' ? '💼 المحفظة الأساسية (عجز/فائض/تسوية)' : w === 'cashback' ? '🎁 كاش باك' : '🤝 عمولات الإحالة'}
                </button>
              ))}
            </div>

            {/* Transactions Table */}
            {filteredWalletTx.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
                <p className="text-sm font-semibold">لا توجد حركات مالية مسجلة</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-[#27272A] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#151519] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">نوع الحركة</th>
                      <th className="p-3">البيان / العملية</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">الرصيد بعد</th>
                      <th className="p-3">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A] bg-white dark:bg-[#101014]">
                    {filteredWalletTx.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#18181D]">
                        <td className="p-3">
                          <Badge variant={tx.type === 'settlement' ? 'warning' : tx.type === 'debit' ? 'danger' : tx.type === 'earned' || tx.type === 'credit' || tx.type === 'commission' ? 'success' : 'danger'}>
                            {tx.type === 'settlement' ? '⚖️ تصفية وشطب' : tx.type === 'debit' ? '⚠️ عجز دفع' : tx.type === 'credit' ? '➕ فائض/إيداع' : tx.type === 'redeemed' ? '➖ استخدام' : tx.type}
                          </Badge>
                        </td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-zinc-100">
                          {tx.operationName}
                          {tx.orderNumber && (
                            <span className="text-[10px] text-zinc-400 font-mono mr-1">({tx.orderNumber})</span>
                          )}
                        </td>
                        <td className={`p-3 font-bold font-mono ${tx.type === 'settlement' ? 'text-amber-500' : tx.type === 'debit' || tx.type === 'redeemed' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {tx.type === 'settlement' ? `تصفية: ${formatCurrency(tx.amount)}` : tx.type === 'debit' || tx.type === 'redeemed' ? `-${formatCurrency(tx.amount)}` : `+${formatCurrency(tx.amount)}`}
                        </td>
                        <td className="p-3 font-mono text-zinc-400">{formatCurrency(tx.balanceAfter)}</td>
                        <td className="p-3 text-zinc-400">{formatDateTime(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Referrals */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">برنامج إحالات الموزعين والتجار</h4>
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span>كود الإحالة: <strong className="font-mono text-amber-500 font-bold">{dealer.referralCode || 'DLR-REF-001'}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyReferralWhatsApp(dealer.referralCode || 'DLR-REF-001')}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="نسخ كود ورسالة الإحالة بالكامل"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ كود ورسالة الإحالة</span>
                  </button>
                  <span className="text-zinc-400">• إجمالي العمولات: {formatCurrency(dealer.totalReferralCommissionEarned || 0)}</span>
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<Settings className="w-3.5 h-3.5 text-purple-500" />}
                onClick={() => setIsRatesModalOpen(true)}
              >
                تعديل النسب والتارجت
              </Button>
            </div>

            {referrals.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Share2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-500" />
                <p className="text-sm font-semibold">لا يوجد تجار مُحالين مسجلين بكود هذا التاجر</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-[#27272A] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#151519] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">التاجر المُحال</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">إجمالي مشترياته</th>
                      <th className="p-3">العمولات المكتسبة منه</th>
                      <th className="p-3">تاريخ الإحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A] bg-white dark:bg-[#101014]">
                    {referrals.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#18181D]">
                        <td className="p-3 font-bold text-gray-900 dark:text-zinc-100">{r.referredDealerName}</td>
                        <td className="p-3 font-mono text-zinc-400" dir="ltr">{r.referredDealerPhone}</td>
                        <td className="p-3">
                          <Badge variant={r.status === 'active' ? 'success' : 'default'}>
                            {r.status === 'active' ? 'أول شهر (نشط)' : 'مدى الحياة'}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-gray-900 dark:text-zinc-100">{formatCurrency(r.totalSpentByReferred)}</td>
                        <td className="p-3 font-bold text-emerald-500">
                          {formatCurrency(r.totalFirstMonthCommissionsEarned + r.totalLifetimeCommissionsEarned)}
                        </td>
                        <td className="p-3 text-zinc-400">{formatDate(r.referredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Dealer Exclusive Coupons & Discounts */}
        {activeTab === 'coupons' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span>كوبونات الخصم المخصصة للتاجر</span>
                  <Badge variant="purple" size="sm">{dealerCoupons.length} كوبون</Badge>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  كوبونات حصرية لعمليات شحن الجملة لهذا التاجر فقط مع إمكانية القيد بلعبة محددة
                </p>
              </div>

              {isOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCompCouponModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                >
                  إصدار كوبون للتاجر
                </Button>
              )}
            </div>

            {dealerCoupons.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 bg-white dark:bg-[#151519] rounded-2xl border border-gray-200 dark:border-[#27272A]">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-500" />
                <p className="text-sm font-semibold">لا توجد كوبونات خصم مسجلة لهذا التاجر حالياً</p>
                <p className="text-xs text-zinc-500 mt-1">يمكنك إنشاء كوبون خصم خاص أو تعويض مرتبط بلعبة محددة</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-[#27272A] rounded-2xl overflow-hidden bg-white dark:bg-[#101014]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#151519] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">كود الكوبون</th>
                      <th className="p-3">قيمة الخصم</th>
                      <th className="p-3">تخصيص اللعبة</th>
                      <th className="p-3">البيان / السبب</th>
                      <th className="p-3">الاستخدام</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">تاريخ الإنشاء</th>
                      <th className="p-3 text-center">مشاركة واتساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {dealerCoupons.map(cpn => {
                      const isUsed = (cpn.currentUsageCount || 0) >= (cpn.maxUsageTotal || 1);
                      const isActive = cpn.isActive && !cpn.isAutoDeactivated && !isUsed;
                      return (
                        <tr key={cpn.id} className="hover:bg-gray-50 dark:hover:bg-[#18181D]">
                          <td className="p-3 font-mono font-black text-purple-400 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span>{cpn.code}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(cpn.code, `كود الكوبون (${cpn.code})`, showToast)}
                                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
                                title="نسخ الكود فقط"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-500 text-sm">
                            {cpn.discountType === 'percentage' ? `${cpn.discountValue}%` : `${cpn.discountValue} ج`}
                          </td>
                          <td className="p-3">
                            {cpn.applicableGameId && cpn.applicableGameId !== 'all' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit">
                                <Gamepad2 className="w-3 h-3" />
                                <span>{cpn.applicableGameName || 'لعبة محددة'}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-zinc-400 border border-gray-200 dark:border-zinc-700 flex items-center gap-1 w-fit">
                                <Globe className="w-3 h-3" />
                                <span>كل الألعاب</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs truncate text-zinc-700 dark:text-zinc-300">
                            {cpn.compensationReason || cpn.title || 'خصم تاجر جملة'}
                          </td>
                          <td className="p-3 font-mono">
                            {cpn.currentUsageCount || 0} / {cpn.maxUsageTotal || 1}
                          </td>
                          <td className="p-3">
                            <Badge variant={isActive ? 'success' : isUsed ? 'default' : 'danger'} size="sm">
                              {isActive ? 'صالح ونشط' : isUsed ? 'تم الاستخدام' : 'منتهي / معطل'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-zinc-400">
                            {formatDate(cpn.createdAt)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleCopyDealerCouponWhatsApp(cpn)}
                              className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-600 hover:text-white text-purple-400 font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="نسخ الرسالة المخصصة للتاجر"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>واتساب 💬</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Commercial Info */}
        {activeTab === 'commercial' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-5 space-y-4">
              <h4 className="font-bold text-sm text-gray-900 dark:text-zinc-100 border-b border-gray-100 dark:border-[#232328] pb-2">
                بيانات النشاط التجاري والعقود
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">اسم المحل / النشاط:</span>
                  <span className="font-bold text-gray-900 dark:text-zinc-100">{dealer.businessName || 'غير محدد'}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">السجل التجاري / البطاقة الضريبية:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-zinc-100">{dealer.commercialRegistrationNumber || 'غير مسجل'}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">المدينة:</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{dealer.city || 'غير محدد'}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">العنوان بالتفصيل:</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{dealer.address || 'غير محدد'}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">مدة التعاقد / الاعتماد:</span>
                  <span className="font-bold text-gray-900 dark:text-zinc-100">{dealer.contractDurationMonths || 12} شهراً</span>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">تاريخ التسجيل في النظام:</span>
                  <span className="font-mono text-zinc-400">{formatDateTime(dealer.createdAt)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 6: Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4 animate-fade-in">
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                placeholder="اكتب ملاحظة أو تنبيه إداري حول التاجر..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                className="flex-1 bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <select
                value={noteType}
                onChange={e => setNoteType(e.target.value as any)}
                className="bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="general">عامة</option>
                <option value="financial">مالية</option>
                <option value="followup">متابعة</option>
                <option value="complaint">شكوى</option>
              </select>
              <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                إضافة
              </Button>
            </form>

            {notes.length === 0 ? (
              <div className="text-center py-10 text-zinc-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                <p className="text-xs">لا توجد ملاحظات مسجلة لهذا التاجر</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map(n => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-zinc-100">{n.authorName}</span>
                        <Badge variant={n.type === 'financial' ? 'warning' : 'default'} size="sm">
                          {n.type}
                        </Badge>
                        <span className="text-[10px] text-zinc-400">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">{n.content}</p>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Activity / Audit Logs */}
        {activeTab === 'activity' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-4">
              <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>سجل الرقابة والنشاط للتاجر #{dealer.code}</span>
              </h4>
              <p className="text-xs text-zinc-400">
                جميع العمليات والتعديلات على هذا الحساب مسجلة وموثقة في سجل الرقابة العام (Audit Log).
              </p>
            </Card>
          </div>
        )}

        {/* Tab 9: Balance Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4 animate-fade-in">
            {/* Quick Balances & Action Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">إجمالي المسحوبات</span>
                  <span className="text-base font-black font-mono text-rose-500">
                    {formatCurrency(
                      dealerWithdrawals
                        .filter(w => w.status !== 'cancelled')
                        .reduce((sum, w) => sum + w.totalAmount, 0)
                    )}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                  <Receipt className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">رصيد حساب التاجر</span>
                  <span className="text-base font-black font-mono text-cyan-500">
                    {formatCurrency(dealer.balance || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Wallet className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">محفظة الإحالة</span>
                  <span className="text-base font-black font-mono text-amber-500">
                    {formatCurrency(dealer.referralBalance || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Share2 className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">محفظة الكاش باك والكميات</span>
                  <span className="text-base font-black font-mono text-emerald-500">
                    {formatCurrency(dealer.cashbackBalance || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Gift className="w-5 h-5" />
                </div>
              </Card>
            </div>

            {/* Action Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span>سجل سحوبات أرصدة التاجر والفواتير الصادرة</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  سحب الرصيد الفائض من حساب التاجر أو عمولات الإحالة أو الكاش باك مع إنشاء فاتورة رسمية فورية
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                onClick={() => setIsWithdrawalModalOpen(true)}
              >
                + سحب رصيد للتاجر
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <th className="p-3">رقم العملية</th>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3">المحافظ المسحوبة</th>
                    <th className="p-3">إجمالي المسحوب</th>
                    <th className="p-3">الرقم المستلم</th>
                    <th className="p-3">الموظف المنفذ</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الفاتورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#27272A]">
                  {dealerWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-40" />
                        <p className="font-bold text-xs">لا توجد عمليات سحب مسجلة لهذا التاجر حتى الآن</p>
                        <p className="text-[11px] text-zinc-500 mt-1">اضغط على زر "سحب رصيد للتاجر" لإنشاء طلب سحب جديد وفاتورة فورية</p>
                      </td>
                    </tr>
                  ) : (
                    dealerWithdrawals.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-500">#{w.id}</td>
                        <td className="p-3 font-mono text-zinc-400 text-[11px]">{formatDateTime(w.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {w.items.map((item, idx) => (
                              <Badge
                                key={idx}
                                variant={
                                  item.walletType === 'main'
                                    ? 'info'
                                    : item.walletType === 'referral'
                                    ? 'warning'
                                    : 'success'
                                }
                                size="sm"
                              >
                                {item.walletLabel || item.walletName}: {formatCurrency(item.amount)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-500">{formatCurrency(w.totalAmount)}</td>
                        <td className="p-3 font-mono text-zinc-300">{w.recipientPhone || dealer.phone}</td>
                        <td className="p-3 text-zinc-400 text-[11px]">{w.employeeName || w.recordedBy || '—'}</td>
                        <td className="p-3">
                          {w.status === 'cancelled' ? (
                            <Badge variant="danger" size="sm">ملغي</Badge>
                          ) : (
                            <Badge variant="success" size="sm">مكتمل</Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedWithdrawalForInvoice(w)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all cursor-pointer"
                            title="طباعة / استعراض الفاتورة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 10: Gamification & Competitions */}
        {activeTab === 'competitions' && (() => {
          const totalRewardsVal = dealerRewards.reduce((sum, r) => sum + (typeof r.prizeValue === 'number' ? r.prizeValue : 0), 0);
          const totalMarketingExpense = dealerRewards.reduce((sum, r) => sum + (r.costEGP || 0), 0);
          const deliveredRewardsCount = dealerRewards.filter(r => r.status === 'delivered').length;

          return (
            <div className="space-y-4 animate-fade-in">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 block font-bold">المسابقات المتاحة للجملة</span>
                  <strong className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 block">
                    {dealerCompetitions.length} مسابقة
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-500 block font-bold">الجوائز المستلمة</span>
                  <strong className="text-base font-black text-emerald-500 mt-1 block">
                    {deliveredRewardsCount} / {dealerRewards.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <span className="text-[10px] text-orange-500 block font-bold">إجمالي قيمة الجوائز</span>
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
                  <span>سجل جوائز ومكافآت التاجر ({dealerRewards.length})</span>
                  <Trophy className="w-4 h-4 text-amber-500" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-900/50 text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                      <tr>
                        <th className="p-3">الجائزة</th>
                        <th className="p-3">المسابقة</th>
                        <th className="p-3 text-center">القيمة</th>
                        <th className="p-3 text-center">المحفظة المصدر</th>
                        <th className="p-3 text-center">التكلفة التسويقية</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">تاريخ التسليم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#27272A]">
                      {dealerRewards.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-400">
                            لا توجد جوائز مسجلة لهذا التاجر حتى الآن
                          </td>
                        </tr>
                      ) : (
                        dealerRewards.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-[#18181B]/50">
                            <td className="p-3">
                              <div className="font-bold text-amber-500">{r.prizeName}</div>
                              <span className="text-[10px] text-zinc-400">{r.prizeType}</span>
                            </td>
                            <td className="p-3 text-zinc-700 dark:text-zinc-300">
                              {r.competitionTitle}
                            </td>
                            <td className="p-3 text-center font-bold text-zinc-800 dark:text-zinc-200">
                              {r.prizeValue} {r.currency}
                            </td>
                            <td className="p-3 text-center text-zinc-500">
                              {r.sourceWalletName || 'محفظة النظام'}
                            </td>
                            <td className="p-3 text-center font-bold text-rose-500">
                              {formatCurrency(r.costEGP)}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={r.status === 'delivered' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
                                {r.status === 'delivered' ? 'تم التسليم' : r.status === 'pending' ? 'مستحقة (Pending)' : 'ملغاة'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-zinc-400 text-[11px] font-mono">
                              {r.deliveredAt ? formatDateTime(r.deliveredAt) : '—'}
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

        {/* Rates & Target Edit Modal */}
        <Modal
          isOpen={isRatesModalOpen}
          onClose={() => setIsRatesModalOpen(false)}
          title="تعديل نسب العمولات والحد الائتماني"
          subtitle={`تخصيص شروط التاجر: ${dealer.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveRatesAndTarget} className="space-y-4 text-right" dir="rtl">
            <Input
              label="عمولة أول 30 يوماً (%)"
              type="number"
              step="any"
              value={editFirstMonthRate}
              onChange={e => setEditFirstMonthRate(Number(e.target.value))}
              required
            />

            <Input
              label="عمولة مدى الحياة (%)"
              type="number"
              step="any"
              value={editLifetimeRate}
              onChange={e => setEditLifetimeRate(Number(e.target.value))}
              required
            />

            <Input
              label="التارجت الشهري (عدد التجار)"
              type="number"
              value={editMonthlyTarget}
              onChange={e => setEditMonthlyTarget(Number(e.target.value))}
              required
            />

            <Input
              label="الحد الائتماني للدين (ج.م)"
              type="number"
              value={editCreditLimit}
              onChange={e => setEditCreditLimit(Number(e.target.value))}
              required
            />

            <Input
              label="نسبة الكاش باك / حافز الكميات (%)"
              type="number"
              step="any"
              value={editCashbackRate}
              onChange={e => setEditCashbackRate(Number(e.target.value))}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#232328]">
              <Button type="button" variant="outline" onClick={() => setIsRatesModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary">
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Modal>

        {/* Manual Credit Adjustment Modal */}
        <Modal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          title="تسوية رصيد يدوي للتاجر"
          subtitle={`تعديل الحساب المالي للتاجر: ${dealer.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4 text-right" dir="rtl">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                نوع الحركة
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('credit')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adjustmentType === 'credit'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  + إضافة رصيد دائن (له)
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentType('debit')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adjustmentType === 'debit'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  - خصم رصيد / مديونية (عليه)
                </button>
              </div>
            </div>

            <Input
              label="المبلغ (ج.م) *"
              type="number"
              step="any"
              value={adjustmentAmount || ''}
              onChange={e => setAdjustmentAmount(Number(e.target.value))}
              placeholder="500.00"
              required
            />

            <Input
              label="سبب التسوية / البيان *"
              placeholder="مثال: تسوية تحويل بنكي يدوي / تسديد نقدي"
              value={adjustmentReason}
              onChange={e => setAdjustmentReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#232328]">
              <Button type="button" variant="outline" onClick={() => setIsAdjustmentModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary">
                تنفيذ التسوية
              </Button>
            </div>
          </form>
        </Modal>

        {/* Print Invoice Modal */}
        {printingTicket && (
          <PrintInvoiceModal
            isOpen={Boolean(printingTicket)}
            onClose={() => setPrintingTicket(null)}
            ticket={printingTicket}
          />
        )}

        {/* Statement Report Modal */}
        {isStatementReportOpen && (
          <ReportGeneratorModal
            isOpen={isStatementReportOpen}
            onClose={() => setIsStatementReportOpen(false)}
            defaultTemplateType="customer_statement"
            customPayload={dealer}
          />
        )}

        {/* Full Dealer Edit Modal (Admin Only) */}
        {isEditModalOpen && (
          <DealerFormModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={dealerData => {
              const updated: Dealer = {
                ...dealer,
                ...dealerData,
                updatedAt: new Date().toISOString()
              };
              db.saveDealer(updated);

              // Audit Logging with Old vs New Values
              db.logAction(
                { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'التجار والموزعين' },
                'edit',
                'تعديل بيانات التاجر',
                updated.id,
                updated.name,
                `تعديل شامل لبيانات التاجر (${updated.name}) بواسطة ${user?.fullName || 'المدير المالك'}`,
                {
                  name: dealer.name,
                  phone: dealer.phone,
                  businessName: dealer.businessName,
                  profileType: dealer.profileType,
                  city: dealer.city,
                  creditLimitEGP: dealer.creditLimitEGP,
                  cashbackRate: dealer.cashbackRate
                },
                {
                  name: updated.name,
                  phone: updated.phone,
                  businessName: updated.businessName,
                  profileType: updated.profileType,
                  city: updated.city,
                  creditLimitEGP: updated.creditLimitEGP,
                  cashbackRate: updated.cashbackRate
                }
              );

              showToast('success', 'تم حفظ التعديلات', `تم تحديث بيانات التاجر "${updated.name}" بنجاح`);
              setIsEditModalOpen(false);
              onDealerUpdated();
            }}
            dealerToEdit={dealer}
          />
        )}

        {/* Comprehensive Ticket Details Modal */}
        {selectedTicketForDetails && (
          <TicketDetailsModal
            isOpen={!!selectedTicketForDetails}
            onClose={() => setSelectedTicketForDetails(null)}
            ticket={selectedTicketForDetails}
            department="dealers"
            onUpdateTicket={(up) => {
              setSelectedTicketForDetails(up);
              loadSubData();
              onDealerUpdated();
            }}
            onPrintTicket={(t) => {
              setSelectedTicketForDetails(null);
              setPrintingTicket(t);
            }}
          />
        )}

        {/* Dealer Coupon Creator Modal */}
        {isCompCouponModalOpen && (
          <Modal
            isOpen={isCompCouponModalOpen}
            onClose={() => setIsCompCouponModalOpen(false)}
            title={`إصدار كوبون خصم للتاجر — ${dealer.name}`}
            subtitle="كوبون مخصص وحصري لهذا التاجر فقط"
            maxWidth="md"
          >
            <form onSubmit={handleCreateDealerCoupon} className="space-y-4 text-right text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">نوع الخصم *</label>
                  <select
                    value={compDiscountType}
                    onChange={e => setCompDiscountType(e.target.value as any)}
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                  >
                    <option value="fixed_amount">مبلغ ثابت (جنيه)</option>
                    <option value="percentage">نسبة مئوية (%)</option>
                  </select>
                </div>

                <Input
                  label={compDiscountType === 'percentage' ? 'نسبة الخصم (%) *' : 'قيمة الخصم (جنيه) *'}
                  type="number"
                  value={compAmount}
                  onChange={e => setCompAmount(parseFloat(e.target.value) || 0)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  ربط وتخصيص الكوبون بلعبة محددة (اختياري)
                </label>
                <select
                  value={compGameId}
                  onChange={e => setCompGameId(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold text-xs"
                >
                  <option value="all">🌐 متاح لجميع الألعاب والخدمات (عام - غير مقيد)</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>
                      🎮 {g.name}
                    </option>
                  ))}
                </select>
                {compGameId !== 'all' && (
                  <p className="text-[11px] text-purple-400 font-bold mt-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      سيكون هذا الكوبون محصوراً ومشفراً حصرياً للعبة [{games.find(g => g.id === compGameId)?.name}] فقط ولا يقبل غيرها.
                    </span>
                  </p>
                )}
              </div>

              <Input
                label="البيان أو سبب منح الخصم للتاجر *"
                value={compReason}
                onChange={e => setCompReason(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                <Button type="button" variant="outline" onClick={() => setIsCompCouponModalOpen(false)}>إلغاء</Button>
                <Button type="submit" variant="primary">توليد الكوبون وحفظه</Button>
              </div>
            </form>
          </Modal>
        )}
        {/* Balance Withdrawal Modal */}
        {isWithdrawalModalOpen && (
          <NewWithdrawalTicketModal
            isOpen={isWithdrawalModalOpen}
            onClose={() => setIsWithdrawalModalOpen(false)}
            mode="dealer"
            preselectedPhone={dealer.phone}
            onSuccess={() => {
              setRefreshTrigger(prev => prev + 1);
              onDealerUpdated();
            }}
          />
        )}

        {/* Wholesale Dealer Cashback Transfer Modal */}
        {isCashbackTransferModalOpen && (
          <CustomerCashbackTransferModal
            isOpen={isCashbackTransferModalOpen}
            onClose={() => setIsCashbackTransferModalOpen(false)}
            dealer={dealer}
            partyType="dealer"
            onSuccess={() => {
              setRefreshTrigger(prev => prev + 1);
              onDealerUpdated();
            }}
          />
        )}

        {/* Withdrawal Invoice Modal */}
        {selectedWithdrawalForInvoice && (
          <WithdrawalInvoiceModal
            isOpen={!!selectedWithdrawalForInvoice}
            onClose={() => setSelectedWithdrawalForInvoice(null)}
            withdrawal={selectedWithdrawalForInvoice}
          />
        )}

        {/* Owner Primary Wallet Debt Clearance Modal (Requirement #7) */}
        {isClearDebtModalOpen && (
          <Modal
            isOpen={isClearDebtModalOpen}
            onClose={() => !isClearingDebt && setIsClearDebtModalOpen(false)}
            title="تصفية المحفظة الأساسية وشطب العجز المالي للتاجر (قرار المالك)"
            maxWidth="md"
          >
            <div className="space-y-4 text-right text-xs">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>تأكيد شطب العجز وتصفية المحفظة</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  أنت على وشك تصفية المحفظة الأساسية للتاجر <strong>{dealer.name}</strong> وشطب العجز والمديونية المتراكمة بقرار استثنائي من المالك.
                </p>
                <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/20 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">عجز السداد الحالي المطلوب شطبه:</span>
                  <span className="text-lg font-black font-mono text-rose-500">
                    {formatCurrency(Math.abs(dealer.accountBalance || dealer.balance || 0))}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
                <strong className="block font-bold">📌 أثر هذا القرار الإداري:</strong>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>سيتحول رصيد المحفظة الأساسية للتاجر فوراً إلى <strong>0 جنيه</strong>.</li>
                  <li>يتم تسجيل العملية في سجل الحركات كـ "تصفية محفظة بأمر المالك".</li>
                  <li><strong>لا يؤثر على أي تقارير أرباح سابقة</strong> لأن العجز لم يدخل في الأرباح أصلاً من البداية.</li>
                  <li>محفظة الكاش باك ومحفظة الإحالة تظلان مستقلتين تماماً دون أي مساس بهما.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsClearDebtModalOpen(false)}
                  disabled={isClearingDebt}
                >
                  إلغاء التراجع
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmClearDebt}
                  disabled={isClearingDebt}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  {isClearingDebt ? 'جارٍ الشطب والتصفية...' : 'تأكيد الشطب والتصفية نهائياً ⚠️'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Expired Balance Management Modal (Modification #6) */}
        {isExpiredBalanceModalOpen && (
          <ExpiredBalanceManagementModal
            isOpen={isExpiredBalanceModalOpen}
            onClose={() => setIsExpiredBalanceModalOpen(false)}
            summary={dealerExpirySummary}
            targetWallet={expiredModalWalletType}
            onSuccess={() => {
              loadSubData();
              onDealerUpdated?.();
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export const DealerProfileModal: React.FC<DealerProfileModalProps> = ({
  isOpen,
  onClose,
  dealer,
  onDealerUpdated,
  onOpenNewTicket
}) => {
  if (!isOpen || !dealer) return null;

  return (
    <DealerProfileModalContent
      key={dealer.id}
      isOpen={isOpen}
      onClose={onClose}
      dealer={dealer}
      onDealerUpdated={onDealerUpdated}
      onOpenNewTicket={onOpenNewTicket}
    />
  );
};
