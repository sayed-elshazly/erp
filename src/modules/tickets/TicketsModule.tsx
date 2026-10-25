import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CustomerTicket,
  TicketLifecycleStatus,
  Customer,
  TicketItem,
  TicketShippingType,
  TicketHistoryLogItem
} from '../../types/customer.types';
import { Dealer } from '../../types/dealer.types';
import { GameTreeItem, GameProduct, StoreWallet } from '../../types/topup.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { recordUndoableAction } from '../../context/HistoryContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { TablePagination } from '../../components/common/TablePagination';
import { normalizePhoneNumber, isSamePhoneNumber, isValidPhoneNumber } from '../../utils/phoneUtils';
import { PlatformSourceSelector, PlatformSourceBadge, getPlatformConfig, getSavedPlatformOrder } from '../../components/common/PlatformSourceSelector';
import { CustomerSource } from '../../types/customer.types';
import {
  Ticket,
  Plus,
  Search,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Gamepad2,
  Sparkles,
  ShieldCheck,
  Printer,
  MessageSquare,
  Send,
  Star,
  Zap,
  Wallet,
  User,
  Trash2,
  Gift,
  Tag,
  TrendingUp,
  Receipt,
  FileText,
  UserPlus,
  Target,
  PhoneCall,
  RotateCcw,
  Lock,
  ShieldAlert,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  ImageIcon,
  Calendar,
  CalendarDays,
  Eye,
  Edit3,
  Landmark,
  Cpu
} from 'lucide-react';
import { PartnerPerformanceService } from '../../services/customer/partnerPerformanceService';
import { DealerPerformanceService } from '../../services/dealer/dealerPerformanceService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyTicketInvoiceToClipboard } from '../../utils/invoiceImageGenerator';
import { PrintInvoiceModal } from '../../components/common/PrintInvoiceModal';
import { CustomerProfileModal } from '../customers/CustomerProfileModal';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { JKRWalletEngine } from '../../services/financial/jkrWalletEngine';
import { PricingBreakdownModal } from '../../components/pricing/PricingBreakdownModal';
import { BudgetHunterModal } from '../../components/pricing/BudgetHunterModal';
import { CouponCheckerModal } from './CouponCheckerModal';
import { CustomerInspectorModal } from './CustomerInspectorModal';
import { DepositNumbersModal } from './DepositNumbersModal';
import { TicketProblemModal } from './TicketProblemModal';
import { TicketRefundModal } from './TicketRefundModal';
import { ShiftSettlementModal } from './ShiftSettlementModal';
import { WalletProfileModal } from './WalletProfileModal';
import { WalletFormModal } from './WalletFormModal';
import { ZeroProfitWalletModal } from './ZeroProfitWalletModal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { PricingEngine } from '../../services/pricing/pricingEngine';
import { ReservationActionsModal } from './ReservationActionsModal';
import { TicketDetailsModal } from './TicketDetailsModal';
import { TicketEditModal } from './TicketEditModal';
import { DepositVoucherModal } from '../finance/DepositVoucherModal';
import { DeletedTicketsModal } from './DeletedTicketsModal';

interface TicketsModuleProps {
  department?: 'customers' | 'dealers';
}

