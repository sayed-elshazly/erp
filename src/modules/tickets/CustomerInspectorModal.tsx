import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { db } from '../../database/db';
import {
  UserCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Gamepad2,
  Award,
  Wallet,
  Clock,
  ExternalLink,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Customer, CustomerTicket } from '../../types/customer.types';

interface CustomerInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomerProfile?: (customer: Customer) => void;
}

export const CustomerInspectorModal: React.FC<CustomerInspectorModalProps> = ({
  isOpen,
  onClose,
  onOpenCustomerProfile
}) => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allTickets, setAllTickets] = useState<CustomerTicket[]>([]);

  // Refresh latest database records on modal open
  useEffect(() => {
    if (isOpen) {
      setAllCustomers(db.getCustomers(true));
      setAllTickets(db.getTickets());
    }
  }, [isOpen]);

  // Debounce input value changes (180ms) for smooth live searching
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 180);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedQuery(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    setDebouncedQuery('');
  };

  // Matching results across customers and tickets
  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return null;

    // Matches in Customer profiles
    const matchedCusts = allCustomers.filter(
      c =>
        c.phone.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.referralCode && c.referralCode.toLowerCase().includes(q))
    );

    // Matches in Tickets (by phone, player game ID, or customer name)
    const matchedTickets = allTickets.filter(
      t =>
        t.customerPhone.includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.playerGameId && t.playerGameId.toLowerCase().includes(q)) ||
        (t.items && t.items.some(it => it.playerGameId && it.playerGameId.toLowerCase().includes(q)))
    );

    // Is there any prior interaction found?
    const hasPriorInteraction = matchedCusts.length > 0 || matchedTickets.length > 0;

    return {
      query: q,
      matchedCusts,
      matchedTickets,
      hasPriorInteraction
    };
  }, [debouncedQuery, allCustomers, allTickets]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="👤 فحص سجل العميل والتحقق الأمني (Customer & Anti-Fraud Inspector)"
      subtitle="البحث الفوري الشامل برقم الهاتف، أو الـ Player ID، أو الاسم لفحص التعاملات السابقة وأهلية أول شحنة"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Live Search Bar with Form & Direct Button */}
        <form onSubmit={handleManualSearch} className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="ادخل رقم الهاتف، أو الـ Player ID، أو كود العميل... (بحث فوري أثناء الكتابة)"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              icon={<Search className="w-4 h-4 text-orange-500" />}
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold p-1 cursor-pointer"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Search className="w-4 h-4" />}
          >
            بحث
          </Button>
        </form>

        {/* Results Box */}
        {searchResults && (
          <div className="space-y-4 animate-fade-in">
            {/* Anti-Fraud & First Shipment Eligibility Status Banner */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 font-bold text-xs ${
                searchResults.hasPriorInteraction
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {searchResults.hasPriorInteraction ? (
                  <Ban className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <div>
                  <span className="block font-black text-sm">
                    {searchResults.hasPriorInteraction
                      ? '⚠️ العميل مسجل ولديه تعاملات وطلبات سابقة'
                      : '✓ عميل جديد تماماً — مؤهل لخصم أول شحنة (First Order)'}
                  </span>
                  <span className="text-[11px] opacity-90">
                    {searchResults.hasPriorInteraction
                      ? 'لا يمكن فتح تذكرة أول شحنة مخفضة لهذا العميل لوجود تطابق في سجلات النظام.'
                      : 'لم يتم العثور على أي رقم هاتف أو Player ID مطابق في سجل التذاكر السابق.'}
                  </span>
                </div>
              </div>

              <Badge variant={searchResults.hasPriorInteraction ? 'danger' : 'success'} size="md">
                {searchResults.hasPriorInteraction ? 'غير مؤهل لأول شحنة' : 'مؤهل لأول شحنة'}
              </Badge>
            </div>

            {/* Matched Customer Profiles */}
            {searchResults.matchedCusts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  <span>البروفايلات المطابقة ({searchResults.matchedCusts.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.matchedCusts.map(cust => (
                    <div
                      key={cust.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                            {cust.name}
                          </strong>
                          <span className="text-zinc-400 font-mono text-[11px]">{cust.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {cust.isFrozen && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              🔒 مجمد
                            </span>
                          )}
                          <Badge variant="default" size="sm">
                            {cust.profileType === 'regular' ? 'عميل عادي' : cust.profileType}
                          </Badge>
                        </div>
                      </div>

                      {cust.isFrozen && (
                        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold">
                          ⛔ الحساب مجمد إدارياً بقرار من المدير العام — يُمنع التعامل أو الصرف من المحفظة حتى فك التجميد.
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#141417]">
                          <span className="text-zinc-400 block">إجمالي الشحن</span>
                          <strong className="text-emerald-500 font-bold">{formatCurrency(cust.totalSpent)}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#141417]">
                          <span className="text-zinc-400 block">التذاكر</span>
                          <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{cust.totalOrders}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#141417]">
                          <span className="text-zinc-400 block">الكاش باك</span>
                          <strong className="text-orange-500 font-bold">{formatCurrency(cust.cashbackBalance)}</strong>
                        </div>
                      </div>

                      {onOpenCustomerProfile && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            onOpenCustomerProfile(cust);
                            onClose();
                          }}
                          className="w-full justify-center text-xs"
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          فتح البروفايل الكامل للعميل
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Tickets */}
            {searchResults.matchedTickets.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                  <Gamepad2 className="w-4 h-4 text-orange-500" />
                  <span>تذاكر الشحن السابقة المطابقة ({searchResults.matchedTickets.length})</span>
                </h4>

                <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-xl max-h-48">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                        <th className="py-2 px-3">رقم التذكرة</th>
                        <th className="py-2 px-3">التاريخ</th>
                        <th className="py-2 px-3">اللعبة والباقة</th>
                        <th className="py-2 px-3">الـ Player ID</th>
                        <th className="py-2 px-3">المبلغ</th>
                        <th className="py-2 px-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                      {searchResults.matchedTickets.slice(0, 5).map(tkt => (
                        <tr key={tkt.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2 px-3 font-mono font-bold text-orange-500">{tkt.ticketNumber}</td>
                          <td className="py-2 px-3 text-zinc-400">{formatDate(tkt.createdAt)}</td>
                          <td className="py-2 px-3 font-bold">{tkt.gameName} — {tkt.gameProductName}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-500">{tkt.playerGameId}</td>
                          <td className="py-2 px-3 font-mono">{formatCurrency(tkt.receivedAmount || tkt.requiredAmount)}</td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={tkt.status === 'completed' ? 'success' : tkt.status === 'problem' ? 'danger' : 'warning'}
                              size="sm"
                            >
                              {tkt.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
