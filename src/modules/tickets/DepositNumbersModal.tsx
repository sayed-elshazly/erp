import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet,
  Copy,
  Check,
  Phone,
  ShieldCheck,
  Send,
  MessageSquare,
  AlertCircle,
  Clock,
  Zap,
  Sparkles,
  Layers,
  Edit3,
  RotateCcw,
  Save,
  Eye,
  Settings2,
  FileText,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { StoreWallet } from '../../types/topup.types';

export interface DepositMessageTemplates {
  singleWalletTemplate: string;
  allWalletsHeader: string;
  allWalletsFooter: string;
}

export const DEPOSIT_TEMPLATES_STORAGE_KEY = 'nzm_jkr_deposit_message_templates';

export const DEFAULT_DEPOSIT_TEMPLATES: DepositMessageTemplates = {
  singleWalletTemplate: `مرحباً بك في مركز شحن ألعاب NZM JKR! 🎮✨
━━━━━━━━━━━━━━━
💳 للتحويل عبر محفظة: {اسم_المحفظة}
📱 رقم التحويل المعتمد: {رقم_التحويل}
{اسم_صاحب_الحساب}
━━━━━━━━━━━━━━━
⚠️ تنبيه هام: يرجى إرسال لقطة شاشة للتحويل فوراً بعد الدفع لتنفيذ طلبك سريعاً.
شكراً لثقتكم 🌟`,
  allWalletsHeader: `🎮 *أرقام ومحافظ التحويل والإيداع المعتمدة* ✨
━━━━━━━━━━━━━━━━━━━━━━━
يسعدنا استقبال مدفوعاتكم عبر أي من وسائل التحويل المعتمدة التالية:`,
  allWalletsFooter: `━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *تعليمات هامة لتنفيذ طلبك سريعاً:*
1️⃣ يرجى التأكد التام من صحة الرقم قبل إرسال المبلغ.
2️⃣ بعد التحويل، يرجى إرسال لقطة شاشة واضحة (سكرين شوت) لإشعار الدفع.
3️⃣ سيتم مراجعة الإشعار وشحن طلبك فوراً.

🌟 شكراً لتعاملكم معنا ونسعد دائماً بخدمتكم.`
};

const loadSavedTemplates = (): DepositMessageTemplates => {
  try {
    const saved = localStorage.getItem(DEPOSIT_TEMPLATES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        singleWalletTemplate: parsed.singleWalletTemplate || DEFAULT_DEPOSIT_TEMPLATES.singleWalletTemplate,
        allWalletsHeader: parsed.allWalletsHeader || DEFAULT_DEPOSIT_TEMPLATES.allWalletsHeader,
        allWalletsFooter: parsed.allWalletsFooter || DEFAULT_DEPOSIT_TEMPLATES.allWalletsFooter,
      };
    }
  } catch (e) {
    console.error('Failed to load deposit message templates', e);
  }
  return DEFAULT_DEPOSIT_TEMPLATES;
};

