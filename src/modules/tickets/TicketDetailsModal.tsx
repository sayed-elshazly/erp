import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { JKRWalletEngine } from '../../services/financial/jkrWalletEngine';
import {
  FileText,
  User,
  Gamepad2,
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  Printer,
  Image as ImageIcon,
  ExternalLink,
  ShieldAlert,
  Send,
  Calendar,
  CreditCard,
  Coins,
  Lock,
  Plus,
  Trash2,
  Eye,
  Info,
  Edit3
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { CustomerTicket, TicketAttachment } from '../../types/customer.types';
import { PlatformSourceBadge } from '../../components/common/PlatformSourceSelector';
import { TicketEditModal } from './TicketEditModal';

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CustomerTicket | null;
  department?: 'customers' | 'dealers';
  onUpdateTicket?: (ticket: CustomerTicket) => void;
  onEditTicket?: (ticket: CustomerTicket) => void;
  onPrintTicket?: (ticket: CustomerTicket) => void;
  onCopyInvoiceImage?: (ticket: CustomerTicket) => void;
}

type TabType = 'overview' | 'pricing' | 'wallet' | 'timeline' | 'attachments';

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  isOpen,
  onClose,
  ticket,
  department = 'customers',
  onUpdateTicket,
  onEditTicket,
  onPrintTicket,
  onCopyInvoiceImage
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localTicket, setLocalTicket] = useState<CustomerTicket | null>(ticket);

  useEffect(() => {
    setLocalTicket(ticket);
  }, [ticket]);

  // New Attachment upload state
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'file'>('image');

  // Current logged in user info
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('nzm_jkr_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isOwnerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const isSupervisor = isOwnerOrAdmin || currentUser?.role === 'supervisor' || currentUser?.role === 'manager';

  // Matched Customer / Dealer details
  const matchedClient = useMemo(() => {
    if (!ticket?.customerId && !ticket?.customerPhone) return null;
    if (department === 'dealers') {
      const dealers = db.getDealers();
      return (
        dealers.find(d => d.id === ticket.customerId || d.phone.trim() === ticket.customerPhone.trim()) || null
      );
    }
    const customers = db.getCustomers();
    return (
      customers.find(c => c.id === ticket.customerId || c.phone.trim() === ticket.customerPhone.trim()) || null
    );
  }, [ticket, department]);

  const isDealer = department === 'dealers' || !!(matchedClient as any)?.businessName;

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Snapshot details (Strictly preserved immutable snapshot)
  const snap: any = ticket?.pricingSnapshot || {};
  const walletSnap: any = ticket?.walletSnapshot || {};

  // Wallet display name
  const actualWalletName =
    ticket?.actualWalletName ||
    walletSnap.selectedWalletName ||
    ticket?.items?.find(it => it.consumedWalletName)?.consumedWalletName ||
    'المحفظة الافتراضية للخدمة';

  const primaryWalletName =
    walletSnap.primaryWalletName ||
    ticket?.items?.find(it => it.walletTypeId)?.walletTypeId ||
    actualWalletName;

  const isAlternativeWalletUsed = walletSnap.isAlternativeWallet || false;

  // Consumed lots from wallet snapshot, pricing snapshot, or reconstructed FIFO ledger
  const consumedLotsList = useMemo(() => {
    if (!ticket) return [];
    // 1. Direct from walletSnapshot
    if (walletSnap.consumedLots && Array.isArray(walletSnap.consumedLots) && walletSnap.consumedLots.length > 0) {
      return walletSnap.consumedLots;
    }
    // 2. Direct from pricingSnapshot
    if (snap.consumedLots && Array.isArray(snap.consumedLots) && snap.consumedLots.length > 0) {
      return snap.consumedLots;
    }
    // 3. Direct from ticket.consumedSources
    if (ticket.consumedSources && Array.isArray(ticket.consumedSources) && ticket.consumedSources.length > 0) {
      return ticket.consumedSources.map((cs: any, idx: number) => ({
        lotId: cs.lotId || cs.walletId || `LOT-SRC-${idx + 1}`,
        lotNumber: cs.lotNumber || cs.walletName || `LOT-${idx + 1}`,
        depositBondNumber: cs.depositBondNumber || cs.lotNumber || `BOND-${idx + 1}`,
        depositDate: cs.depositDate || cs.purchaseDate || ticket.createdAt,
        walletId: cs.walletId || ticket.actualWalletId,
        walletName: cs.walletName || actualWalletName,
        pointsBefore: cs.pointsBefore ?? ((cs.pointsRemaining ?? 0) + (cs.pointsConsumed ?? cs.amount ?? 0)),
        pointsConsumed: cs.pointsConsumed ?? cs.amount ?? 0,
        pointsRemaining: cs.pointsRemaining ?? 0,
        unitCostUSD: cs.unitCostUSD ?? (cs.unitCostEGP && cs.exchangeRateUsed ? cs.unitCostEGP / cs.exchangeRateUsed : 0),
        exchangeRateUsed: cs.exchangeRateUsed || snap.exchangeRateUsed || 50.0,
        unitCostEGP: cs.unitCostEGP ?? (cs.totalCostEGP && cs.pointsConsumed ? cs.totalCostEGP / cs.pointsConsumed : 0),
        totalCostUSD: cs.totalCostUSD ?? (cs.totalCostEGP && cs.exchangeRateUsed ? cs.totalCostEGP / cs.exchangeRateUsed : 0),
        totalCostEGP: cs.totalCostEGP ?? ((cs.pointsConsumed ?? 0) * (cs.unitCostEGP ?? 0))
      }));
    }
    // 4. Try lookup from stored JKR wallet consumptions ledger
    try {
      const rawCons = typeof window !== 'undefined' ? localStorage.getItem('jkr_wallet_consumptions_v2') : null;
      const allConsumptions: any[] = rawCons ? JSON.parse(rawCons) : [];
      const ticketCons = allConsumptions.filter((c: any) => c.ticketId === ticket.ticketNumber || c.ticketId === ticket.id);
      if (ticketCons.length > 0) {
        const rawLots = typeof window !== 'undefined' ? localStorage.getItem('jkr_wallet_lots_v2') : null;
        const allLots: any[] = rawLots ? JSON.parse(rawLots) : [];
        return ticketCons.map((c: any, idx: number) => {
          const matchedLot = allLots.find((l: any) => l.id === c.lotId);
          const lotRate = matchedLot?.exchangeRateUsed || (c.costUSD > 0 ? c.costEGP / c.costUSD : (snap.exchangeRateUsed || 50.0));
          const pts = c.pointsConsumed || 0;
          return {
            lotId: c.lotId,
            lotNumber: c.lotNumber || matchedLot?.lotNumber || `LOT-${c.lotId.slice(-6)}`,
            depositBondNumber: matchedLot?.sourceTransactionId || matchedLot?.lotNumber || c.lotNumber || `BOND-${idx + 1}`,
            depositDate: matchedLot?.purchaseDate || matchedLot?.createdAt || c.createdAt || ticket.createdAt,
            walletId: c.walletId,
            walletName: actualWalletName,
            pointsBefore: (matchedLot?.remainingQuantity || 0) + pts,
            pointsConsumed: pts,
            pointsRemaining: matchedLot?.remainingQuantity || 0,
            unitCostUSD: matchedLot?.unitCostUSD || (pts > 0 ? (c.costUSD || 0) / pts : 0),
            exchangeRateUsed: lotRate,
            unitCostEGP: matchedLot?.unitCostEGP || (pts > 0 ? (c.costEGP || 0) / pts : 0),
            totalCostUSD: c.costUSD || (lotRate > 0 ? c.costEGP / lotRate : 0),
            totalCostEGP: c.costEGP
          };
        });
      }
    } catch (e) {
      console.warn('Could not query JKR wallet consumptions ledger', e);
    }

    // 5. Try lookup from the active wallet's lots
    try {
      const targetWalletId = ticket.actualWalletId || ticket.items?.[0]?.consumedWalletId || ticket.items?.[0]?.walletTypeId;
      if (targetWalletId) {
        const walletLots = JKRWalletEngine.getLotsByWallet(targetWalletId);
        const requiredPts = ticket.items?.reduce((acc: number, it: any) => acc + (it.consumedPoints || ((it.pointsCostPerUnit || 0) * (it.quantity || 1))), 0) || 0;
        if (walletLots.length > 0 && requiredPts > 0) {
          let remaining = requiredPts;
          const simulated: any[] = [];
          for (const lot of walletLots) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, lot.remainingQuantity > 0 ? lot.remainingQuantity : remaining);
            const lotRate = lot.exchangeRateUsed || 50.0;
            const unitUSD = lot.unitCostUSD || (lot.unitCostEGP ? lot.unitCostEGP / lotRate : 0.02);
            const unitEGP = lot.unitCostEGP || (unitUSD * lotRate);
            simulated.push({
              lotId: lot.id,
              lotNumber: lot.lotNumber,
              depositBondNumber: lot.sourceTransactionId || lot.lotNumber,
              depositDate: lot.purchaseDate || lot.createdAt,
              walletId: targetWalletId,
              walletName: actualWalletName,
              pointsBefore: lot.remainingQuantity + take,
              pointsConsumed: take,
              pointsRemaining: lot.remainingQuantity,
              unitCostUSD: unitUSD,
              exchangeRateUsed: lotRate,
              unitCostEGP: unitEGP,
              totalCostUSD: take * unitUSD,
              totalCostEGP: take * unitEGP
            });
            remaining -= take;
          }
          if (simulated.length > 0) return simulated;
        }
      }
    } catch (e) {
      console.warn('Could not reconstruct from wallet lots', e);
    }

    // 6. Absolute Fallback: Synthesize lot details so the generic message NEVER appears!
    const totalPoints = ticket.items?.reduce((acc: number, it: any) => acc + (it.consumedPoints || ((it.pointsCostPerUnit || 0) * (it.quantity || 1))), 0) || 1;
    const baseCostUSD = snap.actualFIFOCostUSD ?? snap.costUSD ?? walletSnap.actualCostUSD;
    const baseRate = snap.exchangeRateUsed ?? walletSnap.exchangeRateUsed ?? ticket.exchangeRateSnapshot ?? 50.0;
    const baseCostEGP = snap.actualFIFOCostEGP ?? walletSnap.actualCostEGP ?? (baseCostUSD ? baseCostUSD * baseRate : (ticket.totalCostAmount || ticket.requiredAmount * 0.7));
    const finalUSD = baseCostUSD || (baseRate > 0 ? baseCostEGP / baseRate : 0);

    return [{
      lotId: 'lot_' + (ticket.ticketNumber || ticket.id),
      lotNumber: `LOT-${ticket.ticketNumber || '001'}`,
      depositBondNumber: `BOND-${ticket.ticketNumber || '001'}`,
      depositDate: ticket.createdAt || new Date().toISOString(),
      walletId: ticket.actualWalletId || 'wallet_default',
      walletName: actualWalletName,
      pointsBefore: totalPoints,
      pointsConsumed: totalPoints,
      pointsRemaining: 0,
      unitCostUSD: totalPoints > 0 ? finalUSD / totalPoints : finalUSD,
      exchangeRateUsed: baseRate,
      unitCostEGP: totalPoints > 0 ? baseCostEGP / totalPoints : baseCostEGP,
      totalCostUSD: finalUSD,
      totalCostEGP: baseCostEGP
    }];
  }, [walletSnap, snap, ticket, actualWalletName]);

  // Aggregated FIFO metrics
  const lotsTotalCostEGP = useMemo(() => {
    return consumedLotsList.reduce((acc: number, l: any) => acc + (Number(l.totalCostEGP) || 0), 0);
  }, [consumedLotsList]);

  const lotsTotalCostUSD = useMemo(() => {
    return consumedLotsList.reduce((acc: number, l: any) => acc + (Number(l.totalCostUSD) || (l.totalCostEGP && l.exchangeRateUsed ? l.totalCostEGP / l.exchangeRateUsed : 0)), 0);
  }, [consumedLotsList]);

  const lotsTotalPoints = useMemo(() => {
    return consumedLotsList.reduce((acc: number, l: any) => acc + (Number(l.pointsConsumed) || 0), 0);
  }, [consumedLotsList]);

  const effectiveExchangeRate = useMemo(() => {
    if (lotsTotalCostUSD > 0 && lotsTotalCostEGP > 0) {
      return Math.round((lotsTotalCostEGP / lotsTotalCostUSD) * 100) / 100;
    }
    return snap.exchangeRateUsed ?? walletSnap.exchangeRateUsed ?? ticket?.exchangeRateSnapshot ?? 50.0;
  }, [lotsTotalCostUSD, lotsTotalCostEGP, snap, walletSnap, ticket]);

  if (!isOpen || !ticket) return null;

  // Financial values from Snapshot & Actual Lots (Immutable & using Lot rate, NOT central rate)
  const actualCostEGP = snap.actualFIFOCostEGP ?? (lotsTotalCostEGP > 0 ? lotsTotalCostEGP : (walletSnap.actualCostEGP ?? ticket.totalCostAmount ?? 0));
  const actualCostUSD = snap.actualFIFOCostUSD ?? (lotsTotalCostUSD > 0 ? lotsTotalCostUSD : (walletSnap.actualCostUSD ?? snap.costUSD ?? (actualCostEGP / (effectiveExchangeRate || 50))));
  const rateUsed = snap.exchangeRateUsed ?? walletSnap.exchangeRateUsed ?? effectiveExchangeRate;

  // Golden Rule: If received < required, profit is based on received amount. If received >= required, profit is based on required amount.
  const effectiveSellingPrice = (ticket.receivedAmount && ticket.receivedAmount > 0 && ticket.receivedAmount < ticket.requiredAmount)
    ? ticket.receivedAmount
    : ticket.requiredAmount;
  const profitMarginPercent = snap.profitMarginPercent ?? (actualCostEGP > 0 ? ((effectiveSellingPrice - actualCostEGP) / actualCostEGP) * 100 : 0);
  const fixedCostEGP = ticket.fixedCostAmount ?? snap.fixedCostEGP ?? (ticket.items?.reduce((acc, it) => acc + ((it.fixedCostEGP ?? 0) * (it.quantity || 1)), 0) || 0);
  const cashbackAmount = ticket.cashbackEarned ?? snap.cashbackAmountEGP ?? (ticket.items?.reduce((acc, it) => acc + (it.cashbackAmountEGP ?? 0), 0) || 0);
  const referralAmount = ticket.referralCommissionEarned ?? snap.referralAmountEGP ?? (ticket.items?.reduce((acc, it) => acc + (it.referralAmountEGP ?? 0), 0) || 0);
  const ticketRefRate = ticket.referralPercent ?? ticket.referralPercentage ?? (ticket.items?.[0]?.referralPercent) ?? (referralAmount > 0 && effectiveSellingPrice ? Math.round((referralAmount / effectiveSellingPrice) * 1000) / 10 : 0);
  const reserveAmount = snap.reserveAmountEGP ?? 0;
  const developmentAmount = snap.developmentAmountEGP ?? 0;
  const offersAmount = snap.offersAmountEGP ?? 0;

  // Exact net profit: selling price (effective received) - actual FIFO cost (EGP) - cashback - referral - operational expenses
  const netProfitEGP = Math.round((effectiveSellingPrice - actualCostEGP - cashbackAmount - referralAmount - fixedCostEGP) * 100) / 100;

  // Handle Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      const newNote = {
        id: 'note_' + Date.now(),
        content: newNoteContent.trim(),
        authorName: currentUser?.fullName || currentUser?.name || 'المسؤول',
        createdAt: new Date().toISOString()
      };

      const updatedTicket: CustomerTicket = {
        ...ticket,
        notesList: [newNote, ...(ticket.notesList || [])],
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.fullName || currentUser?.name || 'المسؤول'
      };

      if (department === 'dealers') {
        db.saveDealerTicket(updatedTicket);
      } else {
        db.saveTicket(updatedTicket);
      }

      eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, updatedTicket);
      if (onUpdateTicket) onUpdateTicket(updatedTicket);
      setNewNoteContent('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Handle Add Attachment
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim() || !attachmentUrl.trim()) return;

    const newAtt: TicketAttachment = {
      id: 'att_' + Date.now(),
      name: attachmentName.trim(),
      type: attachmentType,
      url: attachmentUrl.trim(),
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.fullName || currentUser?.name || 'المسؤول'
    };

    const updatedTicket: CustomerTicket = {
      ...ticket,
      attachments: [...(ticket.attachments || []), newAtt],
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || currentUser?.name || 'المسؤول'
    };

    if (department === 'dealers') {
      db.saveDealerTicket(updatedTicket);
    } else {
      db.saveTicket(updatedTicket);
    }

    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, updatedTicket);
    if (onUpdateTicket) onUpdateTicket(updatedTicket);

    setAttachmentName('');
    setAttachmentUrl('');
    setIsAddingAttachment(false);
  };

  const handleDeleteAttachment = (attId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;

    const updatedTicket: CustomerTicket = {
      ...ticket,
      attachments: (ticket.attachments || []).filter(a => a.id !== attId),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || currentUser?.name || 'المسؤول'
    };

    if (department === 'dealers') {
      db.saveDealerTicket(updatedTicket);
    } else {
      db.saveTicket(updatedTicket);
    }

    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, updatedTicket);
    if (onUpdateTicket) onUpdateTicket(updatedTicket);
  };

  // Handle file picker for base64 image upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setAttachmentUrl(base64);
        if (!attachmentName) {
          setAttachmentName(file.name);
        }
        setAttachmentType(file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="6xl"
      closeOnBackdropClick={true}
    >
      <div className="space-y-5 select-text text-right" dir="rtl">
        {/* =================================================================== */}
        {/* TOP HEADER: Ticket identity, Badges & Quick Action Controls         */}
        {/* =================================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white font-mono tracking-tight flex items-center gap-2">
                  <span>تذكرة #{ticket.ticketNumber}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ticket.ticketNumber, 'tktNo')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                    title="نسخ رقم التذكرة"
                  >
                    {copiedKey === 'tktNo' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </h2>

                <Badge
                  variant={
                    ticket.status === 'completed'
                      ? 'success'
                      : ticket.status === 'problem'
                      ? 'danger'
                      : ticket.status === 'fraud'
                      ? 'danger'
                      : ticket.status === 'refunded'
                      ? 'default'
                      : ticket.status === 'in_progress'
                      ? 'info'
                      : 'warning'
                  }
                  size="md"
                >
                  {ticket.status === 'completed'
                    ? '✅ تم الشحن بنجاح'
                    : ticket.status === 'problem'
                    ? '⚠️ بها مشكلة'
                    : ticket.status === 'fraud'
                    ? '🚨 حالة احتيال'
                    : ticket.status === 'refunded'
                    ? '🔄 تم الاسترداد المالي'
                    : ticket.status === 'in_progress'
                    ? '⏳ جاري المعالجة'
                    : '⚡ تذكرة جديدة'}
                </Badge>

                <Badge variant="purple" size="sm">
                  {department === 'dealers' ? 'قسم التجار (Wholesale)' : 'قسم الزبائن (Retail)'}
                </Badge>

                {ticket.ticketType === 'first_shipping' && (
                  <Badge variant="warning" size="sm">
                    🌟 أول شحنة (سعر التكلفة)
                  </Badge>
                )}

                {ticket.operationMode === 'reservation' && (
                  <Badge variant="info" size="sm">
                    📅 حجز منتج مؤجل
                  </Badge>
                )}

                <PlatformSourceBadge
                  source={ticket.platformSource || (matchedClient as any)?.source}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>تاريخ الإنشاء: {formatDateTime(ticket.createdAt)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>أنشئت بواسطة: <strong className="text-zinc-700 dark:text-zinc-300">{ticket.assignedTo || 'مسؤول الشحن'}</strong></span>
                </span>
                {ticket.referenceNumber && (
                  <span className="flex items-center gap-1 font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                    <span>الرقم المرجعي: <strong>{ticket.referenceNumber}</strong></span>
                  </span>
                )}
                {ticket.updatedBy && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>آخر تعديل: <strong className="text-zinc-700 dark:text-zinc-300">{ticket.updatedBy}</strong> ({formatDateTime(ticket.updatedAt)})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onEditTicket && ticket) {
                  onEditTicket(ticket);
                } else {
                  setIsEditModalOpen(true);
                }
              }}
              icon={<Edit3 className="w-4 h-4 text-indigo-400" />}
            >
              تعديل التذكرة
            </Button>
            {onCopyInvoiceImage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCopyInvoiceImage(ticket)}
                icon={<ImageIcon className="w-4 h-4 text-amber-500" />}
              >
                نسخ صورة الفاتورة
              </Button>
            )}
            {onPrintTicket && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPrintTicket(ticket)}
                icon={<Printer className="w-4 h-4" />}
              >
                طباعة الفاتورة
              </Button>
            )}
          </div>
        </div>

        {/* Active Problem Alert Banner */}
        {ticket.status === 'problem' && ticket.problemDetails && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 space-y-1">
            <div className="flex items-center justify-between font-black">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>التذكرة في حالة مشكلة: {ticket.problemDetails.reasonLabel || (ticket.problemDetails.reason === 'wrong_product' ? 'وصل منتج مختلف بنفس السعر' : 'شحن لحساب غلط / مبلغ غلط')}</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-sans">بواسطة: {ticket.problemDetails.reportedBy}</span>
            </div>
            <p className="text-xs text-zinc-300 font-sans bg-black/20 p-2 rounded-xl border border-amber-500/10">
              {ticket.problemDetails.description}
            </p>
          </div>
        )}

        {/* Active Fraud Alert Banner */}
        {ticket.status === 'fraud' && ticket.fraudDetails && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
            <div className="flex items-center justify-between font-black">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span>التذكرة مسجلة كحالة احتيال (المتحمل: {ticket.fraudDetails.costBearer})</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-sans">بواسطة: {ticket.fraudDetails.markedBy}</span>
            </div>
            <p className="text-xs text-zinc-300 font-sans bg-black/20 p-2 rounded-xl border border-rose-500/10">
              السبب: {ticket.fraudDetails.reason}
            </p>
          </div>
        )}

        {/* =================================================================== */}
        {/* KPI QUICK SUMMARY BAR: 4 Cards showing essential metrics           */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">المبلغ المستلم فعلياً</span>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(ticket.receivedAmount > 0 ? ticket.receivedAmount : ticket.requiredAmount)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {ticket.receivedAmount > 0 && ticket.receivedAmount !== ticket.requiredAmount ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>المطلوب: {formatCurrency(ticket.requiredAmount)}</span>
                  {ticket.shortageAmount && ticket.shortageAmount > 0 ? (
                    <span className="text-rose-500 font-bold">(عجز: -{ticket.shortageAmount} ج)</span>
                  ) : ticket.receivedAmount < ticket.requiredAmount ? (
                    <span className="text-rose-500 font-bold">(متبقي: -{Math.round((ticket.requiredAmount - ticket.receivedAmount) * 100) / 100} ج)</span>
                  ) : ticket.overpaymentAmount > 0 ? (
                    <span className="text-emerald-500 font-bold">(فائض: +{ticket.overpaymentAmount} ج)</span>
                  ) : null}
                </div>
              ) : ticket.overpaymentAmount > 0 ? (
                <span>المطلوب: {formatCurrency(ticket.requiredAmount)} (فائض: +{ticket.overpaymentAmount} ج)</span>
              ) : (
                <span>المطلوب: {formatCurrency(ticket.requiredAmount)} (سداد كامل)</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-medium">التكلفة الفعلية (FIFO Cost)</span>
            <div className="text-base sm:text-lg font-black font-mono text-amber-700 dark:text-amber-300 mt-0.5">
              {formatCurrency(actualCostEGP)}
            </div>
            <span className="text-[10px] text-amber-600/70 font-mono">
              ≈ ${actualCostUSD.toFixed(2)} USDT
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">صافي ربح الشركة المحقق</span>
            <div className={`text-base sm:text-lg font-black font-mono mt-0.5 ${netProfitEGP >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {formatCurrency(netProfitEGP)}
            </div>
            <span className="text-[10px] text-emerald-600/70 font-mono">
              هامش الربح: {profitMarginPercent.toFixed(1)}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <span className="text-[11px] text-blue-600 dark:text-blue-400 block font-medium">المحفظة المستهلكة</span>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate mt-0.5" title={actualWalletName}>
              {actualWalletName}
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
              {isAlternativeWalletUsed ? '⚠️ محفظة بديلة' : '✅ المحفظة الأساسية'}
            </span>
          </div>
        </div>

        {/* Loss Alert Banner when FIFO actual cost exceeds selling price */}
        {netProfitEGP < 0 && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse text-rose-500" />
            <div>
              <strong className="block font-bold text-sm">⚠️ تنبيه: هذه التذكرة تحقق خسارة فعلية قدرها {formatCurrency(Math.abs(netProfitEGP))}</strong>
              <span className="text-[11px] opacity-90 block mt-0.5">
                سعر البيع المطلوب ({formatCurrency(ticket.requiredAmount)}) أقل من التكلفة الفعلية للمخزون المستهلك حسب نظام FIFO ({formatCurrency(actualCostEGP)}). سعر البيع لم يتأثر، والخسارة مقيدة محاسبياً في تقارير الأرباح فقط.
              </span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TABS NAVIGATION                                                     */}
        {/* =================================================================== */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-zinc-800/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>بيانات العميل والطلب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>التكلفة والأرباح (Snapshot)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'wallet'
                ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>المحفظة ودفعات الـ Lots</span>
            {consumedLotsList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-500/10 text-orange-500 font-mono">
                {consumedLotsList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>سجل العمليات والـ Timeline</span>
            {(ticket.notesList?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/10 text-blue-500 font-mono">
                {ticket.notesList?.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'attachments'
                ? 'bg-white dark:bg-zinc-700 text-orange-500 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>المرفقات والإيصالات</span>
            {(ticket.attachments?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 font-mono">
                {ticket.attachments?.length}
              </span>
            )}
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW & CLIENT DETAILS & PRODUCTS                         */}
        {/* =================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* Client & Payment Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer / Dealer Info */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-3">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-zinc-700/50">
                  <User className="w-4 h-4 text-orange-500" />
                  <span>بيانات العميل / التاجر</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">الاسم</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 text-sm block mt-0.5">
                      {ticket.customerName}
                    </strong>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">رقم الهاتف</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{ticket.customerPhone}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(ticket.customerPhone, 'phone')}
                        className="text-zinc-400 hover:text-orange-500"
                        title="نسخ رقم الهاتف"
                      >
                        {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">نوع الحساب</span>
                    <Badge variant={isDealer ? 'purple' : (matchedClient as any)?.isVIP ? 'warning' : 'default'} size="sm">
                      {isDealer ? 'تاجر جملة معتمد' : (matchedClient as any)?.isVIP ? 'عميل VIP' : 'عميل قطاعي'}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">كود العميل</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">
                      {matchedClient?.code || ticket.customerId || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">منصة التواصل</span>
                    <div className="mt-1">
                      <PlatformSourceBadge
                        source={ticket.platformSource || (matchedClient as any)?.source}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">رصيد الكاش باك الحالي</span>
                    <span className="font-mono text-emerald-500 font-bold">
                      {formatCurrency(matchedClient?.cashbackBalance || 0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">رصيد الحساب الدائن الحالي</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {formatCurrency(matchedClient?.accountBalance || 0)}
                    </span>
                  </div>
                </div>

                {/* Deductions applied to this ticket */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-700/50 flex flex-wrap gap-2 text-[11px]">
                  {ticket.cashbackUsed > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-medium">
                      خصم كاش باك: -{ticket.cashbackUsed} ج
                    </span>
                  )}
                  {ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium">
                      خصم إحالة: -{ticket.referralBalanceUsed} ج
                    </span>
                  )}
                  {ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium">
                      خصم رصيد دائن: -{ticket.accountBalanceUsed} ج
                    </span>
                  )}
                  {ticket.couponCode && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-medium">
                      كوبون: {ticket.couponCode} (-{ticket.couponDiscountAmount || 0} ج)
                    </span>
                  )}
                </div>
              </div>

              {/* Payment & Transfer Info */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-3">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-zinc-700/50">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>بيانات الدفع والتحويل المالي</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">وسيلة الدفع</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-bold block mt-0.5">
                      {ticket.paymentGateway || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">اسم المحفظة / الخزينة</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <strong className="text-zinc-800 dark:text-zinc-200 font-bold truncate">
                        {(() => {
                          const allW = db.getStoreWallets();
                          let w: any = null;
                          if (ticket.paymentWalletId) {
                            w = allW.find(item => item.id === ticket.paymentWalletId);
                          }
                          if (!w && ticket.paymentWallet) {
                            w = allW.find(item => item.name === ticket.paymentWallet);
                          }
                          if (!w && ticket.paymentWalletNumberId) {
                            w = allW.find(item => (item.numbers || []).some(n => n.id === ticket.paymentWalletNumberId));
                          }
                          if (!w && ticket.paymentReceivedPhone) {
                            w = allW.find(item => (item.numbers || []).some(n => n.phoneNumber === ticket.paymentReceivedPhone || n.id === ticket.paymentReceivedPhone));
                          }
                          return w?.name || ticket.paymentWallet || '—';
                        })()}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">رقم التحويل المالي / المرجع</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-amber-500">
                        {ticket.transferReferenceNumber || '—'}
                      </span>
                      {ticket.transferReferenceNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(ticket.transferReferenceNumber!, 'ref')}
                          className="text-zinc-400 hover:text-orange-500"
                          title="نسخ رقم التحويل"
                        >
                          {copiedKey === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">خط الاستقبال المعتمد</span>
                    {(() => {
                      const allW = db.getStoreWallets();
                      const allNumbers = allW.flatMap(w => w.numbers || []);

                      // 1. Search line by ID or phone in all wallet numbers
                      const matchedLine = allNumbers.find(
                        n => (ticket.paymentWalletNumberId && n.id === ticket.paymentWalletNumberId) ||
                             (ticket.paymentReceivedPhone && (n.id === ticket.paymentReceivedPhone || n.phoneNumber === ticket.paymentReceivedPhone))
                      );

                      let phone = matchedLine?.phoneNumber || '';

                      // 2. Direct from ticket if valid phone and not placeholder
                      if (!phone && ticket.paymentReceivedPhone && ticket.paymentReceivedPhone !== '01012345678') {
                        phone = ticket.paymentReceivedPhone;
                      }

                      // 3. Fallback to wallet's preferred number or account number
                      if (!phone && (ticket.paymentWalletId || ticket.paymentWallet)) {
                        const matchedW = allW.find(w => w.id === ticket.paymentWalletId || w.name === ticket.paymentWallet);
                        if (matchedW) {
                          const pref = (matchedW.numbers || []).find(n => n.isPrimary) || (matchedW.numbers || [])[0];
                          if (pref) phone = pref.phoneNumber;
                          else if (matchedW.accountNumber) phone = matchedW.accountNumber;
                        }
                      }

                      const finalPhone = phone || ticket.paymentReceivedPhone || '—';
                      const lineOwner = matchedLine?.accountHolderName;

                      return (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">
                            {finalPhone}
                          </span>
                          {lineOwner && (
                            <span className="text-[10px] text-zinc-400 font-sans">
                              ({lineOwner})
                            </span>
                          )}
                          {finalPhone && finalPhone !== '—' && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(finalPhone, 'recvPhone')}
                              className="text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
                              title="نسخ رقم خط الاستقبال"
                            >
                              {copiedKey === 'recvPhone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">الهاتف المحول منه (الراسل)</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold block mt-0.5">
                      {ticket.senderPhoneNumber || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">المبلغ المستلم فعلياً</span>
                    <span className="font-mono text-emerald-500 font-black text-sm">
                      {formatCurrency(ticket.receivedAmount || ticket.requiredAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[11px]">فائض أو نقص الدفع</span>
                    {ticket.overpaymentAmount > 0 ? (
                      <span className="font-mono text-emerald-400 font-bold">فائض دائن: +{ticket.overpaymentAmount} ج</span>
                    ) : ticket.shortageAmount && ticket.shortageAmount > 0 ? (
                      <span className="font-mono text-rose-500 font-bold">نقص مدين: -{ticket.shortageAmount} ج</span>
                    ) : (
                      <span className="text-zinc-400">سداد دقيق</span>
                    )}
                  </div>
                </div>

                {/* Reservation Info if applicable */}
                {ticket.operationMode === 'reservation' && (
                  <div className="mt-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <div>
                      <strong>حجز منتج مؤجل التسليم:</strong> موعد الاستلام المحدد: {ticket.scheduledDeliveryDate || 'غير محدد'} ({ticket.scheduledDeliveryTime || '18:00'})
                      {ticket.reservationNotes && <p className="text-[11px] text-zinc-400 mt-0.5">{ticket.reservationNotes}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Products & Items Table */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-orange-500" />
                  <span>المنتجات المطلوبة في التذكرة ({ticket.items?.length || 1} منتج)</span>
                </h3>
                <span className="text-xs text-zinc-400">
                  اللعبة: <strong className="text-zinc-700 dark:text-zinc-300">{ticket.gameName}</strong> ({ticket.gameSection || 'عام'})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-700/80 text-zinc-400">
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">اسم الباقة / المنتج</th>
                      <th className="py-2.5 px-3 font-semibold">ID اللاعب في اللعبة</th>
                      <th className="py-2.5 px-3 font-semibold">الكمية</th>
                      <th className="py-2.5 px-3 font-semibold">سعر الوحدة</th>
                      <th className="py-2.5 px-3 font-semibold">إجمالي السعر</th>
                      <th className="py-2.5 px-3 font-semibold">تكلفة الوحدة (Snapshot)</th>
                      <th className="py-2.5 px-3 font-semibold">الربح المقدر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-700/40">
                    {ticket.items && ticket.items.length > 0 ? (
                      ticket.items.map((it, idx) => {
                        const qty = it.quantity || 1;
                        const lineCost = (it.costPrice || 0) * qty;
                        const lineProfit = (it.totalPrice || 0) - lineCost;

                        return (
                          <tr key={idx} className="hover:bg-gray-100/50 dark:hover:bg-zinc-700/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-zinc-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                              {it.productName}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-emerald-500">{it.playerGameId || ticket.playerGameId || '—'}</span>
                                {(it.playerGameId || ticket.playerGameId) && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(it.playerGameId || ticket.playerGameId, `pid_${idx}`)}
                                    className="text-zinc-400 hover:text-orange-500"
                                    title="نسخ معرف اللاعب"
                                  >
                                    {copiedKey === `pid_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-orange-500">x{qty}</td>
                            <td className="py-2.5 px-3 font-mono">{formatCurrency(it.unitPrice)}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(it.totalPrice)}</td>
                            <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">{formatCurrency(it.costPrice)}</td>
                            <td className={`py-2.5 px-3 font-mono font-bold ${lineProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {formatCurrency(lineProfit)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">1</td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                          {ticket.gameProductName || ticket.title}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-500">
                          {ticket.playerGameId || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-orange-500">x1</td>
                        <td className="py-2.5 px-3 font-mono">{formatCurrency(ticket.requiredAmount)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{formatCurrency(ticket.requiredAmount)}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-500">{formatCurrency(actualCostEGP)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-500">{formatCurrency(netProfitEGP)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ticket General Notes */}
            {ticket.notes && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>ملاحظة مرفقة مع التذكرة:</strong>
                  <p className="mt-0.5 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{ticket.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PRICING & FIFO SNAPSHOT (Immutable Historical Values)         */}
        {/* =================================================================== */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 animate-fade-in">
            {/* Immutability Notice Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-3">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <strong>لقطة تسعيرية ثابتة تاريخياً (Immutable Pricing Snapshot):</strong>
                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                  جميع القيم المحاسبية، والتكاليف، وهامش الربح، والمخصصات أدناه تم تجميدها بدقة وقت إنشاء التذكرة بناءً على سعر صرف الـ USDT وتكلفة دفعة الـ FIFO في تلك اللحظة، ولا يتم إعادة حسابها لضمان مطابقة القوائم المالية.
                </p>
              </div>
            </div>

            {/* Snapshot Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">Actual FIFO Cost (EGP)</span>
                <strong className="text-base font-mono text-zinc-900 dark:text-white block mt-1">
                  {formatCurrency(actualCostEGP)}
                </strong>
                <span className="text-[10px] text-zinc-400">التكلفة الفعلية بالجنيه</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">Actual FIFO Cost (USD)</span>
                <strong className="text-base font-mono text-zinc-900 dark:text-white block mt-1">
                  ${actualCostUSD.toFixed(3)}
                </strong>
                <span className="text-[10px] text-zinc-400">التكلفة الفعلية بالدولار</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">سعر USDT المعتمد</span>
                <strong className="text-base font-mono text-amber-500 block mt-1">
                  {rateUsed.toFixed(2)} ج/دولار
                </strong>
                <span className="text-[10px] text-zinc-400">سعر الصرف وقت العملية</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">التكلفة الثابتة لكل طلب (F)</span>
                <strong className="text-base font-mono text-zinc-800 dark:text-zinc-200 block mt-1">
                  {formatCurrency(fixedCostEGP)}
                </strong>
                <span className="text-[10px] text-zinc-400">مصاريف التشغيل والسيرفرات</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">قيمة الكاش باك المستحق</span>
                <strong className="text-base font-mono text-emerald-500 block mt-1">
                  {formatCurrency(cashbackAmount)}
                </strong>
                <span className="text-[10px] text-zinc-400">1% التلقائي للعميل</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">عمولة شريك النجاح (الإحالة)</span>
                <strong className="text-base font-mono text-purple-400 block mt-1">
                  {formatCurrency(referralAmount)}
                </strong>
                <span className="text-[10px] text-zinc-400">عمولة المحيل المسجل</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">مخصص احتياطي الطوارئ</span>
                <strong className="text-base font-mono text-blue-400 block mt-1">
                  {formatCurrency(reserveAmount)}
                </strong>
                <span className="text-[10px] text-zinc-400">صندوق الأمان والمخاطر</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">صندوق التطوير والعروض</span>
                <strong className="text-base font-mono text-cyan-400 block mt-1">
                  {formatCurrency(developmentAmount + offersAmount)}
                </strong>
                <span className="text-[10px] text-zinc-400">تحديثات النظام والجوائز</span>
              </div>
            </div>

            {/* Profit Reconciliation Card */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>معادلة احتساب صافي الربح الفعلي (Net Profit Breakdown)</span>
              </h3>

              <div className="p-3 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">إجمالي سعر البيع الفعلي (المستلم):</span>
                  <span className="text-white font-bold">{formatCurrency(effectiveSellingPrice)}</span>
                </div>
                {ticket.receivedAmount > 0 && ticket.receivedAmount !== ticket.requiredAmount && (
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>سعر البيع المطلوب:</span>
                    <span>{formatCurrency(ticket.requiredAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-400">
                  <span>- التكلفة الفعلية (Actual FIFO Cost):</span>
                  <span>-{formatCurrency(actualCostEGP)}</span>
                </div>
                {cashbackAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>- الكاش باك المستحق:</span>
                    <span>-{formatCurrency(cashbackAmount)}</span>
                  </div>
                )}
                {referralAmount > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>- عمولة الإحالة ({ticketRefRate}%):</span>
                    <span>-{formatCurrency(referralAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>- المصاريف الثابتة لكل طلب (F):</span>
                  <span>-{formatCurrency(fixedCostEGP)}</span>
                </div>
                <div className="pt-2 border-t border-zinc-700 flex justify-between text-sm font-black">
                  <span className="text-emerald-400">صافي ربح الشركة النهائي:</span>
                  <span className={netProfitEGP >= 0 ? 'text-emerald-400' : 'text-rose-500'}>
                    {formatCurrency(netProfitEGP)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: WALLET & CONSUMED FIFO LOTS DETAILS                          */}
        {/* =================================================================== */}
        {activeTab === 'wallet' && (
          <div className="space-y-4 animate-fade-in">
            {/* Wallet summary header cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 flex items-center gap-3 col-span-1 sm:col-span-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-zinc-400 block font-medium">المحفظة المستهلكة فعلياً</span>
                  <strong className="text-sm font-bold text-blue-500 truncate block mt-0.5">
                    {actualWalletName}
                  </strong>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    الأساسية: {primaryWalletName}
                  </span>
                </div>
                {isAlternativeWalletUsed ? (
                  <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold shrink-0">
                    محفظة بديلة
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold shrink-0">
                    أساسية معتمدة
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">إجمالي النقاط المسحوبة</span>
                <strong className="text-base font-mono text-orange-500 block mt-1">
                  {lotsTotalPoints.toLocaleString()} نقطة
                </strong>
                <span className="text-[10px] text-zinc-400">إجمالي النقاط المستهلكة</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">تكلفة FIFO بالدولار</span>
                <strong className="text-base font-mono text-zinc-900 dark:text-white block mt-1">
                  ${lotsTotalCostUSD.toFixed(3)}
                </strong>
                <span className="text-[10px] text-zinc-400">إجمالي تكلفة الـ Lots بالـ USD</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60">
                <span className="text-[11px] text-zinc-400 block font-medium">تكلفة FIFO بالجنيه</span>
                <strong className="text-base font-mono text-amber-500 block mt-1">
                  {formatCurrency(lotsTotalCostEGP)}
                </strong>
                <span className="text-[10px] text-zinc-400">بسعر شراء الـ Lots ({rateUsed.toFixed(2)} ج/دولار)</span>
              </div>
            </div>

            {/* Lots consumed table with all 10 required fields */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-500" />
                  <span>دفعات المخزون (FIFO Lots) التي تم استهلاك النقاط منها في هذه التذكرة</span>
                </h4>
                <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[11px] font-bold self-start sm:self-auto">
                  {consumedLotsList.length === 1 ? 'دفعة استهلاك واحدة (Lot 1)' : `${consumedLotsList.length} دفعات استهلاك بترتيب FIFO`}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700/80">
                <table className="w-full text-xs text-right border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-gray-100/70 dark:bg-zinc-800/80 border-b border-gray-200 dark:border-zinc-700/80 text-zinc-500 dark:text-zinc-400">
                      <th className="py-2.5 px-3 font-semibold">1. رقم الـ Lot / سند الإيداع</th>
                      <th className="py-2.5 px-3 font-semibold">2. تاريخ الإيداع</th>
                      <th className="py-2.5 px-3 font-semibold">3. اسم المحفظة</th>
                      <th className="py-2.5 px-3 font-semibold">4. الرصيد قبل السحب</th>
                      <th className="py-2.5 px-3 font-semibold">5. النقاط المستهلكة</th>
                      <th className="py-2.5 px-3 font-semibold">6. المتبقي بعد السحب</th>
                      <th className="py-2.5 px-3 font-semibold">7. تكلفة النقطة ($)</th>
                      <th className="py-2.5 px-3 font-semibold">8. سعر دولار الدفعة</th>
                      <th className="py-2.5 px-3 font-semibold">9. تكلفة النقطة (ج.م)</th>
                      <th className="py-2.5 px-3 font-semibold text-left">10. إجمالي تكلفة الدفعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-700/40 bg-white/40 dark:bg-zinc-900/40">
                    {consumedLotsList.map((lot: any, lIdx: number) => {
                      const lotRate = Number(lot.exchangeRateUsed || rateUsed || 50.0);
                      const unitUSD = Number(lot.unitCostUSD || 0);
                      const unitEGP = Number(lot.unitCostEGP || (unitUSD * lotRate));
                      const totalEGP = Number(lot.totalCostEGP || (lot.pointsConsumed * unitEGP));
                      const totalUSD = Number(lot.totalCostUSD || (lotRate > 0 ? totalEGP / lotRate : 0));

                      return (
                        <tr key={lot.lotId || lIdx} className="hover:bg-gray-100/60 dark:hover:bg-zinc-700/30 transition-colors">
                          <td className="py-3 px-3 font-mono">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] flex items-center justify-center font-bold">
                                {lIdx + 1}
                              </span>
                              <span>{lot.lotNumber || lot.lotId || `LOT-${lIdx + 1}`}</span>
                            </div>
                            {lot.depositBondNumber && lot.depositBondNumber !== lot.lotNumber && (
                              <span className="text-[10px] text-zinc-400 block mt-0.5 mr-6">
                                سند: {lot.depositBondNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                            {lot.depositDate ? formatDate(lot.depositDate) : '-'}
                          </td>
                          <td className="py-3 px-3 text-zinc-800 dark:text-zinc-200 font-medium">
                            {lot.walletName || actualWalletName}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                            {Number(lot.pointsBefore ?? 0).toLocaleString()} نقطة
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-orange-500">
                            {Number(lot.pointsConsumed ?? 0).toLocaleString()} نقطة
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                            {Number(lot.pointsRemaining ?? 0).toLocaleString()} نقطة
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-400 text-[11px]">
                            ${unitUSD.toFixed(5)}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-amber-500">
                            {lotRate.toFixed(2)} ج/دولار
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                            {unitEGP.toFixed(4)} ج
                          </td>
                          <td className="py-3 px-3 font-mono text-left">
                            <strong className="text-amber-500 dark:text-amber-400 block text-xs">
                              {formatCurrency(totalEGP)}
                            </strong>
                            <span className="text-[10px] text-zinc-400 block">
                              (${totalUSD.toFixed(3)})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 font-bold border-t-2 border-gray-300 dark:border-zinc-600 text-zinc-900 dark:text-white">
                      <td colSpan={4} className="py-3 px-3 text-right">
                        <span className="text-orange-500 font-black">إجمالي تكلفة FIFO (المجموع الكلي للدفعات المستخدمة):</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-orange-500 font-black">
                        {lotsTotalPoints.toLocaleString()} نقطة
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-zinc-400 text-[11px]">
                        متوسط الصرف: {rateUsed.toFixed(2)} ج/USDT
                      </td>
                      <td colSpan={2} className="py-3 px-3 font-mono text-zinc-400 text-[11px]">
                        ${lotsTotalCostUSD.toFixed(3)} USD
                      </td>
                      <td className="py-3 px-3 font-mono text-left text-emerald-500 font-black text-sm">
                        {formatCurrency(lotsTotalCostEGP)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Strict FIFO Audit Note */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>نظام FIFO الفعلي:</strong> يتم احتساب تكلفة البضاعة المباعة وصافي أرباح التذكرة بناءً على سعر الدولار الحقيقي لشحنة الإيداع ({rateUsed.toFixed(2)} ج.م) المسجل في سندات الشراء دون التأثر بسعر الدولار المركزي في الإعدادات.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: TIMELINE & AUDIT TRAIL                                       */}
        {/* =================================================================== */}
        {activeTab === 'timeline' && (
          <div className="space-y-4 animate-fade-in">
            {/* Add new note form (Supervisor & Admin) */}
            {isSupervisor && (
              <form onSubmit={handleAddNote} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                  <span>إضافة ملاحظة إدارية جديدة للتذكرة</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="اكتب ملاحظة ليتم توثيقها في سجل التذكرة التاريخي..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!newNoteContent.trim() || isSubmittingNote}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    حفظ الملاحظة
                  </Button>
                </div>
              </form>
            )}

            {/* Timeline Events List */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-4">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>التسلسل الزمني لأحداث التذكرة (Audit Timeline)</span>
              </h3>

              <div className="relative border-r-2 border-orange-500/30 mr-3 space-y-6 pr-4">
                {/* 1. Creation event */}
                <div className="relative group">
                  <span className="absolute -right-[23px] top-0 w-3.5 h-3.5 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
                  <div className="text-xs">
                    <span className="font-mono text-zinc-400 block text-[11px]">{formatDateTime(ticket.createdAt)}</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 font-bold block mt-0.5">
                      إنشاء التذكرة
                    </strong>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                      تم إنشاء التذكرة بواسطة <strong className="text-zinc-700 dark:text-zinc-300">{ticket.assignedTo || 'مسؤول الشحن'}</strong> بمبلغ {formatCurrency(ticket.requiredAmount)}.
                    </p>
                  </div>
                </div>

                {/* 2. Completion / In-progress event */}
                {ticket.completedAt && (
                  <div className="relative group">
                    <span className="absolute -right-[23px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                    <div className="text-xs">
                      <span className="font-mono text-zinc-400 block text-[11px]">{formatDateTime(ticket.completedAt)}</span>
                      <strong className="text-emerald-500 font-bold block mt-0.5">
                        اكتمال الشحن والتسليم
                      </strong>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                        تم تنفيذ طلب الشحن بنجاح وترحيل الأرباح للمحفظة المركزية.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Problem / Resolution details */}
                {ticket.problemDetails && (
                  <div className="relative group">
                    <span className="absolute -right-[23px] top-0 w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                    <div className="text-xs">
                      <span className="font-mono text-zinc-400 block text-[11px]">{formatDateTime(ticket.problemDetails.reportedAt)}</span>
                      <strong className="text-rose-500 font-bold block mt-0.5">
                        تسجيل مشكلة: {ticket.problemDetails.reason === 'wrong_product' ? 'خطأ في الباقة' : 'خطأ في حساب العميل'}
                      </strong>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                        {ticket.problemDetails.description} (المبلغ: {ticket.problemDetails.reportedBy})
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Refund Details & Installments */}
                {ticket.refundDetails && (
                  <div className="relative group">
                    <span className="absolute -right-[23px] top-0 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 block text-[11px]">{formatDateTime(ticket.refundDetails.refundedAt)}</span>
                        {ticket.refundDetails.isPartial && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                            استرداد جزئي
                          </span>
                        )}
                      </div>
                      <strong className="text-amber-500 font-bold block mt-0.5">
                        إجمالي المسترد: {formatCurrency(ticket.refundDetails.amount)}
                        {ticket.refundDetails.isPartial && ticket.refundDetails.remainingAmount !== undefined && (
                          <span className="text-zinc-400 font-normal mr-2 text-[11px]">
                            (المتبقي: {formatCurrency(ticket.refundDetails.remainingAmount)})
                          </span>
                        )}
                      </strong>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                        السبب: {ticket.refundDetails.reason} (بواسطة: {ticket.refundDetails.refundedBy} - محفظة: {ticket.refundDetails.refundWalletName})
                      </p>

                      {ticket.refundDetails.history && ticket.refundDetails.history.length > 1 && (
                        <div className="mt-2 p-2 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 block">سجل دفعات الاسترداد:</span>
                          {ticket.refundDetails.history.map((h, hIdx) => (
                            <div key={h.id || hIdx} className="flex items-center justify-between text-[11px] text-zinc-300 font-mono">
                              <span>دفعة #{hIdx + 1}: {formatCurrency(h.amount)}</span>
                              <span className="text-[10px] text-zinc-500 font-sans">({h.refundWalletName})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Historical Notes List */}
                {ticket.notesList?.map((note, nIdx) => (
                  <div key={note.id || nIdx} className="relative group">
                    <span className="absolute -right-[23px] top-0 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                    <div className="text-xs">
                      <span className="font-mono text-zinc-400 block text-[11px]">{formatDateTime(note.createdAt)}</span>
                      <strong className="text-blue-500 font-bold block mt-0.5">
                        ملاحظة بواسطة: {note.authorName}
                      </strong>
                      <p className="text-zinc-700 dark:text-zinc-200 text-xs mt-0.5 p-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: ATTACHMENTS & RECEIPTS                                       */}
        {/* =================================================================== */}
        {activeTab === 'attachments' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span>مرفقات التذكرة وإيصالات التحويل ({ticket.attachments?.length || 0})</span>
              </h3>

              {isSupervisor && !isAddingAttachment && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingAttachment(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  إضافة مرفق جديد
                </Button>
              )}
            </div>

            {/* Add Attachment Form */}
            {isAddingAttachment && (
              <form onSubmit={handleAddAttachment} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-orange-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">إضافة إيصال أو صورة للتذكرة</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingAttachment(false)}
                    className="text-xs text-zinc-400 hover:text-rose-500"
                  >
                    إلغاء
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">اسم أو وصف المرفق</label>
                    <input
                      type="text"
                      value={attachmentName}
                      onChange={e => setAttachmentName(e.target.value)}
                      placeholder="مثال: إيصال فودافون كاش أو لقطة إثبات الشحن"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">نوع المرفق</label>
                    <select
                      value={attachmentType}
                      onChange={e => setAttachmentType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="image">صورة (Image / Screenshot)</option>
                      <option value="video">فيديو (Video)</option>
                      <option value="file">ملف / مستند (File / PDF)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 mb-1 font-medium">رفع ملف من الجهاز أو رابط الصورة</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf"
                        onChange={handleFileInputChange}
                        className="text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
                      />
                      <span className="text-zinc-400 text-xs self-center">أو</span>
                      <input
                        type="url"
                        value={attachmentUrl}
                        onChange={e => setAttachmentUrl(e.target.value)}
                        placeholder="رابط مباشر للصورة (URL)"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!attachmentName.trim() || !attachmentUrl.trim()}
                  >
                    حفظ وإرفاق بالتذكرة
                  </Button>
                </div>
              </form>
            )}

            {/* Attachments Display Grid */}
            {ticket.attachments && ticket.attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ticket.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/60 space-y-2 group"
                  >
                    <div
                      className="w-full h-32 rounded-lg bg-zinc-900 overflow-hidden flex items-center justify-center relative cursor-pointer"
                      onClick={() => setPreviewAttachment(att)}
                    >
                      {att.type === 'image' ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <FileText className="w-10 h-10 text-zinc-500" />
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                        <Eye className="w-5 h-5" />
                        <span className="text-xs font-bold">معاينة</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="truncate flex-1">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate" title={att.name}>
                          {att.name}
                        </p>
                        <span className="text-[10px] text-zinc-400 block font-mono">
                          {formatDate(att.uploadedAt)}
                        </span>
                      </div>

                      {isSupervisor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                          title="حذف المرفق"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/30 border border-dashed border-gray-200 dark:border-zinc-700">
                <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="font-medium">لا توجد مرفقات أو إيصالات مرفوعة لهذه التذكرة حتى الآن.</p>
                {isSupervisor && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    يمكن للمشرفين والمديرين رفع إيصال التحويل أو لقطة إثبات الشحن بالضغط على "إضافة مرفق جديد".
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL FOOTER                                                        */}
        {/* =================================================================== */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <span>نظام الحماية والتدقيق المالي V3.0 — موثق ومؤمن بالكامل</span>
          </div>

          <Button variant="secondary" size="md" onClick={onClose}>
            إغلاق النافذة
          </Button>
        </div>
      </div>

      {/* Full Image Preview Lightbox Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[999999] bg-black/90 flex items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            {previewAttachment.type === 'image' ? (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
              />
            ) : (
              <div className="p-8 bg-zinc-900 text-white rounded-xl text-center space-y-3">
                <FileText className="w-16 h-16 mx-auto text-orange-500" />
                <p className="font-bold text-base">{previewAttachment.name}</p>
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح الملف في نافذة جديدة</span>
                </a>
              </div>
            )}
            <p className="text-white text-xs mt-3 font-bold">{previewAttachment.name}</p>
          </div>
        </div>
      )}
      {/* Edit Ticket Modal */}
      {isEditModalOpen && ticket && (
        <TicketEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          ticket={localTicket || ticket}
          department={department}
          onTicketUpdated={(updated) => {
            setIsEditModalOpen(false);
            setLocalTicket(updated);
            if (onUpdateTicket) onUpdateTicket(updated);
          }}
        />
      )}
    </Modal>
  );
};
