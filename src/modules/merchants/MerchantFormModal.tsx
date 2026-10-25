import React, { useState, useEffect } from 'react';
import { Merchant, MerchantType, MerchantStatus } from '../../types/merchant.types';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { draftService } from '../../services/draftService';
import { useNotifications } from '../../context/NotificationContext';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Hash,
  DollarSign,
  RotateCcw,
  MessageSquare,
  Send,
  FileText
} from 'lucide-react';

interface MerchantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (merchantData: Partial<Merchant>) => void;
  merchantToEdit?: Merchant | null;
}

export const MerchantFormModal: React.FC<MerchantFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  merchantToEdit
}) => {
  const { showToast } = useNotifications();
  const formDraftKey = merchantToEdit ? `edit_mrc_${merchantToEdit.id}` : 'new_merchant';

  const [formData, setFormData] = useState<Partial<Merchant>>({
    name: '',
    companyName: '',
    type: 'shop',
    categoryTag: 'بطاقات وشحن',
    status: 'active',
    phone: '',
    whatsapp: '',
    telegram: '',
    email: '',
    website: '',
    address: '',
    city: 'بغداد',
    country: 'العراق',
    preferredContactMethod: 'whatsapp',
    commercialRegister: '',
    taxNumber: '',
    balance: 0,
    creditLimit: 5000
  });

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (merchantToEdit) {
        setFormData(merchantToEdit);
        setHasRestoredDraft(false);
      } else {
        const existingDraft = draftService.getDraft<Partial<Merchant>>(formDraftKey);
        if (existingDraft?.data && existingDraft.data.name) {
          setFormData(existingDraft.data);
          setHasRestoredDraft(true);
          showToast('info', 'تم استعادة المسودة', 'تم استرجاع بيانات التاجر غير المحفوظة');
        } else {
          const randomCode = 'TRD-' + Math.floor(1000 + Math.random() * 9000);
          setFormData({
            code: randomCode,
            name: '',
            companyName: '',
            type: 'shop',
            categoryTag: 'شحن وألعاب',
            status: 'active',
            phone: '',
            whatsapp: '',
            telegram: '',
            email: '',
            website: '',
            address: '',
            city: 'بغداد',
            country: 'العراق',
            preferredContactMethod: 'whatsapp',
            commercialRegister: '',
            taxNumber: '',
            balance: 0,
            creditLimit: 5000,
            totalPurchases: 0,
            totalSales: 0,
            totalProfits: 0,
            totalInvoicesCount: 0,
            totalOrdersCount: 0,
            isArchived: false,
            notesCount: 0,
            filesCount: 0,
            activeRemindersCount: 0
          });
          setHasRestoredDraft(false);
        }
      }
      setErrors({});
    }
  }, [merchantToEdit, isOpen, formDraftKey]);

  const handleFieldChange = (key: keyof Merchant, value: any) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    if (!merchantToEdit) {
      draftService.saveDraft(formDraftKey, updated);
    }
  };

  const handleClearDraft = () => {
    draftService.clearDraft(formDraftKey);
    setHasRestoredDraft(false);
    const randomCode = 'TRD-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({
      code: randomCode,
      name: '',
      companyName: '',
      type: 'shop',
      categoryTag: 'شحن وألعاب',
      status: 'active',
      phone: '',
      whatsapp: '',
      telegram: '',
      email: '',
      address: '',
      city: 'بغداد',
      country: 'العراق',
      preferredContactMethod: 'whatsapp',
      balance: 0,
      creditLimit: 5000
    });
    showToast('info', 'تم مسح المسودة', 'تم إعادة ضبط النموذج');
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.name?.trim()) errs.name = 'اسم التاجر / المندوب مطلوب';
    if (!formData.companyName?.trim()) errs.companyName = 'اسم المحل / الشركة مطلوب';
    if (!formData.phone?.trim()) errs.phone = 'رقم الهاتف الأساسي مطلوب';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    draftService.clearDraft(formDraftKey);
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={merchantToEdit ? 'تعديل بيانات التاجر / المورد' : 'إضافة تاجر / مورد جديد'}
      subtitle={merchantToEdit ? `كود الحساب: ${merchantToEdit.code}` : 'أدخل البيانات التجارية والمالية لإنشاء ملف تاجر معتمد'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {hasRestoredDraft && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs animate-fade-in">
            <span className="text-orange-500 font-semibold flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              تم استرجاع مسودة غير محفوظة تلقائياً
            </span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-zinc-400 hover:text-rose-500 text-[11px] underline"
            >
              مسح والبدء من جديد
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Info */}
          <Input
            label="اسم التاجر / الشخص المسؤول *"
            placeholder="مثال: حسين فاضل العبيدي"
            value={formData.name || ''}
            onChange={e => handleFieldChange('name', e.target.value)}
            error={errors.name}
            icon={<User className="w-4 h-4" />}
            autoFocus
          />

          <Input
            label="اسم المحل / المنشأة / الشركة *"
            placeholder="مثال: غيمرز ستور العراق"
            value={formData.companyName || ''}
            onChange={e => handleFieldChange('companyName', e.target.value)}
            error={errors.companyName}
            icon={<Building2 className="w-4 h-4" />}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              نوع الحساب والتصنيف التجاري *
            </label>
            <select
              value={formData.type || 'shop'}
              onChange={e => handleFieldChange('type', e.target.value as MerchantType)}
              className="w-full rounded-xl bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 text-xs p-2.5 outline-none focus:border-orange-500"
            >
              <option value="supplier">مورد رئيسي (Supplier)</option>
              <option value="shop">محل بيع بالتجزئة (Shop)</option>
              <option value="agent">وكيل معتمد (Agent)</option>
              <option value="partner">شريك تجاري (Partner)</option>
              <option value="wholesaler">تاجر جملة (Wholesaler)</option>
              <option value="retailer">تاجر تجزئة (Retailer)</option>
              <option value="distributor">موزع معتمد (Distributor)</option>
            </select>
          </div>

          {/* Contact Methods */}
          <Input
            label="رقم الهاتف الأساسي *"
            placeholder="مثال: +964 770 123 4567"
            value={formData.phone || ''}
            onChange={e => handleFieldChange('phone', e.target.value)}
            error={errors.phone}
            icon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="رقم واتساب (WhatsApp)"
            placeholder="+964 770 123 4567"
            value={formData.whatsapp || ''}
            onChange={e => handleFieldChange('whatsapp', e.target.value)}
            icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
          />

          <Input
            label="معرف تيليجرام (Telegram)"
            placeholder="@username_iq"
            value={formData.telegram || ''}
            onChange={e => handleFieldChange('telegram', e.target.value)}
            icon={<Send className="w-4 h-4 text-blue-400" />}
          />

          <Input
            label="البريد الإلكتروني"
            type="email"
            placeholder="merchant@example.com"
            value={formData.email || ''}
            onChange={e => handleFieldChange('email', e.target.value)}
            icon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="الموقع الإلكتروني"
            placeholder="https://store.example.com"
            value={formData.website || ''}
            onChange={e => handleFieldChange('website', e.target.value)}
            icon={<Globe className="w-4 h-4" />}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              طريقة التواصل المفضلة
            </label>
            <select
              value={formData.preferredContactMethod || 'whatsapp'}
              onChange={e => handleFieldChange('preferredContactMethod', e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 text-xs p-2.5 outline-none focus:border-orange-500"
            >
              <option value="whatsapp">واتساب (WhatsApp)</option>
              <option value="telegram">تيليجرام (Telegram)</option>
              <option value="phone">اتصال هاتفي مباشر</option>
              <option value="email">بريد إلكتروني</option>
            </select>
          </div>

          {/* Location */}
          <Input
            label="الدولة"
            placeholder="مثال: العراق"
            value={formData.country || 'العراق'}
            onChange={e => handleFieldChange('country', e.target.value)}
            icon={<MapPin className="w-4 h-4" />}
          />

          <Input
            label="المدينة"
            placeholder="مثال: بغداد"
            value={formData.city || 'بغداد'}
            onChange={e => handleFieldChange('city', e.target.value)}
            icon={<MapPin className="w-4 h-4" />}
          />

          <Input
            label="العنوان التفصيلي"
            placeholder="مثال: المنصور - شارع 14 رمضان"
            value={formData.address || ''}
            onChange={e => handleFieldChange('address', e.target.value)}
            icon={<MapPin className="w-4 h-4" />}
          />

          {/* Financial Limits */}
          <Input
            label="الحد الائتماني المسموح به ($)"
            type="number"
            placeholder="5000"
            value={formData.creditLimit || 5000}
            onChange={e => handleFieldChange('creditLimit', parseFloat(e.target.value) || 0)}
            icon={<DollarSign className="w-4 h-4 text-orange-500" />}
          />

          {!merchantToEdit && (
            <Input
              label="الرصيد الافتتاحي ($)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.balance || 0}
              onChange={e => handleFieldChange('balance', parseFloat(e.target.value) || 0)}
              icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              حالة الحساب
            </label>
            <select
              value={formData.status || 'active'}
              onChange={e => handleFieldChange('status', e.target.value as MerchantStatus)}
              className="w-full rounded-xl bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 text-xs p-2.5 outline-none focus:border-orange-500"
            >
              <option value="active">نشط ومعتمد (Active)</option>
              <option value="inactive">غير نشط (Inactive)</option>
              <option value="suspended">موقوف مؤقتاً (Suspended)</option>
              <option value="blocked">محظور (Blocked)</option>
            </select>
          </div>

          {/* Legal */}
          <Input
            label="رقم السجل التجاري (اختياري)"
            placeholder="CR-12345"
            value={formData.commercialRegister || ''}
            onChange={e => handleFieldChange('commercialRegister', e.target.value)}
            icon={<Hash className="w-4 h-4" />}
          />

          <Input
            label="الرقم الضريبي (اختياري)"
            placeholder="TX-998877"
            value={formData.taxNumber || ''}
            onChange={e => handleFieldChange('taxNumber', e.target.value)}
            icon={<Hash className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#27272A]">
          <span className="text-[11px] text-zinc-400 font-mono">
            {merchantToEdit ? 'تعديل السجل التجاري' : 'يتم حفظ المسودة تلقائياً (Auto-Saved)'}
          </span>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary">
              {merchantToEdit ? 'حفظ التعديلات' : 'إنشاء حساب التاجر'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
