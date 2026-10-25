import React, { useState, useEffect } from 'react';
import { Merchant, MerchantInvoice, InvoiceItem, InvoiceType, PaymentMethod, InvoiceStatus } from '../../types/merchant.types';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  QrCode,
  DollarSign,
  Calendar,
  CheckCircle2,
  Percent,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig } from '../../services/reporting/reportTypes';

interface MerchantInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: MerchantInvoice) => void;
  merchant: Merchant;
  invoiceToEdit?: MerchantInvoice | null;
  defaultType?: InvoiceType;
}

export const MerchantInvoiceModal: React.FC<MerchantInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  merchant,
  invoiceToEdit,
  defaultType = 'sale'
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(defaultType);
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vault_cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_' + Date.now(),
      productName: 'شحن PUBG 660 UC',
      category: 'PUBG',
      quantity: 10,
      unitPrice: 8.0,
      totalPrice: 80.0
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      if (invoiceToEdit) {
        setInvoiceType(invoiceToEdit.type);
        setIssueDate(invoiceToEdit.issueDate);
        setDueDate(invoiceToEdit.dueDate);
        setPaymentMethod(invoiceToEdit.paymentMethod);
        setDiscountAmount(invoiceToEdit.discountAmount);
        setTaxAmount(invoiceToEdit.taxAmount);
        setPaidAmount(invoiceToEdit.paidAmount);
        setNotes(invoiceToEdit.notes || '');
        setItems(invoiceToEdit.items || []);
      } else {
        setInvoiceType(defaultType);
        setIssueDate(new Date().toISOString().slice(0, 10));
        setDueDate(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
        setPaymentMethod('vault_cash');
        setDiscountAmount(0);
        setTaxAmount(0);
        setPaidAmount(0);
        setNotes('');
        setItems([
          {
            id: 'item_' + Date.now(),
            productName: 'شحن PUBG 660 UC',
            category: 'PUBG',
            quantity: 10,
            unitPrice: 8.0,
            totalPrice: 80.0
          }
        ]);
      }
    }
  }, [isOpen, invoiceToEdit, defaultType]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: val };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? parseFloat(val) || 0 : target.quantity;
      const p = field === 'unitPrice' ? parseFloat(val) || 0 : target.unitPrice;
      target.totalPrice = parseFloat((q * p).toFixed(2));
    }

    updated[index] = target;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
        productName: '',
        category: 'عام',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const getStatus = (): InvoiceStatus => {
    if (paidAmount >= totalAmount && totalAmount > 0) return 'paid';
    if (paidAmount > 0 && paidAmount < totalAmount) return 'partial';
    if (new Date(dueDate) < new Date()) return 'overdue';
    return 'unpaid';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || subtotal <= 0) {
      showToast('error', 'خطأ في الفاتورة', 'يرجى إضافة بند واحد على الأقل بمبلغ صالح');
      return;
    }

    const invNum = invoiceToEdit
      ? invoiceToEdit.invoiceNumber
      : 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    const invoiceObj: MerchantInvoice = {
      id: invoiceToEdit ? invoiceToEdit.id : 'inv_' + Date.now(),
      invoiceNumber: invNum,
      merchantId: merchant.id,
      merchantName: merchant.name,
      type: invoiceType,
      issueDate,
      dueDate,
      items,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount,
      remainingAmount,
      status: getStatus(),
      paymentMethod,
      notes,
      createdBy: user?.fullName || 'مسؤول النظام',
      isArchived: false,
      createdAt: invoiceToEdit ? invoiceToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(invoiceObj);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoiceToEdit ? 'تعديل الفاتورة التجارية' : 'إنشاء فاتورة تجارية جديدة'}
      subtitle={`التاجر: ${merchant.name} (${merchant.companyName})`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* Header Setup */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-[#141417] p-3.5 rounded-2xl border border-gray-200/80 dark:border-[#27272A] text-xs">
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">نوع الفاتورة</label>
            <select
              value={invoiceType}
              onChange={e => setInvoiceType(e.target.value as InvoiceType)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="sale">فاتورة مبيعات للتاجر (Sale)</option>
              <option value="purchase">فاتورة شراء من المورد (Purchase)</option>
              <option value="return">فاتورة مرتجع (Return)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="vault_cash">نقداً من الخزنة (Cash)</option>
              <option value="credit">آجل على الحساب (Credit)</option>
              <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
              <option value="electronic_wallet">محفظة إلكترونية (Wallet)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">تاريخ الإصدار</label>
            <input
              type="date"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">بنود ومنتجات الفاتورة</h4>
            <Button type="button" variant="outline" size="sm" icon={<Plus className="w-3 h-3" />} onClick={addItem}>
              إضافة بند
            </Button>
          </div>

          <div className="border border-gray-200 dark:border-[#27272A] rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-2.5">اسم المنتج / الخدمة</th>
                  <th className="p-2.5 w-24">الفئة</th>
                  <th className="p-2.5 w-20">الكمية</th>
                  <th className="p-2.5 w-24">السعر المفرد ($)</th>
                  <th className="p-2.5 w-28">الإجمالي ($)</th>
                  <th className="p-2.5 w-12 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="مثال: شحن PUBG 660 UC"
                        value={item.productName}
                        onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                        className="w-full rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 p-1.5 text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="الفئة"
                        value={item.category}
                        onChange={e => handleItemChange(idx, 'category', e.target.value)}
                        className="w-full rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 p-1.5 text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 p-1.5 text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.1"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 p-1.5 text-zinc-900 dark:text-zinc-100 font-mono outline-none"
                      />
                    </td>
                    <td className="p-2 font-mono font-bold text-orange-500">
                      {formatCurrency(item.totalPrice)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 rounded text-zinc-400 hover:text-rose-500 disabled:opacity-20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Summary Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">ملاحظات الفاتورة</label>
            <textarea
              rows={3}
              placeholder="شروط التسليم، تفاصيل التحويل، أو أي تعليمات خاصة..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none resize-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span>المجموع الفرعي (Subtotal):</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">خصم تجاري ($):</span>
              <input
                type="number"
                step="1"
                value={discountAmount}
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-1 text-xs text-right font-mono outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-zinc-700">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">إجمالي الفاتورة الصافي:</span>
              <span className="font-mono text-base font-black text-orange-500">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-emerald-500 font-semibold">المدفوع نقداً / محصل ($):</span>
              <input
                type="number"
                step="1"
                value={paidAmount}
                onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-500/40 p-1 text-xs text-right font-mono text-emerald-500 font-bold outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-zinc-700 text-rose-500">
              <span className="font-bold">المتبقي آجل (دين):</span>
              <span className="font-mono font-bold">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4 text-orange-500" />}
            onClick={() => {
              const config: ReportConfig = {
                startDate: '',
                endDate: '',
                reportType: 'detailed',
                showProfits: true,
                showCosts: true,
                showExpenses: true,
                showLogo: true,
                showUserData: true,
                showPageNumbers: true,
                showManagerSignature: true
              };
              const doc = ReportEngine.generateReportDocument('merchants_statement', config, merchant);
              ReportEngine.printReportDocument(doc, config);
            }}
          >
            🖨️ معاينة وطباعة الفاتورة
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary">
              {invoiceToEdit ? 'حفظ تعديلات الفاتورة' : 'إصدار الفاتورة واعتمادها'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
