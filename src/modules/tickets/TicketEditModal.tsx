import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import {
  CustomerTicket,
  TicketLifecycleStatus,
  TicketHistoryLogItem,
  TicketItem
} from '../../types/customer.types';
import { GameTreeItem, GameProduct, StoreWallet } from '../../types/topup.types';
import { JKRWalletEngine } from '../../services/financial/jkrWalletEngine';
import { PricingEngine } from '../../services/pricing/pricingEngine';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { CustomerSource } from '../../types/customer.types';
import { PlatformSourceSelector } from '../../components/common/PlatformSourceSelector';
import {
  Edit3,
  User,
  Phone,
  Gamepad2,
  Wallet,
  Hash,
  FileText,
  Activity,
  AlertCircle,
  Package,
  Layers,
  DollarSign,
  Calculator,
  Coins,
  ShieldCheck,
  Tag,
  CreditCard
} from 'lucide-react';

interface TicketEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CustomerTicket | null;
  department?: 'customers' | 'dealers';
  onTicketUpdated?: (updated: CustomerTicket) => void;
}

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  isOpen,
  onClose,
  ticket,
  department,
  onTicketUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Basic Details
  const [playerGameId, setPlayerGameId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TicketLifecycleStatus>('new');
  const [platformSource, setPlatformSource] = useState<CustomerSource>('whatsapp');

  // Game, Section, Product & Quantity
  const [games, setGames] = useState<GameTreeItem[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Financial fields
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [paymentGateway, setPaymentGateway] = useState('Vodafone Cash');
  const [paymentWalletId, setPaymentWalletId] = useState('');
  const [paymentWallet, setPaymentWallet] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [referralPercentInput, setReferralPercentInput] = useState<string>('0');

  // Reference lists
  const [wallets, setWallets] = useState<StoreWallet[]>([]);

  useEffect(() => {
    const allGames = db.getGameTree();
    setGames(allGames);
    const storeWallets = db.getStoreWallets().filter(w => !w.isFrozen);
    setWallets(storeWallets);

    if (ticket) {
      setPlayerGameId(ticket.playerGameId || '');
      setCustomerName(ticket.customerName || '');
      setCustomerPhone(ticket.customerPhone || '');
      setReferenceNumber(ticket.referenceNumber || '');
      setNotes(ticket.notes || '');
      setStatus(ticket.status || 'new');
      setPlatformSource(ticket.platformSource || 'whatsapp');
      setPaymentGateway(ticket.paymentGateway || 'Vodafone Cash');
      setPaymentWalletId(ticket.paymentWalletId || '');
      setPaymentWallet(ticket.paymentWallet || '');
      setReceivedAmount(ticket.receivedAmount || ticket.requiredAmount || 0);
      setDiscountAmount(ticket.couponDiscountAmount || 0);
      setCouponCode(ticket.couponCode || '');

      // Restore snapshot referral percentage from the ticket
      const savedRate = ticket.referralPercent !== undefined
        ? ticket.referralPercent
        : ticket.referralPercentage !== undefined
          ? ticket.referralPercentage
          : (ticket.items?.[0]?.referralPercent !== undefined
              ? ticket.items[0].referralPercent
              : (ticket.referralCommissionEarned && ticket.requiredAmount ? Math.round((ticket.referralCommissionEarned / ticket.requiredAmount) * 1000) / 10 : 0));
      setReferralPercentInput(String(savedRate));

      const primaryItem = ticket.items?.[0];
      if (primaryItem) {
        setSelectedGameId(primaryItem.gameId || '');
        setSelectedSectionId(primaryItem.sectionId || '');
        setSelectedProductId(primaryItem.productId || '');
        setQuantity(primaryItem.quantity || 1);
        setUnitPrice(primaryItem.unitPrice || 0);
      } else {
        // Fallback search by gameName
        const matchedG = allGames.find(g => g.name === ticket.gameName);
        if (matchedG) {
          setSelectedGameId(matchedG.id);
          const matchedP = (matchedG.products || []).find(p => p.name === ticket.gameProductName);
          if (matchedP) {
            setSelectedSectionId(matchedP.sectionId || '');
            setSelectedProductId(matchedP.id);
            setUnitPrice(matchedP.calculatedPriceEGP || matchedP.customSellingPriceEGP || 0);
          }
        }
        setQuantity(1);
        setUnitPrice(ticket.totalProductsAmount || 0);
      }
    }
  }, [ticket, isOpen]);

  // Game & Section & Product Selections
  const selectedGame = useMemo(() => games.find(g => g.id === selectedGameId), [games, selectedGameId]);
  const availableSections = useMemo(() => selectedGame?.sections || [], [selectedGame]);

  const availableProducts = useMemo(() => {
    if (!selectedGame) return [];
    if (selectedSectionId) {
      return (selectedGame.products || []).filter(p => p.sectionId === selectedSectionId);
    }
    return selectedGame.products || [];
  }, [selectedGame, selectedSectionId]);

  const selectedProduct = useMemo(() => {
    if (!selectedGame) return undefined;
    return (selectedGame.products || []).find(p => p.id === selectedProductId);
  }, [selectedGame, selectedProductId]);

  // Customer or Dealer context
  const customer = useMemo(() => {
    if (!ticket) return null;
    return db.getCustomerById(ticket.customerId)
      || db.getCustomers(true).find(c => c.phone === ticket.customerPhone)
      || db.getDealers().find(d => d.id === ticket.customerId || d.phone === ticket.customerPhone)
      || null;
  }, [ticket]);

  // Resolved Customer / Dealer Cashback Rate from Profile
  const resolvedCustomerCashbackRate = useMemo(() => {
    if (customer?.cashbackRate !== undefined && customer?.cashbackRate !== null) {
      const parsed = Number(customer.cashbackRate);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    const isDealerTicket = ticket?.department === 'dealers';
    return isDealerTicket ? 0.5 : 1.0;
  }, [customer, ticket]);

  const pricingConfig = useMemo(() => PricingEngine.getPricingConfig(), []);

  // 3. Live Points Sufficiency Validation
  const pointsValidation = useMemo(() => {
    if (!selectedProduct) {
      return { isInsufficient: false, pointsNeeded: 0, availablePoints: 0, walletName: '', hasPointsCost: false };
    }
    const pts = selectedProduct.pointsCostPerUnit || 0;
    const needed = pts * (quantity || 1);
    if (pts <= 0) {
      return { isInsufficient: false, pointsNeeded: 0, availablePoints: 0, walletName: '', hasPointsCost: false };
    }

    // If ticket has already deducted stock for this exact wallet, credit back old points for check
    const prevConsumedPoints = (ticket?.stockDeducted && ticket?.items?.[0]?.productId === selectedProduct.id)
      ? (ticket?.items?.[0]?.consumedPoints || 0)
      : 0;

    const wId = selectedProduct.primaryWalletId || selectedProduct.walletTypeId;
    let avail = 0;
    let wName = '';

    if (wId) {
      const jkrW = JKRWalletEngine.getWalletById(wId);
      if (jkrW) {
        avail = (jkrW.pointsBalance ?? 0) + prevConsumedPoints;
        wName = jkrW.name;
      } else {
        const stW = wallets.find(w => w.id === wId);
        if (stW && stW.pointsBalance !== undefined) {
          avail = stW.pointsBalance + prevConsumedPoints;
          wName = stW.name;
        }
      }
    }

    return {
      isInsufficient: needed > avail,
      pointsNeeded: needed,
      availablePoints: avail,
      walletName: wName,
      hasPointsCost: true
    };
  }, [selectedProduct, quantity, ticket, wallets]);

  const maxEditQuantity = 999999;

  // Live Recalculations: FIFO, Operating, Cashback, Referral, Net Profit
  const calculations = useMemo(() => {
    const totalSale = Math.round(((unitPrice || 0) * (quantity || 1)) * 100) / 100;
    const netSale = Math.max(0, totalSale - (discountAmount || 0));

    // FIFO Cost
    let fifoCost = 0;
    if (selectedProduct) {
      const wId = selectedProduct.primaryWalletId || selectedProduct.walletTypeId;
      const pts = (selectedProduct.pointsCostPerUnit || 0) * (quantity || 1);
      if (wId && pts > 0) {
        const costRes = JKRWalletEngine.getWalletEffectivePointCost(wId, pts);
        fifoCost = Math.round(costRes.totalCostEGP * 100) / 100;
      } else {
        const unitCost = selectedProduct.costPriceEGP || ((selectedProduct.costUSD || 0) * 50);
        fifoCost = Math.round((unitCost * (quantity || 1)) * 100) / 100;
      }
    }

    // Operating Expenses
    const fixedCostPerUnit = selectedProduct?.fixedCostPerOrder !== undefined
      ? selectedProduct.fixedCostPerOrder
      : (pricingConfig.manualFixedCostEGP || 5);
    const operatingExpenses = Math.round((fixedCostPerUnit * (quantity || 1)) * 100) / 100;

    // Cashback: strictly use customer profile cashbackRate (if enabled on game and product)
    const isCbEligible = selectedGame?.cashbackEnabled !== false &&
      selectedProduct?.isCashbackEnabled !== false;
    const cbPercent = isCbEligible
      ? (selectedProduct?.cashbackPercent !== undefined && selectedProduct?.cashbackPercent > 0
          ? selectedProduct.cashbackPercent
          : resolvedCustomerCashbackRate)
      : 0;
    const cashback = isCbEligible ? Math.round(((netSale * cbPercent) / 100) * 100) / 100 : 0;

    // Referral: strictly lower of client rate vs product rate for company benefit
    const parsedRef = parseFloat(referralPercentInput);
    const refPercent = !isNaN(parsedRef) && parsedRef >= 0 ? parsedRef : 0;
    const isRefEligible = selectedGame?.referralEnabled !== false &&
      selectedProduct?.isReferralEnabled !== false;
    const prodRefLimit = selectedProduct?.partnerCommissionPercent !== undefined && selectedProduct?.partnerCommissionPercent !== null
      ? Number(selectedProduct.partnerCommissionPercent)
      : (pricingConfig.referralPercent ?? 2.0);
    const effectiveRefPercent = isRefEligible ? Math.min(refPercent, prodRefLimit) : 0;
    const rawReferral = isRefEligible ? Math.round(((netSale * (effectiveRefPercent / 100))) * 100) / 100 : 0;

    const hasReferrer = db.hasValidReferrer(ticket?.customerId || ticket?.customerPhone || customer?.id || customer?.phone, ticket?.department);
    const referral = hasReferrer ? rawReferral : 0;
    const referralAllowance = !hasReferrer ? rawReferral : 0;

    // Strict Formula: Net Profit = Sale Price - FIFO Cost - Cashback - Referral - Operating Expenses
    // When customer has no referrer, referral converts to profit as "بدل إحالة" and is NOT deducted from profit
    const netProfit = Math.round((netSale - fifoCost - cashback - referral - operatingExpenses) * 100) / 100;

    return {
      totalSale,
      netSale,
      fifoCost,
      operatingExpenses,
      cashback,
      referral,
      referralAllowance,
      hasReferrer,
      netProfit,
      refPercent: effectiveRefPercent,
      cbPercent
    };
  }, [unitPrice, quantity, discountAmount, selectedProduct, selectedGame, customer, referralPercentInput, resolvedCustomerCashbackRate, ticket]);

  if (!ticket) return null;

  const handleGameChange = (gId: string) => {
    setSelectedGameId(gId);
    setSelectedSectionId('');
    setSelectedProductId('');
    const g = games.find(item => item.id === gId);
    if (g && g.products && g.products.length > 0) {
      const firstP = g.products[0];
      setSelectedProductId(firstP.id);
      setSelectedSectionId(firstP.sectionId || '');
      setUnitPrice(firstP.calculatedPriceEGP || firstP.customSellingPriceEGP || 0);
    } else {
      setUnitPrice(0);
    }
  };

  const handleSectionChange = (sId: string) => {
    setSelectedSectionId(sId);
    if (selectedGame) {
      const prods = sId ? (selectedGame.products || []).filter(p => p.sectionId === sId) : (selectedGame.products || []);
      if (prods.length > 0 && !prods.some(p => p.id === selectedProductId)) {
        handleProductChange(prods[0].id);
      }
    }
  };

  const handleProductChange = (pId: string) => {
    setSelectedProductId(pId);
    if (selectedGame) {
      const p = selectedGame.products?.find(prod => prod.id === pId);
      if (p) {
        if (p.sectionId) setSelectedSectionId(p.sectionId);
        setUnitPrice(p.calculatedPriceEGP || p.customSellingPriceEGP || 0);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerPhone.trim()) {
      showToast('error', 'خطأ في الإدخال', 'رقم الهاتف مطلوب');
      return;
    }

    if (quantity < 1) {
      showToast('error', 'خطأ في الكمية', 'الكمية يجب أن تكون 1 على الأقل');
      return;
    }

    // Points sufficiency alert (informational - does not block edit)
    if (pointsValidation.isInsufficient) {
      showToast(
        'warning',
        'تنبيه رصيد النقاط',
        `رصيد المحفظة [${pointsValidation.walletName || ''}] أقل من المطلوب (المتاح: ${pointsValidation.availablePoints.toLocaleString()} | المطلوب: ${pointsValidation.pointsNeeded.toLocaleString()}). سيتم السحب بالسالب تحت حد الأمان.`
      );
    }

    // Unique Reference Number check across all tickets (Customers & Dealers)
    const cleanRef = referenceNumber.trim();
    if (cleanRef) {
      const allTickets = [...db.getTickets(), ...db.getDealerTickets()];
      const isDuplicate = allTickets.some(
        t => t.id !== ticket.id && (
          (t.referenceNumber && t.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase()) ||
          (t.transferReferenceNumber && t.transferReferenceNumber.trim().toLowerCase() === cleanRef.toLowerCase())
        )
      );
      if (isDuplicate) {
        showToast('error', '⛔ الرقم المرجعي مكرر', 'الرقم المرجعي مستخدم بالفعل في تذكرة أخرى ولا يمكن تكراره.');
        return;
      }
    }

    // Track Diffs for Audit Log
    const previousState: Record<string, any> = {};
    const newState: Record<string, any> = {};
    const diffDescriptions: string[] = [];

    const prevItem = ticket.items?.[0];

    if (ticket.playerGameId !== playerGameId.trim()) {
      previousState.playerGameId = ticket.playerGameId;
      newState.playerGameId = playerGameId.trim();
      diffDescriptions.push(`معرف اللاعب: "${ticket.playerGameId}" ➔ "${playerGameId.trim()}"`);
    }

    if (ticket.customerName !== customerName.trim()) {
      previousState.customerName = ticket.customerName;
      newState.customerName = customerName.trim();
      diffDescriptions.push(`اسم العميل: "${ticket.customerName}" ➔ "${customerName.trim()}"`);
    }

    if (ticket.customerPhone !== customerPhone.trim()) {
      previousState.customerPhone = ticket.customerPhone;
      newState.customerPhone = customerPhone.trim();
      diffDescriptions.push(`رقم الهاتف: "${ticket.customerPhone}" ➔ "${customerPhone.trim()}"`);
    }

    if (selectedGame && selectedGame.name !== ticket.gameName) {
      previousState.gameName = ticket.gameName;
      newState.gameName = selectedGame.name;
      diffDescriptions.push(`اللعبة: "${ticket.gameName}" ➔ "${selectedGame.name}"`);
    }

    if (selectedProduct && selectedProduct.name !== ticket.gameProductName) {
      previousState.productName = ticket.gameProductName;
      newState.productName = selectedProduct.name;
      diffDescriptions.push(`المنتج: "${ticket.gameProductName}" ➔ "${selectedProduct.name}"`);
    }

    const prevQty = prevItem?.quantity || 1;
    if (prevQty !== quantity) {
      previousState.quantity = prevQty;
      newState.quantity = quantity;
      diffDescriptions.push(`الكمية: ${prevQty} ➔ ${quantity}`);
    }

    const prevUnitP = prevItem?.unitPrice || 0;
    if (prevUnitP !== unitPrice) {
      previousState.unitPrice = prevUnitP;
      newState.unitPrice = unitPrice;
      diffDescriptions.push(`سعر الوحدة: ${prevUnitP} ج ➔ ${unitPrice} ج`);
    }

    if ((ticket.couponDiscountAmount || 0) !== discountAmount) {
      previousState.discount = ticket.couponDiscountAmount || 0;
      newState.discount = discountAmount;
      diffDescriptions.push(`الخصم: ${ticket.couponDiscountAmount || 0} ج ➔ ${discountAmount} ج`);
    }

    if (ticket.paymentWallet !== paymentWallet || (ticket.paymentWalletId && ticket.paymentWalletId !== paymentWalletId)) {
      previousState.paymentWallet = ticket.paymentWallet;
      newState.paymentWallet = paymentWallet;
      diffDescriptions.push(`محفظة الاستلام: "${ticket.paymentWallet}" ➔ "${paymentWallet}"`);
    }

    if ((ticket.receivedAmount || 0) !== receivedAmount) {
      previousState.receivedAmount = ticket.receivedAmount || 0;
      newState.receivedAmount = receivedAmount;
      diffDescriptions.push(`المبلغ المستلم: ${ticket.receivedAmount || 0} ج ➔ ${receivedAmount} ج`);
    }

    if ((ticket.referenceNumber || '') !== cleanRef) {
      previousState.referenceNumber = ticket.referenceNumber || '';
      newState.referenceNumber = cleanRef;
      diffDescriptions.push(`الرقم المرجعي: "${ticket.referenceNumber || 'فارغ'}" ➔ "${cleanRef || 'فارغ'}"`);
    }

    if ((ticket.notes || '') !== notes.trim()) {
      previousState.notes = ticket.notes || '';
      newState.notes = notes.trim();
      diffDescriptions.push('تعديل الملاحظات');
    }

    if (ticket.status !== status) {
      previousState.status = ticket.status;
      newState.status = status;
      diffDescriptions.push(`الحالة: "${ticket.status}" ➔ "${status}"`);
    }

    if (diffDescriptions.length === 0) {
      showToast('info', 'لا توجد تغييرات', 'لم تقم بتعديل أي بيانات');
      onClose();
      return;
    }

    const editorName = user?.fullName || user?.username || 'المسؤول';
    const now = new Date().toISOString();

    const historyItem: TicketHistoryLogItem = {
      id: 'hist_' + Date.now(),
      action: 'تعديل بيانات التذكرة بالكامل',
      previousStatus: ticket.status,
      newStatus: status,
      performedBy: editorName,
      timestamp: now,
      notes: diffDescriptions.join(' | ')
    };

    // Construct updated TicketItem
    const updatedItem: TicketItem = {
      id: prevItem?.id || ('itm_' + Date.now()),
      gameId: selectedGame?.id || prevItem?.gameId || '',
      gameName: selectedGame?.name || ticket.gameName,
      sectionId: selectedSectionId || undefined,
      sectionName: availableSections.find(s => s.id === selectedSectionId)?.name || undefined,
      productId: selectedProduct?.id || prevItem?.productId || '',
      productName: selectedProduct?.name || ticket.gameProductName,
      playerGameId: playerGameId.trim(),
      quantity,
      unitPrice,
      totalPrice: calculations.totalSale,
      costPrice: Math.round((calculations.fifoCost / (quantity || 1)) * 100) / 100,
      fixedCostEGP: calculations.operatingExpenses / (quantity || 1),
      cashbackPercent: calculations.cbPercent,
      cashbackAmountEGP: calculations.cashback,
      referralPercent: calculations.refPercent,
      referralAmountEGP: calculations.referral,
      netProfitEGP: calculations.netProfit,
      walletTypeId: selectedProduct?.primaryWalletId || selectedProduct?.walletTypeId,
      consumedWalletId: selectedProduct?.primaryWalletId || selectedProduct?.walletTypeId,
      consumedWalletName: pointsValidation.walletName,
      consumedPoints: (selectedProduct?.pointsCostPerUnit || 0) * quantity
    };

    // Calculate overpayment/shortage
    const liveRequired = calculations.netSale;
    const overpayment = Math.max(0, (receivedAmount || 0) - liveRequired);
    const shortage = (receivedAmount > 0 && receivedAmount < liveRequired) ? (liveRequired - receivedAmount) : 0;

    // Generate fresh pricing snapshot
    const pricingSnapshot = FinancialEngine.generateTicketSnapshot([updatedItem], discountAmount, user || undefined);

    const updatedTicket: CustomerTicket = {
      ...ticket,
      playerGameId: playerGameId.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      platformSource,
      gameName: updatedItem.gameName,
      gameSection: updatedItem.sectionName || 'عام',
      gameProductName: updatedItem.productName,
      items: [updatedItem],
      stockDeducted: true,
      requiredAmount: liveRequired,
      totalProductsAmount: calculations.totalSale,
      totalCostAmount: calculations.fifoCost,
      fixedCostAmount: calculations.operatingExpenses,
      cashbackEarned: calculations.cashback,
      cashbackPercent: calculations.cbPercent,
      cashbackPercentage: calculations.cbPercent,
      referralCommissionEarned: calculations.referral,
      referralAllowance: calculations.referralAllowance,
      referralAllowanceReason: calculations.referralAllowance > 0
        ? (ticket.department === 'dealers' ? 'بدل إحالة (تاجر غير مرتبط بإحالة)' : 'بدل إحالة (عميل غير مرتبط بإحالة)')
        : undefined,
      referralPercent: calculations.refPercent,
      referralPercentage: calculations.refPercent,
      totalProfitMargin: calculations.netProfit,
      netProfit: calculations.netProfit,
      receivedAmount,
      overpaymentAmount: overpayment,
      shortageAmount: shortage,
      couponCode: couponCode.trim() || undefined,
      couponDiscountAmount: discountAmount,
      paymentGateway,
      paymentWallet,
      paymentWalletId: paymentWalletId || ticket.paymentWalletId,
      referenceNumber: cleanRef || undefined,
      transferReferenceNumber: cleanRef || ticket.transferReferenceNumber || undefined,
      notes: notes.trim() || undefined,
      status,
      pricingSnapshot,
      historyLog: [historyItem, ...(ticket.historyLog || [])],
      updatedAt: now,
      updatedBy: editorName
    };

    // Reconcile all financial records, wallets, customer/dealer balances, cashback, inventory points, profits and expenses
    const reconcileResult = db.reconcileTicketEdit(ticket, updatedTicket, user);
    const finalTicket = reconcileResult.updatedTicket || updatedTicket;
    if (reconcileResult.adjustments.length > 0) {
      diffDescriptions.push(...reconcileResult.adjustments);
      historyItem.notes = diffDescriptions.join(' | ');
    }

    // Save in database (detect dealer vs customer)
    const isDealer = department === 'dealers' || ticket.department === 'dealers' || !!db.getDealerTicketById(ticket.id);
    if (isDealer) {
      db.saveDealerTicket(finalTicket);
      db.recalculateDealerProfile(finalTicket.customerId || finalTicket.customerPhone);
    } else {
      db.saveTicket(finalTicket);
      db.recalculateCustomerProfile(finalTicket.customerId || finalTicket.customerPhone);
    }

    // Record in Audit Log
    db.logAction(
      {
        id: user?.id || 'admin',
        name: editorName,
        role: user?.role || 'admin',
        department: isDealer ? 'قسم التجار والموزعين' : 'قسم الشحن والتذاكر'
      },
      'edit',
      'ticket',
      ticket.id,
      ticket.ticketNumber,
      `تعديل التذكرة بالكامل: ${diffDescriptions.join(' | ')}`,
      previousState,
      newState
    );

    // Publish event
    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, finalTicket);

    showToast('success', 'تم حفظ التعديلات بنجاح', 'تم تحديث التذكرة وضبط الأرصدة ومزامنة مخزون البضاعة FIFO بنجاح');
    if (onTicketUpdated) onTicketUpdated(finalTicket);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل التذكرة بالكامل #${ticket.ticketNumber}`}
      subtitle="تعديل بيانات اللعبة، المنتج، الكمية، الأسعار، والمحفظة مع إعادة احتساب التكلفة الفعلية والأرباح وتوثيق سجل التدقيق"
      maxWidth="4xl"
    >
      <form onSubmit={handleSave} className="space-y-4 text-right text-xs" dir="rtl">
        {/* Audit Log Warning Notice */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>كل تعديل تقوم به يتم تسجيله باسمك وتاريخه بالتفصيل داخل سجل التدقيق (Audit Log) دون حذف الحركات السابقة.</span>
        </div>

        {/* Section 1: Customer & Player Info */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
          <h4 className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-orange-500" />
            بيانات العميل واللاعب
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">اسم العميل</label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل..." />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">رقم الهاتف *</label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف..." />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-purple-500" />
                معرف اللاعب (Player ID)
              </label>
              <Input value={playerGameId} onChange={e => setPlayerGameId(e.target.value)} placeholder="ID اللاعب في اللعبة..." />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-[#27272A]">
            <PlatformSourceSelector value={platformSource} onChange={setPlatformSource} />
          </div>
        </div>

        {/* Section 2: Game, Product & Quantity with Live Points Check */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
          <h4 className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5 text-blue-500" />
            تفاصيل الباقة والمحفظة الفرعية
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Game */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">اللعبة</label>
              <select
                value={selectedGameId}
                onChange={e => handleGameChange(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs"
              >
                <option value="">اختر اللعبة...</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">القسم</label>
              <select
                value={selectedSectionId}
                onChange={e => handleSectionChange(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs"
              >
                <option value="">عام / كل الأقسام</option>
                {availableSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">المنتج / الباقة</label>
              <select
                value={selectedProductId}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs"
              >
                <option value="">اختر الباقة...</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.calculatedPriceEGP || p.customSellingPriceEGP || 0} ج</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">الكمية</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, val));
                }}
              />
            </div>
          </div>

          {/* Live Points Warning Alert */}
          {pointsValidation.hasPointsCost && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
              pointsValidation.isInsufficient
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 font-bold'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 shrink-0" />
                <span>
                  {pointsValidation.isInsufficient
                    ? `لا يمكن تنفيذ العملية. رصيد المحفظة غير كافٍ. المتاح: ${pointsValidation.availablePoints.toLocaleString()} نقطة | المطلوب: ${pointsValidation.pointsNeeded.toLocaleString()} نقطة.`
                    : `رصيد النقاط متاح: المطلوب ${pointsValidation.pointsNeeded.toLocaleString()} نقطة | المتاح: ${pointsValidation.availablePoints.toLocaleString()} نقطة في [${pointsValidation.walletName || 'المحفظة'}]`}
                </span>
              </div>
              {pointsValidation.isInsufficient && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shrink-0">
                  عجز رصيد
                </span>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Pricing & Payments */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
          <h4 className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            التسعير والدفع المالي
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Unit Price */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">سعر الوحدة (ج)</label>
              <Input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">الخصم / الكوبون (ج)</label>
              <Input
                type="number"
                step="0.01"
                value={discountAmount}
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Received Amount */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">المبلغ المستلم (ج)</label>
              <Input
                type="number"
                step="0.01"
                value={receivedAmount}
                onChange={e => setReceivedAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                طريقة الدفع
              </label>
              <select
                value={paymentGateway}
                onChange={e => setPaymentGateway(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs"
              >
                <option value="Vodafone Cash">فودافون كاش (Vodafone Cash)</option>
                <option value="InstaPay">إنستاباي (InstaPay)</option>
                <option value="Bank Transfer">تحويل بنكي (Bank Transfer)</option>
                <option value="USDT">USDT</option>
                <option value="Cash">كاش نقدي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Payment Receiving Wallet */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                محفظة الاستلام
              </label>
              <select
                value={paymentWalletId || ''}
                onChange={e => {
                  const targetId = e.target.value;
                  setPaymentWalletId(targetId);
                  const w = wallets.find(item => item.id === targetId);
                  if (w) setPaymentWallet(w.name);
                }}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs"
              >
                <option value="">اختر محفظة الاستلام...</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-500" />
                الرقم المرجعي (Unique Reference)
              </label>
              <Input
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="الرقم المرجعي الفريد..."
              />
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-orange-500" />
                حالة التذكرة
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TicketLifecycleStatus)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs"
              >
                <option value="new">⚡ جديدة (New)</option>
                <option value="in_progress">⏳ جاري المعالجة (In Progress)</option>
                <option value="completed">✅ تم الشحن بنجاح (Completed)</option>
                <option value="problem">⚠️ بها مشكلة (Problem)</option>
                <option value="refunded">🔄 تم الاسترداد (Refunded)</option>
                <option value="canceled">❌ ملغاة (Canceled)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Live Financial Recalculation Breakdown */}
        <div className="p-3 rounded-xl bg-zinc-900 text-white space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <span className="font-black text-xs flex items-center gap-1 text-orange-400">
              <Calculator className="w-3.5 h-3.5" />
              إعادة الاحتساب التلقائي (معادلة صافي الربح الدقيقة)
            </span>
            <span className="text-[10px] text-zinc-400">
              الربح = سعر البيع - تكلفة FIFO - الكاش باك - الإحالة - مصاريف التشغيل
            </span>
          </div>

          {/* Referral Percentage Input in Edit Modal */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-purple-500/20 text-xs">
            <span className="text-zinc-300 font-bold">نسبة عمولة الإحالة للتذكرة (%):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={referralPercentInput}
                onChange={e => setReferralPercentInput(e.target.value)}
                className="w-20 rounded-lg bg-zinc-800 border border-purple-500/40 p-1 text-center font-mono font-bold text-purple-300 text-xs outline-none focus:border-purple-400"
              />
              <span className="text-purple-400 font-bold">%</span>
              <div className="flex items-center gap-1">
                {[0, 1, 1.5, 2, 3, 5, 7.5, 10].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setReferralPercentInput(String(pct))}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      parseFloat(referralPercentInput) === pct
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-400'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px] pt-1">
            <div className="p-2 rounded-lg bg-white/5">
              <div className="text-zinc-400 text-[10px]">سعر البيع الفعلي</div>
              <div className="font-bold text-emerald-400 text-sm mt-0.5">{calculations.netSale.toFixed(2)} ج</div>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <div className="text-zinc-400 text-[10px]">تكلفة FIFO الفعلية</div>
              <div className="font-bold text-rose-400 text-sm mt-0.5">{calculations.fifoCost.toFixed(2)} ج</div>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <div className="text-zinc-400 text-[10px]">الكاش باك المستحق</div>
              <div className="font-bold text-amber-400 text-sm mt-0.5">{calculations.cashback.toFixed(2)} ج</div>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <div className="text-zinc-400 text-[10px]">
                {calculations.hasReferrer ? `عمولة الإحالة (${calculations.refPercent}%)` : 'بدل إحالة للأرباح'}
              </div>
              <div className={`font-bold text-sm mt-0.5 ${calculations.hasReferrer ? 'text-purple-400' : 'text-emerald-400'}`}>
                {calculations.hasReferrer ? `${calculations.referral.toFixed(2)} ج` : `+${calculations.referralAllowance.toFixed(2)} ج (أرباح)`}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <div className="text-zinc-400 text-[10px]">مصاريف التشغيل</div>
              <div className="font-bold text-zinc-300 text-sm mt-0.5">{calculations.operatingExpenses.toFixed(2)} ج</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 px-1 border-t border-zinc-800 text-xs">
            <span className="font-bold text-zinc-300">صافي الربح الفعلي المحقق:</span>
            <span className={`font-black text-sm px-2 py-0.5 rounded-lg ${
              calculations.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {calculations.netProfit.toFixed(2)} ج
            </span>
          </div>
        </div>

        {/* Section 5: Ticket Notes */}
        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            ملاحظات التذكرة
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="ملاحظات وتفاصيل التذكرة..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={pointsValidation.isInsufficient}
            icon={<Edit3 className="w-4 h-4" />}
          >
            حفظ التعديلات بالكامل وتوثيق التدقيق
          </Button>
        </div>
      </form>
    </Modal>
  );
};