interface DepositNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositNumbersModal: React.FC<DepositNumbersModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';

  // Active Main Tab: 'numbers' (display) | 'customize' (edit templates)
  const [activeTab, setActiveTab] = useState<'numbers' | 'customize'>('numbers');
  // Sub-tab inside customize: 'single' | 'all'
  const [customizeSubTab, setCustomizeSubTab] = useState<'single' | 'all'>('single');

  // Saved templates state
  const [templates, setTemplates] = useState<DepositMessageTemplates>(loadSavedTemplates);
  // Form editing draft state
  const [draftTemplates, setDraftTemplates] = useState<DepositMessageTemplates>(loadSavedTemplates);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const singleTextareaRef = useRef<HTMLTextAreaElement>(null);

  const wallets = useMemo(() => db.getStoreWallets(), []);

  // Reload saved templates whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const loaded = loadSavedTemplates();
      setTemplates(loaded);
      setDraftTemplates(loaded);
    }
  }, [isOpen]);

  // Filter ONLY active operating transfer & receiving wallets
  const operatingWallets = useMemo(() => {
    return wallets.filter(w => {
      // 1. Exclude explicit system wallets
      if (w.isSystemWallet) return false;
      if (w.systemType && w.systemType.length > 0) return false;
      if (['w_profits', 'w_cashback', 'w_trust', 'w_referrals'].includes(w.id)) return false;
      if (w.type === 'trust' || w.type === 'profits' || w.type === 'inventory') return false;

      // 2. Exclude system account numbers
      const acc = (w.accountNumber || '').toUpperCase().trim();
      if (
        acc === 'CASHBACK-SYSTEM' ||
        acc === 'REFERRALS-SYSTEM' ||
        acc === 'TRUST-ESCROW' ||
        acc === 'NET-PROFITS-SAFE' ||
        acc === 'AP-US-INVENTORY' ||
        acc.includes('SYSTEM') ||
        acc.includes('ESCROW') ||
        acc.includes('INVENTORY')
      ) {
        return false;
      }

      // 3. Exclude by name / category keywords related to system, referrals, cashback, escrow, debts, or net profits
      const name = (w.name || '').toLowerCase();
      const cat = (w.category || '').toLowerCase();
      const isSystemRelated =
        name.includes('كاش باك') ||
        name.includes('الكاش باك') ||
        name.includes('الإحالات') ||
        name.includes('العمولات') ||
        name.includes('الأمانات') ||
        name.includes('الديون') ||
        name.includes('الأرباح الصافية') ||
        name.includes('تصفية شهرية') ||
        name.includes('خزينة usdt') ||
        name.includes('system') ||
        name.includes('escrow') ||
        cat.includes('أمانات') ||
        cat.includes('أرباح') ||
        cat.includes('إحالات');
      if (isSystemRelated) return false;

      // 4. Exclude frozen wallets
      if (w.isFrozen || w.status === 'frozen' || w.status === 'disabled') return false;

      // 5. Must have at least one active line or a valid deposit account number
      const activeNumbers = (w.numbers || []).filter(n => n.status !== 'frozen');
      const hasValidAccNumber = w.accountNumber && w.accountNumber.trim().length > 3 && !w.accountNumber.includes('-');
      if (activeNumbers.length === 0 && !hasValidAccNumber) {
        return false;
      }

      // 6. Must be an operating cash, instapay, or bank receiving wallet
      return (
        w.type === 'operating' ||
        w.allowWithdrawal !== false ||
        name.includes('فودافون') ||
        name.includes('أورنج') ||
        name.includes('اورنج') ||
        name.includes('اتصالات') ||
        name.includes('وي') ||
        name.includes('instapay') ||
        name.includes('إنستاباي') ||
        name.includes('انستاباي') ||
        name.includes('بنك') ||
        name.includes('تحويل') ||
        name.includes('كاش')
      );
    });
  }, [wallets]);

  // Helper function to remove the word "الرئيسي" from account holder names
  const cleanAccountHolder = (name?: string): string => {
    if (!name) return '';
    const cleaned = name
      .replace(/\(?\s*الرقم الرئيسي\s*\)?/gi, '')
      .replace(/\(?\s*الرئيسي\s*\)?/gi, '')
      .replace(/[-–—]\s*الرئيسي/gi, '')
      .trim();
    return cleaned;
  };

  // Helper function to format single wallet message
  const formatSingleWalletMessage = (templateText: string, w: StoreWallet): string => {
    const activeNums = (w.numbers || []).filter(n => n.status !== 'frozen');
    const pref = activeNums.find(n => n.isPrimary) || activeNums[0];
    const phone = pref ? pref.phoneNumber : (w.accountNumber || 'غير محدد');
    const cleanHolder = cleanAccountHolder(pref?.accountHolderName);
    const holderText = cleanHolder ? `👤 صاحب الحساب: ${cleanHolder}` : '';

    let formatted = templateText
      .replace(/\{اسم_المحفظة\}|\{wallet_name\}/g, w.name || '')
      .replace(/\{رقم_التحويل\}|\{phone_number\}/g, phone)
      .replace(/\{اسم_صاحب_الحساب\}|\{account_holder\}/g, holderText);

    // Clean up empty lines if holderText is empty
    formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
    return formatted.trim();
  };

  // Helper function to format all wallets message
  const formatAllWalletsMessage = (headerText: string, footerText: string, wList: StoreWallet[]): string => {
    const lines: string[] = [];
    if (headerText.trim()) {
      lines.push(headerText.trim());
      lines.push('');
    }

    wList.forEach(w => {
      const activeNums = (w.numbers || []).filter(n => n.status !== 'frozen');
      const pref = activeNums.find(n => n.isPrimary) || activeNums[0];

      lines.push(`💳 *${w.name}*`);
      if (pref) {
        const cleanHolder = cleanAccountHolder(pref.accountHolderName);
        const holder = cleanHolder ? ` (${cleanHolder})` : '';
        lines.push(`   📱 رقم التحويل: \`${pref.phoneNumber}\`${holder}`);
      } else if (w.accountNumber) {
        lines.push(`   📱 رقم/حساب التحويل: \`${w.accountNumber}\``);
      }
      lines.push('');
    });

    if (footerText.trim()) {
      lines.push(footerText.trim());
    }

    return lines.join('\n');
  };

  const handleCopy = async (text: string, key: string, label: string) => {
    const success = await copyToClipboard(text, label, showToast);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Copy single wallet formatted message
  const handleCopyFormattedMessage = async (w: StoreWallet) => {
    const message = formatSingleWalletMessage(templates.singleWalletTemplate, w);
    const success = await copyToClipboard(message, `رسالة محفظة (${w.name})`, showToast);
    if (success) {
      setCopiedKey(`tpl_${w.id}`);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Copy all deposit numbers combined message
  const handleCopyAllDepositNumbersMessage = async () => {
    if (operatingWallets.length === 0) {
      showToast('warning', 'تنبيه', 'لا توجد محافظ إيداع أو أرقام تحويل متاحة حالياً');
      return;
    }

    const message = formatAllWalletsMessage(templates.allWalletsHeader, templates.allWalletsFooter, operatingWallets);
    const success = await copyToClipboard(message, `رسالة الأرقام المفضلة (${operatingWallets.length} محفظة)`, showToast);
    if (success) {
      setCopiedKey('all_numbers_message');
      setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  // Save customized templates
  const handleSaveTemplates = () => {
    try {
      localStorage.setItem(DEPOSIT_TEMPLATES_STORAGE_KEY, JSON.stringify(draftTemplates));
      setTemplates(draftTemplates);
      showToast('success', 'تم الحفظ', 'تم حفظ نصوص رسائل الإيداع بنجاح وتطبيقها على جميع المحافظ');
    } catch (e) {
      showToast('error', 'خطأ', 'تعذر حفظ نصوص الرسائل في التخزين المحلي');
    }
  };

  // Reset to default templates
  const handleResetTemplates = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في استعادة النصوص الافتراضية؟')) {
      setDraftTemplates(DEFAULT_DEPOSIT_TEMPLATES);
      setTemplates(DEFAULT_DEPOSIT_TEMPLATES);
      localStorage.removeItem(DEPOSIT_TEMPLATES_STORAGE_KEY);
      showToast('info', 'تم الاسترجاع', 'تمت استعادة نصوص الرسائل الافتراضية');
    }
  };

  // Insert variable into single wallet textarea
  const insertVariableIntoSingleTemplate = (variableTag: string) => {
    const textarea = singleTextareaRef.current;
    if (!textarea) {
      setDraftTemplates(prev => ({
        ...prev,
        singleWalletTemplate: prev.singleWalletTemplate + ' ' + variableTag
      }));
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentText = draftTemplates.singleWalletTemplate;

    const newText = currentText.substring(0, startPos) + variableTag + currentText.substring(endPos);
    setDraftTemplates(prev => ({
      ...prev,
      singleWalletTemplate: newText
    }));

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + variableTag.length, startPos + variableTag.length);
    }, 50);
  };

  // Sample wallet for live preview
  const previewWallet: StoreWallet = useMemo(() => {
    if (operatingWallets.length > 0) return operatingWallets[0];
    return {
      id: 'preview_wallet',
      name: 'فودافون كاش',
      balance: 15000,
      currency: 'EGP',
      type: 'operating',
      category: 'فودافون كاش',
      numbers: [
        {
          id: 'num_prev',
          phoneNumber: '01012345678',
          accountHolderName: 'أحمد محمد علي',
          isPrimary: true,
          dailyLimit: 30000,
          dailyReceived: 8500,
          dailySent: 2000,
          status: 'active'
        }
      ]
    } as unknown as StoreWallet;
  }, [operatingWallets]);

  // Live previews
  const liveSinglePreview = useMemo(() => {
    return formatSingleWalletMessage(draftTemplates.singleWalletTemplate, previewWallet);
  }, [draftTemplates.singleWalletTemplate, previewWallet]);

  const liveAllPreview = useMemo(() => {
    const sampleList = operatingWallets.length > 0 ? operatingWallets.slice(0, 3) : [previewWallet];
    return formatAllWalletsMessage(draftTemplates.allWalletsHeader, draftTemplates.allWalletsFooter, sampleList);
  }, [draftTemplates.allWalletsHeader, draftTemplates.allWalletsFooter, operatingWallets, previewWallet]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💳 أرقام الإيداع ومحافظ التشغيل المعتمدة (Deposit Numbers)"
      subtitle="عرض ومشاركة أرقام استقبال المدفوعات وتخصيص نص الرسائل المرسلة للعملاء والتجار"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-zinc-800/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('numbers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'numbers'
                  ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>أرقام ومحافظ الإيداع ({operatingWallets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customize')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'customize'
                  ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>تعديل نصوص الرسائل</span>
              <span className="px-1.5 py-0.2 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px]">
                تخصيص
              </span>
            </button>
          </div>

          {activeTab === 'numbers' && (
            <button
              type="button"
              onClick={() => setActiveTab('customize')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 font-bold text-xs transition-colors cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              <span>تخصيص نص الرسائل</span>
            </button>
          )}
        </div>

        {/* TAB 1: NUMBERS & WALLETS VIEW */}
        {activeTab === 'numbers' && (
          <div className="space-y-4">
            {/* Quick Action: Copy All Deposit Numbers in One Message */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                    مشاركة جميع أرقام ومحافظ الإيداع للعميل بنقرة واحدة
                  </strong>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    توليد رسالة واتساب منسقة تحتوي على الأرقام المفضلة المعتمدة لكافة المحافظ ({operatingWallets.length} محفظة إيداع)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('customize');
                    setCustomizeSubTab('all');
                  }}
                  className="px-3 py-2 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="تعديل مقدمة وخاتمة رسالة جميع الأرقام"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تعديل النص</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllDepositNumbersMessage}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-sm ${
                    copiedKey === 'all_numbers_message'
                      ? 'bg-emerald-600 text-white scale-100 ring-2 ring-emerald-400/40'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                  }`}
                >
                  {copiedKey === 'all_numbers_message' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم نسخ الرسالة الشاملة ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ جميع الأرقام في رسالة واحدة 📋</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="font-bold">
                  يعرض النظام الرقم المفضل المعتمد لكل محفظة، ويمكنك تخصيص صيغة الرسالة عبر زر "تعديل نصوص الرسائل".
                </span>
              </div>
              <Badge variant="warning" size="sm">
                {operatingWallets.length} محافظ متاحة (بالرقم المفضل)
              </Badge>
            </div>

            {/* Operating Wallets List */}
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {operatingWallets.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 bg-gray-50 dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] p-6 space-y-2">
                  <Wallet className="w-10 h-10 mx-auto opacity-30 text-orange-500" />
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">لا توجد محافظ تشغيل واستقبال مفعلة حالياً</p>
                  <p className="text-xs text-zinc-500">تم استبعاد محافظ النظام الآلية (الكاش باك، الإحالات، الأمانات، والأرباح)</p>
                </div>
              ) : (
                operatingWallets.map(w => {
                  const activeNumbers = (w.numbers || []).filter(n => n.status !== 'frozen');
                  const preferredNumberItem = activeNumbers.find(n => n.isPrimary) || activeNumbers[0];
                  const primaryPhoneNumber = preferredNumberItem?.phoneNumber || w.accountNumber || 'غير محدد';

                  const dailyReceiveRem = preferredNumberItem
                    ? Math.max(0, (preferredNumberItem.dailyLimit || 30000) - (preferredNumberItem.dailyReceived || 0))
                    : Math.max(0, (w.dailyLimit || 30000) - (w.dailyIncome || 0));

                  const dailySendRem = preferredNumberItem
                    ? Math.max(0, (preferredNumberItem.dailySendLimit || 30000) - (preferredNumberItem.dailySent || 0))
                    : Math.max(0, (w.dailyLimit || 30000) - (w.dailySent || 0));

                  return (
                    <div
                      key={w.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3 hover:border-orange-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-bold">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <strong className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                              {w.name}
                            </strong>
                            <span className="text-zinc-400 text-[11px] font-mono">
                              {w.category || 'محفظة تحويل واستقبال'} • الرصيد: {formatCurrency(w.balance, w.currency)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyFormattedMessage(w)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="نسخ قالب رسالة الدفع الكاملة للواتساب لهذه المحفظة"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{copiedKey === `tpl_${w.id}` ? 'تم نسخ القالب ✓' : 'نسخ رسالة المحفظة'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Preferred Number Display Only */}
                      <div className="space-y-2">
                        {preferredNumberItem ? (
                          <div
                            className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                              <strong className="font-mono font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-wide">
                                {preferredNumberItem.phoneNumber}
                              </strong>
                              {(() => {
                                const cleanName = cleanAccountHolder(preferredNumberItem.accountHolderName);
                                return cleanName ? (
                                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                                    ({cleanName})
                                  </span>
                                ) : null;
                              })()}
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                                ⭐ الرقم المفضل
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-mono text-[10px]">
                              <span className="text-emerald-500 font-bold">
                                متبقي استقبال: <strong>{formatCurrency(dailyReceiveRem, w.currency)}</strong>
                              </span>
                              <span className="text-blue-400 hidden sm:inline">
                                متبقي إرسال: <strong>{formatCurrency(dailySendRem, w.currency)}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(preferredNumberItem.phoneNumber, `num_${preferredNumberItem.id || w.id}`, 'رقم التحويل المفضل')}
                                className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === `num_${preferredNumberItem.id || w.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ الرقم</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
                            <div className="flex items-center gap-2 font-mono text-sm font-black text-zinc-900 dark:text-zinc-100">
                              <Phone className="w-4 h-4 text-orange-500" />
                              <span>{primaryPhoneNumber}</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                ⭐ الرقم المعتمد
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(primaryPhoneNumber, `num_${w.id}`, 'رقم المحفظة')}
                              className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرقم</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMIZE MESSAGE TEMPLATES */}
        {activeTab === 'customize' && (
          <div className="space-y-4">
            {/* Sub-tabs for template types */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizeSubTab('single')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    customizeSubTab === 'single'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-orange-500'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>رسالة المحفظة الفردية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomizeSubTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    customizeSubTab === 'all'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-orange-500'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>رسالة جميع المحافظ الشاملة</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetTemplates}
                  className="px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="استرجاع النص الأصلي الافتراضي"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة الافتراضي</span>
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveTemplates}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Save className="w-4 h-4 ml-1" />
                  حفظ التعديلات
                </Button>
              </div>
            </div>

            {/* SINGLE WALLET TEMPLATE EDITOR */}
            {customizeSubTab === 'single' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Editor Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <span>قالب رسالة المحفظة الفردية:</span>
                    </label>
                    <span className="text-[11px] text-zinc-400">انقر على المتغير لإدراجه في النص</span>
                  </div>

                  {/* Available Variables Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20">
                    <span className="text-[11px] font-bold text-orange-500">متغيرات ذكية:</span>
                    <button
                      type="button"
                      onClick={() => insertVariableIntoSingleTemplate('{اسم_المحفظة}')}
                      className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 font-mono text-[11px] font-bold transition-all cursor-pointer"
                      title="يتم استبداله باسم المحفظة تلقائياً"
                    >
                      + {'{اسم_المحفظة}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableIntoSingleTemplate('{رقم_التحويل}')}
                      className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 font-mono text-[11px] font-bold transition-all cursor-pointer"
                      title="يتم استبداله بالرقم المفضل تلقائياً"
                    >
                      + {'{رقم_التحويل}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableIntoSingleTemplate('{اسم_صاحب_الحساب}')}
                      className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 font-mono text-[11px] font-bold transition-all cursor-pointer"
                      title="يتم استبداله باسم صاحب الخط إن وجد"
                    >
                      + {'{اسم_صاحب_الحساب}'}
                    </button>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={singleTextareaRef}
                    rows={10}
                    value={draftTemplates.singleWalletTemplate}
                    onChange={e => setDraftTemplates(prev => ({ ...prev, singleWalletTemplate: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden leading-relaxed"
                    placeholder="اكتب نص الرسالة هنا مع استخدام المتغيرات..."
                  />

                  <p className="text-[11px] text-zinc-500">
                    💡 هذه الرسالة تظهر عند الضغط على زر <strong className="text-emerald-500">"نسخ رسالة المحفظة"</strong> بجوار أي محفظة.
                  </p>
                </div>

                {/* Live Preview Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-emerald-500" />
                      <span>معاينة حية لشكل الرسالة في الواتساب:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopy(liveSinglePreview, 'preview_single', 'معاينة الرسالة')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'preview_single' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'preview_single' ? 'تم النسخ' : 'نسخ المعاينة'}</span>
                    </button>
                  </div>

                  {/* WhatsApp Bubble Preview */}
                  <div className="p-4 rounded-2xl bg-[#EFEAE2] dark:bg-[#111B21] border border-gray-300 dark:border-zinc-800 shadow-inner min-h-[220px] flex flex-col justify-start">
                    <div className="max-w-[95%] p-3.5 rounded-2xl rounded-tr-xs bg-[#D9FDD3] dark:bg-[#005C4B] text-zinc-900 dark:text-zinc-100 shadow-xs space-y-1.5 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {liveSinglePreview}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 text-[11px] text-zinc-500">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">ملاحظة:</span> المعاينة الحية تستخدم بيانات تجريبية لأول محفظة معتمدة للتأكد من تناسق النصوص قبل الحفظ.
                  </div>
                </div>
              </div>
            )}

            {/* ALL WALLETS COMBINED TEMPLATE EDITOR */}
            {customizeSubTab === 'all' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Editor Column */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>مقدمة الرسالة الشاملة (Header):</span>
                    </label>
                    <textarea
                      rows={3}
                      value={draftTemplates.allWalletsHeader}
                      onChange={e => setDraftTemplates(prev => ({ ...prev, allWalletsHeader: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden leading-relaxed"
                      placeholder="اكتب الترحيب وعنوان الرسالة..."
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-dashed border-gray-300 dark:border-zinc-700 text-center text-zinc-500 text-[11px]">
                    ⚡ [يتم إدراج قائمة أرقام ومحافظ التشغيل المعتمدة تلقائياً في المنتصف بين المقدمة والخاتمة]
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span>خاتمة الرسالة وتعليمات التحويل (Footer):</span>
                    </label>
                    <textarea
                      rows={6}
                      value={draftTemplates.allWalletsFooter}
                      onChange={e => setDraftTemplates(prev => ({ ...prev, allWalletsFooter: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden leading-relaxed"
                      placeholder="اكتب التنبيهات والشكر في نهاية الرسالة..."
                    />
                  </div>
                </div>

                {/* Live Preview Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-emerald-500" />
                      <span>معاينة حية للرسالة الشاملة:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopy(liveAllPreview, 'preview_all', 'معاينة الرسالة الشاملة')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'preview_all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'preview_all' ? 'تم النسخ' : 'نسخ المعاينة'}</span>
                    </button>
                  </div>

                  {/* WhatsApp Bubble Preview */}
                  <div className="p-4 rounded-2xl bg-[#EFEAE2] dark:bg-[#111B21] border border-gray-300 dark:border-zinc-800 shadow-inner max-h-[300px] overflow-y-auto flex flex-col justify-start">
                    <div className="max-w-[95%] p-3.5 rounded-2xl rounded-tr-xs bg-[#D9FDD3] dark:bg-[#005C4B] text-zinc-900 dark:text-zinc-100 shadow-xs space-y-1.5 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {liveAllPreview}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('numbers')}
                className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-bold cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لعرض الأرقام والمحافظ</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleSaveTemplates}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 ml-1" />
                  <span>حفظ نصوص الرسائل</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
