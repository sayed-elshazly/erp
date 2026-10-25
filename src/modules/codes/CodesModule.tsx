import React, { useState, useEffect, useMemo } from 'react';
import { SystemCodeItem, SystemCodeType } from '../../types/topup.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import {
  KeyRound,
  Plus,
  Search,
  Copy,
  CheckCircle2,
  Trash2,
  Lock,
  Gamepad2,
  Tag,
  Gift,
  Users,
  ShieldCheck,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Printer
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';

export const CodesModule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  const [codes, setCodes] = useState<SystemCodeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeTab, setSelectedTypeTab] = useState<'all' | SystemCodeType>('all');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'active' | 'used' | 'canceled'>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Date Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Single Code Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SystemCodeType>('product_code');
  const [gameName, setGameName] = useState('Free Fire');
  const [productName, setProductName] = useState('شحن 520 جوهرة فري فاير');
  const [valueEGP, setValueEGP] = useState<number>(235);
  const [maxUsageCount, setMaxUsageCount] = useState<number>(1);
  const [notes, setNotes] = useState('');

  // Bulk Generator Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState<number>(50);
  const [bulkPrefix, setBulkPrefix] = useState('JKR-PIN');
  const [bulkType, setBulkType] = useState<SystemCodeType>('product_code');
  const [bulkGameName, setBulkGameName] = useState('Free Fire');
  const [bulkProductName, setBulkProductName] = useState('شحن 100 جوهرة فري فاير');
  const [bulkValueEGP, setBulkValueEGP] = useState<number>(50);
  const [bulkUsagePerCode, setBulkUsagePerCode] = useState<number>(1);
  const [bulkNotes, setBulkNotes] = useState('دفعة أكواد مجمعة');

  const loadData = () => {
    setCodes(db.getSystemCodes());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCodes = useMemo(() => {
    return codes.filter(c => {
      if (selectedTypeTab !== 'all' && c.type !== selectedTypeTab) return false;
      if (selectedStatusTab !== 'all' && c.status !== selectedStatusTab) return false;

      // Date Range Filter
      if (startDate) {
        const itemDate = new Date(c.createdAt).toISOString().split('T')[0];
        if (itemDate < startDate) return false;
      }
      if (endDate) {
        const itemDate = new Date(c.createdAt).toISOString().split('T')[0];
        if (itemDate > endDate) return false;
      }

      const q = (searchQuery || '').toLowerCase().trim();
      if (q) {
        return (
          Boolean(c.code && c.code.toLowerCase().includes(q)) ||
          Boolean(c.title && c.title.toLowerCase().includes(q)) ||
          Boolean(c.gameName && c.gameName.toLowerCase().includes(q)) ||
          Boolean(c.assignedToCustomerName && c.assignedToCustomerName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [codes, selectedTypeTab, selectedStatusTab, startDate, endDate, searchQuery]);

  const handleSaveCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeValue.trim().toUpperCase();
    if (!cleanCode || !title.trim()) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال الكود والوصف');
      return;
    }

    // Check duplicate code
    const isDuplicate = codes.some(c => c.code.toUpperCase() === cleanCode);
    if (isDuplicate) {
      showToast('error', 'كود مكرر', 'هذا الكود مسجل مسبقاً في النظام. يُشترط أن يكون الكود فريداً.');
      return;
    }

    const limit = Math.max(1, maxUsageCount || 1);
    const newItem: SystemCodeItem = {
      id: 'code_' + Date.now(),
      code: cleanCode,
      title: title.trim(),
      type,
      gameName: type === 'product_code' ? gameName : undefined,
      productName: type === 'product_code' ? productName : undefined,
      valueEGP: valueEGP || undefined,
      maxUsageCount: limit,
      currentUsageCount: 0,
      remainingUsageCount: limit,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: user?.fullName || 'المدير',
      notes: notes.trim() || undefined
    };

    db.saveSystemCode(newItem);
    showToast('success', 'تم الحفظ', `تم حفظ الكود "${cleanCode}" بنجاح بعدد استخدامات (${limit})`);
    setIsModalOpen(false);
    loadData();
  };

  // Bulk Generator Execution
  const handleExecuteBulkGeneration = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.min(1000, Math.max(1, bulkCount));
    const prefix = bulkPrefix.trim().toUpperCase() || 'JKR';
    const limitPerCode = Math.max(1, bulkUsagePerCode || 1);

    const generatedItems: SystemCodeItem[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const uniqueCode = `${prefix}-${randomSuffix}`;

      generatedItems.push({
        id: `code_bulk_${Date.now()}_${i}`,
        code: uniqueCode,
        title: `${bulkProductName || 'كود شحن'} (دفعة #${i + 1})`,
        type: bulkType,
        gameName: bulkType === 'product_code' ? bulkGameName : undefined,
        productName: bulkType === 'product_code' ? bulkProductName : undefined,
        valueEGP: bulkValueEGP || undefined,
        maxUsageCount: limitPerCode,
        currentUsageCount: 0,
        remainingUsageCount: limitPerCode,
        status: 'active',
        createdAt: timestamp,
        createdBy: user?.fullName || 'المدير',
        notes: bulkNotes.trim() || undefined
      });
    }

    db.saveBulkSystemCodes(generatedItems);
    showToast('success', 'تم إنشاء الدفعة المجمعة', `تم توليد ${count} كود فريد بنجاح (كل كود بعدد ${limitPerCode} استخدام)`);
    setIsBulkModalOpen(false);
    loadData();
  };

  const handleDeleteCode = (id: string, codeStr: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الكود "${codeStr}"؟`)) {
      db.deleteSystemCode(id);
      showToast('success', 'تم الحذف', 'تم حذف الكود بنجاح');
      loadData();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              قسم إدارة الأكواد والقسائم (System Codes Engine)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-bold">
              {codes.length} كود مسجل
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            إدارة أكواد كروت الشحن الفورية (PINs)، التوليد بالجملة (Bulk Generator)، وتتبع حالات الاستخدام.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4 text-orange-500" />}
            onClick={() => setIsReportModalOpen(true)}
          >
            🖨️ طباعة تقرير الأكواد
          </Button>

          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<Layers className="w-4 h-4 text-purple-400" />}
                onClick={() => setIsBulkModalOpen(true)}
              >
                توليد دفعة أكواد بالجملة (Bulk)
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setCodeValue('');
                  setTitle('');
                  setIsModalOpen(true);
                }}
              >
                إضافة كود جديد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search & Universal Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setSelectedTypeTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTypeTab === 'all' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            جميع الأنواع ({codes.length})
          </button>
          <button
            onClick={() => setSelectedTypeTab('product_code')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              selectedTypeTab === 'product_code' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> أكواد شحن المنتجات ({codes.filter(c => c.type === 'product_code').length})
          </button>
          <button
            onClick={() => setSelectedTypeTab('referral')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              selectedTypeTab === 'referral' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> أكواد الإحالة ({codes.filter(c => c.type === 'referral').length})
          </button>
          <button
            onClick={() => setSelectedTypeTab('coupon')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              selectedTypeTab === 'coupon' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> كوبونات الخصم ({codes.filter(c => c.type === 'coupon').length})
          </button>
        </div>

        {/* Date Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => { setStartDate(''); setEndDate(''); }}
          />

          <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] w-full sm:w-64 shadow-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="بحث بالكود، الوصف، أو اللعبة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Codes Master Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-4">كود الشحن / القسيمة</th>
                <th className="py-3 px-4">النوع والتصنيف</th>
                <th className="py-3 px-4">الوصف والباقة</th>
                <th className="py-3 px-4">القيمة التقديرية</th>
                <th className="py-3 px-4">مرات الاستخدام والمتبقي</th>
                <th className="py-3 px-4">تاريخ الإنشاء</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    لا توجد أكواد مطابقة لخيارات البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredCodes.map(c => {
                  const rem = c.remainingUsageCount !== undefined ? c.remainingUsageCount : (c.status === 'used' ? 0 : (c.maxUsageCount || 1));
                  const isExhausted = c.status === 'used' || rem <= 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-orange-500 text-sm tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.code, `كود النظام (${c.code})`, showToast)}
                            className="p-1 rounded text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 cursor-pointer"
                            title="نسخ الكود"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            c.type === 'product_code'
                              ? 'orange'
                              : c.type === 'referral'
                              ? 'purple'
                              : c.type === 'coupon'
                              ? 'info'
                              : 'default'
                          }
                          size="sm"
                        >
                          {c.type === 'product_code'
                            ? '🎮 كود منتج'
                            : c.type === 'referral'
                            ? '🤝 كود إحالة'
                            : c.type === 'coupon'
                            ? '🏷️ كوبون'
                            : '🎫 قسيمة'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">{c.title}</div>
                        {c.gameName && <span className="text-[11px] text-zinc-400">{c.gameName} — {c.productName}</span>}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-500">
                        {c.valueEGP ? `${c.valueEGP} ج` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">
                            {c.currentUsageCount || 0} / {c.maxUsageCount || 1}
                          </span>
                          <Badge
                            variant={isExhausted ? 'danger' : rem === 1 ? 'warning' : 'success'}
                            size="sm"
                          >
                            {isExhausted ? 'مستهلك بالكامل' : `متبقي ${rem}`}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={!isExhausted && c.status === 'active' ? 'success' : 'danger'} size="sm">
                          {!isExhausted && c.status === 'active' ? 'جاهز للاستخدام' : 'منتهية ومستهلكة'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCode(c.id, c.code)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف الكود"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-zinc-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Single Add Code Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="إضافة كود أو قسيمة شحن جديدة"
          subtitle="تسجيل كروت الشحن وأكواد PIN الفورية مع تحديد عدد مرات الاستخدام المتاحة"
          maxWidth="md"
        >
          <form onSubmit={handleSaveCode} className="space-y-4 text-right text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">طريقة إدخال الكود:</span>
              <button
                type="button"
                onClick={() => {
                  const generated = `PIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                  setCodeValue(generated);
                }}
                className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> توليد كود عشوائي
              </button>
            </div>

            <Input
              label="كود الشحن / الـ PIN (فريد وغير مكرر) *"
              placeholder="مثال: FF-PIN-998811 أو UC-660-MIDAS"
              value={codeValue}
              onChange={e => setCodeValue(e.target.value.toUpperCase())}
              autoFocus
            />

            <Input
              label="وصف أو مسمى الكود *"
              placeholder="مثال: كود شحن 520 جوهرة فري فاير"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">نوع الكود</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="product_code">🎮 كود منتج / لعبة</option>
                  <option value="referral">🤝 كود إحالة</option>
                  <option value="coupon">🏷️ كوبون خصم</option>
                  <option value="internal_voucher">🎫 قسيمة داخلية</option>
                </select>
              </div>

              <Input
                label="عدد مرات الاستخدام (الكمية) *"
                type="number"
                min={1}
                value={maxUsageCount}
                onChange={e => setMaxUsageCount(parseInt(e.target.value) || 1)}
                placeholder="1"
              />

              <Input
                label="القيمة بالجنيه (اختياري)"
                type="number"
                value={valueEGP}
                onChange={e => setValueEGP(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="submit" variant="primary">حفظ الكود</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Batch Generator Modal */}
      {isBulkModalOpen && (
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="توليد دفعة أكواد مجمعة (Bulk Code Generator)"
          subtitle="توليد كميات كبيرة (50, 100, 500 كود) دفعة واحدة مع كود فريد لكل بطاقة"
          maxWidth="lg"
        >
          <form onSubmit={handleExecuteBulkGeneration} className="space-y-4 text-right text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  عدد الأكواد المطلوبة (Quantity) *
                </label>
                <div className="flex items-center gap-2">
                  {[20, 50, 100, 500].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setBulkCount(cnt)}
                      className={`px-3 py-1.5 rounded-xl font-bold font-mono transition-colors cursor-pointer ${
                        bulkCount === cnt
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={bulkCount}
                    onChange={e => setBulkCount(parseInt(e.target.value) || 10)}
                    className="w-20 p-1.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-center font-mono font-bold"
                  />
                </div>
              </div>

              <Input
                label="بادئة الكود (Prefix) *"
                placeholder="مثال: FF-PIN أو PUBG-UC أو JKR"
                value={bulkPrefix}
                onChange={e => setBulkPrefix(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="مرات الاستخدام لكل كود *"
                type="number"
                min={1}
                value={bulkUsagePerCode}
                onChange={e => setBulkUsagePerCode(parseInt(e.target.value) || 1)}
                placeholder="1"
              />

              <Input
                label="اللعبة المرتبطة (اختياري)"
                placeholder="مثال: Free Fire"
                value={bulkGameName}
                onChange={e => setBulkGameName(e.target.value)}
              />

              <Input
                label="اسم الباقة (اختياري)"
                placeholder="مثال: 100 جوهرة"
                value={bulkProductName}
                onChange={e => setBulkProductName(e.target.value)}
              />

              <Input
                label="القيمة بالجنيه"
                type="number"
                value={bulkValueEGP}
                onChange={e => setBulkValueEGP(parseFloat(e.target.value) || 0)}
              />
            </div>

            <Input
              label="ملاحظات الدفعة"
              value={bulkNotes}
              onChange={e => setBulkNotes(e.target.value)}
            />

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs flex items-center justify-between">
              <span>نموذج الكود الناتج:</span>
              <strong className="text-sm font-bold text-orange-400">{bulkPrefix || 'JKR'}-A9B8C7</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>إلغاء</Button>
              <Button type="submit" variant="primary" icon={<Layers className="w-4 h-4" />}>
                توليد {bulkCount} كود الآن
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="codes"
        />
      )}
    </div>
  );
};