export const TicketsModule: React.FC<TicketsModuleProps> = ({ department = 'customers' }) => {
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';
  const { showToast } = useNotifications();

  // Primary Data
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [games, setGames] = useState<GameTreeItem[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allDealers, setAllDealers] = useState<Dealer[]>([]);
  const [wallets, setWallets] = useState<StoreWallet[]>([]);


  // -------------------------------------------------------------
  // MODALS STATE
  // -------------------------------------------------------------
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<CustomerTicket | null>(null);
  const [isCouponCheckerOpen, setIsCouponCheckerOpen] = useState(false);
  const [isCustomerInspectorOpen, setIsCustomerInspectorOpen] = useState(false);
  const [isDepositNumbersOpen, setIsDepositNumbersOpen] = useState(false);
  const [isDepositVoucherOpen, setIsDepositVoucherOpen] = useState(false);
  const [isBudgetHunterOpen, setIsBudgetHunterOpen] = useState(false);
  const [isShiftSettlementOpen, setIsShiftSettlementOpen] = useState(false);
  const [shiftSettlementMode, setShiftSettlementMode] = useState<'audit' | 'settlement'>('audit');
  const [isZeroProfitModalOpen, setIsZeroProfitModalOpen] = useState(false);

  // Selected ticket for sub-actions
  const [selectedTicketSnapshot, setSelectedTicketSnapshot] = useState<{ snapshot: any; title: string } | null>(null);
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);
  const [printingTicket, setPrintingTicket] = useState<CustomerTicket | null>(null);
  const [problemTargetTicket, setProblemTargetTicket] = useState<CustomerTicket | null>(null);
  const [problemModalInitialTab, setProblemModalInitialTab] = useState<'problem' | 'fraud'>('problem');
  const [refundTargetTicket, setRefundTargetTicket] = useState<CustomerTicket | null>(null);

  // Rating Modal
  const [ratingTicket, setRatingTicket] = useState<CustomerTicket | null>(null);
  const [selectedStars, setSelectedStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // -------------------------------------------------------------
  // UNIVERSAL & ADMINISTRATIVE FILTERS STATE
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'reservations' | 'completed_reservations' | TicketLifecycleStatus>('all');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [reservationFilter, setReservationFilter] = useState<'all' | 'completed_reservations' | 'pending_reservations' | 'direct'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highestAmount' | 'lowestAmount'>('newest');

  // Date Range Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // -------------------------------------------------------------
  // NEW TICKET MODAL STATE
  // -------------------------------------------------------------
  const [ticketType, setTicketType] = useState<TicketShippingType>('regular');
  const [customerPhone, setCustomerPhone] = useState('');

  // Smart Phone Autocomplete Dropdown State
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [selectedDropdownIndex, _setSelectedDropdownIndex] = useState(-1);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline Quick Add Customer / Dealer Modal
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustProfileType, setNewCustProfileType] = useState<string>('regular');
  const [newCustSource, setNewCustSource] = useState<any>('whatsapp');
  const [newCustReferralCode, setNewCustReferralCode] = useState('');
  const [newCustBirthDate, setNewCustBirthDate] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Multi-Product Line Items
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);

  // Item Selector State (for adding line item)
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [linePlayerGameId, setLinePlayerGameId] = useState('');
  const [lineQuantity, setLineQuantity] = useState<number>(1);

  // Referral Percentage Configuration for the Ticket
  const [ticketReferralPercentInput, setTicketReferralPercentInput] = useState<string>('0');
  const [isReferralRateOverridden, setIsReferralRateOverridden] = useState<boolean>(false);

  // Payment, Balances & Deductions
  const [useCashback, setUseCashback] = useState(false);
  const [customCashbackAmount, setCustomCashbackAmount] = useState<number>(0);

  const [useReferralBalance, setUseReferralBalance] = useState(false);
  const [customReferralAmount, setCustomReferralAmount] = useState<number>(0);

  const [useCreditBalance, setUseCreditBalance] = useState(false);
  const [customCreditAmount, setCustomCreditAmount] = useState<number>(0);

  // Coupon Code
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState<number>(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');

  // Payment Details
  const [paymentGateway, setPaymentGateway] = useState('Vodafone Cash');
  const [paymentWallet, setPaymentWallet] = useState('فودافون كاش - تشغيل 1');
  const [paymentWalletId, setPaymentWalletId] = useState('w_op_1');
  const [paymentWalletNumberId, setPaymentWalletNumberId] = useState('');
  const [paymentReceivedPhone, setPaymentReceivedPhone] = useState('');
  const [senderPhoneNumber, setSenderPhoneNumber] = useState('');
  const [transferReferenceNumber, setTransferReferenceNumber] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [ticketNotes, setTicketNotes] = useState('');
  const [ticketReferenceNumber, setTicketReferenceNumber] = useState('');
  const [platformSource, setPlatformSource] = useState<CustomerSource>('whatsapp');

  // Reservation / Booking Mode State
  const [operationMode, setOperationMode] = useState<'direct' | 'reservation'>('direct');
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState('');
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState('18:00');
  const [reservationNotes, setReservationNotes] = useState('');
  const [isReservationsDueModalOpen, setIsReservationsDueModalOpen] = useState(false);

  // Wallet Profile & Form Modal States
  const [selectedWalletForProfile, setSelectedWalletForProfile] = useState<StoreWallet | null>(null);
  const [isWalletProfileOpen, setIsWalletProfileOpen] = useState(false);
  const [isWalletFormOpen, setIsWalletFormOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<StoreWallet | null>(null);

  // Delivery message modal post-creation
  const [completedTicketInfo, setCompletedTicketInfo] = useState<{
    ticket: CustomerTicket;
    message: string;
  } | null>(null);

  // Full Ticket Details Modal State (Customer & Dealer Departments)
  const [selectedDetailsTicket, setSelectedDetailsTicket] = useState<CustomerTicket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<CustomerTicket | null>(null);
  const [isDeletedTicketsModalOpen, setIsDeletedTicketsModalOpen] = useState(false);

  const loadData = useCallback(() => {
    if (department === 'dealers') {
      setTickets(db.getDealerTickets());
      setAllCustomers(db.getDealers() as unknown as Customer[]);
      setAllDealers(db.getDealers());
    } else {
      setTickets(db.getTickets());
      setAllCustomers(db.getCustomers());
      setAllDealers(db.getDealers());
    }
    const tree =
      ticketType === 'first_shipping'
        ? db.getFirstShippingGameTree()
        : db.getGameTree();
    setGames(tree.filter(g => g.isActive !== false));
    const storeW = db.getStoreWallets();
    setWallets(storeW);

    const validOp = storeW.filter(
      w =>
        !w.isSystemWallet &&
        !['w_profits', 'w_cashback', 'w_trust', 'w_referrals', 'w_operating_expenses'].includes(w.id) &&
        w.type !== 'profits' &&
        w.systemType !== 'operating_expenses' &&
        (w.type === 'operating' ||
          w.category?.includes('كاش') ||
          w.category?.includes('إنستاباي') ||
          w.name.includes('كاش') ||
          w.name.includes('إنستاباي') ||
          w.name.includes('InstaPay'))
    );
    if (validOp.length > 0) {
      setPaymentWalletId(prev => {
        const nextId = validOp.some(w => w.id === prev) ? prev : validOp[0].id;
        const match = validOp.find(w => w.id === nextId);
        setPaymentWallet(match ? match.name : validOp[0].name);
        return nextId;
      });
    }
  }, [department, ticketType]);

  useEffect(() => {
    const tree =
      ticketType === 'first_shipping'
        ? db.getFirstShippingGameTree()
        : db.getGameTree();
    const activeGames = tree.filter(g => g.isActive !== false);
    setGames(activeGames);
    if (activeGames.length > 0) {
      setSelectedGameId(activeGames[0].id);
      setSelectedSectionId(activeGames[0].sections?.[0]?.id || '');
      setSelectedProductId(activeGames[0].products?.[0]?.id || '');
    } else {
      setSelectedGameId('');
      setSelectedSectionId('');
      setSelectedProductId('');
    }
  }, [ticketType]);

  useEffect(() => {
    loadData();
    const unsubProducts = eventBus.subscribe(SYSTEM_EVENTS.PRODUCTS_UPDATED, () => {
      loadData();
    });
    const unsubWallet = eventBus.subscribe(SYSTEM_EVENTS.WALLET_MUTATED, () => {
      loadData();
    });
    const unsubTicketUpd = eventBus.subscribe(SYSTEM_EVENTS.TICKET_UPDATED, () => {
      loadData();
    });
    const unsubTicketCreated = eventBus.subscribe(SYSTEM_EVENTS.TICKET_CREATED, () => {
      loadData();
    });
    const unsubCust = eventBus.subscribe(SYSTEM_EVENTS.CUSTOMER_UPDATED, () => {
      loadData();
    });

    window.addEventListener('storage', loadData);
    window.addEventListener('store_wallets_updated', loadData);
    window.addEventListener('tickets_updated', loadData);
    window.addEventListener('dealer_tickets_updated', loadData);
    window.addEventListener('jkr_wallets_updated', loadData);
    window.addEventListener('customer_wallets_updated', loadData);

    return () => {
      unsubProducts();
      unsubWallet();
      unsubTicketUpd();
      unsubTicketCreated();
      unsubCust();
      window.removeEventListener('storage', loadData);
      window.removeEventListener('store_wallets_updated', loadData);
      window.removeEventListener('tickets_updated', loadData);
      window.removeEventListener('dealer_tickets_updated', loadData);
      window.removeEventListener('jkr_wallets_updated', loadData);
      window.removeEventListener('customer_wallets_updated', loadData);
    };
  }, [loadData]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        phoneInputRef.current &&
        !phoneInputRef.current.contains(event.target as Node)
      ) {
        setIsPhoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [walletCardLimitType, setWalletCardLimitType] = useState<'receive' | 'send'>('receive');

  // Operating cash wallets for carousel & ticket creation (Excludes System Wallets, strictly deduplicated)
  const operatingWallets = useMemo(() => {
    const list = wallets.filter(
      w =>
        !w.isSystemWallet &&
        !['w_profits', 'w_cashback', 'w_trust', 'w_referrals', 'w_operating_expenses'].includes(w.id) &&
        w.type !== 'profits' &&
        w.systemType !== 'operating_expenses' &&
        (w.type === 'operating' ||
          w.category?.includes('كاش') ||
          w.category?.includes('إنستاباي') ||
          w.name.includes('كاش') ||
          w.name.includes('إنستاباي') ||
          w.name.includes('InstaPay'))
    );
    const seen = new Set<string>();
    return list.filter(w => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  }, [wallets]);

  // Displayed Wallets (Transferred system wallets to Finance section -> Operating wallets only in Tickets)
  const displayedWallets = useMemo(() => {
    return operatingWallets;
  }, [operatingWallets]);

  // Customer Cashback live metrics to guarantee exact real-time sync with all accounts
  const customerCashbackMetrics = useMemo(() => {
    const totalBalance = Math.round(allCustomers.reduce((sum, c) => sum + (Number(c.cashbackBalance) || 0), 0) * 100) / 100;
    const totalEarned = Math.round(allCustomers.reduce((sum, c) => {
      const earned = Number(c.totalCashbackEarned) || 0;
      const current = Number(c.cashbackBalance) || 0;
      return sum + Math.max(earned, current);
    }, 0) * 100) / 100;
    const totalRedeemed = Math.max(0, Math.round((totalEarned - totalBalance) * 100) / 100);
    return {
      balance: totalBalance,
      earned: totalEarned,
      redeemed: totalRedeemed
    };
  }, [allCustomers]);

  // Distinct Games List with Clean Deduplication (Fixes duplicate PUBG)
  const distinctGames = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    games.forEach(g => {
      const cleanKey = g.name.toLowerCase().replace(/[()\u0600-\u06FF]/g, '').trim() || g.name;
      if (!map.has(cleanKey)) {
        map.set(cleanKey, { id: g.id, name: g.name });
      }
    });
    return Array.from(map.values());
  }, [games]);

  // Unique employees list from tickets
  const distinctEmployees = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.assignedTo || 'مسؤول الشحن').filter(Boolean)));
  }, [tickets]);

  // Searchable Select Options for Filters Bar
  const gameFilterOptions = useMemo(() => {
    return distinctGames.map(g => ({
      value: g.name,
      label: g.name,
      icon: <Gamepad2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
    }));
  }, [distinctGames]);

  const walletFilterOptions = useMemo(() => {
    return operatingWallets.map(w => ({
      value: w.name,
      label: w.name,
      badge: formatCurrency(w.balance, w.currency),
      icon: <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    }));
  }, [operatingWallets]);

  const employeeFilterOptions = useMemo(() => {
    return distinctEmployees.map(emp => ({
      value: emp,
      label: emp,
      icon: <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
    }));
  }, [distinctEmployees]);

  const shippingTypeFilterOptions = useMemo(() => [
    { value: 'regular', label: 'شحنة عادية', icon: <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" /> },
    { value: 'first_shipping', label: 'عرض أول شحنة (سعر التكلفة)', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />, badge: 'تخفيض' }
  ], []);

  const platformFilterOptions = useMemo(() => {
    const savedOrder = getSavedPlatformOrder();
    const ordered = savedOrder.map(id => getPlatformConfig(id));
    return [
      { value: 'all', label: 'كافة مصادر التواصل 🌐' },
      ...ordered.map(p => ({
        value: p.id,
        label: `${p.name} (${p.nameEn})`,
        icon: p.icon('w-3.5 h-3.5 shrink-0')
      }))
    ];
  }, []);

  // -------------------------------------------------------------
  // Smart Phone Auto Complete Search Matching (Customers + Dealers)
  // -------------------------------------------------------------
  const matchingCustomers = useMemo(() => {
    const q = customerPhone.trim().toLowerCase();
    if (!q) return [];
    const normQ = normalizePhoneNumber(q);
    const rawDigits = q.replace(/\D/g, '');

    const matchesPhone = (phone: string) => {
      if (!phone) return false;
      if (phone.toLowerCase().includes(q)) return true;
      if (normQ && isSamePhoneNumber(phone, normQ)) return true;
      if (rawDigits.length >= 4) {
        const pDigits = phone.replace(/\D/g, '');
        if (pDigits.includes(rawDigits)) return true;
      }
      return false;
    };

    const custMatches = allCustomers
      .filter(c => !c.isFrozen && c.status !== 'suspended')
      .filter(c => matchesPhone(c.phone) || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .slice(0, 5);
    const dealerMatches = allDealers
      .filter(d => !d.isFrozen && d.status !== 'suspended')
      .filter(d => matchesPhone(d.phone) || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.businessName && d.businessName.toLowerCase().includes(q)))
      .slice(0, 5);
    return [...custMatches, ...dealerMatches] as any[];
  }, [allCustomers, allDealers, customerPhone]);

  // Exact Matched Customer / Dealer via Phone
  const matchedCustomer = useMemo(() => {
    if (!customerPhone.trim()) return null;
    const q = customerPhone.trim();
    const dealer = allDealers.find(d => isSamePhoneNumber(d.phone, q) || d.id === q || d.code === q);
    if (dealer) return dealer as any;
    return allCustomers.find(c => isSamePhoneNumber(c.phone, q) || c.id === q || c.code === q) || null;
  }, [allCustomers, allDealers, customerPhone]);

  // Is current client a Wholesale Dealer?
  const isDealer = useMemo(() => {
    if (!matchedCustomer) return false;
    return allDealers.some(d => d.id === matchedCustomer.id || d.phone === matchedCustomer.phone);
  }, [allDealers, matchedCustomer]);

  // Auto-detect referral rate from customer or referrer data
  const detectedReferralRate = useMemo(() => {
    if (!matchedCustomer) return 0;

    // 1. Check if customer has a referrer code
    if (matchedCustomer.referredByCode) {
      const cleanRef = matchedCustomer.referredByCode.trim().toUpperCase();
      const custRef = allCustomers.find(c => c.referralCode?.trim().toUpperCase() === cleanRef);
      if (custRef && !custRef.isFrozen && custRef.status !== 'suspended') {
        const { rate } = PartnerPerformanceService.getEffectiveCommissionRate(
          custRef,
          matchedCustomer.referralLinkedAt || matchedCustomer.createdAt || new Date().toISOString(),
          matchedCustomer
        );
        return rate;
      }
      const dealerRef = allDealers.find(d => d.referralCode?.trim().toUpperCase() === cleanRef);
      if (dealerRef && !dealerRef.isFrozen && dealerRef.status !== 'suspended') {
        const { rate } = DealerPerformanceService.getEffectiveCommissionRate(
          dealerRef,
          matchedCustomer.referralLinkedAt || matchedCustomer.createdAt || new Date().toISOString()
        );
        return rate;
      }
    }

    // 2. Check if the matched client itself has a commission rate configured (Influencer, Partner, Dealer)
    if (matchedCustomer.referralPercent !== undefined && matchedCustomer.referralPercent !== null) {
      return Number(matchedCustomer.referralPercent);
    }
    if (matchedCustomer.referralPercentage !== undefined && matchedCustomer.referralPercentage !== null) {
      return Number(matchedCustomer.referralPercentage);
    }
    if (matchedCustomer.customCommissionRate !== undefined && matchedCustomer.customCommissionRate !== null) {
      return Number(matchedCustomer.customCommissionRate);
    }
    if (matchedCustomer.firstMonthCommissionRate !== undefined && matchedCustomer.firstMonthCommissionRate !== null) {
      return Number(matchedCustomer.firstMonthCommissionRate);
    }
    if (matchedCustomer.highCashbackRate !== undefined && matchedCustomer.highCashbackRate !== null) {
      return Number(matchedCustomer.highCashbackRate);
    }

    // 3. Fallback based on profile type
    if (matchedCustomer.profileType === 'influencer') return 5.0;
    if (matchedCustomer.profileType === 'partner') return 3.0;
    if (matchedCustomer.profileType === 'shop') return 2.0;
    if (matchedCustomer.profileType === 'distributor') return 4.0;
    if (matchedCustomer.profileType === 'vip_dealer') return 3.5;

    return 0;
  }, [matchedCustomer, allCustomers, allDealers]);

  // Reset override flag when customer changes
  useEffect(() => {
    setIsReferralRateOverridden(false);
  }, [matchedCustomer?.id, customerPhone]);

  // Sync detected rate to ticket input if not manually overridden
  useEffect(() => {
    if (!isReferralRateOverridden) {
      setTicketReferralPercentInput(detectedReferralRate > 0 ? String(detectedReferralRate) : '0');
    }
  }, [detectedReferralRate, isReferralRateOverridden]);

  // Resolved Effective Ticket Referral Percentage
  const effectiveTicketReferralPercent = useMemo(() => {
    const parsed = parseFloat(ticketReferralPercentInput);
    return !isNaN(parsed) && parsed >= 0 ? parsed : detectedReferralRate;
  }, [ticketReferralPercentInput, detectedReferralRate]);

  // Resolved Customer / Dealer Cashback Rate strictly from Profile
  const resolvedCustomerCashbackRate = useMemo(() => {
    if (matchedCustomer?.cashbackRate !== undefined && matchedCustomer?.cashbackRate !== null) {
      const parsed = Number(matchedCustomer.cashbackRate);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return isDealer ? 0.5 : 1.0;
  }, [matchedCustomer, isDealer]);

  const _handleUpdateReferralPercent = (newRateStr: string) => {
    setTicketReferralPercentInput(newRateStr);
    setIsReferralRateOverridden(true);
    const parsed = parseFloat(newRateStr);
    const rate = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    setTicketItems(prev =>
      prev.map(item => {
        const g = games.find(game => game.id === item.gameId);
        const p = g?.products.find(prod => prod.id === item.productId);
        const isRefActive = g?.referralEnabled !== false && p?.isReferralEnabled !== false;
        const prodRefLimit = p?.partnerCommissionPercent !== undefined && p?.partnerCommissionPercent !== null
          ? Number(p.partnerCommissionPercent)
          : (PricingEngine.getPricingConfig().referralPercent ?? 2.0);
        const effectiveRefRate = isRefActive ? Math.min(rate, prodRefLimit) : 0;
        const qty = item.quantity || 1;
        const itemReferralAmount = Math.round(((item.unitPrice * qty) * (effectiveRefRate / 100)) * 100) / 100;
        const itemNetProfit = Math.round(((item.unitPrice * qty) - (item.costPrice * qty) - (item.cashbackAmountEGP || 0) - itemReferralAmount - ((item.fixedCostEGP || 0) * qty)) * 100) / 100;
        return {
          ...item,
          referralPercent: effectiveRefRate,
          referralAmountEGP: itemReferralAmount,
          netProfitEGP: itemNetProfit
        };
      })
    );
  };

  // Selected Product in Line Item Selector
  const currentSelectedProduct = useMemo(() => {
    if (!selectedGameId || !selectedProductId) return null;
    const g = games.find(game => game.id === selectedGameId);
    return g?.products.find(p => p.id === selectedProductId) || null;
  }, [games, selectedGameId, selectedProductId]);

  // Strict maximum quantity calculation for a product taking into account already committed items in ticketItems
  const getProductMaxQuantity = useCallback((product: GameProduct, excludeItemId?: string): number => {
    let maxQty = 999999;

    // 1. Check physical stock limit if enabled
    if (product.availableQuantity !== undefined && product.availableQuantity !== null) {
      const alreadyAddedQty = ticketItems
        .filter(it => it.productId === product.id && it.id !== excludeItemId)
        .reduce((sum, it) => sum + (it.quantity || 1), 0);
      maxQty = Math.min(maxQty, Math.max(0, product.availableQuantity - alreadyAddedQty));
    }

    // 2. Check points wallet limit
    const pts = product.pointsCostPerUnit || 0;
    const walletId = product.primaryWalletId || product.walletTypeId;
    if (pts > 0 && walletId) {
      let totalWalletPoints = 0;
      let hasWallet = false;
      const jkrW = JKRWalletEngine.getWalletById(walletId);
      if (jkrW) {
        totalWalletPoints = jkrW.pointsBalance ?? 0;
        hasWallet = true;
      } else {
        const stW = db.getStoreWallets().find(w => w.id === walletId);
        if (stW && stW.pointsBalance !== undefined) {
          totalWalletPoints = stW.pointsBalance;
          hasWallet = true;
        }
      }

      if (hasWallet) {
        // Calculate points already committed by other items in the ticket that use this wallet
        const pointsCommitted = ticketItems.reduce((sum, itm) => {
          if (excludeItemId && itm.id === excludeItemId) return sum;
          const itmWId = itm.consumedWalletId || itm.walletTypeId;
          const itmProd = games.flatMap(g => g.products || []).find(p => p.id === itm.productId);
          const targetWId = itmWId || itmProd?.primaryWalletId || itmProd?.walletTypeId;
          if (targetWId === walletId) {
            const itemPts = itmProd?.pointsCostPerUnit || (itm.consumedPoints && itm.quantity ? itm.consumedPoints / itm.quantity : 0);
            return sum + (itemPts * (itm.quantity || 1));
          }
          return sum;
        }, 0);

        const remainingPoints = Math.max(0, totalWalletPoints - pointsCommitted);
        const maxPointsQty = Math.floor(remainingPoints / pts);
        maxQty = Math.min(maxQty, maxPointsQty);
      }
    }

    return Math.max(0, maxQty);
  }, [ticketItems, games]);

  // Live Points Sufficiency Validation for Current Selected Line Item (Requirement #3)
  const linePointsValidation = useMemo(() => {
    if (!currentSelectedProduct) {
      return { hasPointsWallet: false, isInsufficient: false, pointsNeeded: 0, availablePoints: 0, pointsPerUnit: 0, maxAddableQty: 999999 };
    }
    const pts = currentSelectedProduct.pointsCostPerUnit || 0;
    const walletId = currentSelectedProduct.primaryWalletId || currentSelectedProduct.walletTypeId;
    const maxAddableQty = getProductMaxQuantity(currentSelectedProduct);

    if (pts <= 0 || !walletId) {
      return { hasPointsWallet: false, isInsufficient: maxAddableQty <= 0, pointsNeeded: 0, availablePoints: 0, pointsPerUnit: 0, maxAddableQty };
    }

    let totalWalletPoints = 0;
    let hasPointsWallet = false;

    const jkrW = JKRWalletEngine.getWalletById(walletId);
    if (jkrW) {
      totalWalletPoints = jkrW.pointsBalance ?? 0;
      hasPointsWallet = true;
    } else {
      const stW = db.getStoreWallets().find(w => w.id === walletId);
      if (stW && stW.pointsBalance !== undefined) {
        totalWalletPoints = stW.pointsBalance;
        hasPointsWallet = true;
      }
    }

    if (!hasPointsWallet) {
      return { hasPointsWallet: false, isInsufficient: maxAddableQty <= 0, pointsNeeded: 0, availablePoints: 0, pointsPerUnit: 0, maxAddableQty };
    }

    // Points already committed by items in ticketItems using this wallet
    const pointsCommitted = ticketItems.reduce((sum, itm) => {
      const itmWId = itm.consumedWalletId || itm.walletTypeId;
      const itmProd = games.flatMap(g => g.products || []).find(p => p.id === itm.productId);
      const targetWId = itmWId || itmProd?.primaryWalletId || itmProd?.walletTypeId;
      if (targetWId === walletId) {
        const itemPts = itmProd?.pointsCostPerUnit || (itm.consumedPoints && itm.quantity ? itm.consumedPoints / itm.quantity : 0);
        return sum + (itemPts * (itm.quantity || 1));
      }
      return sum;
    }, 0);

    const availablePoints = Math.max(0, totalWalletPoints - pointsCommitted);
    const qty = Math.max(1, lineQuantity);
    const pointsNeeded = pts * qty;
    const isInsufficient = pointsNeeded > availablePoints || maxAddableQty < qty;

    return {
      hasPointsWallet,
      isInsufficient,
      pointsNeeded,
      availablePoints,
      pointsPerUnit: pts,
      maxAddableQty
    };
  }, [currentSelectedProduct, lineQuantity, ticketItems, games, getProductMaxQuantity]);

  // Suggested Player IDs based on past history
  const suggestedPlayerIds = useMemo(() => {
    if (!matchedCustomer && !customerPhone.trim()) return [];
    const pastTickets = tickets.filter(
      t =>
        (t.customerId === matchedCustomer?.id || t.customerPhone === customerPhone.trim()) &&
        t.playerGameId
    );
    return Array.from(new Set(pastTickets.map(t => t.playerGameId)));
  }, [matchedCustomer, customerPhone, tickets]);

  // -------------------------------------------------------------
  // Live Multi-Product Totals & Financial Calculations
  // -------------------------------------------------------------
  const totalProductsPrice = useMemo(() => {
    return Math.round(ticketItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0) * 100) / 100;
  }, [ticketItems]);

  const totalProductsCost = useMemo(() => {
    return Math.round(ticketItems.reduce((acc, item) => acc + (item.costPrice * (item.quantity || 1)), 0) * 100) / 100;
  }, [ticketItems]);

  const totalOperatingExpenses = useMemo(() => {
    return Math.round(ticketItems.reduce((acc, item) => acc + ((item.fixedCostEGP ?? 0) * (item.quantity || 1)), 0) * 100) / 100;
  }, [ticketItems]);

  const totalItemCashback = useMemo(() => {
    return Math.round(ticketItems.reduce((acc, item) => acc + (item.cashbackAmountEGP ?? 0), 0) * 100) / 100;
  }, [ticketItems]);

  const totalItemReferral = useMemo(() => {
    return Math.round(ticketItems.reduce((acc, item) => acc + (item.referralAmountEGP ?? 0), 0) * 100) / 100;
  }, [ticketItems]);

  const hasValidReferrer = useMemo(() => {
    return db.hasValidReferrer(matchedCustomer?.id || customerPhone, department);
  }, [matchedCustomer, customerPhone, department]);

  const effectiveItemReferral = hasValidReferrer ? totalItemReferral : 0;
  const _effectiveReferralAllowance = !hasValidReferrer ? totalItemReferral : 0;

  // Approved Strict Formula: Net Profit = Sale Price - Actual FIFO Cost - Actual Cashback - Actual Referral - Product Operating Expenses
  // When customer has NO valid referrer, referral converts to profit (بدل إحالة) and is NOT deducted from profit
  const totalProfitMargin = useMemo(() => {
    return Math.round((totalProductsPrice - totalProductsCost - totalItemCashback - effectiveItemReferral - totalOperatingExpenses) * 100) / 100;
  }, [totalProductsPrice, totalProductsCost, totalItemCashback, effectiveItemReferral, totalOperatingExpenses]);

  // Deductions:
  // After Coupon:
  const afterCoupon = Math.max(0, totalProductsPrice - appliedCouponDiscount);

  // Cashback
  const availableCashback = (matchedCustomer?.cashbackBalance || 0) + (editingTicket?.cashbackUsed || 0);
  const effectiveCashbackUsed = useCashback ? Math.min(customCashbackAmount || availableCashback, afterCoupon) : 0;
  const afterCashback = Math.max(0, afterCoupon - effectiveCashbackUsed);

  // Referral Wallet
  const availableReferral = (matchedCustomer?.referralWalletBalance || 0) + (editingTicket?.referralBalanceUsed || 0);
  const effectiveReferralUsed = useReferralBalance ? Math.min(customReferralAmount || availableReferral, afterCashback) : 0;
  const afterReferral = Math.max(0, afterCashback - effectiveReferralUsed);

  // Customer Account Balance (المحفظة الأساسية: رصيد العميل دائن أو مدين)
  const rawCustomerBalance = matchedCustomer ? (matchedCustomer.accountBalance !== undefined ? matchedCustomer.accountBalance : (matchedCustomer.balance ?? 0)) : 0;
  const adjustedCustomerBalance = rawCustomerBalance + (editingTicket?.accountBalanceUsed || 0);
  const availableCredit = adjustedCustomerBalance > 0 ? adjustedCustomerBalance : 0;
  const hasNegativeBalance = adjustedCustomerBalance < 0;
  const effectiveCreditUsed = useCreditBalance ? Math.min(customCreditAmount || availableCredit, afterReferral) : 0;

  // Final Net Required Cash to pay
  const finalRequiredCash = Math.max(0, afterReferral - effectiveCreditUsed);

  // Excess (Overpayment) or Shortage (Underpayment)
  const overpaymentExcess = Math.max(0, (receivedAmount || 0) - finalRequiredCash);
  const shortageDebit = receivedAmount > 0 && receivedAmount < finalRequiredCash ? (finalRequiredCash - receivedAmount) : 0;

  // Expected Automatic Profit & Cashback
  const _expectedCashbackEarned = totalItemCashback;

  // -------------------------------------------------------------
  // 🎯 Filtered Tickets Engine (Fully Responsive to All Filters)
  // -------------------------------------------------------------
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Status & Reservation Tab filter
      if (selectedStatusTab === 'reservations') {
        if (!t.isReservation && t.operationMode !== 'reservation') return false;
        // Only show active/pending reservations here (completed/delivered move to completed tab)
        if (
          t.status === 'completed' ||
          t.status === 'canceled' ||
          t.status === 'refunded' ||
          t.reservationStatus === 'delivered' ||
          t.reservationStatus === 'cancelled'
        ) {
          return false;
        }
      } else if (selectedStatusTab === 'completed_reservations') {
        const isRes = t.isReservation || t.operationMode === 'reservation';
        if (!isRes || t.status !== 'completed') return false;
      } else if (selectedStatusTab !== 'all' && t.status !== selectedStatusTab) {
        return false;
      }

      // Reservation Source Filter Dropdown
      if (reservationFilter === 'completed_reservations') {
        const isRes = t.isReservation || t.operationMode === 'reservation';
        if (!isRes || t.status !== 'completed') return false;
      } else if (reservationFilter === 'pending_reservations') {
        const isRes = t.isReservation || t.operationMode === 'reservation';
        if (!isRes || t.status === 'completed' || t.status === 'canceled' || t.status === 'refunded') return false;
      } else if (reservationFilter === 'direct') {
        const isRes = t.isReservation || t.operationMode === 'reservation';
        if (isRes) return false;
      }

      // Game filter
      if (selectedGameFilter !== 'all') {
        const filterClean = selectedGameFilter.toLowerCase().replace(/[()\u0600-\u06FF]/g, '').trim();
        const matchesPrimary = t.gameName === selectedGameFilter || (filterClean && t.gameName?.toLowerCase().includes(filterClean));
        const matchesItems = t.items && t.items.some(it => it.gameName === selectedGameFilter || (filterClean && it.gameName?.toLowerCase().includes(filterClean)));
        if (!matchesPrimary && !matchesItems) return false;
      }

      // Wallet filter
      if (selectedWalletFilter !== 'all') {
        if (t.paymentWallet !== selectedWalletFilter && t.paymentGateway !== selectedWalletFilter) return false;
      }

      // Employee filter
      if (selectedEmployeeFilter !== 'all') {
        if (t.assignedTo !== selectedEmployeeFilter) return false;
      }

      // Ticket type filter
      if (selectedTypeFilter !== 'all') {
        if (t.ticketType !== selectedTypeFilter) return false;
      }

      // Platform / Communication source filter
      if (selectedPlatformFilter !== 'all') {
        const tSource = t.platformSource || 'whatsapp';
        if (tSource !== selectedPlatformFilter) {
          const custSource = allCustomers.find(c => c.id === t.customerId || c.phone === t.customerPhone)?.source;
          if (custSource !== selectedPlatformFilter) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = t.ticketNumber.toLowerCase().includes(q);
        const matchPhone = t.customerPhone.includes(q);
        const matchName = t.customerName.toLowerCase().includes(q);
        const matchGame = t.gameName.toLowerCase().includes(q);
        const matchPlayerId = Boolean(t.playerGameId && t.playerGameId.toLowerCase().includes(q));
        const matchNotes = Boolean(t.notes && t.notes.toLowerCase().includes(q));
        const matchSenderPhone = Boolean(t.senderPhoneNumber && t.senderPhoneNumber.includes(q));
        const matchRefNumber = Boolean(t.transferReferenceNumber && t.transferReferenceNumber.toLowerCase().includes(q));
        const matchTicketRef = Boolean(t.referenceNumber && t.referenceNumber.toLowerCase().includes(q));
        const custNotes = allCustomers.find(c => c.id === t.customerId || c.phone === t.customerPhone)?.notes;
        const matchCustomerNotes = Boolean(custNotes && custNotes.toLowerCase().includes(q));

        if (
          !matchNumber &&
          !matchPhone &&
          !matchName &&
          !matchGame &&
          !matchPlayerId &&
          !matchNotes &&
          !matchSenderPhone &&
          !matchRefNumber &&
          !matchTicketRef &&
          !matchCustomerNotes
        ) {
          return false;
        }
      }

      // Date Range Filter
      if (startDate || endDate) {
        const ticketDateStr = t.createdAt ? t.createdAt.split('T')[0] : '';
        if (startDate && ticketDateStr < startDate) return false;
        if (endDate && ticketDateStr > endDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'highestAmount') return (b.receivedAmount || b.requiredAmount) - (a.receivedAmount || a.requiredAmount);
      if (sortBy === 'lowestAmount') return (a.receivedAmount || a.requiredAmount) - (b.receivedAmount || b.requiredAmount);
      return 0;
    });
  }, [
    tickets,
    selectedStatusTab,
    selectedGameFilter,
    selectedWalletFilter,
    selectedEmployeeFilter,
    selectedTypeFilter,
    selectedPlatformFilter,
    reservationFilter,
    searchQuery,
    allCustomers,
    startDate,
    endDate,
    sortBy
  ]);

  // Google-Style Pagination States for Tickets (10 tickets per page default)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // Reset page to 1 when any search, tab, or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedStatusTab,
    selectedGameFilter,
    selectedWalletFilter,
    selectedEmployeeFilter,
    selectedTypeFilter,
    reservationFilter,
    startDate,
    endDate,
    sortBy
  ]);

  // Universal Reset Filters Handler
  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSelectedStatusTab('all');
    setSelectedGameFilter('all');
    setSelectedWalletFilter('all');
    setSelectedEmployeeFilter('all');
    setSelectedTypeFilter('all');
    setSelectedPlatformFilter('all');
    setReservationFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setCurrentPage(1);
    showToast('info', 'تم تصفير الفلاتر', 'تم إلغاء كافة الفلاتر والبحث واسترجاع العرض الافتراضي لكافة التذاكر');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedStatusTab !== 'all') count++;
    if (selectedGameFilter !== 'all') count++;
    if (selectedWalletFilter !== 'all') count++;
    if (selectedEmployeeFilter !== 'all') count++;
    if (selectedTypeFilter !== 'all') count++;
    if (selectedPlatformFilter !== 'all') count++;
    if (reservationFilter !== 'all') count++;
    if (startDate || endDate) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [
    searchQuery,
    selectedStatusTab,
    selectedGameFilter,
    selectedWalletFilter,
    selectedEmployeeFilter,
    selectedTypeFilter,
    selectedPlatformFilter,
    reservationFilter,
    startDate,
    endDate,
    sortBy
  ]);

  // Due Reservations Calculation (For Smart Notifications & Reminders)
  const dueReservations = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tickets.filter(
      t => (t.isReservation || t.operationMode === 'reservation') &&
        t.status !== 'completed' &&
        t.status !== 'canceled' &&
        t.status !== 'refunded' &&
        t.reservationStatus !== 'delivered' &&
        t.reservationStatus !== 'cancelled' &&
        (t.reservationStatus === 'pending' || t.reservationStatus === 'rescheduled' || !t.reservationStatus) &&
        t.scheduledDeliveryDate &&
        t.scheduledDeliveryDate <= today
    );
  }, [tickets]);

  const allReservations = useMemo(() => {
    return tickets.filter(
      t => (t.isReservation || t.operationMode === 'reservation') &&
        t.status !== 'completed' &&
        t.status !== 'canceled' &&
        t.status !== 'refunded' &&
        t.reservationStatus !== 'delivered' &&
        t.reservationStatus !== 'cancelled'
    );
  }, [tickets]);

  // -------------------------------------------------------------
  // Dynamic KPIs (Calculated from Current Filtered Results)
  // -------------------------------------------------------------
  const filteredKPIs = useMemo(() => {
    const totalCount = filteredTickets.length;
    const completedCount = filteredTickets.filter(t => t.status === 'completed').length;
    const openCount = filteredTickets.filter(t => t.status === 'new' || t.status === 'in_progress').length;
    const problemCount = filteredTickets.filter(t => t.status === 'problem' || t.status === 'fraud').length;

    const totalRevenue = filteredTickets.reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0);
    const totalCost = filteredTickets.reduce((sum, t) => sum + (t.totalCostAmount || 0), 0);
    const totalProfit = filteredTickets.reduce((sum, t) => sum + (t.totalProfitMargin || 0), 0);
    const totalCashbackGiven = filteredTickets.reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);
    const totalReferralGiven = filteredTickets.reduce((sum, t) => sum + (t.referralBalanceUsed || 0), 0);

    // Active shift revenue (completed tickets in the active shift since last settlement)
    const latestSettlement = db.getSettlements()
      .filter(s => s.status === 'closed' || s.status === 'verified')
      .sort((a, b) => new Date(b.closedAt || b.endTime || b.createdAt).getTime() - new Date(a.closedAt || a.endTime || a.createdAt).getTime())[0];
    const cutoffTime = latestSettlement
      ? new Date(latestSettlement.closedAt || latestSettlement.endTime || latestSettlement.createdAt).getTime()
      : 0;

    const shiftRevenue = filteredTickets
      .filter(t => {
        if (t.status !== 'completed') return false;
        if (t.shiftSettlementId) return false;
        const tTime = new Date(t.completedAt || t.updatedAt || t.createdAt).getTime();
        if (cutoffTime > 0 && tTime <= cutoffTime) return false;
        return true;
      })
      .reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0);

    return {
      totalCount,
      completedCount,
      openCount,
      problemCount,
      totalRevenue,
      totalCost,
      totalProfit,
      totalCashbackGiven,
      totalReferralGiven,
      shiftRevenue
    };
  }, [filteredTickets]);

  // -------------------------------------------------------------
  // Shift Financial Totals (إجمالي الوردية المالي المفصل)
  // -------------------------------------------------------------
  const shiftFinancialTotals = useMemo(() => {
    // When no manual date filters are chosen, calculate from the active shift boundary (since last settlement)
    const latestSettlement = db.getSettlements()
      .filter(s => s.status === 'closed' || s.status === 'verified')
      .sort((a, b) => new Date(b.closedAt || b.endTime || b.createdAt).getTime() - new Date(a.closedAt || a.endTime || a.createdAt).getTime())[0];

    const cutoffTime = latestSettlement
      ? new Date(latestSettlement.closedAt || latestSettlement.endTime || latestSettlement.createdAt).getTime()
      : 0;

    // Filter tickets that belong to the current shift / date window
    const shiftTickets = tickets.filter(t => {
      if (t.status !== 'completed') return false;

      // If user selected custom dates in the search filter bar:
      if (startDate || endDate) {
        const tDate = t.createdAt ? t.createdAt.split('T')[0] : '';
        if (!tDate) return false;
        if (startDate && tDate < startDate) return false;
        if (endDate && tDate > endDate) return false;
        return true;
      }

      // Default: Active Shift (unsettled tickets completed after latest settlement)
      if (t.shiftSettlementId) return false;
      const tTime = new Date(t.completedAt || t.updatedAt || t.createdAt).getTime();
      if (cutoffTime > 0 && tTime <= cutoffTime) return false;
      return true;
    });

    const totalRevenue = shiftTickets.reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0);
    const totalCost = shiftTickets.reduce((sum, t) => sum + (t.totalCostAmount || 0), 0);
    const totalProfit = shiftTickets.reduce(
      (sum, t) => sum + (t.totalProfitMargin !== undefined ? t.totalProfitMargin : (t.netProfit !== undefined ? t.netProfit : ((t.receivedAmount || t.requiredAmount || 0) - (t.totalCostAmount || 0)))),
      0
    );
    const totalCashback = shiftTickets.reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);
    const totalReferral = shiftTickets.reduce((sum, t) => sum + (t.referralCommissionEarned || t.referralBalanceUsed || 0), 0);
    const totalOperatingExpenses = shiftTickets.reduce((sum, t) => sum + (t.fixedCostAmount || t.pricingSnapshot?.fixedCostEGP || 0), 0);

    // الأمانات (Trust): فائض الدفع بالتذاكر + مقدمات الحجوزات المعلقة
    const todayStr = new Date().toISOString().split('T')[0];
    const overpaymentSum = shiftTickets.reduce((sum, t) => sum + (t.overpaymentAmount || 0), 0);
    const reservationDepositSum = tickets
      .filter(t => {
        const tDate = t.createdAt ? t.createdAt.split('T')[0] : '';
        const isMatchDate = (startDate || endDate)
          ? (!startDate || tDate >= startDate) && (!endDate || tDate <= endDate)
          : (cutoffTime > 0 ? new Date(t.createdAt).getTime() > cutoffTime : tDate === todayStr);
        return isMatchDate && (t.isReservation || t.operationMode === 'reservation') && t.status !== 'canceled' && t.status !== 'completed';
      })
      .reduce((sum, t) => sum + (t.receivedAmount || 0), 0);

    const trustWallet = wallets.find(w => w.id === 'w_trust' || w.systemType === 'trust');
    const totalTrust = (overpaymentSum + reservationDepositSum) > 0
      ? (overpaymentSum + reservationDepositSum)
      : (trustWallet?.balance || 0);

    return {
      shiftTicketsCount: shiftTickets.length,
      totalRevenue,
      totalCost,
      totalProfit,
      totalCashback,
      totalReferral,
      totalOperatingExpenses,
      totalTrust
    };
  }, [tickets, startDate, endDate, wallets]);

  // Handle open modal
  const handleOpenNewTicketModal = () => {
    setEditingTicket(null);
    setIsModalOpen(true);
    setIsReferralRateOverridden(false);
    setTicketReferralPercentInput('0');
    setTicketType('regular');
    setPlatformSource('whatsapp');
    setCustomerPhone('');
    setTicketItems([]);
    setLinePlayerGameId('');
    setLineQuantity(1);
    setUseCashback(false);
    setUseReferralBalance(false);
    setUseCreditBalance(false);
    setCouponCodeInput('');
    setAppliedCouponDiscount(0);
    setAppliedCouponCode('');
    setTransferReferenceNumber('');
    setSenderPhoneNumber('');
    setReceivedAmount(0);
    setTicketNotes('');
    setOperationMode('direct');
    setScheduledDeliveryDate('');
    setScheduledDeliveryTime('18:00');
    setReservationNotes('');

    if (games.length > 0) {
      setSelectedGameId(games[0].id);
      setSelectedSectionId(games[0].sections[0]?.id || '');
      setSelectedProductId(games[0].products[0]?.id || '');
    }

    if (operatingWallets.length > 0) {
      const activeWallets = operatingWallets.filter(w => !w.isFrozen);
      const defaultW = activeWallets[0] || operatingWallets[0];
      setPaymentWalletId(defaultW.id);
      setPaymentWallet(defaultW.name);
      const activeNums = (defaultW.numbers || []).filter(n => n.status !== 'frozen');
      const pref = activeNums.find(n => n.isPrimary) || activeNums[0];
      if (pref) {
        setPaymentWalletNumberId(pref.id);
        setPaymentReceivedPhone(pref.phoneNumber);
      } else {
        setPaymentWalletNumberId('');
        setPaymentReceivedPhone(defaultW.accountNumber || '');
      }
    }
  };

  // Handle open modal in Edit Mode (التحكم الكامل وإعادة تحميل بيانات التذكرة)
  const handleOpenEditTicket = (tkt: CustomerTicket) => {
    setEditingTicket(tkt);
    setTicketType(tkt.ticketType || 'regular');
    setPlatformSource(tkt.platformSource || 'whatsapp');
    setCustomerPhone(tkt.customerPhone || '');
    setOperationMode(tkt.operationMode || (tkt.isReservation ? 'reservation' : 'direct'));
    setScheduledDeliveryDate(tkt.scheduledDeliveryDate || '');
    setScheduledDeliveryTime(tkt.scheduledDeliveryTime || '18:00');
    setReservationNotes(tkt.reservationNotes || '');
    setTicketNotes(tkt.notes || '');
    setTransferReferenceNumber(tkt.transferReferenceNumber || tkt.referenceNumber || '');
    setTicketReferenceNumber(tkt.referenceNumber || tkt.transferReferenceNumber || '');
    setSenderPhoneNumber(tkt.senderPhoneNumber || '');
    setReceivedAmount(tkt.receivedAmount || tkt.requiredAmount || 0);

    // Referral rate
    const savedRate = tkt.referralPercent !== undefined
      ? tkt.referralPercent
      : (tkt.referralPercentage !== undefined ? tkt.referralPercentage : 0);
    setTicketReferralPercentInput(String(savedRate));
    setIsReferralRateOverridden(savedRate > 0);

    // Coupon
    setCouponCodeInput(tkt.couponCode || '');
    setAppliedCouponCode(tkt.couponCode || '');
    setAppliedCouponDiscount(tkt.couponDiscountAmount || 0);

    // Deductions used
    const cbUsed = Number(tkt.cashbackUsed || 0);
    setUseCashback(cbUsed > 0);
    setCustomCashbackAmount(cbUsed);

    const refUsed = Number(tkt.referralBalanceUsed || 0);
    setUseReferralBalance(refUsed > 0);
    setCustomReferralAmount(refUsed);

    const crUsed = Number(tkt.accountBalanceUsed || 0);
    setUseCreditBalance(crUsed > 0);
    setCustomCreditAmount(crUsed);

    // Payment wallet
    if (tkt.paymentWalletId) {
      setPaymentWalletId(tkt.paymentWalletId);
      const w = operatingWallets.find(ow => ow.id === tkt.paymentWalletId);
      setPaymentWallet(w?.name || tkt.paymentWallet || '');
    } else if (tkt.paymentWallet) {
      const w = operatingWallets.find(ow => ow.name === tkt.paymentWallet);
      setPaymentWalletId(w?.id || '');
      setPaymentWallet(tkt.paymentWallet);
    }
    setPaymentGateway(tkt.paymentGateway || 'Vodafone Cash');
    setPaymentWalletNumberId(tkt.paymentWalletNumberId || '');
    setPaymentReceivedPhone(tkt.paymentReceivedPhone || '');

    // Line items
    if (tkt.items && tkt.items.length > 0) {
      const resolved = tkt.items.map((it, idx) => {
        const matchedG = games.find(g => g.id === it.gameId || g.name === it.gameName);
        const matchedP = matchedG?.products?.find(p => p.id === it.productId || p.name === it.productName);
        return {
          ...it,
          id: it.id || `itm_${Date.now()}_${idx}`,
          gameId: it.gameId || matchedG?.id || '',
          gameName: it.gameName || matchedG?.name || '',
          sectionId: it.sectionId || matchedP?.sectionId || '',
          sectionName: it.sectionName || '',
          productId: it.productId || matchedP?.id || '',
          productName: it.productName || matchedP?.name || '',
          playerGameId: it.playerGameId || tkt.playerGameId || '',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
          totalPrice: it.totalPrice || (it.unitPrice * (it.quantity || 1)),
          costPrice: it.costPrice || 0,
          fixedCostEGP: it.fixedCostEGP !== undefined ? it.fixedCostEGP : 0,
          cashbackPercent: it.cashbackPercent !== undefined ? it.cashbackPercent : 0,
          referralPercent: it.referralPercent !== undefined ? it.referralPercent : 0
        };
      });
      setTicketItems(resolved);
    } else {
      const matchedG = games.find(g => g.name === tkt.gameName);
      const matchedP = matchedG?.products?.find(p => p.name === tkt.gameProductName);
      setTicketItems([{
        id: `itm_${Date.now()}`,
        gameId: matchedG?.id || '',
        gameName: tkt.gameName || '',
        sectionId: matchedP?.sectionId || '',
        sectionName: tkt.gameSection || 'عام',
        productId: matchedP?.id || '',
        productName: tkt.gameProductName || '',
        playerGameId: tkt.playerGameId || '',
        quantity: 1,
        unitPrice: tkt.totalProductsAmount || tkt.requiredAmount || 0,
        totalPrice: tkt.totalProductsAmount || tkt.requiredAmount || 0,
        costPrice: tkt.totalCostAmount || 0,
        fixedCostEGP: tkt.fixedCostAmount || 0,
        cashbackPercent: tkt.cashbackPercent || 0,
        referralPercent: tkt.referralPercent || 0
      }]);
    }

    if (games.length > 0) {
      setSelectedGameId(games[0].id);
      setSelectedSectionId(games[0].sections[0]?.id || '');
      setSelectedProductId(games[0].products[0]?.id || '');
      setLinePlayerGameId(tkt.playerGameId || '');
      setLineQuantity(1);
    }

    setIsNewTicketModalOpen(true);
  };

  const setIsModalOpen = (open: boolean) => {
    if (!open) setEditingTicket(null);
    setIsNewTicketModalOpen(open);
  };

  // Helper to comprehensively check if customer, phone, or player ID is ineligible for First Shipping discount
  const checkFirstShippingIneligibility = useCallback((
    phone: string,
    cust?: Customer | Dealer | null,
    playerIds: string[] = []
  ): { eligible: boolean; reason?: string } => {
    const qPhone = (phone || '').trim();

    // 1. Check if the phone number has previously benefited from first shipping offer
    if (qPhone) {
      const hasUsed = db.hasPhoneNumberUsedFirstShipping(qPhone);
      if (hasUsed) {
        return {
          eligible: false,
          reason: 'هذا الرقم استفاد بالفعل من عرض أول شحنة ولا يمكن استخدام العرض مرة أخرى.'
        };
      }
    }

    // 2. Direct customer entity flag check
    if (cust && (cust as Customer).hasUsedFirstOrderDiscount) {
      return {
        eligible: false,
        reason: 'هذا الرقم استفاد بالفعل من عرض أول شحنة ولا يمكن استخدام العرض مرة أخرى.'
      };
    }

    // 3. Check Database & Tickets for Player ID (Anti-fraud by Game ID if used with first_shipping)
    const cleanPlayerIds = playerIds.map(p => (p || '').trim().toLowerCase()).filter(Boolean);
    if (cleanPlayerIds.length > 0) {
      for (const pId of cleanPlayerIds) {
        const pastFirstShippingByPlayerId = tickets.find(t => {
          if (t.status === 'canceled' || t.status === 'fraud') return false;
          if (t.ticketType !== 'first_shipping' && !t.isFirstOrderDiscountApplied) return false;
          if (t.playerGameId && t.playerGameId.trim().toLowerCase() === pId) return true;
          if (t.items && t.items.some(it => it.playerGameId && it.playerGameId.trim().toLowerCase() === pId)) return true;
          return false;
        });

        if (pastFirstShippingByPlayerId) {
          return {
            eligible: false,
            reason: `معرف اللاعب (Player ID: ${pId}) استفاد بالفعل من عرض أول شحنة في تذكرة #${pastFirstShippingByPlayerId.ticketNumber}.`
          };
        }
      }
    }

    return { eligible: true };
  }, [tickets]);

  // Reactive First Shipping Ineligibility Detection (Order-Independent)
  useEffect(() => {
    if (ticketType !== 'first_shipping') return;
    const allPlayerIds = [
      linePlayerGameId.trim(),
      ...ticketItems.map(it => it.playerGameId?.trim()).filter(Boolean)
    ];
    const check = checkFirstShippingIneligibility(customerPhone, matchedCustomer, allPlayerIds);
    if (!check.eligible && check.reason) {
      showToast('error', '⛔ غير مؤهل لعرض "أول شحنة"', `${check.reason} تم التحويل لشحنة عادية تلقائياً.`);
      setTicketType('regular');
    }
  }, [ticketType, customerPhone, matchedCustomer, linePlayerGameId, ticketItems, tickets, checkFirstShippingIneligibility, showToast]);

  // Re-evaluate line items prices when ticketType, isDealer, or catalog games change
  useEffect(() => {
    const tree = ticketType === 'first_shipping' ? db.getFirstShippingGameTree() : db.getGameTree();
    setTicketItems(prevItems => {
      if (prevItems.length === 0) return prevItems;
      return prevItems.map(item => {
        const g = tree.find(game => game.id === item.gameId || game.name === item.gameName);
        const p = g?.products.find(prod => prod.id === item.productId || prod.name === item.productName);
        if (!p) return item;

        const unitPrice =
          ticketType === 'first_shipping'
            ? p.firstOrderCostPriceEGP
            : isDealer
              ? (p.dealerPriceEGP || p.calculatedPriceEGP)
              : p.calculatedPriceEGP;

        const pts = p.pointsCostPerUnit || 0;
        const walletId = p.primaryWalletId || p.walletTypeId;
        let costPrice = p.costPriceEGP || item.costPrice || 0;

        if (walletId && pts > 0) {
          const fifoInfo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts * (item.quantity || 1));
          if (fifoInfo.totalCostEGP > 0) {
            costPrice = Math.round((fifoInfo.totalCostEGP / (item.quantity || 1)) * 100) / 100;
          }
        }

        const qty = item.quantity || 1;
        const productFixedCost = p.fixedCostPerOrder !== undefined && p.fixedCostPerOrder >= 0
          ? p.fixedCostPerOrder
          : (PricingEngine.getPricingConfig().manualFixedCostEGP || 0);

        const isCbActive = g?.cashbackEnabled !== false && p.isCashbackEnabled !== false;
        const effectiveCbRate = isCbActive
          ? (matchedCustomer?.cashbackRate !== undefined && matchedCustomer?.cashbackRate !== null
              ? resolvedCustomerCashbackRate
              : (p.cashbackPercent !== undefined && p.cashbackPercent > 0 ? p.cashbackPercent : resolvedCustomerCashbackRate))
          : 0;
        const itemCashbackAmount = Math.round(((unitPrice * qty) * (effectiveCbRate / 100)) * 100) / 100;

        const isRefActive = g?.referralEnabled !== false && p.isReferralEnabled !== false;
        const prodRefLimit = p.partnerCommissionPercent !== undefined && p.partnerCommissionPercent !== null
          ? Number(p.partnerCommissionPercent)
          : (PricingEngine.getPricingConfig().referralPercent ?? 2.0);
        const effectiveRefRate = isRefActive ? Math.min(effectiveTicketReferralPercent, prodRefLimit) : 0;
        const itemReferralAmount = Math.round(((unitPrice * qty) * (effectiveRefRate / 100)) * 100) / 100;
        const itemNetProfit = Math.round(((unitPrice * qty) - (costPrice * qty) - itemCashbackAmount - itemReferralAmount - (productFixedCost * qty)) * 100) / 100;

        return {
          ...item,
          unitPrice,
          totalPrice: unitPrice * qty,
          costPrice,
          fixedCostEGP: productFixedCost,
          cashbackPercent: effectiveCbRate,
          cashbackAmountEGP: itemCashbackAmount,
          referralPercent: effectiveRefRate,
          referralAmountEGP: itemReferralAmount,
          netProfitEGP: itemNetProfit
        };
      });
    });
  }, [ticketType, isDealer, games, effectiveTicketReferralPercent, resolvedCustomerCashbackRate, matchedCustomer?.cashbackRate]);

  // Anti-fraud First Shipping Switcher Check
  const handleSelectTicketType = (type: TicketShippingType) => {
    if (type === 'first_shipping') {
      const allPlayerIds = [
        linePlayerGameId.trim(),
        ...ticketItems.map(it => it.playerGameId?.trim()).filter(Boolean)
      ];
      const check = checkFirstShippingIneligibility(customerPhone, matchedCustomer, allPlayerIds);

      if (!check.eligible) {
        showToast(
          'error',
          'مرفوض — تم استهلاك العرض مسبقاً',
          check.reason || 'لا يمكن فتح تذكرة أول شحنة لأن العميل أو الـ ID سبق له التعامل معنا وسداد طلبات سابقة.'
        );
        return;
      }
    }
    setTicketType(type);
  };

  // Select Autocomplete suggestion
  const handleSelectPhoneSuggestion = (cust: Customer) => {
    setCustomerPhone(cust.phone);
    setIsPhoneDropdownOpen(false);

    if (ticketType === 'first_shipping') {
      const allPlayerIds = [
        linePlayerGameId.trim(),
        ...ticketItems.map(it => it.playerGameId?.trim()).filter(Boolean)
      ];
      const check = checkFirstShippingIneligibility(cust.phone, cust, allPlayerIds);
      if (!check.eligible) {
        showToast('error', '⚠️ تحويل تلقائي لشحنة عادية', `${check.reason || 'العميل غير مؤهل لأول شحنة'}`);
        setTicketType('regular');
        return;
      }
    }

    showToast('info', 'تم تحديد العميل', `تم اختيار بروفايل: ${cust.name} (${cust.phone})`);
  };

  // Add Line item
  const handleAddLineItem = () => {
    if (!selectedGameId || !selectedProductId) {
      showToast('error', 'اختر باقة', 'يرجى اختيار اللعبة والباقة المراد إضافتها');
      return;
    }

    if (!linePlayerGameId.trim()) {
      showToast('error', 'معرف اللاعب مطلوب', 'يرجى إدخال Player ID أو اسم حساب اللاعب');
      return;
    }

    const ownershipCheck = db.checkPlayerGameIdOwnership(
      linePlayerGameId,
      customerPhone,
      matchedCustomer?.id
    );
    if (!ownershipCheck.isAllowed) {
      showToast(
        'error',
        '⛔ معرف اللعبة مسجل لعميل آخر',
        `معرف اللاعب (${linePlayerGameId.trim()}) مسجل مسبقاً للعميل "${ownershipCheck.conflictCustomerName}" (${ownershipCheck.conflictCustomerPhone}) ولا يمكن استخدامه لعميل آخر.`
      );
      return;
    }

    const g = games.find(game => game.id === selectedGameId);
    const p = g?.products.find(prod => prod.id === selectedProductId);
    const sec = g?.sections.find(s => s.id === selectedSectionId);

    if (!p) return;

    // Strict Stock and Points Balance Sufficiency Check (Accounting for already added items in ticketItems)
    const qty = Math.max(1, lineQuantity);
    const maxAllowedToAdd = getProductMaxQuantity(p);
    if (maxAllowedToAdd <= 0) {
      showToast(
        'error',
        'لا يمكن تنفيذ العملية',
        'تم استنفاذ كامل الرصيد/الكمية المتاحة لهذا المنتج في هذه التذكرة بالفعل.'
      );
      return;
    }
    if (qty > maxAllowedToAdd) {
      showToast(
        'error',
        'الكمية المطلوبة أكبر من المتاح',
        `الكمية المتبقية المتاحة للإضافة هي ${maxAllowedToAdd} فقط.`
      );
      return;
    }

    const avail = db.checkProductAvailability(p, qty);
    if (!avail.isAvailable) {
      showToast(
        'error',
        'المنتج غير متاح حالياً',
        avail.reason || 'المنتج غير متاح حاليًا لعدم توفر رصيد كافٍ في مصادره.'
      );
      return;
    }

    const pts = p.pointsCostPerUnit || 0;
    const walletId = p.primaryWalletId || p.walletTypeId;

    // Wholesale Dealer Pricing vs Regular Customer Pricing vs First Order Cost
    const unitPrice =
      ticketType === 'first_shipping'
        ? p.firstOrderCostPriceEGP
        : isDealer
          ? (p.dealerPriceEGP || p.calculatedPriceEGP)
          : p.calculatedPriceEGP;

    let costPrice = p.costPriceEGP || 0;

    if (walletId && pts > 0) {
      const fifoInfo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts * qty);
      if (fifoInfo.totalCostEGP > 0) {
        costPrice = Math.round((fifoInfo.totalCostEGP / qty) * 100) / 100;
      }
    }

    // Product-Specific Operating Expenses (Fixed Cost)
    const productFixedCost = p.fixedCostPerOrder !== undefined && p.fixedCostPerOrder >= 0
      ? p.fixedCostPerOrder
      : (PricingEngine.getPricingConfig().manualFixedCostEGP || 0);

    // Cashback strictly from Customer/Dealer Profile (or Product custom rate if set)
    const isCbActive = g?.cashbackEnabled !== false && p.isCashbackEnabled !== false;
    const effectiveCbRate = isCbActive
      ? (matchedCustomer?.cashbackRate !== undefined && matchedCustomer?.cashbackRate !== null
          ? resolvedCustomerCashbackRate
          : (p.cashbackPercent !== undefined && p.cashbackPercent > 0 ? p.cashbackPercent : resolvedCustomerCashbackRate))
      : 0;
    const itemCashbackAmount = Math.round(((unitPrice * qty) * (effectiveCbRate / 100)) * 100) / 100;

    // Product-Specific Referral Commission (strictly lower of client rate vs product rate for company benefit)
    const isRefActive = g?.referralEnabled !== false && p.isReferralEnabled !== false;
    const prodRefLimit = p.partnerCommissionPercent !== undefined && p.partnerCommissionPercent !== null
      ? Number(p.partnerCommissionPercent)
      : (PricingEngine.getPricingConfig().referralPercent ?? 2.0);
    const effectiveRefRate = isRefActive ? Math.min(effectiveTicketReferralPercent, prodRefLimit) : 0;
    const itemReferralAmount = Math.round(((unitPrice * qty) * (effectiveRefRate / 100)) * 100) / 100;

    // Item Net Profit strictly: Price - FIFO Cost - Cashback - Referral - Operating Expenses
    const itemNetProfit = Math.round(((unitPrice * qty) - (costPrice * qty) - itemCashbackAmount - itemReferralAmount - (productFixedCost * qty)) * 100) / 100;

    const newItem: TicketItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      gameId: g?.id || '',
      gameName: g?.name || 'لعبة',
      sectionId: sec?.id,
      sectionName: sec?.name,
      productId: p.id,
      productName: p.name,
      playerGameId: linePlayerGameId.trim(),
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      costPrice,
      fixedCostEGP: productFixedCost,
      cashbackPercent: effectiveCbRate,
      cashbackAmountEGP: itemCashbackAmount,
      referralPercent: effectiveRefRate,
      referralAmountEGP: itemReferralAmount,
      netProfitEGP: itemNetProfit,
      walletTypeId: p.primaryWalletId || p.walletTypeId
    };

    setTicketItems([...ticketItems, newItem]);

    if (unitPrice < costPrice) {
      const loss = Math.round((costPrice - unitPrice) * qty * 100) / 100;
      showToast(
        'warning',
        '⚠️ تنبيه للإدارة: بيع بأقل من التكلفة الفعلية (FIFO)',
        `سعر البيع الحالي (${unitPrice} ج) أقل من تكلفة المنتج الفعلية (${costPrice} ج). سيتم تسجيل هذه العملية بخسارة قدرها: ${loss} جنيه.`
      );
    } else {
      showToast(
        'success',
        'تمت إضافة الباقة',
        isDealer
          ? `تمت إضافة ${p.name} بسعر الجملة للتاجر (${unitPrice} ج)`
          : `تمت إضافة ${p.name} للتذكرة (${unitPrice} ج)`
      );
    }
  };

  const handleRemoveLineItem = (id: string) => {
    setTicketItems(ticketItems.filter(it => it.id !== id));
  };

  const handleUpdateItemQuantity = (id: string, newQty: number) => {
    const targetItem = ticketItems.find(it => it.id === id);
    if (!targetItem) return;

    const prod = games.flatMap(g => g.products || []).find(p => p.id === targetItem.productId);
    const maxAllowed = prod ? getProductMaxQuantity(prod, id) : 999999;

    if (newQty > maxAllowed) {
      showToast(
        'error',
        'تم الوصول للحد الأقصى المتاح',
        `الكمية المتاحة في الرصيد لهذا المنتج هي ${maxAllowed} فقط، ولا يمكن زيادة الكمية فوق ذلك.`
      );
    }

    const validQty = Math.max(1, Math.min(newQty, maxAllowed));
    setTicketItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const unitP = it.unitPrice || 0;
          const costP = it.costPrice || 0;
          const cbRate = it.cashbackPercent || 0;
          const refRate = it.referralPercent || 0;
          const fixCost = it.fixedCostEGP || 0;
          const itemCb = Math.round(((unitP * validQty) * (cbRate / 100)) * 100) / 100;
          const itemRef = Math.round(((unitP * validQty) * (refRate / 100)) * 100) / 100;
          const itemNetProfit = Math.round(((unitP * validQty) - (costP * validQty) - itemCb - itemRef - (fixCost * validQty)) * 100) / 100;

          return {
            ...it,
            quantity: validQty,
            totalPrice: Math.round((unitP * validQty) * 100) / 100,
            cashbackAmountEGP: itemCb,
            referralAmountEGP: itemRef,
            netProfitEGP: itemNetProfit,
            consumedPoints: (it.consumedPoints && it.quantity ? (it.consumedPoints / it.quantity) * validQty : undefined)
          };
        }
        return it;
      })
    );
  };

  // Validate coupon
  const handleValidateCoupon = () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      showToast('error', 'ادخل الكود', 'يرجى كتابة كود الكوبون أولاً');
      return;
    }

    if (ticketType === 'first_shipping') {
      showToast('error', 'غير متاح لأول شحنة', 'كوبونات الخصم لا تعمل مع عروض وتذاكر أول شحنة المخفضة أصلاً');
      return;
    }

    if (matchedCustomer && (matchedCustomer.isFrozen || matchedCustomer.status === 'suspended')) {
      showToast('error', 'حساب مجمد', 'هذا الحساب مجمد ولا يمكن التعامل معه.');
      return;
    }

    // Comprehensive backend validation
    const valResult = db.validateCoupon(code, totalProductsPrice, {
      customerId: matchedCustomer?.id,
      customerPhone: customerPhone.trim(),
      customerCode: matchedCustomer?.code,
      gameId: ticketItems[0]?.gameId
    });

    if (!valResult.valid || !valResult.coupon) {
      showToast('error', 'كوبون غير صالح', valResult.message);
      return;
    }

    const coupon = valResult.coupon;

    // Check game match if restricted to a specific game
    if (coupon.applicableGameId && coupon.applicableGameId !== 'all') {
      const match = ticketItems.some(it => it.gameId === coupon.applicableGameId);
      if (!match) {
        showToast('error', 'كوبون مخصص للعبة أخرى', `هذا الكوبون مخصص للعبة [${coupon.applicableGameName || 'محددة'}] فقط`);
        return;
      }
    }

    setAppliedCouponDiscount(valResult.discountAmount);
    setAppliedCouponCode(coupon.code);
    showToast(
      'success',
      'تم تطبيق الكوبون بنجاح',
      `تم تطبيق خصم بقيمة ${valResult.discountAmount} جنيه على الفاتورة (${coupon.title})`
    );
  };

  // Quick Register Customer / Dealer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const isDealerDept = department === 'dealers';

    if (!newCustName.trim()) {
      showToast('error', 'الاسم مطلوب', isDealerDept ? 'يرجى كتابة اسم التاجر / المحل' : 'يرجى كتابة اسم العميل');
      return;
    }

    const cleanPhone = normalizePhoneNumber(customerPhone);
    if (!isValidPhoneNumber(cleanPhone)) {
      showToast('error', 'رقم غير صالح', 'يرجى إدخال رقم هاتف صحيح');
      return;
    }

    const phoneCheck = db.isPhoneTaken(cleanPhone);
    if (phoneCheck.taken) {
      const typeLabel = phoneCheck.entityType === 'dealer' ? 'تاجر' : 'عميل';
      showToast('error', 'هاتف مسجل بالفعل', `رقم الهاتف (${phoneCheck.phone}) مسجل مسبقاً لحساب ${typeLabel} باسم "${phoneCheck.name}"`);
      return;
    }

    const trimmedNotes = newCustNotes.trim();

    if (isDealerDept) {
      const newDealer: Dealer = {
        id: 'dlr_' + Date.now(),
        code: 'DLR-' + Math.floor(1000 + Math.random() * 9000),
        name: newCustName.trim(),
        phone: cleanPhone,
        profileType: (newCustProfileType as any) || 'distributor',
        source: newCustSource,
        status: 'active',
        isFrozen: false,
        monthlyReferredCount: 0,
        partnerWarningCount: 0,
        referralCode: 'REF-DLR-' + Math.floor(1000 + Math.random() * 9000),
        referredByCode: newCustReferralCode.trim() || undefined,
        birthDate: newCustBirthDate.trim() || undefined,
        notes: trimmedNotes || undefined,
        notesCount: trimmedNotes ? 1 : 0,
        referralWalletBalance: 0,
        totalReferralCommissionEarned: 0,
        balance: 0,
        accountBalance: 0,
        cashbackBalance: 0,
        totalCashbackEarned: 0,
        totalSpent: 0,
        totalOrders: 0,
        maxSingleOrderAmount: 0,
        loyaltyTier: 'normal',
        purchasingPower: 'normal',
        isArchived: false,
        ticketsCount: 0,
        hasUsedFirstOrderDiscount: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveDealer(newDealer);

      if (trimmedNotes) {
        try {
          db.addDealerNote({
            dealerId: newDealer.id,
            authorName: user?.fullName || (user as any)?.name || 'المدير العام',
            authorRole: user?.role === 'admin' ? 'إدارة النظام' : 'المبيعات والتذاكر',
            content: trimmedNotes,
            type: 'general'
          });
        } catch (err) {
          console.warn('Error saving dealer note:', err);
        }
      }

      showToast('success', 'تم تسجيل التاجر', `تم إنشاء بروفايل التاجر "${newDealer.name}" بنجاح وربطه بالتذكرة`);
    } else {
      const newCust: Customer = {
        id: 'cust_' + Date.now(),
        code: 'JKR-' + Math.floor(1000 + Math.random() * 9000),
        name: newCustName.trim(),
        phone: cleanPhone,
        profileType: (newCustProfileType as any) || 'regular',
        source: newCustSource,
        status: 'active',
        isFrozen: false,
        monthlyReferredCount: 0,
        partnerWarningCount: 0,
        referralCode: 'REF-JKR-' + Math.floor(1000 + Math.random() * 9000),
        referredByCode: newCustReferralCode.trim() || undefined,
        birthDate: newCustBirthDate.trim() || undefined,
        notes: trimmedNotes || undefined,
        notesCount: trimmedNotes ? 1 : 0,
        referralWalletBalance: 0,
        totalReferralCommissionEarned: 0,
        balance: 0,
        accountBalance: 0,
        cashbackBalance: 0,
        totalCashbackEarned: 0,
        totalSpent: 0,
        totalOrders: 0,
        maxSingleOrderAmount: 0,
        loyaltyTier: 'normal',
        purchasingPower: 'normal',
        isArchived: false,
        ticketsCount: 0,
        hasUsedFirstOrderDiscount: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveCustomer(newCust);

      if (trimmedNotes) {
        try {
          db.addCustomerNote({
            customerId: newCust.id,
            authorName: user?.fullName || (user as any)?.name || 'المدير العام',
            authorRole: user?.role === 'admin' ? 'إدارة النظام' : 'المبيعات والتذاكر',
            content: trimmedNotes,
            type: 'general'
          });
        } catch (err) {
          console.warn('Error saving customer note:', err);
        }
      }

      showToast('success', 'تم تسجيل العميل', `تم إنشاء بروفايل "${newCust.name}" بنجاح وربطه بالتذكرة`);
    }

    setIsQuickAddCustomerOpen(false);
    setNewCustName('');
    setNewCustReferralCode('');
    setNewCustBirthDate('');
    setNewCustNotes('');
    loadData();
  };

  // Create Ticket
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerPhone.trim()) {
      showToast('error', 'رقم الهاتف مطلوب', 'يرجى إدخال رقم هاتف العميل');
      return;
    }

    if (ticketItems.length === 0) {
      showToast('error', 'الفاتورة فارغة', 'يرجى إضافة منتج وباقة واحدة على الأقل للتذكرة');
      return;
    }

    if (matchedCustomer && (matchedCustomer.isFrozen || matchedCustomer.status === 'suspended')) {
      showToast('error', 'حساب مجمد', 'هذا الحساب مجمد ولا يمكن التعامل معه.');
      return;
    }

    // Check First Shipping privilege comprehensively
    if (ticketType === 'first_shipping' && (!editingTicket || editingTicket.ticketType !== 'first_shipping')) {
      const allPlayerIds = [
        linePlayerGameId.trim(),
        ...ticketItems.map(it => it.playerGameId?.trim()).filter(Boolean)
      ];
      const check = checkFirstShippingIneligibility(customerPhone, matchedCustomer, allPlayerIds);
      if (!check.eligible) {
        showToast('error', '⛔ مرفوض — تم استهلاك العرض', check.reason || 'العميل غير مؤهل لأول شحنة. تم تحويل التذكرة لشحنة عادية.');
        setTicketType('regular');
        return;
      }
    }

    // Universal Player Game ID Ownership Verification (منع تكرار معرف اللعبة لعميل آخر)
    const allPlayerIdsToCheck = [
      linePlayerGameId.trim(),
      ...ticketItems.map(it => it.playerGameId?.trim()).filter(Boolean)
    ];

    for (const pId of allPlayerIdsToCheck) {
      const check = db.checkPlayerGameIdOwnership(pId, customerPhone, matchedCustomer?.id);
      if (!check.isAllowed) {
        showToast(
          'error',
          '⛔ عملية مرفوضة — معرف اللعبة مسجل لعميل آخر',
          `معرف اللاعب (${pId}) مرتبط ومسجل نهائياً بحساب العميل "${check.conflictCustomerName}" (${check.conflictCustomerPhone})، ولا يُسمح بالحفظ لعميل آخر.`
        );
        return;
      }
    }

    // Reference Number Anti-Duplicate Check (Optional field)
    const cleanRef = transferReferenceNumber.trim();
    if (cleanRef) {
      const allExistingTickets = [...db.getTickets(), ...db.getDealerTickets()];
      const duplicateTicket = allExistingTickets.find(t => {
        if (editingTicket && t.id === editingTicket.id) return false;
        const ref1 = (t.transferReferenceNumber || '').trim().toLowerCase();
        const ref2 = (t.referenceNumber || '').trim().toLowerCase();
        const target = cleanRef.toLowerCase();
        return (ref1 && ref1 === target) || (ref2 && ref2 === target);
      });

      if (duplicateTicket) {
        showToast(
          'error',
          '⛔ رقم مرجعي مكرر',
          `الرقم المرجعي (${cleanRef}) مسجل بالفعل مسبقاً في التذكرة #${duplicateTicket.ticketNumber} (${duplicateTicket.customerName}). لا يمكن تكرار نفس الرقم المرجعي في أكثر من تذكرة منعاً للاحتيال.`
        );
        return;
      }
    }

    const isReservationTicket = operationMode === 'reservation';

    // Check Product Availability Across All Priority Wallets (Requirement #25 - Only for immediate delivery tickets)
    if (!isReservationTicket && !editingTicket) {
      for (const itm of ticketItems) {
        const g = games.find(game => game.id === itm.gameId);
        const prod = g?.products?.find(p => p.id === itm.productId || p.name === itm.productName);
        if (prod) {
          const avail = db.checkProductAvailability(prod, itm.quantity || 1);
          if (!avail.isAvailable) {
            showToast(
              'error',
              'المنتج غير متاح حالياً',
              avail.reason || `المنتج [${prod.name}] غير متاح حاليًا لعدم توفر رصيد كافٍ في مصادره.`
            );
            return;
          }

          // Strict Points Sufficiency Check Across Product Wallets (Requirement #9)
          const pts = prod.pointsCostPerUnit || 0;
          const requiredUnits = itm.quantity || 1;
          const pointsNeeded = pts * requiredUnits;
          if (pts > 0) {
            const wId = prod.primaryWalletId || prod.walletTypeId;
            let currentPointsBalance = 0;
            let hasWallet = false;
            if (wId) {
              const jkrW = JKRWalletEngine.getWalletById(wId);
              if (jkrW) {
                currentPointsBalance = jkrW.pointsBalance ?? 0;
                hasWallet = true;
              } else {
                const stW = db.getStoreWallets().find(w => w.id === wId);
                if (stW && stW.pointsBalance !== undefined) {
                  currentPointsBalance = stW.pointsBalance;
                  hasWallet = true;
                }
              }
            }
            if (hasWallet && pointsNeeded > currentPointsBalance) {
              showToast('error', 'الرصيد غير كافٍ', 'الرصيد الحالي في المحفظة غير كافٍ لإتمام هذه العملية.');
              return;
            }
          }
        }
      }
    }

    // Unique Reference Number Check (Requirement #3)
    if (ticketReferenceNumber.trim()) {
      const cleanRef = ticketReferenceNumber.trim();
      const allTickets = db.getTickets();
      const isDuplicate = allTickets.some(
        t => (editingTicket ? t.id !== editingTicket.id : true) && t.referenceNumber && t.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase()
      );
      if (isDuplicate) {
        showToast('error', 'الرقم المرجعي مكرر', 'الرقم المرجعي مستخدم بالفعل');
        return;
      }
    }

    // 🎯 Rule 5 & 8: Pre-Ticket Final Validation & Atomic FIFO Refresh
    let hasAnyPriceChanged = false;
    const validatedItems: TicketItem[] = ticketItems.map(itm => {
      const val = PricingEngine.validateAndRefreshTicketItem(itm, ticketType, isDealer);
      if (val.priceChanged) {
        hasAnyPriceChanged = true;
      }
      return val.item;
    });

    if (hasAnyPriceChanged) {
      setTicketItems(validatedItems);
      showToast(
        'warning',
        '🔄 تم تحديث السعر والتكلفة وفق دفعة FIFO الحالية',
        'تم تعديل سعر/تكلفة أحد المنتجات تلقائياً وفق أحدث دفعة نشطة في المحفظة لضمان صحة الأرباح ومنع البيع بسعر قديم.'
      );
    }

    // Strict Points Balance Sufficiency Check Across All Items (Requirement #3 - Immediate Tickets Only)
    if (!isReservationTicket) {
      for (const itm of validatedItems) {
        const g = games.find(game => game.id === itm.gameId);
        const p = g?.products?.find(prod => prod.id === itm.productId) || games.flatMap(gm => gm.products || []).find(prod => prod.id === itm.productId);
        const pts = p?.pointsCostPerUnit || 0;
        const wId = itm.walletTypeId || p?.primaryWalletId || p?.walletTypeId;
        if (pts > 0 && wId) {
          const qty = itm.quantity || 1;
          const needed = pts * qty;
          let avail = 0;
          let hasWallet = false;
          const jkrW = JKRWalletEngine.getWalletById(wId);
          if (jkrW) {
            avail = jkrW.pointsBalance ?? 0;
            hasWallet = true;
          } else {
            const stW = db.getStoreWallets().find(w => w.id === wId);
            if (stW && stW.pointsBalance !== undefined) {
              avail = stW.pointsBalance;
              hasWallet = true;
            }
          }

          if (hasWallet && needed > avail) {
            showToast(
              'error',
              'لا يمكن تنفيذ العملية',
              `رصيد المحفظة غير كافٍ للباقة "${itm.productName}".\nالمتاح: ${avail.toLocaleString()} نقطة\nالمطلوب: ${needed.toLocaleString()} نقطة.`
            );
            return;
          }
        }
      }
    }

    const liveTotalProductsPrice = validatedItems.reduce((acc, itm) => acc + (itm.totalPrice || 0), 0);
    const liveTotalProductsCost = validatedItems.reduce((acc, itm) => acc + (itm.costPrice * (itm.quantity || 1)), 0);

    // Re-evaluate required cash based on live validated total
    const liveAfterCoupon = Math.max(0, liveTotalProductsPrice - appliedCouponDiscount);
    const liveAfterCashback = Math.max(0, liveAfterCoupon - effectiveCashbackUsed);
    const liveAfterReferral = Math.max(0, liveAfterCashback - effectiveReferralUsed);
    const liveFinalRequiredCash = Math.max(0, liveAfterReferral - effectiveCreditUsed);

    const primaryItem = validatedItems[0];
    let resolvedCustomer = matchedCustomer;
    if (!resolvedCustomer) {
      const normPhone = normalizePhoneNumber(customerPhone.trim()) || customerPhone.trim();
      const autoNewCust: Customer = {
        id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        code: 'JKR-' + Math.floor(1000 + Math.random() * 9000),
        name: 'عميل شحن ' + (normPhone.length >= 4 ? normPhone.slice(-4) : normPhone),
        phone: normPhone,
        profileType: 'regular',
        source: 'unspecified',
        status: 'active',
        isFrozen: false,
        monthlyReferredCount: 0,
        partnerWarningCount: 0,
        referralCode: 'REF-JKR-' + Math.floor(1000 + Math.random() * 9000),
        referralWalletBalance: 0,
        totalReferralCommissionEarned: 0,
        balance: 0,
        accountBalance: 0,
        cashbackBalance: 0,
        totalCashbackEarned: 0,
        totalSpent: 0,
        totalOrders: 0,
        maxSingleOrderAmount: 0,
        loyaltyTier: 'normal',
        purchasingPower: 'normal',
        isArchived: false,
        notesCount: 0,
        ticketsCount: 0,
        hasUsedFirstOrderDiscount: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.saveCustomer(autoNewCust);
      resolvedCustomer = autoNewCust;
    }

    const customerId = resolvedCustomer.id;
    const customerFullName = resolvedCustomer.name;

    const ticketNumber = `JKR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const pricingSnapshot = FinancialEngine.generateTicketSnapshot(
      validatedItems,
      appliedCouponDiscount + effectiveCashbackUsed + effectiveReferralUsed + effectiveCreditUsed,
      user || undefined
    );

    const chosenWallet = operatingWallets.find(w => w.id === paymentWalletId || w.name === paymentWallet) || operatingWallets[0];
    const chosenNumbers = (chosenWallet?.numbers || []).filter(n => n.status !== 'frozen');
    const chosenNum = chosenNumbers.find(n => n.id === paymentWalletNumberId) ||
                      chosenNumbers.find(n => n.phoneNumber === paymentReceivedPhone) ||
                      chosenNumbers.find(n => n.isPrimary) ||
                      chosenNumbers[0];
    const finalPaymentWallet = chosenWallet?.name || paymentWallet || 'محفظة تشغيل';
    const finalPaymentWalletId = chosenWallet?.id || paymentWalletId || '';
    const finalPaymentWalletNumberId = chosenNum?.id || paymentWalletNumberId || '';
    const finalPaymentReceivedPhone = chosenNum?.phoneNumber || paymentReceivedPhone || chosenWallet?.accountNumber || '';

    let computedOperatingExpenses = 0;
    let computedCashbackTotal = 0;
    let computedReferralTotal = 0;

    for (const itm of validatedItems) {
      const itmQty = itm.quantity || 1;
      const itmFixedCost = itm.fixedCostEGP !== undefined ? itm.fixedCostEGP : 0;
      computedOperatingExpenses += itmFixedCost * itmQty;

      computedCashbackTotal += itm.cashbackAmountEGP !== undefined ? itm.cashbackAmountEGP : 0;
      computedReferralTotal += itm.referralAmountEGP !== undefined ? itm.referralAmountEGP : 0;
    }

    computedOperatingExpenses = Math.round(computedOperatingExpenses * 100) / 100;
    computedCashbackTotal = Math.round(computedCashbackTotal * 100) / 100;
    computedReferralTotal = Math.round(computedReferralTotal * 100) / 100;

    const hasReferrer = db.hasValidReferrer(matchedCustomer?.id || customerPhone, department);
    const effectiveReferralCommission = hasReferrer ? computedReferralTotal : 0;
    const computedReferralAllowance = !hasReferrer ? computedReferralTotal : 0;

    // Golden Rule of Net Profit:
    // Profit = Effective Revenue - Actual FIFO Cost - Actual Cashback - Actual Referral - Product Operating Expenses
    // When customer has NO valid referrer, referral converts to profit (بدل إحالة) and is NOT deducted from profit
    const effectiveRevenueForProfit = (receivedAmount > 0 && receivedAmount < liveFinalRequiredCash)
      ? receivedAmount
      : liveFinalRequiredCash;
    const calculatedNetProfit = Math.round((effectiveRevenueForProfit - liveTotalProductsCost - computedCashbackTotal - effectiveReferralCommission - computedOperatingExpenses) * 100) / 100;

    const effectiveReceived = receivedAmount > 0 ? receivedAmount : liveFinalRequiredCash;
    const liveOverpaymentExcess = Math.max(0, (receivedAmount || 0) - liveFinalRequiredCash);
    const liveShortageDebit = receivedAmount > 0 && receivedAmount < liveFinalRequiredCash ? (liveFinalRequiredCash - receivedAmount) : 0;

    if (editingTicket) {
      // Reconcile Customer Cashback
      const oldCbUsed = editingTicket.cashbackUsed || 0;
      const deltaCbUsed = effectiveCashbackUsed - oldCbUsed;
      if (deltaCbUsed !== 0 && matchedCustomer) {
        const updatedCustomer = {
          ...matchedCustomer,
          cashbackBalance: Math.max(0, Math.round(((matchedCustomer.cashbackBalance || 0) - deltaCbUsed) * 100) / 100)
        };
        if (department === 'dealers') {
          db.saveDealer(updatedCustomer as any);
        } else {
          db.saveCustomer(updatedCustomer as any);
        }
        if (deltaCbUsed > 0) {
          db.debitCashbackFromSystemWallet(deltaCbUsed, customerFullName, editingTicket.ticketNumber);
        } else {
          db.creditCashbackToSystemWallet(Math.abs(deltaCbUsed), customerFullName, editingTicket.ticketNumber);
        }
      }

      // Reconcile Customer Referral
      const oldRefUsed = editingTicket.referralBalanceUsed || 0;
      const deltaRefUsed = effectiveReferralUsed - oldRefUsed;
      if (deltaRefUsed !== 0 && matchedCustomer) {
        const updatedRefCustomer = {
          ...matchedCustomer,
          referralWalletBalance: Math.max(0, Math.round(((matchedCustomer.referralWalletBalance || 0) - deltaRefUsed) * 100) / 100)
        };
        if (department === 'dealers') {
          db.saveDealer(updatedRefCustomer as any);
        } else {
          db.saveCustomer(updatedRefCustomer as any);
        }
        if (deltaRefUsed > 0) {
          db.debitReferralFromSystemWallet(deltaRefUsed, customerFullName, `تعديل استخدام عمولات إحالة لتذكرة #${editingTicket.ticketNumber}`);
        } else {
          db.creditReferralToSystemWallet(Math.abs(deltaRefUsed), customerFullName, `استرجاع عمولات إحالة بعد تعديل تذكرة #${editingTicket.ticketNumber}`);
        }
      }

      // Reconcile Customer Credit (Account Balance)
      const oldCreditUsed = editingTicket.accountBalanceUsed || 0;
      const deltaCreditUsed = effectiveCreditUsed - oldCreditUsed;
      if (deltaCreditUsed !== 0 && resolvedCustomer) {
        const nextBalance = Math.round(((resolvedCustomer.accountBalance || 0) - deltaCreditUsed) * 100) / 100;
        const updatedCreditCustomer = {
          ...resolvedCustomer,
          accountBalance: nextBalance,
          balance: nextBalance
        };
        if (department === 'dealers') {
          db.saveDealer(updatedCreditCustomer as any);
        } else {
          db.saveCustomer(updatedCreditCustomer as any);
        }
        if (deltaCreditUsed > 0) {
          db.debitTrustFromSystemWallet(deltaCreditUsed, customerFullName, 'تعديل استخدام رصيد دائن', editingTicket.ticketNumber);
        } else {
          db.creditTrustToSystemWallet(Math.abs(deltaCreditUsed), customerFullName, 'استرجاع رصيد دائن بعد تعديل تذكرة', editingTicket.ticketNumber);
        }
      }

      // Reconcile Operating Expenses to w_operating_expenses
      const deltaOpExp = computedOperatingExpenses - (editingTicket.fixedCostAmount || 0);
      if (deltaOpExp !== 0) {
        db.recordOperatingExpenseToSystemWallet(
          deltaOpExp,
          editingTicket.ticketNumber,
          `تعديل مصاريف تشغيل وسيرفرات التذكرة (${deltaOpExp > 0 ? '+' : ''}${deltaOpExp} ج)`,
          { customerName: customerFullName, gameName: primaryItem.gameName, performedBy: user }
        );
      }

      const historyItem: TicketHistoryLogItem = {
        id: 'hist_' + Date.now(),
        action: 'تعديل بيانات التذكرة بالكامل (النموذج الشامل)',
        previousStatus: editingTicket.status,
        newStatus: editingTicket.status,
        performedBy: user?.fullName || user?.username || 'المسؤول',
        timestamp: new Date().toISOString(),
        notes: `تحديث بيانات التذكرة: إجمالي ${liveTotalProductsPrice} ج، المطلوب ${liveFinalRequiredCash} ج، المستلم ${effectiveReceived} ج`
      };

      const updatedTicket: CustomerTicket = {
        ...editingTicket,
        customerName: customerFullName,
        customerPhone: customerPhone.trim(),
        ticketType,
        platformSource,
        items: validatedItems,
        gameName: primaryItem.gameName,
        gameSection: primaryItem.sectionName || 'عام',
        gameProductName: validatedItems.length > 1 ? `${primaryItem.productName} (+${validatedItems.length - 1} باقات)` : primaryItem.productName,
        playerGameId: primaryItem.playerGameId,
        requiredAmount: liveFinalRequiredCash,
        totalProductsAmount: liveTotalProductsPrice,
        totalCostAmount: liveTotalProductsCost,
        fixedCostAmount: computedOperatingExpenses,
        cashbackEarned: computedCashbackTotal,
        cashbackPercent: computedCashbackTotal > 0 ? resolvedCustomerCashbackRate : (primaryItem?.cashbackPercent || 0),
        cashbackPercentage: computedCashbackTotal > 0 ? resolvedCustomerCashbackRate : (primaryItem?.cashbackPercent || 0),
        referralCommissionEarned: effectiveReferralCommission,
        referralAllowance: computedReferralAllowance,
        referralAllowanceReason: computedReferralAllowance > 0
          ? (department === 'dealers' ? 'بدل إحالة (تاجر غير مرتبط بإحالة)' : 'بدل إحالة (عميل غير مرتبط بإحالة)')
          : undefined,
        referralPercent: effectiveTicketReferralPercent,
        referralPercentage: effectiveTicketReferralPercent,
        totalProfitMargin: calculatedNetProfit,
        netProfit: calculatedNetProfit,
        receivedAmount: effectiveReceived,
        overpaymentAmount: liveOverpaymentExcess,
        shortageAmount: liveShortageDebit,
        paymentWallet: finalPaymentWallet,
        paymentWalletId: finalPaymentWalletId,
        paymentWalletNumberId: finalPaymentWalletNumberId,
        paymentReceivedPhone: finalPaymentReceivedPhone,
        paymentGateway,
        senderPhoneNumber: senderPhoneNumber.trim() || undefined,
        transferReferenceNumber: cleanRef || undefined,
        referenceNumber: cleanRef || undefined,
        cashbackUsed: effectiveCashbackUsed,
        referralBalanceUsed: effectiveReferralUsed,
        accountBalanceUsed: effectiveCreditUsed,
        couponCode: appliedCouponCode || undefined,
        couponDiscountAmount: appliedCouponDiscount,
        pricingSnapshot,
        notes: ticketNotes.trim() || undefined,
        operationMode,
        isReservation: operationMode === 'reservation',
        scheduledDeliveryDate: operationMode === 'reservation' ? scheduledDeliveryDate : undefined,
        scheduledDeliveryTime: operationMode === 'reservation' ? scheduledDeliveryTime : undefined,
        reservationNotes: operationMode === 'reservation' ? (reservationNotes.trim() || undefined) : undefined,
        historyLog: [historyItem, ...(editingTicket.historyLog || [])],
        updatedAt: new Date().toISOString(),
        updatedBy: user?.fullName || user?.username || 'المسؤول'
      };

      // Reconcile all financial records, wallets, customer/dealer balances, cashback, inventory points, profits and expenses
      const reconcileResult = db.reconcileTicketEdit(editingTicket, updatedTicket, user);
      const finalTicket = reconcileResult.updatedTicket || updatedTicket;

      if (department === 'dealers') {
        db.saveDealerTicket(finalTicket);
        db.recalculateDealerProfile(finalTicket.customerId || finalTicket.customerPhone);
      } else {
        db.saveTicket(finalTicket);
        db.recalculateCustomerProfile(finalTicket.customerId || finalTicket.customerPhone);
      }

      showToast('success', 'تم تعديل التذكرة بنجاح', `تم حفظ وتحديث تذكرة الشحن #${editingTicket.ticketNumber}`);
      setIsNewTicketModalOpen(false);
      setEditingTicket(null);
      loadData();
      return;
    }

    const newTicket: CustomerTicket = {
      id: 'tkt_' + Date.now(),
      ticketNumber,
      customerId,
      customerName: customerFullName,
      customerPhone: customerPhone.trim(),
      ticketType,
      platformSource,
      items: validatedItems,
      gameName: primaryItem.gameName,
      gameSection: primaryItem.sectionName || 'عام',
      gameProductName: validatedItems.length > 1 ? `${primaryItem.productName} (+${validatedItems.length - 1} باقات)` : primaryItem.productName,
      playerGameId: primaryItem.playerGameId,
      requiredAmount: liveFinalRequiredCash,
      totalProductsAmount: liveTotalProductsPrice,
      totalCostAmount: liveTotalProductsCost,
      fixedCostAmount: computedOperatingExpenses,
      cashbackEarned: computedCashbackTotal,
      cashbackPercent: computedCashbackTotal > 0 ? resolvedCustomerCashbackRate : (primaryItem?.cashbackPercent || 0),
      cashbackPercentage: computedCashbackTotal > 0 ? resolvedCustomerCashbackRate : (primaryItem?.cashbackPercent || 0),
      referralCommissionEarned: effectiveReferralCommission,
      referralAllowance: computedReferralAllowance,
      referralAllowanceReason: computedReferralAllowance > 0
        ? (department === 'dealers' ? 'بدل إحالة (تاجر غير مرتبط بإحالة)' : 'بدل إحالة (عميل غير مرتبط بإحالة)')
        : undefined,
      referralPercent: effectiveTicketReferralPercent,
      referralPercentage: effectiveTicketReferralPercent,
      totalProfitMargin: calculatedNetProfit,
      netProfit: calculatedNetProfit,
      receivedAmount: effectiveReceived,
      overpaymentAmount: liveOverpaymentExcess,
      shortageAmount: liveShortageDebit,
      isOverpaymentApproved: liveOverpaymentExcess > 0,
      paymentWallet: finalPaymentWallet,
      paymentWalletId: finalPaymentWalletId,
      paymentWalletNumberId: finalPaymentWalletNumberId,
      paymentReceivedPhone: finalPaymentReceivedPhone,
      paymentGateway,
      senderPhoneNumber: senderPhoneNumber.trim() || undefined,
      transferReferenceNumber: cleanRef || undefined,
      referenceNumber: cleanRef || undefined,
      cashbackUsed: effectiveCashbackUsed,
      referralBalanceUsed: effectiveReferralUsed,
      accountBalanceUsed: effectiveCreditUsed,
      couponCode: appliedCouponCode || undefined,
      isFirstOrderDiscountApplied: ticketType === 'first_shipping',
      pricingSnapshot,
      status: operationMode === 'reservation' ? 'new' : 'new',
      title: operationMode === 'reservation'
        ? `حجز منتج ${primaryItem.gameName} — ${primaryItem.productName}`
        : `شحن ${primaryItem.gameName} — ${primaryItem.productName}`,
      notes: ticketNotes.trim() || undefined,
      calculatorModeUsed: true,
      assignedTo: user?.fullName || 'مسؤول الشحن',
      // Reservation Fields
      operationMode,
      isReservation: operationMode === 'reservation',
      scheduledDeliveryDate: operationMode === 'reservation' ? scheduledDeliveryDate : undefined,
      scheduledDeliveryTime: operationMode === 'reservation' ? scheduledDeliveryTime : undefined,
      reservationNotes: operationMode === 'reservation' ? (reservationNotes.trim() || undefined) : undefined,
      reservationStatus: operationMode === 'reservation' ? 'pending' : undefined,
      reservationTrustHeld: operationMode === 'reservation' ? effectiveReceived : undefined,
      reservationTrustDeducted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate Wallet Number Limits before submission
    if (paymentWalletId && paymentWalletNumberId) {
      const limitCheck = db.validateWalletNumberLimits(paymentWalletId, paymentWalletNumberId, effectiveReceived, 'receive');
      if (!limitCheck.allowed) {
        showToast('error', 'تجاوز حدود الاستقبال للخط', limitCheck.reason || 'هذا الخط غير متاح للاستقبال لتجاوزه الحد المسموح');
        return;
      }
    }

    let activeCustomer = matchedCustomer;

    // 1. Deduct Cashback if used & sync with System Wallets w_cashback
    if (effectiveCashbackUsed > 0 && activeCustomer) {
      const nextCbBalance = Math.max(0, (activeCustomer.cashbackBalance || 0) - effectiveCashbackUsed);
      activeCustomer = { ...activeCustomer, cashbackBalance: nextCbBalance };
      if (isDealer) {
        db.saveDealer(activeCustomer as any);
        db.addDealerUnifiedWalletTransaction({
          customerId: activeCustomer.id,
          walletType: 'cashback',
          type: 'redeemed',
          operationName: `استخدام كاش باك في سداد تذكرة #${ticketNumber}`,
          amount: effectiveCashbackUsed,
          balanceAfter: nextCbBalance,
          orderNumber: ticketNumber
        });
      } else {
        db.saveCustomer(activeCustomer as any);
        db.addUnifiedWalletTransaction({
          customerId: activeCustomer.id,
          walletType: 'cashback',
          type: 'redeemed',
          operationName: `استخدام كاش باك في سداد تذكرة #${ticketNumber}`,
          amount: effectiveCashbackUsed,
          balanceAfter: nextCbBalance,
          orderNumber: ticketNumber
        });
      }
      db.debitCashbackFromSystemWallet(effectiveCashbackUsed, customerFullName, ticketNumber);
    }

    // 2. Deduct Referral Balance if used
    if (effectiveReferralUsed > 0 && activeCustomer) {
      const nextRefBalance = Math.max(0, (activeCustomer.referralWalletBalance || 0) - effectiveReferralUsed);
      activeCustomer = { ...activeCustomer, referralWalletBalance: nextRefBalance };
      if (isDealer) {
        db.saveDealer(activeCustomer as any);
        db.addDealerUnifiedWalletTransaction({
          customerId: activeCustomer.id,
          walletType: 'referral',
          type: 'redeemed',
          operationName: `استخدام عمولات إحالة في سداد تذكرة #${ticketNumber}`,
          amount: effectiveReferralUsed,
          balanceAfter: nextRefBalance,
          orderNumber: ticketNumber
        });
      } else {
        db.saveCustomer(activeCustomer as any);
        db.addUnifiedWalletTransaction({
          customerId: activeCustomer.id,
          walletType: 'referral',
          type: 'redeemed',
          operationName: `استخدام عمولات إحالة في سداد تذكرة #${ticketNumber}`,
          amount: effectiveReferralUsed,
          balanceAfter: nextRefBalance,
          orderNumber: ticketNumber
        });
      }
      db.debitReferralFromSystemWallet(effectiveReferralUsed, customerFullName, `استخدام عمولات إحالة في سداد تذكرة #${ticketNumber}`);
    }

    // 3. Deduct Account Credit if used (Reservations defer deduction until product delivery)
    if (effectiveCreditUsed > 0 && resolvedCustomer) {
      if (!isReservationTicket) {
        const nextAccountBalance = Math.round(((resolvedCustomer.accountBalance || 0) - effectiveCreditUsed) * 100) / 100;
        resolvedCustomer = {
          ...resolvedCustomer,
          accountBalance: nextAccountBalance,
          balance: nextAccountBalance
        };
        if (isDealer) {
          db.saveDealer(resolvedCustomer as any);
          db.addDealerUnifiedWalletTransaction({
            customerId: resolvedCustomer.id,
            walletType: 'account_balance',
            type: 'redeemed',
            operationName: `استخدام رصيد دائن في سداد تذكرة #${ticketNumber}`,
            amount: effectiveCreditUsed,
            balanceAfter: nextAccountBalance,
            orderNumber: ticketNumber
          });
        } else {
          db.saveCustomer(resolvedCustomer as any);
          db.addUnifiedWalletTransaction({
            customerId: resolvedCustomer.id,
            walletType: 'account_balance',
            type: 'redeemed',
            operationName: `استخدام رصيد دائن في سداد تذكرة #${ticketNumber}`,
            amount: effectiveCreditUsed,
            balanceAfter: nextAccountBalance,
            orderNumber: ticketNumber
          });
        }
        db.debitTrustFromSystemWallet(effectiveCreditUsed, customerFullName, 'استخدام رصيد دائن في سداد تذكرة', ticketNumber);
        newTicket.creditDeducted = true;
      } else {
        // Defer credit deduction until delivery
        newTicket.creditDeducted = false;
      }
    }

    // 3.1 Handle Overpayment (Credit) vs Underpayment (Debit) immediately for non-reservations
    if (!isReservationTicket && resolvedCustomer) {
      if (liveOverpaymentExcess > 0) {
        const nextAccountBalance = Math.round(((resolvedCustomer.accountBalance || 0) + liveOverpaymentExcess) * 100) / 100;
        resolvedCustomer = {
          ...resolvedCustomer,
          accountBalance: nextAccountBalance,
          balance: nextAccountBalance
        };
        if (isDealer) {
          db.saveDealer(resolvedCustomer as any);
          db.addDealerUnifiedWalletTransaction({
            customerId: resolvedCustomer.id,
            walletType: 'account_balance',
            type: 'credit',
            operationName: `فائض دفع لتذكرة ${ticketNumber} (+${liveOverpaymentExcess} ج)`,
            amount: liveOverpaymentExcess,
            balanceAfter: nextAccountBalance,
            orderNumber: ticketNumber
          });
        } else {
          db.saveCustomer(resolvedCustomer as any);
          db.addUnifiedWalletTransaction({
            customerId: resolvedCustomer.id,
            walletType: 'account_balance',
            type: 'credit',
            operationName: `فائض دفع لتذكرة ${ticketNumber} (+${liveOverpaymentExcess} ج)`,
            amount: liveOverpaymentExcess,
            balanceAfter: nextAccountBalance,
            orderNumber: ticketNumber
          });
        }
        newTicket.overpaymentSettled = true;
        newTicket.balanceSettled = true;
      } else if (liveShortageDebit > 0) {
        const nextAccountBalance = Math.round(((resolvedCustomer.accountBalance || 0) - liveShortageDebit) * 100) / 100;
        resolvedCustomer = {
          ...resolvedCustomer,
          accountBalance: nextAccountBalance,
          balance: nextAccountBalance
        };
        if (isDealer) {
          db.saveDealer(resolvedCustomer as any);
          db.addDealerUnifiedWalletTransaction({
            customerId: resolvedCustomer.id,
            walletType: 'account_balance',
            type: 'debit',
            operationName: `عجز دفع لتذكرة ${ticketNumber} (-${liveShortageDebit} ج)`,
            amount: liveShortageDebit,
            balanceAfter: nextAccountBalance,
            orderNumber: ticketNumber
          });
        } else {
          db.saveCustomer(resolvedCustomer as any);
          db.addUnifiedWalletTransaction({
            customerId: resolvedCustomer.id,
            walletType: 'account_balance',
            type: 'debit',
            operationName: `عجز دفع لتذكرة ${ticketNumber} (-${liveShortageDebit} ج)`,
            amount: liveShortageDebit,
            balanceAfter: nextAccountBalance,
            orderNumber: ticketNumber
          });
        }
        newTicket.shortageSettled = true;
        newTicket.balanceSettled = true;
      }
    }

    // Capture frozen balance snapshots on the ticket at transaction time (تجميد الأرصدة تاريخياً للتذكرة)
    newTicket.primaryBalanceSnapshot = resolvedCustomer ? (resolvedCustomer.accountBalance !== undefined ? resolvedCustomer.accountBalance : (resolvedCustomer.balance ?? 0)) : 0;
    
    const prevCbForSnap = matchedCustomer ? (matchedCustomer.cashbackBalance ?? 0) : 0;
    const netCbForSnap = Math.max(0, prevCbForSnap - effectiveCashbackUsed) + (isReservationTicket ? 0 : (newTicket.cashbackEarned || 0));
    newTicket.cashbackBalanceSnapshot = Math.round(netCbForSnap * 100) / 100;

    const prevRefForSnap = matchedCustomer ? (matchedCustomer.referralWalletBalance ?? 0) : 0;
    newTicket.referralBalanceSnapshot = Math.max(0, Math.round((prevRefForSnap - effectiveReferralUsed) * 100) / 100);

    // 🎯 Deduct stock & points from linked sub-wallets immediately upon ticket purchase (EXCEPT for reservations - deducted upon delivery)
    if (!isReservationTicket) {
      const isDeducted = db.consumeTicketProductStock(newTicket, {
        id: user?.id || 'usr',
        name: user?.fullName || 'المسؤول',
        role: user?.role || 'user'
      });
      newTicket.stockDeducted = Boolean(isDeducted);
    } else {
      newTicket.stockDeducted = false;
    }

    // Auto-sync Cashback & Profit to System Wallets (EXCEPT for reservations - synced upon delivery)
    if (!isReservationTicket) {
      if (newTicket.cashbackEarned && newTicket.cashbackEarned > 0) {
        db.creditCashbackToSystemWallet(newTicket.cashbackEarned, customerFullName, ticketNumber);
        newTicket.cashbackSynced = true;
      }
      if (newTicket.totalProfitMargin !== undefined && newTicket.totalProfitMargin !== 0) {
        db.recordProfitOrLossToSystemWallet(newTicket.totalProfitMargin, ticketNumber, {
          customerName: customerFullName,
          gameName: newTicket.gameName,
          referralAllowance: newTicket.referralAllowance
        });
        newTicket.profitSynced = true;
      }
    } else {
      newTicket.cashbackSynced = false;
      newTicket.profitSynced = false;
    }

    if (department === 'dealers') {
      db.saveDealerTicket(newTicket);
    } else {
      db.saveTicket(newTicket);
    }

    // Record coupon usage atomically
    if (appliedCouponCode) {
      db.incrementCouponUsage(
        appliedCouponCode,
        ticketNumber,
        customerPhone.trim(),
        appliedCouponDiscount,
        {
          customerName: customerFullName,
          customerCode: matchedCustomer?.code || customerPhone.trim(),
          customerId: matchedCustomer?.id,
          staffName: user?.fullName || user?.username || 'الموظف المسؤول',
          user
        }
      );
    }

    // Auto-sync Overpayment or Reservation to Trust System Wallet w_trust
    if (liveOverpaymentExcess > 0) {
      db.creditTrustToSystemWallet(liveOverpaymentExcess, customerFullName, 'فائض دفع وتغذية أمانات تذكرة', ticketNumber);
    }
    if (operationMode === 'reservation' && effectiveReceived > 0) {
      db.creditTrustToSystemWallet(effectiveReceived, customerFullName, 'مبلغ حجز واستلام معلق لتذكرة حجز', ticketNumber);
    }

    // Auto-sync Operating Expenses to Operating Expenses System Wallet w_operating_expenses
    if (computedOperatingExpenses > 0) {
      db.recordOperatingExpenseToSystemWallet(
        computedOperatingExpenses,
        ticketNumber,
        'مصاريف تشغيل وسيرفرات مستقطعة من تذكرة شحن',
        { customerName: customerFullName, gameName: newTicket.gameName, performedBy: user }
      );
    }

    // Credit receiving wallet & line, and monitor monthly limits with full source tracking
    const walletRes = db.recordWalletReceivingPayment(
      newTicket.paymentWalletId || newTicket.paymentWallet || paymentWalletId || paymentWallet,
      newTicket.paymentWalletNumberId || newTicket.paymentReceivedPhone || paymentWalletNumberId || paymentReceivedPhone,
      effectiveReceived,
      ticketNumber,
      customerFullName,
      { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'user' },
      {
        ticketId: newTicket.id,
        customerPhone: newTicket.customerPhone,
        gameName: newTicket.gameName,
        senderPhoneNumber: newTicket.senderPhoneNumber,
        receivingPhoneNumber: newTicket.paymentReceivedPhone
      }
    );

    if (walletRes.isLimitExceeded) {
      showToast('warning', '⚠️ تنبيه استهلاك الليمت', walletRes.message || 'تم استهلاك الحد الشهري للمحفظة/الرقم!');
    }

    showToast('success', 'تم إنشاء التذكرة بنجاح', `رقم التذكرة: ${ticketNumber} بإجمالي ${finalRequiredCash} ج`);
    setIsNewTicketModalOpen(false);
    setTicketReferralPercentInput('0');
    setIsReferralRateOverridden(false);
    setTicketReferenceNumber('');
    setPlatformSource('whatsapp');

    // Register Undo/Redo for Ticket Creation
    const createdTicketSnapshot = { ...newTicket };
    recordUndoableAction(
      `إنشاء التذكرة #${ticketNumber}`,
      () => {
        if (department === 'dealers') {
          db.deleteDealerTicket(createdTicketSnapshot.id);
        } else {
          db.deleteTicket(createdTicketSnapshot.id);
        }
        loadData();
      },
      () => {
        if (department === 'dealers') {
          db.saveDealerTicket(createdTicketSnapshot);
        } else {
          db.saveTicket(createdTicketSnapshot);
        }
        loadData();
      }
    );

    loadData();

    // Open instant WhatsApp delivery dialog
    const itemsSummary = ticketItems
      .map(i => `• ${i.productName} (${i.gameName}) | الكمية: ${i.quantity} × ${i.unitPrice} ج = ${i.totalPrice} ج (ID: ${i.playerGameId})`)
      .join('\n');
    const platformLabel = getPlatformConfig(newTicket.platformSource).name;
    const msg = `🎮 مرحباً بك ${customerFullName}! ✨\n━━━━━━━━━━━━━━━\n📦 تم إنشاء تذكرة الشحن #${ticketNumber}:\n${itemsSummary}\n━━━━━━━━━━━━━━━\n🌐 مصدر التواصل:\n${platformLabel}\n━━━━━━━━━━━━━━━\n💰 المبلغ الإجمالي: ${totalProductsPrice} ج\n💵 الصافي المطلوب: ${finalRequiredCash} ج\n🎁 كاش باك مستحق: +${newTicket.cashbackEarned} ج\n━━━━━━━━━━━━━━━\nNZM JKR Top Up 🌟`;

    setCompletedTicketInfo({
      ticket: newTicket,
      message: msg
    });
  };

  // Ticket Status Transitions (Employee & Owner)
  const handleTransitionStatus = (ticketId: string, newStatus: TicketLifecycleStatus) => {
    const targetTkt = tickets.find(t => t.id === ticketId);
    const prevStatus = targetTkt?.status;

    if (newStatus === 'completed') {
      let allowEarly = false;
      const isReservation = targetTkt?.isReservation || targetTkt?.operationMode === 'reservation';
      if (isReservation && targetTkt?.scheduledDeliveryDate) {
        const now = new Date();
        const timePart = targetTkt.scheduledDeliveryTime || '00:00';
        const scheduledDateTime = new Date(`${targetTkt.scheduledDeliveryDate}T${timePart}:00`);
        const hasArrived = isNaN(scheduledDateTime.getTime())
          ? (targetTkt.scheduledDeliveryDate <= now.toISOString().split('T')[0])
          : (now.getTime() >= scheduledDateTime.getTime());

        if (!hasArrived) {
          const confirmEarly = window.confirm(
            `تنبيه: موعد تسليم تذكرة الحجز #${targetTkt.ticketNumber} محدد في (${targetTkt.scheduledDeliveryDate} ${targetTkt.scheduledDeliveryTime ? `الساعة ${targetTkt.scheduledDeliveryTime}` : ''}).\n\nهل ترغب في تسليم التذكرة وإنهائها مبكراً الآن؟`
          );
          if (!confirmEarly) return;
          allowEarly = true;
        }
      }

      const res = db.completeTopUpTicket(ticketId, user?.fullName || 'الموظف', allowEarly);
      if (res.success) {
        showToast('success', 'اكتمل الشحن', res.message);
        if (prevStatus && prevStatus !== 'completed') {
          recordUndoableAction(
            `إكمال التذكرة #${targetTkt?.ticketNumber || ''}`,
            () => {
              db.updateTicketStatus(ticketId, prevStatus, user || undefined);
              loadData();
            },
            () => {
              db.completeTopUpTicket(ticketId, user?.fullName || 'الموظف', true);
              loadData();
            }
          );
        }
        loadData();
      } else {
        showToast('error', 'فشل الإكمال', res.message);
      }
      return;
    }

    const res = db.updateTicketStatus(ticketId, newStatus, user || undefined);
    if (res.success) {
      showToast('success', 'تحديث الحالة', res.message);
      if (prevStatus && prevStatus !== newStatus) {
        const statusMap: Record<string, string> = {
          new: 'جديدة',
          in_progress: 'قيد التنفيذ',
          completed: 'مكتملة',
          cancelled: 'ملغية',
          problem: 'مشكلة',
          under_review: 'قيد المراجعة',
          scheduled: 'مجدولة / حجز'
        };
        recordUndoableAction(
          `تغيير حالة التذكرة #${targetTkt?.ticketNumber || ''} إلى (${statusMap[newStatus] || newStatus})`,
          () => {
            db.updateTicketStatus(ticketId, prevStatus, user || undefined);
            loadData();
          },
          () => {
            db.updateTicketStatus(ticketId, newStatus, user || undefined);
            loadData();
          }
        );
      }
      loadData();
    } else {
      showToast('error', 'فشل التحديث', res.message);
    }
  };

  // Delete Ticket (Owner Only)
  const handleDeleteTicket = (ticketId: string, ticketNumber: string) => {
    if (!isOwner) {
      showToast('error', 'غير مصرح', 'حذف التذاكر مخصص للمدير العام فقط.');
      return;
    }

    const target = tickets.find(t => t.id === ticketId || t.ticketNumber === ticketNumber);
    if (window.confirm(`هل أنت متأكد من حذف التذكرة #${ticketNumber} نهائياً؟`)) {
      const ticketBackup = target ? { ...target } : null;
      const isDealer = department === 'dealers' || target?.department === 'dealers' || !!db.getDealerTicketById(ticketId);

      // Immediately close modal if it was open for this ticket
      if (selectedDetailsTicket && (selectedDetailsTicket.id === ticketId || selectedDetailsTicket.ticketNumber === ticketNumber)) {
        setSelectedDetailsTicket(null);
      }
      if (ticketToEdit && (ticketToEdit.id === ticketId || ticketToEdit.ticketNumber === ticketNumber)) {
        setTicketToEdit(null);
      }

      // Immediately remove from UI state to eliminate race condition/lag
      setTickets(prev => prev.filter(t => t.id !== ticketId && t.ticketNumber !== ticketNumber));

      if (isDealer) {
        db.deleteDealerTicket(ticketId, user);
      } else {
        db.deleteTicket(ticketId, user);
      }

      showToast('success', 'تم حذف التذكرة واسترداد الأرصدة', `تم حذف التذكرة #${ticketNumber} واسترجاع النقاط لمخزن البضاعة وعكس المبلغ المسدد من محفظة الكاش بنجاح.`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(isDealer ? 'dealer_tickets_updated' : 'tickets_updated'));
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }

      if (ticketBackup) {
        recordUndoableAction(
          `حذف التذكرة #${ticketNumber}`,
          () => {
            db.restoreTicket(ticketId, user);
            loadData();
          },
          () => {
            if (isDealer) {
              db.deleteDealerTicket(ticketId, user);
            } else {
              db.deleteTicket(ticketId, user);
            }
            loadData();
          }
        );
      }
      loadData();
    }
  };

  const handleSaveRating = () => {
    if (!ratingTicket) return;
    db.rateTicket(ratingTicket.id, selectedStars, ratingFeedback.trim());
    showToast('success', 'تم حفظ التقييم', `تم تسجيل تقييم ${selectedStars} ⭐ للتذكرة`);
    setRatingTicket(null);
    setRatingFeedback('');
    loadData();
  };

  // Quick 1-Click Copy Invoice As High-Res Image to Clipboard
  const handleQuickCopyInvoiceImage = async (tkt: CustomerTicket) => {
    try {
      showToast('info', 'جاري تجهيز صورة الفاتورة...', 'يتم التقاط الفاتورة بدقة عالية');
      const res = await copyTicketInvoiceToClipboard(tkt, db.getCustomerModuleSettings());
      if (res.success) {
        if (res.message === 'downloaded') {
          showToast('success', 'تم تنزيل صورة الفاتورة 📥', 'تم حفظ الصورة على جهازك');
        } else {
          showToast(
            'success',
            'تم نسخ صورة الفاتورة 🖼️',
            'تم نسخ صورة الفاتورة إلى الحافظة بنجاح! يمكنك الآن لصقها (Ctrl+V) مباشرة في واتساب.'
          );
        }
      } else {
        showToast('error', 'تعذر التقاط الصورة', res.message || '');
      }
    } catch (e: any) {
      showToast('error', 'حدث خطأ', e?.message || '');
    }
  };

  const handleDeleteWalletDirect = (w: StoreWallet) => {
    if (w.isSystemWallet || ['w_cashback', 'w_referrals', 'w_trust', 'w_profits'].includes(w.id) || w.type === 'profits') {
      showToast('error', 'محفظة نظام محمية', 'لا يمكن حذف محافظ النظام الآلية لضمان سلامة السجلات المالية');
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف محفظة "${w.name}" نهائياً؟\n\nتنبيه: سيتم إزالة المحفظة وجميع أرقامها وبياناتها من النظام. هذه العملية لا يمكن التراجع عنها.`
    );
    if (!confirmed) return;

    const walletBackup = { ...w };
    const success = db.deleteStoreWallet(w.id);
    if (success) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المستخدم', role: user?.role || 'user', department: 'التذاكر والمحافظ' },
        'delete',
        'محفظة تشغيل',
        w.id,
        `حذف محفظة: ${w.name}`,
        `تم حذف المحفظة نهائياً من قبل ${user?.fullName || 'المستخدم'}`
      );
      showToast('success', 'تم حذف المحفظة بنجاح', `تم إزالة محفظة "${w.name}" من النظام`);
      recordUndoableAction(
        `حذف محفظة "${w.name}"`,
        () => {
          db.saveStoreWallet(walletBackup);
          loadData();
        },
        () => {
          db.deleteStoreWallet(w.id);
          loadData();
        }
      );
      loadData();
    } else {
      showToast('error', 'فشل الحذف', 'تعذر حذف المحفظة، يرجى المحاولة مرة أخرى');
    }
  };

  const [currentTimestamp] = useState(() => Date.now());

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs">

      {/* 🔔 SMART RESERVATIONS DUE NOTIFICATION BANNER */}
      {dueReservations.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-purple-900/60 to-purple-950/80 border-2 border-purple-500/50 shadow-lg shadow-purple-900/20 flex items-center justify-between gap-4 flex-wrap animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <CalendarDays className="w-5 h-5 text-purple-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-purple-200">
                  🔔 تنبيه مواعيد التسليم: يوجد {dueReservations.length} حجز مستحق التسليم اليوم!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white font-bold text-[10px] uppercase tracking-wider">
                  مستحق الآن
                </span>
              </div>
              <p className="text-purple-300/80 text-[11px] mt-0.5">
                يرجى مراجعة تذاكر الحجز والتواصل مع العملاء لتنفيذ الشحن أو إعادة الجدولة أو الإلغاء.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<CalendarDays className="w-4 h-4" />}
            onClick={() => setIsReservationsDueModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 font-bold shadow-md shadow-purple-900/50"
          >
            ⚡ إدارة حجوزات اليوم ({dueReservations.length})
          </Button>
        </div>
      )}

      {/* ============================================================= */}
      {/* 1️⃣ [ كاروسيل ومحافظ التشغيل ومحافظ النظام ] WALLETS CAROUSEL */}
      {/* ============================================================= */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Wallet className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              المحافظ وقنوات الاستقبال والتشغيل ({operatingWallets.length})
            </h3>

            {/* Toggle Send vs Receive Limits */}
            <div className="flex items-center bg-gray-100 dark:bg-[#1f1f23] p-0.5 rounded-xl border border-gray-200 dark:border-[#2f2f36] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setWalletCardLimitType('receive')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  walletCardLimitType === 'receive'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>📥 ليمت استقبال</span>
              </button>
              <button
                type="button"
                onClick={() => setWalletCardLimitType('send')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  walletCardLimitType === 'send'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>📤 ليمت إرسال</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="w-4 h-4 text-emerald-500" />}
              onClick={() => {
                setWalletToEdit(null);
                setIsWalletFormOpen(true);
              }}
            >
              + إضافة محفظة جديدة
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Phone className="w-4 h-4 text-emerald-500" />}
              onClick={() => setIsDepositNumbersOpen(true)}
            >
              أرقام الإيداع الجاهزة
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Receipt className="w-4 h-4 text-emerald-500" />}
              onClick={() => setIsDepositVoucherOpen(true)}
            >
              📝 سند إيداع
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 💼 OPERATING & SYSTEM STORE WALLETS */}
          {displayedWallets.map(w => {
            const isSystem = w.isSystemWallet || ['w_profits', 'w_cashback', 'w_trust', 'w_referrals', 'w_operating_expenses'].includes(w.id) || w.type === 'profits' || w.systemType === 'operating_expenses';

            if (isSystem) {
              const isProfits = w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits';
              const isCashback = w.id === 'w_cashback' || w.systemType === 'cashback';
              const isTrust = w.id === 'w_trust' || w.systemType === 'trust';
              const _isReferrals = w.id === 'w_referrals' || w.systemType === 'referrals';
              const isExpenses = w.id === 'w_operating_expenses' || w.systemType === 'operating_expenses';

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    const walletToOpen = isCashback
                      ? {
                          ...w,
                          balance: customerCashbackMetrics.balance,
                          totalReceived: customerCashbackMetrics.earned,
                          totalWithdrawn: customerCashbackMetrics.redeemed
                        }
                      : w;
                    setSelectedWalletForProfile(walletToOpen);
                    setIsWalletProfileOpen(true);
                  }}
                  className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden backdrop-blur-sm ${
                    isProfits
                      ? 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/25 dark:via-[#18181B] dark:to-[#18181B] border-emerald-500/30 hover:border-emerald-500/60'
                      : isCashback
                        ? 'bg-gradient-to-b from-fuchsia-500/10 via-fuchsia-500/5 to-transparent dark:from-fuchsia-950/25 dark:via-[#18181B] dark:to-[#18181B] border-fuchsia-500/30 hover:border-fuchsia-500/60'
                        : isTrust
                          ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/25 dark:via-[#18181B] dark:to-[#18181B] border-amber-500/30 hover:border-amber-500/60'
                          : isExpenses
                            ? 'bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/25 dark:via-[#18181B] dark:to-[#18181B] border-rose-500/30 hover:border-rose-500/60'
                            : 'bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-950/25 dark:via-[#18181B] dark:to-[#18181B] border-purple-500/30 hover:border-purple-500/60'
                  }`}
                >
                  {/* Card Header: Icon + Name + Type Badge */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#27272A]/70">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 transition-colors shadow-xs ${
                          isProfits
                            ? 'bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                            : isCashback
                              ? 'bg-fuchsia-500/15 text-fuchsia-500 group-hover:bg-fuchsia-500 group-hover:text-white'
                              : isTrust
                                ? 'bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-white'
                                : isExpenses
                                  ? 'bg-rose-500/15 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                                  : 'bg-purple-500/15 text-purple-500 group-hover:bg-purple-500 group-hover:text-white'
                        }`}
                      >
                        {isProfits ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : isCashback ? (
                          <Sparkles className="w-4 h-4" />
                        ) : isTrust ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : isExpenses ? (
                          <Cpu className="w-4 h-4" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="text-xs font-black text-zinc-900 dark:text-zinc-100 block truncate" title={w.name}>
                          {w.name}
                        </strong>
                        <span className="text-[10px] text-zinc-400 font-medium block truncate mt-0.5">
                          {isProfits
                            ? 'تجميع آلي من التذاكر'
                            : isCashback
                              ? 'مزامنة كاش باك العملاء'
                              : isTrust
                                ? 'أمانات ووساطة معلقة'
                                : isExpenses
                                  ? 'مصاريف التشغيل والسيرفرات'
                                  : 'عمولات شركاء النجاح'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 whitespace-nowrap shadow-2xs ${
                        isProfits
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : isCashback
                            ? 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
                            : isTrust
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : isExpenses
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      }`}
                    >
                      {isProfits
                        ? '💵 صافي الأرباح'
                        : isCashback
                          ? '✨ كاش باك'
                          : isTrust
                            ? '🛡️ أمانات نظام'
                            : isExpenses
                              ? '⚙️ مصاريف تشغيل'
                              : '🎁 عمولات إحالة'}
                    </span>
                  </div>

                  {/* 3 Financial Metrics Boxes */}
                  <div className="grid grid-cols-3 gap-2 my-3">
                    <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate mb-0.5">الرصيد</span>
                      <strong
                        className={`text-xs sm:text-[13px] font-bold font-mono tracking-tight truncate ${
                          isProfits
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : isCashback
                              ? 'text-fuchsia-500 dark:text-fuchsia-400'
                              : isTrust
                                ? 'text-amber-500 dark:text-amber-400'
                                : isExpenses
                                  ? 'text-rose-500 dark:text-rose-400'
                                  : 'text-purple-500 dark:text-purple-400'
                        }`}
                      >
                        {formatCurrency(isCashback ? customerCashbackMetrics.balance : w.balance, w.currency)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate mb-0.5">
                        {isProfits ? 'المحصل' : 'الممنوح'}
                      </span>
                      <strong className="text-zinc-800 dark:text-zinc-200 font-bold text-xs sm:text-[13px] font-mono tracking-tight truncate">
                        {formatCurrency(isCashback ? customerCashbackMetrics.earned : (w.totalReceived || w.monthlyIncome || 0), w.currency)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate mb-0.5">
                        {isProfits ? 'المسحوب' : 'المسترد'}
                      </span>
                      <strong className="text-zinc-500 dark:text-zinc-400 font-bold text-xs sm:text-[13px] font-mono tracking-tight truncate">
                        {formatCurrency(isCashback ? customerCashbackMetrics.redeemed : (w.totalWithdrawn || w.monthlyWithdrawn || 0), w.currency)}
                      </strong>
                    </div>
                  </div>

                  {/* Bottom Footer & System Sync Badge */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#27272A]/70 mt-auto">
                    <div className="px-2.5 py-1.5 rounded-lg bg-gray-50/60 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/60 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
                      <span className="flex items-center gap-1.5 truncate text-zinc-500 dark:text-zinc-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${isProfits ? 'bg-emerald-500' : isCashback ? 'bg-fuchsia-500' : isTrust ? 'bg-amber-500' : 'bg-purple-500'}`}></span>
                        {isProfits
                          ? 'تغذية تلقائية من التذاكر المنفذة'
                          : isCashback
                            ? 'مزامنة بنسبة 1% من قيمة الطلبات'
                            : isTrust
                              ? 'أمانات وأرصدة معلقة حتى التسليم'
                              : 'عمولات الشركاء والإحالات'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                      <span className="text-zinc-400 text-[9.5px]">⚙️ محفظة نظام آلية</span>
                      <div className="flex items-center gap-1.5">
                        {isProfits && isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsZeroProfitModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-[9.5px] border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                            title="تصفير محفظة الأرباح وتحويلها للخزنة"
                          >
                            <Landmark className="w-2.5 h-2.5" />
                            تصفير الأرباح
                          </button>
                        )}
                        <span
                          className={`font-bold flex items-center gap-1 transition-transform group-hover:translate-x-[-2px] text-[10px] ${
                            isProfits
                              ? 'text-emerald-500'
                              : isCashback
                                ? 'text-fuchsia-500'
                                : isTrust
                                  ? 'text-amber-500'
                                  : 'text-purple-400'
                          }`}
                        >
                          دفتر الأستاذ ←
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const numbersList = w.numbers || [];
            const activeNumbers = numbersList.filter(n => n.status !== 'frozen' && n.status !== 'disabled');
            const hasNumbers = numbersList.length > 0;
            const preferredNumber = numbersList.find(n => n.isPrimary) || numbersList[0];

            // When a preferred number is set, display its balance and metrics
            const cardBalance = preferredNumber ? (preferredNumber.currentBalance ?? w.balance ?? 0) : (w.balance || 0);

            // Monthly Limit Metrics: based on preferred line if present
            const cardMonthlyLimit = preferredNumber
              ? (preferredNumber.monthlyLimit || 200000)
              : (hasNumbers ? activeNumbers.reduce((sum, n) => sum + (n.monthlyLimit || 200000), 0) : (w.monthlyLimit || 0));

            const cardMonthlyReceived = preferredNumber
              ? (preferredNumber.monthlyReceived || 0)
              : (w.monthlyIncome || (hasNumbers ? activeNumbers.reduce((s, n) => s + (n.monthlyReceived || 0), 0) : 0));

            const cardMonthlyRemaining = Math.max(0, cardMonthlyLimit - cardMonthlyReceived);
            const cardMonthlyPercentUsed = cardMonthlyLimit > 0 ? Math.min(100, Math.round((cardMonthlyReceived / cardMonthlyLimit) * 100)) : 0;

            // Daily Limit Metrics: based on preferred line if present
            const cardDailyLimit = preferredNumber
              ? (preferredNumber.dailyLimit || 30000)
              : (hasNumbers ? activeNumbers.reduce((sum, n) => sum + (n.dailyLimit || 30000), 0) : (w.dailyLimit || 30000));

            const cardDailyReceived = preferredNumber
              ? (preferredNumber.dailyReceived || 0)
              : (hasNumbers ? activeNumbers.reduce((sum, n) => sum + (n.dailyReceived || 0), 0) : (w.dailyIncome || 0));

            const cardDailyRemaining = Math.max(0, cardDailyLimit - cardDailyReceived);
            const cardDailyPercentUsed = cardDailyLimit > 0 ? Math.min(100, Math.round((cardDailyReceived / cardDailyLimit) * 100)) : 0;

            // Send Limit Metrics (Daily & Monthly)
            const cardDailySendLimit = preferredNumber
              ? (preferredNumber.dailySendLimit || 30000)
              : (hasNumbers ? activeNumbers.reduce((sum, n) => sum + (n.dailySendLimit || 30000), 0) : 30000);
            const cardDailySent = preferredNumber
              ? (preferredNumber.dailySent || 0)
              : (hasNumbers ? activeNumbers.reduce((sum, n) => sum + (n.dailySent || 0), 0) : 0);
            const cardDailySendRemaining = Math.max(0, cardDailySendLimit - cardDailySent);
            const cardDailySendPercentUsed = cardDailySendLimit > 0 ? Math.min(100, Math.round((cardDailySent / cardDailySendLimit) * 100)) : 0;

            const cardMonthlySendLimit = preferredNumber
              ? (preferredNumber.monthlySendLimit || 200000)
              : (hasNumbers ? activeNumbers.reduce((sum, n) => sum + (n.monthlySendLimit || 200000), 0) : 200000);
            const cardMonthlySent = preferredNumber
              ? (preferredNumber.monthlySent || preferredNumber.monthlyWithdrawn || 0)
              : (w.monthlyWithdrawn || (hasNumbers ? activeNumbers.reduce((s, n) => s + (n.monthlySent || n.monthlyWithdrawn || 0), 0) : 0));
            const cardMonthlySendRemaining = Math.max(0, cardMonthlySendLimit - cardMonthlySent);
            const cardMonthlySendPercentUsed = cardMonthlySendLimit > 0 ? Math.min(100, Math.round((cardMonthlySent / cardMonthlySendLimit) * 100)) : 0;

            const linesCount = numbersList.length || (w.accountNumber ? 1 : 0);

            // 4 exact requested statuses: evaluated on the preferred line if present
            const isManualDisabled = w.isFrozen || (preferredNumber ? (preferredNumber.status === 'frozen' || preferredNumber.status === 'disabled') : (numbersList.length > 0 && activeNumbers.length === 0));
            const isReachedLimit = !isManualDisabled && (preferredNumber ? (preferredNumber.status === 'limit_reached' || cardMonthlyRemaining <= 0 || cardDailyRemaining <= 0) : (cardMonthlyLimit > 0 && cardMonthlyReceived >= cardMonthlyLimit));
            const isCloseToLimit = !isManualDisabled && !isReachedLimit && (cardMonthlyPercentUsed >= 80 || cardDailyPercentUsed >= 80);

            const numbersStatusLabel = isManualDisabled
              ? 'معطّل يدوي'
              : isReachedLimit
              ? 'وصل الليمت'
              : isCloseToLimit
              ? 'قرب الليمت'
              : 'آمن';

            const statusBadgeVariant: 'danger' | 'warning' | 'success' = isManualDisabled || isReachedLimit
              ? 'danger'
              : isCloseToLimit
              ? 'warning'
              : 'success';

            return (
              <div
                key={w.id}
                onClick={() => {
                  setSelectedWalletForProfile(w);
                  setIsWalletProfileOpen(true);
                }}
                className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden backdrop-blur-sm ${
                  isReachedLimit
                    ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                    : isCloseToLimit
                    ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                    : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/60'
                }`}
              >
                {/* Header: Wallet Name, Preferred Number & Status Badges */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#27272A]/70">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0 shadow-xs">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="text-xs font-black text-zinc-900 dark:text-zinc-100 block truncate" title={w.name}>
                        {w.name}
                      </strong>
                      <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 truncate mt-0.5">
                        {preferredNumber ? (
                          <>
                            <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-0.5 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {preferredNumber.phoneNumber}
                            </span>
                            <span className="text-zinc-400 dark:text-zinc-500 truncate">({preferredNumber.accountHolderName})</span>
                          </>
                        ) : (
                          <span className="truncate">{w.accountNumber || 'خط الاستقبال'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {preferredNumber ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold shrink-0 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        المفضل
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[9px] font-bold shrink-0">
                        {linesCount} خطوط
                      </span>
                    )}
                    <Badge variant={statusBadgeVariant} size="sm">
                      {numbersStatusLabel}
                    </Badge>
                    <button
                      type="button"
                      title="حذف المحفظة نهائياً"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWalletDirect(w);
                      }}
                      className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Available Balance & Received/Sent Metrics */}
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-center flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate mb-0.5">الرصيد المتاح</span>
                    <strong className="text-emerald-500 dark:text-emerald-400 font-bold text-xs sm:text-[13px] font-mono tracking-tight truncate">
                      {formatCurrency(cardBalance, w.currency)}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-center flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate mb-0.5">
                      {walletCardLimitType === 'receive' ? 'مستلم الشهر' : 'مُرسل الشهر'}
                    </span>
                    <strong className={`font-bold text-xs sm:text-[13px] font-mono tracking-tight truncate ${
                      walletCardLimitType === 'receive' ? 'text-orange-500 dark:text-orange-400' : 'text-blue-500 dark:text-blue-400'
                    }`}>
                      {walletCardLimitType === 'receive' ? formatCurrency(cardMonthlyReceived, w.currency) : formatCurrency(cardMonthlySent, w.currency)}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-center flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate mb-0.5">
                      {walletCardLimitType === 'receive' ? 'متبقي الاستقبال' : 'متبقي الإرسال'}
                    </span>
                    <strong className={`font-bold text-xs sm:text-[13px] font-mono tracking-tight truncate ${
                      walletCardLimitType === 'receive'
                        ? (isReachedLimit ? 'text-rose-500' : 'text-zinc-800 dark:text-zinc-200')
                        : (cardMonthlySendRemaining <= 0 ? 'text-rose-500' : 'text-zinc-800 dark:text-zinc-200')
                    }`}>
                      {walletCardLimitType === 'receive'
                        ? (cardMonthlyLimit > 0 ? formatCurrency(cardMonthlyRemaining, w.currency) : 'مفتوح')
                        : (cardMonthlySendLimit > 0 ? formatCurrency(cardMonthlySendRemaining, w.currency) : 'مفتوح')}
                    </strong>
                  </div>
                </div>

                {/* Dual Visual Progress Bars: Daily & Monthly Limits (Receive or Send) */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#27272A]/70 mt-auto">
                  {/* Daily Limit Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400 flex items-center gap-1 font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${walletCardLimitType === 'receive' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                        {walletCardLimitType === 'receive' ? 'استقبال يومي:' : 'إرسال يومي:'} <strong className="text-zinc-700 dark:text-zinc-300 font-bold">
                          {walletCardLimitType === 'receive' ? `${cardDailyPercentUsed}%` : `${cardDailySendPercentUsed}%`}
                        </strong>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[9.5px]">
                        متبقي: <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {walletCardLimitType === 'receive' ? formatCurrency(cardDailyRemaining, w.currency) : formatCurrency(cardDailySendRemaining, w.currency)}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          (walletCardLimitType === 'receive' ? cardDailyPercentUsed : cardDailySendPercentUsed) >= 100
                            ? 'bg-rose-500'
                            : (walletCardLimitType === 'receive' ? cardDailyPercentUsed : cardDailySendPercentUsed) >= 80
                            ? 'bg-amber-500'
                            : walletCardLimitType === 'receive' ? 'bg-blue-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${walletCardLimitType === 'receive' ? cardDailyPercentUsed : cardDailySendPercentUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Monthly Limit Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400 flex items-center gap-1 font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${walletCardLimitType === 'receive' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                        {walletCardLimitType === 'receive' ? 'استقبال شهري:' : 'إرسال شهري:'} <strong className="text-zinc-700 dark:text-zinc-300 font-bold">
                          {walletCardLimitType === 'receive' ? `${cardMonthlyPercentUsed}%` : `${cardMonthlySendPercentUsed}%`}
                        </strong>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[9.5px]">
                        متبقي: <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {walletCardLimitType === 'receive' ? formatCurrency(cardMonthlyRemaining, w.currency) : formatCurrency(cardMonthlySendRemaining, w.currency)}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          (walletCardLimitType === 'receive' ? cardMonthlyPercentUsed : cardMonthlySendPercentUsed) >= 100
                            ? 'bg-rose-500'
                            : (walletCardLimitType === 'receive' ? cardMonthlyPercentUsed : cardMonthlySendPercentUsed) >= 80
                            ? 'bg-amber-500'
                            : walletCardLimitType === 'receive' ? 'bg-emerald-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${walletCardLimitType === 'receive' ? cardMonthlyPercentUsed : cardMonthlySendPercentUsed}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1">
                    <span className="text-zinc-500 text-[9.5px]">
                      {preferredNumber ? `سعة الخط: ${formatCurrency(cardMonthlyLimit, w.currency)}` : `السعة: ${formatCurrency(cardMonthlyLimit, w.currency)}`}
                    </span>
                    <span className="font-bold text-orange-500 group-hover:text-orange-400 flex items-center gap-1 transition-transform group-hover:translate-x-[-2px] text-[10px]">
                      فتح المحفظة ←
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2️⃣ [ المؤشرات ] FILTERED KPIS SUMMARY STRIP */}
      {/* ============================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">إيراد الوردية المفلتر</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-base font-black text-emerald-500 font-mono block">
            {formatCurrency(filteredKPIs.shiftRevenue)}
          </strong>
          <span className="text-[10px] text-zinc-400">الطلبات المكتملة اليوم</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">إجمالي التذاكر</span>
            <Ticket className="w-4 h-4 text-orange-500" />
          </div>
          <strong className="text-base font-black text-zinc-900 dark:text-zinc-100 font-mono block">
            {filteredKPIs.totalCount} تذكرة
          </strong>
          <span className="text-[10px] text-zinc-400">مطابقة للفلاتر الحالية</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">التذاكر المكتملة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block">
            {filteredKPIs.completedCount} تذكرة
          </strong>
          <span className="text-[10px] text-zinc-400">تم شحنها بنجاح</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">التذاكر المفتوحة</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <strong className="text-base font-black text-cyan-500 font-mono block">
            {filteredKPIs.openCount} تذكرة
          </strong>
          <span className="text-[10px] text-zinc-400">جديدة وقيد المعالجة</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">تذاكر بها مشكلة</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <strong className="text-base font-black text-rose-500 font-mono block">
            {filteredKPIs.problemCount} تذكرة
          </strong>
          <span className="text-[10px] text-zinc-400">تحتاج تدخلاً إدارياً</span>
        </div>
      </div>

      {/* Owner-Only Financial Strip (شريط إجمالي الوردية المالي الشامل) */}
      {isOwner && (
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Active Shift Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{startDate || endDate ? 'فترة مخصصة' : (shiftFinancialTotals.shiftTicketsCount === 0 ? 'الوردية الحالية (مصفاة: 0 ج)' : `الوردية الحالية (${shiftFinancialTotals.shiftTicketsCount} تذكرة)`)}</span>
            </div>

            {/* 1. إجمالي الوارد */}
            <div className="flex items-center gap-1.5 font-bold" title="إجمالي الوارد المحصل بالوردية">
              <span className="text-zinc-400">💰 إجمالي الوارد:</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-black">
                {formatCurrency(shiftFinancialTotals.totalRevenue)}
              </span>
            </div>

            {/* 2. إجمالي البضاعة */}
            <div className="flex items-center gap-1.5 font-bold" title="تكلفة البضاعة المسحوبة من المخزون">
              <span className="text-zinc-400">📦 إجمالي البضاعة:</span>
              <span className="text-orange-500 font-mono font-bold">
                {formatCurrency(shiftFinancialTotals.totalCost)}
              </span>
            </div>

            {/* 3. صافي الربح */}
            <div className="flex items-center gap-1.5 font-bold" title="صافي أرباح الوردية الحقيقية">
              <span className={shiftFinancialTotals.totalProfit >= 0 ? "text-emerald-500" : "text-rose-500"}>
                ✨ صافي الربح:
              </span>
              <span className={`font-mono font-black ${shiftFinancialTotals.totalProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {shiftFinancialTotals.totalProfit >= 0 ? '+' : ''}{formatCurrency(shiftFinancialTotals.totalProfit)}
              </span>
            </div>

            {/* 4. كاش باك */}
            <div className="flex items-center gap-1.5 font-bold" title="أمانات كاش باك ممنوحة للعملاء">
              <span className="text-zinc-400">🎁 كاش باك:</span>
              <span className="text-amber-500 font-mono font-bold">
                {formatCurrency(shiftFinancialTotals.totalCashback)}
              </span>
            </div>

            {/* 5. إحالة */}
            <div className="flex items-center gap-1.5 font-bold" title="عمولات المسوقين والإحالات">
              <span className="text-zinc-400">👥 إحالة:</span>
              <span className="text-purple-400 font-mono font-bold">
                {formatCurrency(shiftFinancialTotals.totalReferral)}
              </span>
            </div>

            {/* 6. مصاريف تشغيل */}
            <div className="flex items-center gap-1.5 font-bold" title="تكاليف وسيرفرات ورسوم التشغيل">
              <span className="text-zinc-400">⚙️ مصاريف تشغيل:</span>
              <span className="text-rose-400 font-mono font-bold">
                {formatCurrency(shiftFinancialTotals.totalOperatingExpenses)}
              </span>
            </div>

            {/* 7. أمانة */}
            <div className="flex items-center gap-1.5 font-bold" title="أمانات معلقة وفائض الدفع والحجوزات">
              <span className="text-zinc-400">🛡️ أمانة:</span>
              <span className="text-teal-400 font-mono font-bold">
                {formatCurrency(shiftFinancialTotals.totalTrust)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<FileText className="w-4 h-4 text-blue-400" />}
              onClick={() => {
                setShiftSettlementMode('audit');
                setIsShiftSettlementOpen(true);
              }}
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white font-bold"
              title="فحص إيرادات ومحافظ وأرقام الوردية للموظف"
            >
              🔍 فحص الوردية (Audit)
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Lock className="w-4 h-4 text-purple-400" />}
              onClick={() => {
                if (!isOwner) {
                  showToast('warning', 'صلاحية المالك فقط', 'تصفية الوردية مخصصة لمالك النظام فقط. يمكنك استخدام زر "فحص الوردية" للمراجعة.');
                  return;
                }
                setShiftSettlementMode('settlement');
                setIsShiftSettlementOpen(true);
              }}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white font-black"
              title="تصفية الوردية النهائية وحساب USDT وتوزيع الأرباح للمالك"
            >
              🔒 تصفية الوردية (Settlement)
            </Button>

            {isOwner && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Trash2 className="w-4 h-4 text-red-400" />}
                onClick={() => setIsDeletedTicketsModalOpen(true)}
                className="border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white font-bold"
                title="سلة التذاكر المحذوفة وأرشيف الاسترداد وإعادة الربط بالمحافظ وقواعد البيانات"
              >
                🗑️ المحذوفات والاستعادة
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3️⃣ [ الفلاتر ] UNIVERSAL FILTERS BAR */}
      {/* ============================================================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Ticket Number & Universal Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="بحث برقم التذكرة (JKR-2026-...)، الهاتف، أو اللاعب..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-orange-500" />}
            />
          </div>

          {/* 2. Game Filter (Searchable) */}
          <div>
            <SearchableSelect
              options={gameFilterOptions}
              value={selectedGameFilter}
              onChange={val => setSelectedGameFilter(val)}
              allOptionLabel="كافة الألعاب"
              placeholder="اختر اللعبة..."
            />
          </div>

          {/* 3. Wallet Filter (Searchable) */}
          <div>
            <SearchableSelect
              options={walletFilterOptions}
              value={selectedWalletFilter}
              onChange={val => setSelectedWalletFilter(val)}
              allOptionLabel="كافة المحافظ"
              placeholder="اختر المحفظة..."
            />
          </div>

          {/* 4. Employee Filter (Searchable) */}
          <div>
            <SearchableSelect
              options={employeeFilterOptions}
              value={selectedEmployeeFilter}
              onChange={val => setSelectedEmployeeFilter(val)}
              allOptionLabel="كافة الموظفين"
              placeholder="اختر الموظف..."
            />
          </div>

          {/* 5. Ticket Type Filter (Searchable) */}
          <div>
            <SearchableSelect
              options={shippingTypeFilterOptions}
              value={selectedTypeFilter}
              onChange={val => setSelectedTypeFilter(val as any)}
              allOptionLabel="كافة أنواع الشحن"
              placeholder="اختر نوع الشحنة..."
            />
          </div>

          {/* 6. Reservation & Fulfillment Route Filter */}
          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'كافة المسارات', icon: <Layers className="w-3.5 h-3.5 text-orange-500 shrink-0" /> },
                { value: 'completed_reservations', label: '📦 تذاكر تمت بالحجز', icon: <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" /> },
                { value: 'pending_reservations', label: '📅 حجوزات معلقة', icon: <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" /> },
                { value: 'direct', label: '⚡ شحن فوري عادي', icon: <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" /> }
              ]}
              value={reservationFilter}
              onChange={val => setReservationFilter(val as any)}
              allOptionLabel="كافة المسارات (حجز/فوري)"
              placeholder="مسار التذكرة..."
            />
          </div>

          {/* 7. Platform / Communication Source Filter */}
          <div>
            <SearchableSelect
              options={platformFilterOptions}
              value={selectedPlatformFilter}
              onChange={val => setSelectedPlatformFilter(val)}
              allOptionLabel="كافة مصادر التواصل 🌐"
              placeholder="مصدر التواصل..."
            />
          </div>


          {/* 8. Reset All Filters Button in Filters Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="w-full h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center gap-1.5 font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                title="إلغاء كافة الفلاتر النشطة واسترجاع الوضع الافتراضي"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير الفلاتر ({activeFiltersCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Date Filter & Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedStatusTab('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${selectedStatusTab === 'all' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
            >
              الكل ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('new')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'new' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
            >
              <Clock className="w-3 h-3" /> جديدة ({tickets.filter(t => t.status === 'new').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('in_progress')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'in_progress' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
            >
              <Zap className="w-3 h-3" /> جاري المعالجة ({tickets.filter(t => t.status === 'in_progress').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('completed')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'completed' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
            >
              <CheckCircle2 className="w-3 h-3" /> تم الشحن ({tickets.filter(t => t.status === 'completed').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('problem')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'problem' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
            >
              <AlertTriangle className="w-3 h-3" /> في مشكلة ({tickets.filter(t => t.status === 'problem').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('fraud')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'fraud' ? 'bg-rose-600 text-white shadow-xs' : 'text-zinc-400 hover:text-rose-400'
                }`}
            >
              <ShieldAlert className="w-3 h-3" /> احتيال ({tickets.filter(t => t.status === 'fraud').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('refunded')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'refunded' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
            >
              <RotateCcw className="w-3 h-3" /> تم الاسترداد ({tickets.filter(t => t.status === 'refunded').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('reservations')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'reservations' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-400 hover:text-purple-300'
                }`}
            >
              <CalendarDays className="w-3 h-3" /> 📅 الحجوزات المعلقة ({allReservations.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('completed_reservations')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${selectedStatusTab === 'completed_reservations' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-400 hover:text-purple-300'
                }`}
              title="عرض التذاكر التي تم شحنها وتسليمها عبر نظام الحجوزات"
            >
              <CheckCircle2 className="w-3 h-3" /> 📦 تمت بالحجز ({tickets.filter(t => (t.isReservation || t.operationMode === 'reservation') && t.status === 'completed').length})
            </button>
          </div>

          {/* Date Range Picker & Universal Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onReset={() => { setStartDate(''); setEndDate(''); }}
            />

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none text-xs font-bold"
            >
              <option value="newest">الأحدث أولاً 🗓️</option>
              <option value="oldest">الأقدم أولاً ⏳</option>
              <option value="highestAmount">الأعلى سعراً 💰</option>
              <option value="lowestAmount">الأقل سعراً 💵</option>
            </select>

            {/* Prominent Reset Filters Button */}
            <button
              type="button"
              onClick={handleResetAllFilters}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFiltersCount > 0
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#141417] text-zinc-400 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
              }`}
              title="إلغاء كافة الفلاتر والبحث والرجوع للوضع الافتراضي"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{activeFiltersCount > 0 ? `تصفير الفلاتر (${activeFiltersCount})` : 'تصفير الفلاتر'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 4️⃣ [ الأزرار الرئيسية ] MAIN ACTION BUTTONS STRIP */}
      {/* ============================================================= */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* + New Ticket */}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenNewTicketModal}
            className="font-black"
          >
            + تذكرة جديدة (Ctrl+N)
          </Button>

          {/* Reservations Manager Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<CalendarDays className="w-4 h-4 text-purple-400" />}
            onClick={() => setIsReservationsDueModalOpen(true)}
            className={`border-purple-500/30 text-purple-400 hover:bg-purple-500/10 ${dueReservations.length > 0 ? 'ring-2 ring-purple-500/50 animate-pulse' : ''
              }`}
          >
            📅 إدارة الحجوزات ({allReservations.length})
            {dueReservations.length > 0 && (
              <span className="mr-1 px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[9px] font-bold">
                {dueReservations.length} مستحق
              </span>
            )}
          </Button>

          {/* Coupon Checker */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Tag className="w-4 h-4 text-orange-500" />}
            onClick={() => setIsCouponCheckerOpen(true)}
          >
            🔍 فحص كوبون
          </Button>

          {/* Customer Checker */}
          <Button
            variant="secondary"
            size="sm"
            icon={<User className="w-4 h-4 text-blue-500" />}
            onClick={() => setIsCustomerInspectorOpen(true)}
          >
            👤 فحص عميل
          </Button>

          {/* Deposit Numbers */}
          <Button
            variant="secondary"
            size="sm"
            icon={<PhoneCall className="w-4 h-4 text-emerald-500" />}
            onClick={() => setIsDepositNumbersOpen(true)}
          >
            💳 أرقام الإيداع
          </Button>


          {/* Budget Hunter */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Target className="w-4 h-4 text-amber-500" />}
            onClick={() => setIsBudgetHunterOpen(true)}
            className="border-amber-500/30"
          >
            🎯 صائد الميزانية
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-zinc-500">النتائج المعروضة:</span>
          <span className="font-mono font-black text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg">
            {filteredTickets.length} تذكرة
          </span>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              title="إلغاء كافة الفلاتر والبحث واسترجاع العرض الكامل"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير الفلاتر ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 5️⃣ [ قائمة التذاكر ] TICKETS TABLE */}
      {/* ============================================================= */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-[#141417]/80 text-zinc-500 dark:text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-4">رقم التذكرة</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">العميل والهاتف</th>
                <th className="py-3 px-4 text-center">مصدر التواصل</th>
                <th className="py-3 px-4">نوع التذكرة</th>
                <th className="py-3 px-4">المنتجات والباقات</th>
                <th className="py-3 px-4">وسيلة ورقم التحويل</th>
                <th className="py-3 px-4">المبالغ والأرصدة</th>
                <th className="py-3 px-4">الموظف والسرعة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    <div className="space-y-2">
                      <Ticket className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                      <p className="font-bold text-sm">لا توجد تذاكر تطابق معايير البحث والفلترة المحددة</p>
                      <span className="text-[11px] text-zinc-500">
                        جرب تغيير الفلاتر أو اضغط على "+ تذكرة جديدة" لإنشاء أول طلب شحن.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map(tkt => {
                  const isReservation = tkt.isReservation || tkt.operationMode === 'reservation';
                  let isReservationDue = true;
                  let scheduledTimeStr = '';
                  if (isReservation && tkt.scheduledDeliveryDate) {
                    const timePart = tkt.scheduledDeliveryTime || '00:00';
                    scheduledTimeStr = `${tkt.scheduledDeliveryDate} ${tkt.scheduledDeliveryTime ? `(${tkt.scheduledDeliveryTime})` : ''}`;
                    const schedTime = new Date(`${tkt.scheduledDeliveryDate}T${timePart}:00`).getTime();
                    if (!isNaN(schedTime)) {
                      isReservationDue = currentTimestamp >= schedTime;
                    } else {
                      isReservationDue = new Date().toISOString().split('T')[0] >= tkt.scheduledDeliveryDate;
                    }
                  }

                  // Calculate open ticket timer warning (5 min warning, 15 min red alert)
                  const minutesOpen = tkt.createdAt
                    ? Math.floor((currentTimestamp - new Date(tkt.createdAt).getTime()) / (1000 * 60))
                    : 0;
                  const isOpen = tkt.status === 'new' || tkt.status === 'in_progress';
                  const isWarningTime = isOpen && minutesOpen >= 5 && minutesOpen < 15;
                  const isDangerTime = isOpen && minutesOpen >= 15;

                  return (
                    <tr
                      key={tkt.id}
                      onClick={() => setSelectedDetailsTicket(tkt)}
                      className={`transition-colors cursor-pointer group/row border-b border-gray-100 dark:border-[#27272A] ${
                        isReservation
                          ? 'bg-purple-500/10 dark:bg-purple-950/30 hover:bg-purple-500/15 dark:hover:bg-purple-900/40 border-r-4 border-r-purple-500 shadow-xs'
                          : isDangerTime
                          ? 'bg-rose-500/5 hover:bg-rose-500/10'
                          : isWarningTime
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'hover:bg-orange-500/5 dark:hover:bg-zinc-800/80'
                      }`}
                      title="انقر لفتح تفاصيل التذكرة بالكامل"
                    >
                      {/* Ticket Number & Timer Alert */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className={`font-mono font-black block text-xs underline decoration-dotted underline-offset-2 ${
                            isReservation
                              ? 'text-purple-400 group-hover/row:text-purple-300'
                              : 'text-orange-500 group-hover/row:text-orange-600'
                          }`}>
                            {tkt.ticketNumber}
                          </strong>

                          {isReservation && (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black flex items-center gap-1 shadow-xs">
                              <Calendar className="w-2.5 h-2.5 text-purple-400" />
                              حجز
                            </span>
                          )}

                          {isDangerTime && !isReservation && (
                            <span className="p-0.5 rounded-full bg-rose-500 text-white animate-pulse" title={`تنبيه أحمر: التذكرة مفتوحة منذ ${minutesOpen} دقيقة!`}>
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                          {isWarningTime && !isReservation && (
                            <span className="p-0.5 rounded-full bg-amber-500 text-white" title={`تنبيه: التذكرة مفتوحة منذ ${minutesOpen} دقائق`}>
                              <Clock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        {isReservation && (
                          <div className="mt-1">
                            <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                              isReservationDue ? 'text-emerald-400' : 'text-purple-300'
                            }`}>
                              <Clock className="w-2.5 h-2.5" />
                              {isReservationDue ? '🔔 يحين الآن: ' : '⏳ موعد التسليم: '}
                              {scheduledTimeStr}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                        <div>{formatDate(tkt.createdAt)}</div>
                        <span className="text-[10px] text-zinc-400">{formatDateTime(tkt.createdAt).split(' ')[1]}</span>
                      </td>

                      {/* Customer Info */}
                      <td
                        className="py-3 px-4 cursor-pointer hover:bg-orange-500/5 transition-colors group"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cust = db.getCustomerById(tkt.customerId) || db.getCustomers().find(c => c.phone.trim() === tkt.customerPhone.trim());
                          if (cust) setSelectedProfileCustomer(cust);
                        }}
                        title="انقر لفتح بروفايل العميل"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors flex items-center gap-1">
                            <span>{tkt.customerName}</span>
                            <User className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity" />
                          </p>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono">{tkt.customerPhone}</span>
                      </td>

                      {/* Communication Source (خانة مصدر التواصل) */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="inline-flex justify-center">
                          <PlatformSourceBadge source={tkt.platformSource} size="xs" />
                        </div>
                      </td>

                      {/* Ticket Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {isReservation ? (
                            <Badge variant="purple" size="sm" className="font-bold flex items-center gap-1">
                              📅 حجز مجدول
                            </Badge>
                          ) : (
                            <Badge variant={tkt.ticketType === 'first_shipping' ? 'warning' : 'default'} size="sm">
                              {tkt.ticketType === 'first_shipping' ? '🌟 أول شحنة' : 'شحنة عادية'}
                            </Badge>
                          )}
                          {isReservation && tkt.ticketType === 'first_shipping' && (
                            <span className="text-[9px] text-amber-400 font-bold">🌟 أول شحنة</span>
                          )}
                        </div>
                      </td>

                      {/* Products / Items List */}
                      <td className="py-3 px-4">
                        {tkt.items && tkt.items.length > 0 ? (
                          <div className="space-y-1">
                            {tkt.items.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="default" size="sm">{it.gameName}</Badge>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">{it.productName}</span>
                                <span className="font-mono text-[11px] text-emerald-500 font-bold">ID: {it.playerGameId}</span>
                                {it.quantity > 1 && <span className="font-mono text-orange-500 font-bold">x{it.quantity}</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-zinc-800 dark:text-zinc-200">{tkt.gameName} — {tkt.gameProductName}</p>
                            <span className="text-[11px] font-mono text-emerald-500 font-bold">ID: {tkt.playerGameId}</span>
                          </div>
                        )}

                        {tkt.notes && (
                          <div className="mt-1 p-1 px-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] flex items-center gap-1 max-w-xs">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{tkt.notes}</span>
                          </div>
                        )}
                      </td>

                      {/* Gateway & Transfer Details */}
                      <td className="py-3 px-4">
                        {tkt.senderPhoneNumber && (
                          <div className="text-[11px] text-zinc-400 font-mono">
                            من: <span className="font-bold text-zinc-700 dark:text-zinc-300">{tkt.senderPhoneNumber}</span>
                          </div>
                        )}
                        {tkt.transferReferenceNumber && (
                          <span className="font-mono font-bold text-orange-400 block text-[11px]">
                            {tkt.transferReferenceNumber}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400">{tkt.paymentGateway || tkt.paymentWallet}</span>
                      </td>

                      {/* Amounts & Balances */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {/* Main prominent amount: Received Amount (المبلغ المستلم) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-400 font-bold">المستلم:</span>
                            <strong className="font-mono text-zinc-900 dark:text-zinc-100 text-sm font-black">
                              {formatCurrency(tkt.receivedAmount !== undefined && tkt.receivedAmount > 0 ? tkt.receivedAmount : tkt.requiredAmount)}
                            </strong>
                          </div>

                          {/* Show Required Amount if different from received */}
                          {tkt.receivedAmount !== undefined && tkt.receivedAmount > 0 && tkt.receivedAmount !== tkt.requiredAmount && (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                              <span>المطلوب:</span>
                              <span className="line-through text-zinc-500">{formatCurrency(tkt.requiredAmount)}</span>
                            </div>
                          )}

                          {/* Shortage / Debt Warning */}
                          {tkt.shortageAmount && tkt.shortageAmount > 0 ? (
                            <span className="text-[10px] text-rose-500 font-bold block bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              عجز (مدين): -{tkt.shortageAmount} ج
                            </span>
                          ) : tkt.receivedAmount !== undefined && tkt.receivedAmount > 0 && tkt.receivedAmount < tkt.requiredAmount ? (
                            <span className="text-[10px] text-rose-500 font-bold block bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              متبقي: -{Math.round((tkt.requiredAmount - tkt.receivedAmount) * 100) / 100} ج
                            </span>
                          ) : null}

                          {tkt.cashbackUsed > 0 && (
                            <span className="text-[10px] text-emerald-500 font-bold block">
                              كاش باك: -{tkt.cashbackUsed} ج
                            </span>
                          )}
                          {tkt.referralBalanceUsed && tkt.referralBalanceUsed > 0 && (
                            <span className="text-[10px] text-purple-400 font-bold block">
                              إحالة: -{tkt.referralBalanceUsed} ج
                            </span>
                          )}
                          {tkt.accountBalanceUsed && tkt.accountBalanceUsed > 0 && (
                            <span className="text-[10px] text-blue-400 font-bold block">
                              دائن: -{tkt.accountBalanceUsed} ج
                            </span>
                          )}
                          {tkt.overpaymentAmount > 0 && (
                            <span className="text-[10px] text-emerald-400 font-bold block">
                              فائض: +{tkt.overpaymentAmount} ج
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Speed & CSAT */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-zinc-400 block text-[11px]">{tkt.assignedTo || 'مسؤول الشحن'}</span>
                        {tkt.status === 'completed' && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${(tkt.customerRating || 5) >= star
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-zinc-600'
                                  }`}
                              />
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            tkt.status === 'completed'
                              ? 'success'
                              : tkt.status === 'problem'
                                ? 'danger'
                                : tkt.status === 'refunded'
                                  ? 'default'
                                  : tkt.status === 'fraud'
                                    ? 'danger'
                                    : tkt.status === 'in_progress'
                                      ? 'info'
                                      : 'warning'
                          }
                          size="sm"
                        >
                          {tkt.status === 'completed'
                            ? 'تم الشحن'
                            : tkt.status === 'problem'
                              ? 'في مشكلة'
                              : tkt.status === 'refunded'
                                ? 'تم الاسترداد'
                                : tkt.status === 'fraud'
                                  ? 'احتيال'
                                  : tkt.status === 'in_progress'
                                    ? 'جاري المعالجة'
                                    : 'جديدة'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {/* 🔍 Ticket Details (Snapshot & Timeline) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetailsTicket(tkt);
                            }}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                            title="عرض تفاصيل التذكرة بالكامل (Snapshot & Timeline)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Lifecycle transitions */}
                          {tkt.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => handleTransitionStatus(tkt.id, 'in_progress')}
                              className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white font-bold text-[11px] transition-colors"
                              title="بدء المعالجة"
                            >
                              معالجة
                            </button>
                          )}

                          {(tkt.status === 'new' || tkt.status === 'in_progress') && (
                            isReservation && !isReservationDue ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="opacity-60 cursor-not-allowed border-purple-500/40 text-purple-300 bg-purple-950/40 font-bold"
                                title={`⏳ موعد التسليم لم يحن بعد (${scheduledTimeStr}). لا يمكن إكمال التذكرة قبل حلول هذا الموعد.`}
                                icon={<Clock className="w-3.5 h-3.5 text-purple-400" />}
                              >
                                ⏳ قبل الموعد
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleTransitionStatus(tkt.id, 'completed')}
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                className={isReservation ? "bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-900/40 border-purple-400/30 font-bold" : ""}
                              >
                                {isReservation ? '⚡ تسليم الحجز' : 'إكمال'}
                              </Button>
                            )
                          )}

                          {/* Problem Handler */}
                          {tkt.status !== 'refunded' && tkt.status !== 'canceled' && (
                            <button
                              type="button"
                              onClick={() => {
                                setProblemModalInitialTab('problem');
                                setProblemTargetTicket(tkt);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                tkt.status === 'problem'
                                  ? 'bg-amber-500 text-white shadow-xs animate-pulse'
                                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white'
                              }`}
                              title={tkt.status === 'problem' ? 'إدارة وإغلاق المشكلة' : 'تسجيل مشكلة بالتذكرة'}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Fraud Handler (Owner) */}
                          {isOwner && tkt.status !== 'refunded' && tkt.status !== 'canceled' && (
                            <button
                              type="button"
                              onClick={() => {
                                setProblemModalInitialTab('fraud');
                                setProblemTargetTicket(tkt);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                tkt.status === 'fraud'
                                  ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                              }`}
                              title={tkt.status === 'fraud' ? 'إدارة واسترداد تذكرة الاحتيال' : 'تسجيل وتفعيل حالة احتيال'}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Refund (Owner) */}
                          {isOwner && tkt.status !== 'refunded' && tkt.status !== 'canceled' && tkt.status !== 'fraud' && (
                            <button
                              type="button"
                              onClick={() => setRefundTargetTicket(tkt)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                              title="استرداد مالي للتذكرة (مكتملة أو قيد المعالجة)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* ✏️ Edit Ticket */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditTicket(tkt);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors"
                            title="تعديل بيانات التذكرة بالكامل (فتح نموذج التذكرة الشامل)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Pricing breakdown */}
                          <button
                            type="button"
                            onClick={() => {
                              const snap = tkt.pricingSnapshot || FinancialEngine.generateTicketSnapshot(tkt.items || [], tkt.couponDiscountAmount || 0, user || undefined);
                              setSelectedTicketSnapshot({
                                snapshot: snap,
                                title: `تفاصيل تسعير التذكرة #${tkt.ticketNumber}`
                              });
                            }}
                            className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                            title="تفاصيل التسعير والـ FIFO"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Copy Invoice Image */}
                          <button
                            type="button"
                            onClick={() => handleQuickCopyInvoiceImage(tkt)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors"
                            title="نسخ الفاتورة كـ صورة فورية للحافظة (Ctrl+V في واتساب)"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Invoice PDF Print */}
                          <button
                            type="button"
                            onClick={() => setPrintingTicket(tkt)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:text-orange-500 transition-colors"
                            title="طباعة الفاتورة الرسمية"
                          >
                            <Receipt className="w-3.5 h-3.5 text-orange-500" />
                          </button>

                          {/* WhatsApp message */}
                          <button
                            type="button"
                            onClick={() => {
                              const clean = tkt.customerPhone.replace(/[^0-9]/g, '');
                              const phone = clean.startsWith('0') ? '2' + clean : clean;
                              const itemsTxt = tkt.items && tkt.items.length > 0
                                ? tkt.items.map(i => `• ${i.gameName}: ${i.productName} (ID: ${i.playerGameId})`).join('\n')
                                : `• ${tkt.gameName}: ${tkt.gameProductName} (ID: ${tkt.playerGameId})`;
                              const platformName = getPlatformConfig(tkt.platformSource).name;
                              const effectiveReceived = tkt.receivedAmount !== undefined && tkt.receivedAmount > 0 ? tkt.receivedAmount : tkt.requiredAmount;
                              const msg = `🎮 مرحباً بك ${tkt.customerName}! ✨\n━━━━━━━━━━━━━━━\n📦 تفاصيل تذكرتك #${tkt.ticketNumber}:\n${itemsTxt}\n━━━━━━━━━━━━━━━\n🌐 مصدر التواصل:\n${platformName}\n━━━━━━━━━━━━━━━\n💰 المبلغ المستلم: ${effectiveReceived} ج${tkt.receivedAmount && tkt.receivedAmount !== tkt.requiredAmount ? ` (المطلوب: ${tkt.requiredAmount} ج)` : ''}${tkt.shortageAmount ? `\n⚠️ متبقي (مدين): -${tkt.shortageAmount} ج` : ''}\n🎁 كاش باك: +${tkt.cashbackEarned} ج\n━━━━━━━━━━━━━━━\nNZM JKR Top Up 🌟`;
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                            title="إرسال عبر واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Owner only) */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(tkt.id, tkt.ticketNumber)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="حذف التذكرة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredTickets.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          labelName="تذكرة شحن"
          themeColor="orange"
        />
      </Card>

      {/* ============================================================= */}
      {/* 🚀 NEW MULTI-PRODUCT TICKET MODAL */}
      {/* ============================================================= */}
      {isNewTicketModalOpen && (
        <Modal
          isOpen={isNewTicketModalOpen}
          onClose={() => {
            setIsNewTicketModalOpen(false);
            setEditingTicket(null);
          }}
          title={editingTicket ? `✏️ تعديل تذكرة شحن وفاتورة #${editingTicket.ticketNumber} (Edit Ticket)` : "إنشاء تذكرة شحن وفاتورة متعددة المنتجات (New Multi-Product Ticket)"}
          subtitle={editingTicket ? "تعديل ومراجعة كافة بيانات التذكرة، الباقات والكميات، وأرصدة العميل والدفع والتحكم الكامل" : "البحث التلقائي الذكي بالهاتف، إضافة باقات متعددة، وتطبيق الخصومات والمحافظ"}
          maxWidth="4xl"
        >
          <form onSubmit={handleCreateTicket} className="space-y-4 text-right text-xs">

            {/* 1. Ticket Type Selector */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between gap-4">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">نوع التذكرة والشحن:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none">
                  <input
                    type="radio"
                    name="ticketType"
                    checked={ticketType === 'regular'}
                    onChange={() => handleSelectTicketType('regular')}
                    className="text-orange-500"
                  />
                  <span>○ شحنة عادية (Regular)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-amber-500">
                  <input
                    type="radio"
                    name="ticketType"
                    checked={ticketType === 'first_shipping'}
                    onChange={() => handleSelectTicketType('first_shipping')}
                    className="text-amber-500"
                  />
                  <span>⭐ أول شحنة للعميل (First Order Discount)</span>
                </label>
              </div>
            </div>

            {/* 1.5 Operation Mode Selector (بيع مباشر / حجز منتج) */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-purple-500" />
                  وضع العملية:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOperationMode('direct')}
                    className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${operationMode === 'direct'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    ⚡ بيع وشحن مباشر
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationMode('reservation')}
                    className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${operationMode === 'reservation'
                        ? 'bg-purple-500 text-white border-purple-500 shadow-xs'
                        : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    📅 حجز منتج (Reservation)
                  </button>
                </div>
              </div>

              {/* Reservation Date/Time Fields */}
              {operationMode === 'reservation' && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                    <CalendarDays className="w-4 h-4" />
                    <span>بيانات الحجز — سيتم تنبيهك عند حلول موعد التسليم</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">تاريخ الاستلام المتوقع *</label>
                      <input
                        type="date"
                        value={scheduledDeliveryDate}
                        onChange={e => setScheduledDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required={operationMode === 'reservation'}
                        className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 font-mono font-bold text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">وقت الاستلام (اختياري)</label>
                      <input
                        type="time"
                        value={scheduledDeliveryTime}
                        onChange={e => setScheduledDeliveryTime(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 font-mono text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">ملاحظات الحجز</label>
                      <input
                        type="text"
                        value={reservationNotes}
                        onChange={e => setReservationNotes(e.target.value)}
                        placeholder="مثال: العميل سيستلم بعد العصر..."
                        className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-orange-500" />
                  <span>{department === 'dealers' ? '1️⃣ البحث عن التاجر برقم الهاتف (Smart Autocomplete) *' : '1️⃣ البحث عن العميل برقم الهاتف (Smart Autocomplete) *'}</span>
                </label>

                {!matchedCustomer && customerPhone.trim().length >= 4 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={<UserPlus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setNewCustProfileType(department === 'dealers' ? 'distributor' : 'regular');
                      setIsQuickAddCustomerOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    {department === 'dealers' ? '+ جديد (تسجيل تاجر فوري)' : '+ جديد (تسجيل عميل فوري)'}
                  </Button>
                )}
              </div>

              <div ref={phoneInputRef} className="relative">
                <Input
                  placeholder="ابحث برقم الهاتف أو اكتب رقم جديد..."
                  value={customerPhone}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    setIsPhoneDropdownOpen(true);
                  }}
                  onFocus={() => setIsPhoneDropdownOpen(true)}
                  icon={<Search className="w-4 h-4 text-zinc-400" />}
                />

                {/* Autocomplete Dropdown */}
                {isPhoneDropdownOpen && matchingCustomers.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-[#27272A]"
                  >
                    {matchingCustomers.map((cust, idx) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectPhoneSuggestion(cust)}
                        className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${idx === selectedDropdownIndex ? 'bg-orange-500/10 text-orange-500' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                          }`}
                      >
                        <div>
                          <strong className="text-zinc-900 dark:text-zinc-100 block text-xs">{cust.name}</strong>
                          <span className="text-[11px] font-mono text-zinc-400">{cust.phone}</span>
                        </div>
                        <div className="text-left font-mono text-[10px]">
                          <span className="text-emerald-500 font-bold block">كاش باك: {formatCurrency(cust.cashbackBalance || 0)}</span>
                          <span className="text-zinc-400">{cust.totalOrders || 0} طلبات</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Matched Customer Info Badge */}
              {matchedCustomer && (
                matchedCustomer.isFrozen || matchedCustomer.status === 'suspended' ? (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-between gap-3 animate-fade-in font-bold">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <strong className="text-rose-600 dark:text-rose-400 block text-xs">⚠️ هذا الحساب مجمد ولا يمكن التعامل معه.</strong>
                        <span className="text-[11px] font-mono text-zinc-400">{matchedCustomer.name} ({matchedCustomer.phone})</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-xs">حساب مجمد 🔒</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <div>
                        <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{matchedCustomer.name}</strong>
                        <span className="text-zinc-400 text-[11px] font-mono mr-2">({matchedCustomer.phone})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-emerald-500 font-bold">🎁 كاش باك ({resolvedCustomerCashbackRate}%): {formatCurrency(matchedCustomer.cashbackBalance || 0)}</span>
                      <span className="text-purple-400 font-bold">🤝 إحالة: {formatCurrency(matchedCustomer.referralWalletBalance || 0)}</span>
                      {matchedCustomer.accountBalance !== 0 && (
                        <span className={matchedCustomer.accountBalance > 0 ? 'text-blue-400 font-bold' : 'text-rose-400 font-bold'}>
                          {matchedCustomer.accountBalance > 0 ? `دائن: +${matchedCustomer.accountBalance} ج` : `مدين: ${matchedCustomer.accountBalance} ج`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Platform Source Selector (واتساب، تيك توك، انستجرام، ماسنجر، تليجرام، أخرى) */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]">
                <PlatformSourceSelector
                  value={platformSource}
                  onChange={setPlatformSource}
                />
              </div>
            </div>

            {/* 3. Multi-Product Line Items Builder */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
              <label className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
                <Gamepad2 className="w-4 h-4 text-orange-500" />
                <span>2️⃣ إضافة المنتجات والباقات للشحنة (Multi-Product Builder)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 items-end">
                {/* Game */}
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1 text-[11px]">🎮 اللعبة (Searchable)</label>
                  <SearchableSelect
                    allowAll={false}
                    required
                    value={selectedGameId}
                    placeholder="اختر اللعبة..."
                    searchPlaceholder="ابحث في الألعاب (مثال: Free Fire)..."
                    options={games.map(g => ({
                      value: g.id,
                      label: g.name,
                      icon: <Gamepad2 className="w-3.5 h-3.5 text-orange-500" />
                    }))}
                    onChange={val => {
                      setSelectedGameId(val);
                      const g = games.find(game => game.id === val);
                      setSelectedSectionId(g?.sections[0]?.id || '');
                      setSelectedProductId(g?.products[0]?.id || '');
                    }}
                  />
                </div>

                {/* Section */}
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1 text-[11px]">📁 القسم (Searchable)</label>
                  <SearchableSelect
                    allowAll={false}
                    required
                    value={selectedSectionId}
                    placeholder="اختر القسم..."
                    searchPlaceholder="ابحث في الأقسام..."
                    options={(games.find(g => g.id === selectedGameId)?.sections || []).map(s => ({
                      value: s.id,
                      label: s.name
                    }))}
                    onChange={val => {
                      setSelectedSectionId(val);
                      const g = games.find(game => game.id === selectedGameId);
                      const prods = g?.products.filter(p => p.sectionId === val) || [];
                      setSelectedProductId(prods[0]?.id || g?.products[0]?.id || '');
                    }}
                  />
                </div>

                {/* Product */}
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1 text-[11px]">📦 الباقة المطلوبة (Searchable)</label>
                  <SearchableSelect
                    allowAll={false}
                    required
                    value={selectedProductId}
                    placeholder="اختر الباقة..."
                    searchPlaceholder="ابحث في الباقات والمنتجات..."
                    options={(
                      games
                        .find(g => g.id === selectedGameId)
                        ?.products.filter(p => !selectedSectionId || p.sectionId === selectedSectionId) || []
                    ).map(p => {
                      const avail = db.checkProductAvailability(p, 1);
                      const isAvail = avail.isAvailable && p.isActive !== false;
                      const price = ticketType === 'first_shipping' ? p.firstOrderCostPriceEGP : isDealer ? (p.dealerPriceEGP || p.calculatedPriceEGP) : p.calculatedPriceEGP;
                      return {
                        value: p.id,
                        label: `${isAvail ? '' : '⛔ '}${p.name} (${price} ج)${isAvail ? '' : ' — [غير متاح حالياً]'}`,
                        badge: `${price} ج`,
                        badgeClassName: isAvail ? 'bg-orange-500/10 text-orange-500' : 'bg-rose-500/10 text-rose-500',
                        disabled: !isAvail
                      };
                    })}
                    onChange={setSelectedProductId}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1 text-[11px]">الكمية (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    max={linePointsValidation.maxAddableQty > 0 ? linePointsValidation.maxAddableQty : 1}
                    step="1"
                    value={lineQuantity}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 1;
                      const maxLimit = linePointsValidation.maxAddableQty > 0 ? linePointsValidation.maxAddableQty : 1;
                      setLineQuantity(Math.max(1, Math.min(val, maxLimit)));
                    }}
                    className="w-full rounded-xl bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f36] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-bold text-center font-mono text-xs"
                  />
                </div>

                {/* Player ID */}
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1 text-[11px]">Player ID اللاعب *</label>
                  <input
                    type="text"
                    placeholder="ID في اللعبة..."
                    value={linePlayerGameId}
                    onChange={e => setLinePlayerGameId(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f36] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-mono text-xs"
                  />
                  {suggestedPlayerIds.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[9px] text-zinc-400">اقتراح:</span>
                      {suggestedPlayerIds.slice(0, 2).map((pid, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLinePlayerGameId(pid)}
                          className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono text-[9px] hover:bg-orange-500 hover:text-white transition-colors cursor-pointer"
                        >
                          {pid}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Line Item Button */}
                <div>
                  <Button
                    type="button"
                    variant={linePointsValidation.isInsufficient ? "danger" : "secondary"}
                    size="sm"
                    disabled={linePointsValidation.isInsufficient}
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAddLineItem}
                    className="w-full justify-center py-2.5"
                    title={linePointsValidation.isInsufficient ? 'رصيد المحفظة غير كافٍ لإضافة هذه الكمية' : 'إضافة باقة'}
                  >
                    {linePointsValidation.isInsufficient ? 'رصيد غير كافٍ ⛔' : 'إضافة باقة'}
                  </Button>
                </div>
              </div>

              {/* Insufficient Points Live Warning Alert (Requirement #3) */}
              {linePointsValidation.isInsufficient && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-500 font-bold text-xs flex items-center justify-between gap-3 animate-fade-in shadow-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                    <div>
                      <span className="block font-black text-sm">لا يمكن تنفيذ العملية. رصيد المحفظة غير كافٍ.</span>
                      <span className="text-[11px] font-mono text-rose-400">
                        المتاح: <strong className="text-zinc-900 dark:text-white font-black">{linePointsValidation.availablePoints.toLocaleString()}</strong> نقطة | المطلوب: <strong className="text-zinc-900 dark:text-white font-black">{linePointsValidation.pointsNeeded.toLocaleString()}</strong> نقطة.
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-mono font-black shrink-0 shadow-xs">
                    عجز: -{(linePointsValidation.pointsNeeded - linePointsValidation.availablePoints).toLocaleString()} نقطة
                  </span>
                </div>
              )}

              {/* Live Calculation Preview Banner */}
              {currentSelectedProduct && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-600 dark:text-orange-400 font-semibold">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span>سعر الوحدة: <strong className="font-mono text-zinc-900 dark:text-white font-bold">{ticketType === 'first_shipping' ? currentSelectedProduct.firstOrderCostPriceEGP : isDealer ? (currentSelectedProduct.dealerPriceEGP || currentSelectedProduct.calculatedPriceEGP) : currentSelectedProduct.calculatedPriceEGP} ج</strong></span>
                    <span>×</span>
                    <span>الكمية: <strong className="font-mono text-zinc-900 dark:text-white font-bold">{Math.max(1, lineQuantity)}</strong></span>
                    <span>=</span>
                    <span>الإجمالي: <strong className="font-mono text-orange-500 font-bold text-sm">{(ticketType === 'first_shipping' ? currentSelectedProduct.firstOrderCostPriceEGP : isDealer ? (currentSelectedProduct.dealerPriceEGP || currentSelectedProduct.calculatedPriceEGP) : currentSelectedProduct.calculatedPriceEGP) * Math.max(1, lineQuantity)} ج</strong></span>
                  </div>
                  <span className="text-[11px] text-zinc-400">سيتم تجميع كافة الباقات وتحديث الربح والكاش باك والخزينة تلقائياً</span>
                </div>
              )}

              {/* Items Table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-xl">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                      <th className="py-2.5 px-3">اللعبة</th>
                      <th className="py-2.5 px-3">القسم</th>
                      <th className="py-2.5 px-3">الباقة / المنتج</th>
                      <th className="py-2.5 px-3">الـ Player ID</th>
                      <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3 text-center">الإجمالي</th>
                      <th className="py-2.5 px-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {ticketItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-zinc-400">
                          لم تتم إضافة أي باقة بعد. يرجى اختيار الباقة والكمية والـ ID والضغط على "إضافة باقة"
                        </td>
                      </tr>
                    ) : (
                      ticketItems.map(it => {
                        const prod = games.flatMap(g => g.products || []).find(p => p.id === it.productId);
                        const maxAllowed = prod ? getProductMaxQuantity(prod, it.id) : 999999;
                        const isMaxReached = it.quantity >= maxAllowed;

                        return (
                          <tr key={it.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                            <td className="py-2 px-3 font-bold">{it.gameName}</td>
                            <td className="py-2 px-3 text-zinc-500">{it.sectionName || 'عام'}</td>
                            <td className="py-2 px-3 text-zinc-800 dark:text-zinc-200 font-semibold">{it.productName}</td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-500">{it.playerGameId}</td>
                            <td className="py-2 px-3 text-center font-mono text-zinc-600 dark:text-zinc-300">{it.unitPrice} ج</td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQuantity(it.id, it.quantity - 1)}
                                  disabled={it.quantity <= 1}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-xs font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={maxAllowed}
                                  step="1"
                                  value={it.quantity}
                                  onChange={e => handleUpdateItemQuantity(it.id, parseFloat(e.target.value) || 1)}
                                  className={`w-12 text-center p-0.5 text-xs font-mono font-bold rounded bg-white dark:bg-[#141417] border ${isMaxReached ? 'border-amber-500/60 text-amber-400' : 'border-gray-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'}`}
                                  title={isMaxReached ? `أقصى كمية متاحة: ${maxAllowed}` : undefined}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQuantity(it.id, it.quantity + 1)}
                                  disabled={isMaxReached}
                                  title={isMaxReached ? `تم الوصول للحد الأقصى المتاح (${maxAllowed})` : 'زيادة الكمية'}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                              {isMaxReached && (
                                <div className="text-[9px] text-amber-500 font-bold mt-0.5 font-mono">
                                  الحد الأقصى ({maxAllowed})
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-orange-500">{it.totalPrice} ج</td>
                            <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(it.id)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              title="حذف الباقة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Discounts, Balances & Coupon Validation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coupon Engine */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  3️⃣ كود الكوبون والخصم الفوري
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="ادخل كود الكوبون (مثال: JKR-PROMO)..."
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleValidateCoupon}>
                    تطبيق
                  </Button>
                </div>
                {appliedCouponDiscount > 0 && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-between text-xs font-mono">
                    <span>خصم الكوبون ({appliedCouponCode}):</span>
                    <span>-{appliedCouponDiscount} ج</span>
                  </div>
                )}
              </div>

              {/* Customer Balances Deductions */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2.5">
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  4️⃣ استخدام أرصدة ومحافظ العميل
                </label>

                {/* Cashback */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useCashback}
                      onChange={e => {
                        setUseCashback(e.target.checked);
                        if (e.target.checked) setCustomCashbackAmount(availableCashback);
                      }}
                      disabled={availableCashback <= 0}
                      className="rounded text-orange-500"
                    />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      رصيد الكاش باك ({availableCashback} ج متاح)
                    </span>
                  </label>
                  {useCashback && (
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={customCashbackAmount}
                      max={availableCashback}
                      onChange={e => setCustomCashbackAmount(Math.min(availableCashback, parseFloat(e.target.value) || 0))}
                      className="w-20 p-1 text-center rounded bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f36] font-mono text-emerald-500 font-bold"
                    />
                  )}
                </div>

                {/* Referral Balance */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useReferralBalance}
                      onChange={e => {
                        setUseReferralBalance(e.target.checked);
                        if (e.target.checked) setCustomReferralAmount(availableReferral);
                      }}
                      disabled={availableReferral <= 0}
                      className="rounded text-orange-500"
                    />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      محفظة الإحالة ({availableReferral} ج متاح)
                    </span>
                  </label>
                  {useReferralBalance && (
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={customReferralAmount}
                      max={availableReferral}
                      onChange={e => setCustomReferralAmount(Math.min(availableReferral, parseFloat(e.target.value) || 0))}
                      className="w-20 p-1 text-center rounded bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f36] font-mono text-purple-400 font-bold"
                    />
                  )}
                </div>

                {/* Customer Primary Wallet Balance (رصيد العميل نفسه / المحفظة الأساسية) */}
                <div className={`p-2.5 rounded-xl border transition-all ${
                  hasNegativeBalance
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : availableCredit > 0
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-gray-50 dark:bg-[#141417] border-gray-200 dark:border-[#27272A]'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useCreditBalance}
                        onChange={e => {
                          setUseCreditBalance(e.target.checked);
                          if (e.target.checked) setCustomCreditAmount(Math.min(availableCredit, afterReferral));
                        }}
                        disabled={availableCredit <= 0}
                        className="rounded text-blue-500"
                      />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        رصيد محفظة العميل الأساسية ({availableCredit > 0 ? `+${availableCredit} ج متاح` : '0.00 ج متاح'})
                      </span>
                    </label>
                    {useCreditBalance && availableCredit > 0 && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={customCreditAmount}
                          max={Math.min(availableCredit, afterReferral)}
                          onChange={e => setCustomCreditAmount(Math.min(availableCredit, parseFloat(e.target.value) || 0))}
                          className="w-20 p-1 text-center rounded bg-white dark:bg-[#1f1f23] border border-blue-500/40 font-mono text-blue-400 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomCreditAmount(Math.min(availableCredit, afterReferral))}
                          className="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold transition-all cursor-pointer"
                        >
                          أقصى حد
                        </button>
                      </div>
                    )}
                  </div>
                  {hasNegativeBalance && (
                    <div className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <span>⚠️ تنبيه: مسجل على العميل مديونية / عجز سداد سابق بقيمة ({Math.abs(rawCustomerBalance)} ج.م)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Payment Wallet, Sub-Line & Gateway Details */}
            {(() => {
              const selectedW = operatingWallets.find(w => w.id === paymentWalletId || w.name === paymentWallet) || operatingWallets[0];
              const availableNumbers = selectedW?.numbers || [];
              const activeNumber = availableNumbers.find(n => n.id === paymentWalletNumberId || n.phoneNumber === paymentReceivedPhone) || availableNumbers[0];

              const numRemaining = activeNumber ? Math.max(0, activeNumber.monthlyLimit - (activeNumber.monthlyReceived || 0)) : (selectedW?.monthlyLimit || 200000) - (selectedW?.monthlyIncome || 0);
              const isNumFull = activeNumber ? (activeNumber.monthlyReceived || 0) >= activeNumber.monthlyLimit : false;
              const isNumWarning = activeNumber ? ((activeNumber.monthlyReceived || 0) / activeNumber.monthlyLimit) >= 0.8 && !isNumFull : false;

              return (
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                      5️⃣ بيانات الدفع ومحفظة الاستقبال المعتمدة
                    </label>
                    {activeNumber && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        متبقي ليمت الخط: <strong className={`font-bold ${isNumFull ? 'text-rose-500' : isNumWarning ? 'text-amber-500' : 'text-emerald-500'}`}>{formatCurrency(numRemaining, selectedW?.currency || 'EGP')}</strong>
                      </span>
                    )}
                  </div>

                  {/* Limit Warning Alert */}
                  {isNumFull && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>⚠️ تحذير: هذا الخط استهلك الحد الشهري الأقصى (الـ Limit) بالكامل! يرجى اختيار خط أو محفظة أخرى لتجنب تعليق الحساب.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Wallet Select */}
                    <div>
                      <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">محفظة الاستقبال *</label>
                      <select
                        value={paymentWalletId || selectedW?.id}
                        onChange={e => {
                          const targetId = e.target.value;
                          const w = operatingWallets.find(item => item.id === targetId);
                          if (w) {
                            setPaymentWalletId(w.id);
                            setPaymentWallet(w.name);
                            const activeNums = (w.numbers || []).filter(n => n.status !== 'frozen');
                            const preferred = activeNums.find(n => n.isPrimary) || activeNums[0];
                            if (preferred) {
                              setPaymentWalletNumberId(preferred.id);
                              setPaymentReceivedPhone(preferred.phoneNumber);
                            } else {
                              setPaymentWalletNumberId('');
                              setPaymentReceivedPhone(w.accountNumber || '');
                            }
                          }
                        }}
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                      >
                        <optgroup label="💼 محافظ التشغيل والاستقبال">
                          {operatingWallets
                            .filter(w => !w.isFrozen)
                            .map(w => (
                              <option key={w.id} value={w.id}>
                                {w.name} (الرصيد: {formatCurrency(w.balance, w.currency)})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Sub-number / Receiving Phone Select */}
                    <div>
                      <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">رقم/خط الاستقبال المحول عليه *</label>
                      <select
                        value={paymentWalletNumberId || activeNumber?.id || paymentReceivedPhone || ''}
                        onChange={e => {
                          const targetVal = e.target.value;
                          const num = availableNumbers.find(n => n.id === targetVal || n.phoneNumber === targetVal);
                          if (num) {
                            setPaymentWalletNumberId(num.id);
                            setPaymentReceivedPhone(num.phoneNumber);
                          } else if (targetVal) {
                            setPaymentWalletNumberId('');
                            setPaymentReceivedPhone(targetVal);
                          }
                        }}
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none"
                      >
                        {availableNumbers.filter(n => n.status !== 'frozen').length > 0 ? (
                          availableNumbers
                            .filter(n => n.status !== 'frozen')
                            .map(n => (
                              <option key={n.id || n.phoneNumber} value={n.id || n.phoneNumber}>
                                {n.phoneNumber} {n.accountHolderName ? `— ${n.accountHolderName}` : ''} {n.isPrimary ? '⭐ (المفضل)' : ''}
                              </option>
                            ))
                        ) : (
                          <option value={selectedW?.accountNumber || ''}>{selectedW?.accountNumber || 'رقم الحساب الافتراضي'}</option>
                        )}
                      </select>
                    </div>

                    {/* Gateway */}
                    <div>
                      <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">وسيلة الدفع (Gateway)</label>
                      <select
                        value={paymentGateway}
                        onChange={e => setPaymentGateway(e.target.value)}
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                      >
                        <option value="Vodafone Cash">Vodafone Cash (فودافون كاش)</option>
                        <option value="InstaPay">InstaPay (إنستاباي)</option>
                        <option value="Orange Cash">Orange Cash (أورنج كاش)</option>
                        <option value="Etisalat Cash">Etisalat Cash (اتصالات كاش)</option>
                        <option value="WE Pay">WE Pay (وي باي)</option>
                        <option value="Bank Transfer">تحويل بنكي (Bank Transfer)</option>
                        <option value="USDT">USDT (محفظة كريبتو)</option>
                        <option value="Cash">كاش نقدي في المتجر</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Input
                        label="رقم الهاتف المحول منه (المصدر)"
                        placeholder="رقم المحفظة التي حولت..."
                        value={senderPhoneNumber}
                        onChange={e => setSenderPhoneNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <Input
                        label="الرقم المرجعي / رقم التحويل المالي (اختياري)"
                        placeholder="رقم العملية / المرجع المالي الفريد (إن وجد)..."
                        value={transferReferenceNumber}
                        onChange={e => setTransferReferenceNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <Input
                        label="المبلغ المستلم فعلياً (جنيه)"
                        type="number"
                        placeholder={finalRequiredCash.toString()}
                        value={receivedAmount || ''}
                        onChange={e => setReceivedAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 6. Ticket Notes */}
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1 text-xs">
                ملاحظات التذكرة والطلب (تظهر في الفاتورة والتفاصيل)
              </label>
              <textarea
                rows={2}
                placeholder="مثال: العميل طلب شحن سريع، تأكيد استلام، ملاحظة موظف..."
                value={ticketNotes}
                onChange={e => setTicketNotes(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none text-xs"
              />
            </div>

            {/* Live Financial Summary Bar */}
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold flex-wrap gap-2">
                <span className="text-zinc-700 dark:text-zinc-300">إجمالي المنتجات: {totalProductsPrice} ج</span>
                {appliedCouponDiscount > 0 && <span className="text-amber-500">خصم الكوبون: -{appliedCouponDiscount} ج</span>}
                {effectiveCashbackUsed > 0 && <span className="text-emerald-500">كاش باك مستخدم: -{effectiveCashbackUsed} ج</span>}
                {effectiveReferralUsed > 0 && <span className="text-purple-400">إحالة مستخدم: -{effectiveReferralUsed} ج</span>}
                {effectiveCreditUsed > 0 && <span className="text-blue-400">رصيد دائن: -{effectiveCreditUsed} ج</span>}
              </div>

              {/* Automatic Live Profit & Deductions Breakdown Strip */}
              <div className="p-2.5 rounded-xl bg-black/25 border border-white/5 space-y-1.5 font-mono text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-400">
                  <div>
                    <span>تكلفة FIFO:</span>
                    <strong className="text-zinc-200 block">{totalProductsCost} ج</strong>
                  </div>
                  <div>
                    <span>الكاش باك ({resolvedCustomerCashbackRate}%):</span>
                    <strong className="text-amber-400 block">-{totalItemCashback} ج</strong>
                  </div>
                  <div>
                    <span>{hasValidReferrer ? `عمولة الإحالة (${effectiveTicketReferralPercent}%):` : 'بدل إحالة للأرباح:'}</span>
                    <strong className={`block ${hasValidReferrer ? 'text-purple-400' : 'text-emerald-400'}`}>
                      {hasValidReferrer ? `-${totalItemReferral} ج` : `+${totalItemReferral} ج (أرباح)`}
                    </strong>
                  </div>
                  <div>
                    <span>مصاريف التشغيل:</span>
                    <strong className="text-zinc-300 block">-{totalOperatingExpenses} ج</strong>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between font-bold">
                  <div className={`flex items-center gap-1.5 ${totalProfitMargin < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    <span>{totalProfitMargin < 0 ? '🔻 صافي الخسارة الفعلي:' : '💰 صافي الربح الفعلي:'}</span>
                    <strong className="font-mono text-sm">{totalProfitMargin > 0 ? `+${totalProfitMargin}` : totalProfitMargin} ج</strong>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {hasValidReferrer ? 'الربح = البيع - FIFO - الكاش باك - الإحالة - التشغيل' : 'الربح = البيع - FIFO - الكاش باك - التشغيل (شاملاً بدل الإحالة)'}
                  </div>
                </div>
              </div>

              {/* Management Loss Alert Banner (Rule 4) */}
              {(totalProductsPrice < totalProductsCost || totalProfitMargin < 0) && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-bold space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>⚠️ تنبيه للإدارة: سعر البيع الحالي أقل من تكلفة المنتج الفعلية (FIFO).</span>
                  </div>
                  <div className="text-[11px] font-normal text-rose-300">
                    سيتم تسجيل هذه العملية بخسارة قدرها: <strong className="font-mono font-bold text-white underline">{Math.abs(Math.round(totalProfitMargin * 100) / 100)} جنيه</strong>. النظام لا يمنع البيع وسيتم قيد الخسارة في التقارير والمالية.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-orange-500/20 font-black text-sm">
                <span className="text-orange-500 font-bold text-xs">المبلغ الصافي المطلوب تحصيله:</span>
                <strong className="font-mono text-base text-orange-500">{finalRequiredCash} ج.م</strong>
              </div>

              {overpaymentExcess > 0 && (
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs font-mono flex items-center justify-between">
                  <span>فائض دفع (زيادة مستلمة): +{overpaymentExcess} ج</span>
                  <span>تضاف تلقائياً إلى رصيد العميل الدائن</span>
                </div>
              )}

              {shortageDebit > 0 && (
                <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 font-bold text-xs font-mono flex items-center justify-between">
                  <span>عجز دفع (مبلغ ناقص): -{shortageDebit} ج</span>
                  <span>تسجل تلقائياً كرصيد مدين على العميل</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewTicketModalOpen(false);
                  setEditingTicket(null);
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" variant="primary" icon={<CheckCircle2 className="w-4 h-4" />}>
                {editingTicket ? 'حفظ تعديلات التذكرة والفاتورة' : 'إنشاء تذكرة الشحن والفاتورة'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* ➕ QUICK REGISTER CUSTOMER / DEALER POPUP */}
      {/* ============================================================= */}
      {isQuickAddCustomerOpen && (
        <Modal
          isOpen={isQuickAddCustomerOpen}
          onClose={() => {
            setIsQuickAddCustomerOpen(false);
            setNewCustNotes('');
          }}
          title={department === 'dealers' ? 'تسجيل تاجر جديد سريع' : 'تسجيل عميل جديد سريع'}
          subtitle={department === 'dealers' ? 'إنشاء بروفايل تاجر سريع ومتابعة إنشاء التذكرة فوراً' : 'إنشاء بروفايل سريع ومتابعة إنشاء التذكرة فوراً'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveQuickCustomer} className="space-y-4 text-right text-xs">
            <Input
              label={department === 'dealers' ? 'رقم هاتف التاجر (تم تثبيته) *' : 'رقم الهاتف (تم تثبيته) *'}
              value={customerPhone}
              disabled
            />

            <Input
              label={department === 'dealers' ? 'اسم التاجر / المحل التجاري *' : 'اسم العميل الكامل *'}
              placeholder={department === 'dealers' ? 'مثال: متجر النور / أحمد التاجر' : 'مثال: عمر محمد إبراهيم'}
              value={newCustName}
              onChange={e => setNewCustName(e.target.value)}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  {department === 'dealers' ? 'تصنيف التاجر' : 'نوع البروفايل'}
                </label>
                {department === 'dealers' ? (
                  <select
                    value={newCustProfileType}
                    onChange={e => setNewCustProfileType(e.target.value as any)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="distributor">📦 موزع معتمد</option>
                    <option value="shop">🏪 متجر / كشك شحن</option>
                    <option value="agent">🤝 وكيل ألعاب</option>
                    <option value="vip_dealer">⭐ تاجر VIP</option>
                    <option value="regular">👤 تاجر عادي</option>
                  </select>
                ) : (
                  <select
                    value={newCustProfileType}
                    onChange={e => setNewCustProfileType(e.target.value as any)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="regular">👤 عميل عادي</option>
                    <option value="partner">🤝 شريك (Partner)</option>
                    <option value="shop">🏪 محل (Shop)</option>
                    <option value="influencer">⭐ مشهور (Influencer)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  {department === 'dealers' ? 'مصدر التاجر' : 'مصدر العميل'}
                </label>
                <select
                  value={newCustSource}
                  onChange={e => setNewCustSource(e.target.value as any)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="whatsapp">واتساب (WhatsApp)</option>
                  <option value="facebook">فيسبوك (Facebook)</option>
                  <option value="tiktok">تيك توك (TikTok)</option>
                  <option value="telegram">تيليجرام (Telegram)</option>
                  <option value="word_of_mouth">سمع عنا (توصية)</option>
                </select>
              </div>
            </div>

            <Input
              label="كود الإحالة للمُحيل (اختياري)"
              placeholder="كود المُحيل إن وجد..."
              value={newCustReferralCode}
              onChange={e => setNewCustReferralCode(e.target.value.toUpperCase())}
            />

            <Input
              type="date"
              label="تاريخ الميلاد (اختياري)"
              value={newCustBirthDate}
              onChange={e => setNewCustBirthDate(e.target.value)}
            />

            {/* ملاحظات التسجيل السريع */}
            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                {department === 'dealers' ? 'ملاحظات التاجر (اختياري)' : 'ملاحظات العميل (اختياري)'}
              </label>
              <textarea
                rows={2}
                placeholder={department === 'dealers' ? 'اكتب أي ملاحظات خاصة بالتاجر (شروط دفع، مواعيد، ملاحظات تسليم...)' : 'اكتب أي ملاحظات خاصة بالعميل (تفضيلات شحن، تنبيهات، تفاصيل حساب...)'}
                value={newCustNotes}
                onChange={e => setNewCustNotes(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-xs outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => {
                setIsQuickAddCustomerOpen(false);
                setNewCustNotes('');
              }}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" icon={<UserPlus className="w-4 h-4" />}>
                حفظ وإنشاء البروفايل
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 🧩 SUB-MODALS (COUPON, CUSTOMER, DEPOSIT, BUDGET, ETC.) */}
      {/* ============================================================= */}
      {isCouponCheckerOpen && (
        <CouponCheckerModal
          isOpen={isCouponCheckerOpen}
          onClose={() => setIsCouponCheckerOpen(false)}
        />
      )}

      {isCustomerInspectorOpen && (
        <CustomerInspectorModal
          isOpen={isCustomerInspectorOpen}
          onClose={() => setIsCustomerInspectorOpen(false)}
          onOpenCustomerProfile={cust => setSelectedProfileCustomer(cust)}
        />
      )}

      {isDepositNumbersOpen && (
        <DepositNumbersModal
          isOpen={isDepositNumbersOpen}
          onClose={() => setIsDepositNumbersOpen(false)}
        />
      )}

      {isDepositVoucherOpen && (
        <DepositVoucherModal
          isOpen={isDepositVoucherOpen}
          onClose={() => setIsDepositVoucherOpen(false)}
          onSuccess={loadData}
        />
      )}

      {isBudgetHunterOpen && (
        <BudgetHunterModal
          isOpen={isBudgetHunterOpen}
          onClose={() => setIsBudgetHunterOpen(false)}
        />
      )}

      {isShiftSettlementOpen && (
        <ShiftSettlementModal
          isOpen={isShiftSettlementOpen}
          onClose={() => {
            setIsShiftSettlementOpen(false);
            loadData();
          }}
          initialMode={shiftSettlementMode}
          department={department}
        />
      )}

      {problemTargetTicket && (
        <TicketProblemModal
          isOpen={!!problemTargetTicket}
          onClose={() => setProblemTargetTicket(null)}
          ticket={problemTargetTicket}
          onUpdated={loadData}
          initialTab={problemModalInitialTab}
        />
      )}

      {refundTargetTicket && (
        <TicketRefundModal
          isOpen={!!refundTargetTicket}
          onClose={() => setRefundTargetTicket(null)}
          ticket={refundTargetTicket}
          onUpdated={loadData}
        />
      )}

      {selectedProfileCustomer && (
        <CustomerProfileModal
          isOpen={!!selectedProfileCustomer}
          onClose={() => setSelectedProfileCustomer(null)}
          customer={selectedProfileCustomer}
          onCustomerUpdated={loadData}
        />
      )}

      {selectedTicketSnapshot && (
        <PricingBreakdownModal
          isOpen={!!selectedTicketSnapshot}
          onClose={() => setSelectedTicketSnapshot(null)}
          snapshot={selectedTicketSnapshot.snapshot}
          title={selectedTicketSnapshot.title}
        />
      )}

      {/* Rating Modal */}
      {ratingTicket && (
        <Modal
          isOpen={!!ratingTicket}
          onClose={() => setRatingTicket(null)}
          title={`⭐ تقييم رضا العميل للتذكرة #${ratingTicket.ticketNumber}`}
          subtitle="تسجيل تقييم رضا العميل وملاحظات الجودة"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center text-xs">
            <div className="flex items-center justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  className="p-1.5 transition-transform hover:scale-125 cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${selectedStars >= star ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'
                      }`}
                  />
                </button>
              ))}
            </div>

            <Input
              label="ملاحظات العميل ورأيه (اختياري)"
              placeholder="مثال: سرعة ممتازة، خدمة عملاء رائعة..."
              value={ratingFeedback}
              onChange={e => setRatingFeedback(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setRatingTicket(null)}>
                إلغاء
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveRating}>
                حفظ التقييم
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delivery Confirmation WhatsApp Dialog Post-Creation */}
      {completedTicketInfo && (
        <Modal
          isOpen={!!completedTicketInfo}
          onClose={() => setCompletedTicketInfo(null)}
          title="✨ تم إنشاء التذكرة بنجاح"
          subtitle={`رقم التذكرة: #${completedTicketInfo.ticket.ticketNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>تم تسجيل الطلب وتحديث أرصدة العميل بنجاح في قاعدة البيانات.</span>
            </div>

            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                نص رسالة الواتساب الجاهزة للإرسال:
              </label>
              <pre className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] font-sans text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-all">
                {completedTicketInfo.message}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<ImageIcon className="w-4 h-4 text-amber-500" />}
                  className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 font-bold"
                  onClick={() => handleQuickCopyInvoiceImage(completedTicketInfo.ticket)}
                >
                  {completedTicketInfo.ticket.isReservation || completedTicketInfo.ticket.operationMode === 'reservation'
                    ? 'نسخ إيصال الحجز كـ صورة 🖼️'
                    : 'نسخ الفاتورة كـ صورة 🖼️'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={() => {
                    setPrintingTicket(completedTicketInfo.ticket);
                    setCompletedTicketInfo(null);
                  }}
                >
                  {completedTicketInfo.ticket.isReservation || completedTicketInfo.ticket.operationMode === 'reservation'
                    ? 'إصدار إيصال الحجز 🧾'
                    : 'طباعة الفاتورة'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCompletedTicketInfo(null)}>
                  إغلاق
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    const clean = completedTicketInfo.ticket.customerPhone.replace(/[^0-9]/g, '');
                    const phone = clean.startsWith('0') ? '2' + clean : clean;
                    window.open(
                      `https://wa.me/${phone}?text=${encodeURIComponent(completedTicketInfo.message)}`,
                      '_blank'
                    );
                    setCompletedTicketInfo(null);
                  }}
                >
                  {completedTicketInfo.ticket.isReservation || completedTicketInfo.ticket.operationMode === 'reservation'
                    ? 'إرسال إيصال الحجز عبر واتساب'
                    : 'إرسال للعميل عبر واتساب'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 🧾 TICKET INVOICE & RECEIPT MODAL */}
      {/* ============================================================= */}
      {printingTicket && (
        <PrintInvoiceModal
          isOpen={!!printingTicket}
          onClose={() => setPrintingTicket(null)}
          ticket={printingTicket}
        />
      )}

      {/* ============================================================= */}
      {/* 💼 WALLET FULL PROFILE MODAL */}
      {/* ============================================================= */}
      {selectedWalletForProfile && (
        <WalletProfileModal
          isOpen={isWalletProfileOpen}
          onClose={() => {
            setIsWalletProfileOpen(false);
            setSelectedWalletForProfile(null);
          }}
          walletId={selectedWalletForProfile.id}
          department={department}
          onWalletUpdated={loadData}
          onOpenEditModal={(w) => {
            setWalletToEdit(w);
            setIsWalletFormOpen(true);
          }}
        />
      )}

      {/* ============================================================= */}
      {/* 💰 ZERO / TRANSFER PROFIT WALLET MODAL */}
      {/* ============================================================= */}
      <ZeroProfitWalletModal
        isOpen={isZeroProfitModalOpen}
        onClose={() => setIsZeroProfitModalOpen(false)}
        currentBalance={wallets.find(w => w.id === 'w_profits')?.balance || 0}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ============================================================= */}
      {/* ➕ ADD / EDIT WALLET MODAL */}
      {/* ============================================================= */}
      {isWalletFormOpen && (
        <WalletFormModal
          isOpen={isWalletFormOpen}
          onClose={() => {
            setIsWalletFormOpen(false);
            setWalletToEdit(null);
          }}
          walletToEdit={walletToEdit}
          onSaved={loadData}
        />
      )}



      {/* ============================================================= */}
      {/* 📅 RESERVATION & SCHEDULED DELIVERY MANAGER MODAL */}
      {/* ============================================================= */}
      {isReservationsDueModalOpen && (
        <ReservationActionsModal
          isOpen={isReservationsDueModalOpen}
          onClose={() => setIsReservationsDueModalOpen(false)}
          dueTickets={allReservations}
          onTicketsUpdated={loadData}
        />
      )}

      {/* ============================================================= */}
      {/* 🔍 COMPREHENSIVE TICKET DETAILS MODAL (Customers & Dealers)   */}
      {/* ============================================================= */}
      {selectedDetailsTicket && (
        <TicketDetailsModal
          isOpen={!!selectedDetailsTicket}
          onClose={() => setSelectedDetailsTicket(null)}
          ticket={selectedDetailsTicket}
          department={department}
          onUpdateTicket={(updated) => {
            setSelectedDetailsTicket(updated);
            loadData();
          }}
          onEditTicket={(tkt) => {
            setSelectedDetailsTicket(null);
            handleOpenEditTicket(tkt);
          }}
          onPrintTicket={(tkt) => {
            setSelectedDetailsTicket(null);
            setPrintingTicket(tkt);
          }}
          onCopyInvoiceImage={(tkt) => {
            handleQuickCopyInvoiceImage(tkt);
          }}
        />
      )}

      {/* ============================================================= */}
      {/* ✏️ TICKET EDIT MODAL (WITH AUDIT LOG & UNIQUE REFERENCE)       */}
      {/* ============================================================= */}
      {ticketToEdit && (
        <TicketEditModal
          isOpen={!!ticketToEdit}
          onClose={() => setTicketToEdit(null)}
          ticket={ticketToEdit}
          department={department}
          onTicketUpdated={(_updated) => {
            setTicketToEdit(null);
            loadData();
          }}
        />
      )}

      {/* ============================================================= */}
      {/* 🗑️ DELETED TICKETS ARCHIVE & RESTORE MODAL                    */}
      {/* ============================================================= */}
      {isDeletedTicketsModalOpen && (
        <DeletedTicketsModal
          isOpen={isDeletedTicketsModalOpen}
          onClose={() => setIsDeletedTicketsModalOpen(false)}
          onTicketRestored={() => loadData()}
        />
      )}

    </div>
  );
};
