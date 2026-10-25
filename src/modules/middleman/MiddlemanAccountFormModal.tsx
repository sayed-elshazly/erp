// =============================================================
// NZM JKR TOP UP ERP — Game Account Asset Form Modal
// =============================================================

import React, { useState, useMemo } from 'react';
import { GameAccountAsset, AccountRating, AccountAssetStatus } from '../../types/middleman.types';
import { Customer } from '../../types/customer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import {
  Gamepad2,
  Lock,
  DollarSign,
  User,
  UserPlus,
  ShieldCheck,
  Save,
  Search,
  Image as ImageIcon,
  Star,
  CheckCircle2,
  UploadCloud,
  Film,
  X,
  Play,
  Trash2,
  Camera,
  FileVideo
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface MiddlemanAccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: GameAccountAsset) => void;
  existingAccount?: GameAccountAsset | null;
}

export const MiddlemanAccountFormModal: React.FC<MiddlemanAccountFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingAccount
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const allCustomers = db.getMiddlemanClients();

  // Active (non-frozen) customers
  const activeCustomers = useMemo(() => {
    return allCustomers.filter((c: Customer) => !c.isFrozen && c.status !== 'frozen' && c.status !== 'suspended');
  }, [allCustomers]);

  // Quick Customer State
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState(existingAccount?.title || '');
  const [gameName, setGameName] = useState(existingAccount?.gameName || 'PUBG Mobile');
  const [accountIdentifier, setAccountIdentifier] = useState(existingAccount?.accountIdentifier || '');
  const [email, setEmail] = useState(existingAccount?.email || '');
  const [phone, setPhone] = useState(existingAccount?.phone || '');
  const [password, setPassword] = useState(existingAccount?.password || '');
  const [securityDetails, setSecurityDetails] = useState(existingAccount?.securityDetails || '');
  const [accountLevel, setAccountLevel] = useState(existingAccount?.accountLevel || '');
  const [rating, setRating] = useState<AccountRating>(existingAccount?.rating || 'strong');
  const [status, setStatus] = useState<AccountAssetStatus>(existingAccount?.status || 'available');

  // Quantity Tracking
  const [availableQuantity, setAvailableQuantity] = useState<number>(
    existingAccount?.availableQuantity !== undefined ? existingAccount.availableQuantity : 1
  );

  // Direct Media State (Direct file upload support)
  const [images, setImages] = useState<string[]>(existingAccount?.images || []);
  const [videoUrl, setVideoUrl] = useState<string>(existingAccount?.videoUrl || '');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [notes, setNotes] = useState(existingAccount?.notes || '');

  // Financials
  const [purchaseCostEGP, setPurchaseCostEGP] = useState<number>(existingAccount?.purchaseCostEGP || 1000);
  const [expectedSellingPriceEGP, setExpectedSellingPriceEGP] = useState<number>(
    existingAccount?.expectedSellingPriceEGP || 1500
  );

  // Seller Search
  const [sellerSearch, setSellerSearch] = useState(
    existingAccount ? `${existingAccount.sellerName} (${existingAccount.sellerPhone})` : ''
  );
  const [selectedSeller, setSelectedSeller] = useState<Customer | null>(() => {
    if (existingAccount?.sellerId) {
      return allCustomers.find((c: Customer) => c.id === existingAccount.sellerId) || null;
    }
    return null;
  });
  const [purchasedFromPhone, setPurchasedFromPhone] = useState(
    existingAccount?.purchasedFromPhone || existingAccount?.sellerPhone || ''
  );

  // Matching Sellers (Active Only)
  const matchingSellers = sellerSearch && (!selectedSeller || !sellerSearch.includes(selectedSeller.name))
    ? activeCustomers.filter((c: Customer) => c.name.toLowerCase().includes(sellerSearch.toLowerCase()) || c.phone.includes(sellerSearch)).slice(0, 5)
    : [];

  const handleQuickCustomerSave = (custData: Partial<Customer>) => {
    const newCust = {
      ...custData,
      id: `brk_cust_${Date.now()}`,
      code: `BRK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Customer;
    db.saveMiddlemanClient(newCust, { id: user?.id, name: user?.fullName, role: user?.role });
    setSelectedSeller(newCust);
    setSellerSearch(`${newCust.name} (${newCust.phone})`);
    setPurchasedFromPhone(newCust.phone);
    setIsQuickCustomerOpen(false);
    showToast('success', 'تم تسجيل العميل', `تم ربط البائع "${newCust.name}" بالحساب`);
  };

  const handleImageFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validImageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (validImageFiles.length === 0) {
      showToast('error', 'ملف غير صالح', 'يرجى اختيار صور فقط (JPG, PNG, WebP)');
      return;
    }

    setIsUploadingImage(true);
    let loadedCount = 0;
    const newImages: string[] = [];

    validImageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) newImages.push(res);
        loadedCount++;
        if (loadedCount === validImageFiles.length) {
          setImages(prev => [...prev, ...newImages]);
          setIsUploadingImage(false);
          showToast('success', 'تم رفع الصور', `تمت إضافة ${newImages.length} صور بنجاح`);
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === validImageFiles.length) {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleVideoFile = (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      showToast('error', 'صيغة فيديو غير مدعومة', 'يرجى اختيار ملف فيديو بصيغة MP4 أو WebM');
      return;
    }

    if (file.size > 150 * 1024 * 1024) {
      showToast('warning', 'حجم الفيديو كبير', 'يفضل رفع فيديو بحجم أقل من 100 ميغابايت للحفاظ على كفاءة الذاكرة');
    }

    setIsUploadingVideo(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      if (res) {
        setVideoUrl(res);
        showToast('success', 'تم رفع الفيديو', 'تم رفع وتضمين الفيديو بنجاح');
      }
      setIsUploadingVideo(false);
    };
    reader.onerror = () => {
      showToast('error', 'خطأ في القراءة', 'تعذر قراءة ملف الفيديو');
      setIsUploadingVideo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
  };

  const expectedProfitEGP = Math.max(0, expectedSellingPriceEGP - purchaseCostEGP);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSeller) {
      showToast('error', 'البائع مطلوب', 'يرجى تحديد العميل الذي تم شراء الحساب منه أو إضافة عميل جديد');
      return;
    }
    if (selectedSeller.isFrozen || selectedSeller.status === 'frozen' || selectedSeller.status === 'suspended') {
      showToast('error', 'حساب مجمد', `حساب البائع (${selectedSeller.name}) مجمد أو معلق في النظام ولا يمكن الشراء منه.`);
      return;
    }
    if (!title.trim()) {
      showToast('error', 'العنوان مطلوب', 'يرجى كتابة عنوان ووصف مختصر للحساب');
      return;
    }
    if (purchaseCostEGP <= 0) {
      showToast('error', 'التكلفة غير صحيحة', 'تكلفة الشراء يجب أن تكون أكبر من الصفر');
      return;
    }

    const qty = Math.max(1, availableQuantity);
    const accountCode = existingAccount?.accountCode || `ACC-${Math.floor(2000 + Math.random() * 8000)}`;

    const newAccount: GameAccountAsset = {
      id: existingAccount?.id || 'acc_' + Date.now(),
      accountCode,
      title: title.trim(),
      gameName: gameName.trim(),
      accountIdentifier: accountIdentifier.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: password.trim(),
      securityDetails: securityDetails.trim(),
      accountLevel,
      rating,

      images: images.length > 0 ? images : existingAccount?.images || [],
      videoUrl: videoUrl || existingAccount?.videoUrl || undefined,
      notes: notes.trim(),

      purchaseCostEGP,
      expectedSellingPriceEGP,
      expectedProfitEGP,
      actualSalePriceEGP: existingAccount?.actualSalePriceEGP,
      netRealizedProfitEGP: existingAccount?.netRealizedProfitEGP,

      initialQuantity: existingAccount?.initialQuantity || qty,
      availableQuantity: qty,
      soldQuantity: existingAccount?.soldQuantity || 0,
      salesHistory: existingAccount?.salesHistory || [],
      lastSoldAt: existingAccount?.lastSoldAt,
      lastBuyerName: existingAccount?.lastBuyerName,
      lastBuyerPhone: existingAccount?.lastBuyerPhone,

      status: qty <= 0 ? 'sold' : status,
      sellerId: selectedSeller.id,
      sellerName: selectedSeller.name,
      sellerPhone: selectedSeller.phone,
      purchasedFromPhone: purchasedFromPhone.trim() || selectedSeller.phone,
      purchasedAt: existingAccount?.purchasedAt || new Date().toISOString(),
      purchasedBy: existingAccount?.purchasedBy || user?.fullName || 'المدير العام',

      saleRecord: existingAccount?.saleRecord,

      createdAt: existingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveMiddlemanAccount(newAccount, { id: user?.id, name: user?.fullName, role: user?.role });
    showToast('success', 'تم حفظ الحساب', `تم حفظ الحساب #${saved.accountCode} في المخزن بنجاح`);
    onSuccess(saved);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={existingAccount ? `تعديل الحساب بالمخزن #${existingAccount.accountCode}` : 'إضافة حساب جديد لمخزن الأصول (New Game Account Asset)'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs" dir="rtl">
          {/* 1. Account Basic Info */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
              <Gamepad2 className="w-4 h-4 text-amber-500" />
              <span>١. بيانات الحساب الأساسية واللعبة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="عنوان الحساب / الوصف المختصر *"
                  placeholder="مثال: حساب ببجي ميثك لفل 70 مع إمفور ثلجي ماكس"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="اسم اللعبة *"
                  placeholder="مثال: PUBG, Valorant, Free Fire, Roblox, FC 26..."
                  value={gameName}
                  onChange={e => setGameName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="معرف اللاعب (Player ID / Game ID)"
                  placeholder="مثال: 5129481023"
                  value={accountIdentifier}
                  onChange={e => setAccountIdentifier(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="مستوى الحساب / الرانك (Level / Rank)"
                  placeholder="مثال: Level 68 / Conqueror"
                  value={accountLevel}
                  onChange={e => setAccountLevel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">تقييم الحساب:</label>
                <select
                  value={rating}
                  onChange={e => setRating(e.target.value as any)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 font-bold focus:outline-none"
                >
                  <option value="weak">ضعيف (Weak)</option>
                  <option value="medium">متوسط (Medium)</option>
                  <option value="strong">قوي (Strong)</option>
                  <option value="very_strong">قوي جداً (Very Strong ★)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* 2. Security & Credentials */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>٢. بيانات الدخول والأمان والروابط (مشفرة ومحمية)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Input
                  label="البريد الإلكتروني الأساسي"
                  placeholder="user@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="رقم الهاتف المرتبط"
                  placeholder="010..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="كلمة المرور الحالية"
                  type="text"
                  placeholder="Password..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <div className="sm:col-span-3">
                <Input
                  label="وسائل الحماية والروابط المتاحة (2FA / Recovery)"
                  placeholder="مثال: الربط تويتر متاح للتغيير، الإيميل تم تغيير كلمة سره، لا يوجد طرف ثالث"
                  value={securityDetails}
                  onChange={e => setSecurityDetails(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* 3. Seller Linkage & Financial Valuation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seller Linkage */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] relative">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-500" /> البائع (الذي تم الشراء منه) *
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(true)}
                  className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" /> عميل جديد
                </button>
              </div>

              <div className="relative">
                <Input
                  placeholder="ابحث بالاسم أو الهاتف..."
                  value={sellerSearch}
                  onChange={e => {
                    setSellerSearch(e.target.value);
                    if (selectedSeller) setSelectedSeller(null);
                  }}
                  icon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
                />

                {matchingSellers.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-[#27272A]">
                    {matchingSellers.map((c: Customer) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedSeller(c);
                          setSellerSearch(`${c.name} (${c.phone})`);
                          setPurchasedFromPhone(c.phone);
                        }}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                        </div>
                        <Badge variant="success" size="sm">اختيار</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Input
                label="رقم الهاتف الذي تم الشراء والتحويل له"
                value={purchasedFromPhone}
                onChange={e => setPurchasedFromPhone(e.target.value)}
              />
            </Card>

            {/* Financial Valuation */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-500" /> التقييم المالي والأرباح المتوقعة
                </span>
                <Badge variant="warning" size="sm">أصل رقمي</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="سعر الشراء (التكلفة) ج *"
                  type="number"
                  step="any"
                  value={purchaseCostEGP}
                  onChange={e => setPurchaseCostEGP(parseFloat(e.target.value) || 0)}
                  required
                />
                <Input
                  label="سعر البيع المتوقع ج *"
                  type="number"
                  step="any"
                  value={expectedSellingPriceEGP}
                  onChange={e => setExpectedSellingPriceEGP(parseFloat(e.target.value) || 0)}
                  required
                />
                <Input
                  label="الكمية المتوفرة بالمخزن *"
                  type="number"
                  min="0.0001"
                  step="any"
                  value={availableQuantity}
                  onChange={e => setAvailableQuantity(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center font-mono font-bold text-emerald-500 text-xs">
                صافي الربح المتوقع لكل نسخة: +{formatCurrency(expectedProfitEGP)}
                {availableQuantity > 1 && (
                  <span className="text-zinc-400 font-normal mr-2">
                    (إجمالي الربح المتوقع للكمية: +{formatCurrency(expectedProfitEGP * availableQuantity)})
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* 4. Media & Notes (Direct File Uploads: Images & Video) */}
          <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>٤. وسائط الحساب المباشرة (صور متعددة + فيديو استعراض)</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {images.length} صور • {videoUrl ? 'فيديو مرفوع 🎥' : 'لا يوجد فيديو'}
              </span>
            </div>

            {/* Images Upload Zone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span>صور الحساب (رفع صورة واحدة أو أكثر - سحب وإفلات أو اختيار)</span>
                </label>
                <span className="text-[10px] text-zinc-400">JPG, PNG, WebP</span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDraggingImage(true);
                }}
                onDragLeave={() => setIsDraggingImage(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingImage(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleImageFiles(e.dataTransfer.files);
                  }
                }}
                className={`p-4 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                  isDraggingImage
                    ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-amber-500/50 bg-gray-50/50 dark:bg-[#141417]'
                }`}
                onClick={() => {
                  const input = document.getElementById('account-image-upload-input');
                  if (input) input.click();
                }}
              >
                <input
                  id="account-image-upload-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageFiles(e.target.files);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block">
                      اسحب وأفلت الصور هنا أو اضغط للاختيار من جهازك
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      يمكنك تحديد عدة صور دفعة واحدة وتظهر المعاينة فوراً قبل الحفظ
                    </span>
                  </div>
                  {isUploadingImage && (
                    <span className="text-xs text-amber-500 font-bold animate-pulse">جارٍ معالجة ورفع الصور...</span>
                  )}
                </div>
              </div>

              {/* Images Preview Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-black/40 shadow-xs"
                    >
                      <img
                        src={img}
                        alt={`Account preview ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1.5 flex-col">
                        <div className="self-end">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-transform hover:scale-110"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-md self-start">
                          صورة {idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Upload Zone */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-purple-500" />
                  <span>فيديو استعراض الحساب المباشر (MP4 / WebM)</span>
                </label>
                <span className="text-[10px] text-zinc-400">سحب وإفلات أو اختيار من الجهاز</span>
              </div>

              {!videoUrl ? (
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDraggingVideo(true);
                  }}
                  onDragLeave={() => setIsDraggingVideo(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDraggingVideo(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleVideoFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`p-4 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                    isDraggingVideo
                      ? 'border-purple-500 bg-purple-500/10 scale-[0.99]'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-purple-500/50 bg-gray-50/50 dark:bg-[#141417]'
                  }`}
                  onClick={() => {
                    const input = document.getElementById('account-video-upload-input');
                    if (input) input.click();
                  }}
                >
                  <input
                    id="account-video-upload-input"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleVideoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-2.5 rounded-full bg-purple-500/10 text-purple-400">
                      <FileVideo className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block">
                        اسحب ملف الفيديو هنا أو اضغط للاختيار من جهازك
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        يدعم ملفات MP4 و WebM المباشرة بدون الحاجة لأي روابط خارجية
                      </span>
                    </div>
                    {isUploadingVideo && (
                      <span className="text-xs text-purple-400 font-bold animate-pulse">جارٍ معالجة الفيديو...</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-zinc-950 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5" /> مشغل معاينة الفيديو المرفوع
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="px-2 py-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> حذف الفيديو
                    </button>
                  </div>
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-h-52 rounded-xl bg-black object-contain border border-zinc-800"
                  />
                </div>
              )}
            </div>

            {/* Notes Input */}
            <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Input
                label="ملاحظات وتفاصيل إضافية عن الحساب"
                placeholder="سكنات نادرة، رقصات، أسلحة مطورة، ألقاب وإنجازات..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button variant="secondary" type="button" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={<Save className="w-4 h-4" />}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              {existingAccount ? 'حفظ تعديلات الحساب' : 'إضافة الحساب للمخزن'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer */}
      {isQuickCustomerOpen && (
        <CustomerFormModal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          onSave={handleQuickCustomerSave}
          moduleContext="middleman"
        />
      )}
    </>
  );
};
