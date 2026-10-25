import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, User, DollarSign, FileText, Ticket, ArrowLeft, X } from 'lucide-react';
import { db } from '../../database/db';
import { Customer } from '../../types/customer.types';
import { Expense, Debt } from '../../types/finance.types';
import { formatCurrency } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onNavigateSection: (section: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onNavigateSection
}) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCustomers(db.getCustomers());
      setExpenses(db.getExpenses());
      setDebts(db.getDebts());
      setQuery('');

      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        window.scrollTo({ top: scrollPos, behavior: 'instant' as ScrollBehavior });
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const q = query.toLowerCase().trim();

  const filteredCustomers = q
    ? customers.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.code.toLowerCase().includes(q)
      )
    : [];

  const filteredExpenses = q
    ? expenses.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      )
    : [];

  const filteredDebts = q
    ? debts.filter(
        d =>
          d.partyName.toLowerCase().includes(q) ||
          (d.partyPhone && d.partyPhone.includes(q))
      )
    : [];

  const hasResults =
    filteredCustomers.length > 0 ||
    filteredExpenses.length > 0 ||
    filteredDebts.length > 0;

  const modalNode = (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Search Dialog */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in"
        dir="rtl"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-[#2E2E2E] gap-3">
          <Search className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="بحث عام في النظام (الزبائن، الحركات، المصاريف، الديون...)"
            className="w-full bg-transparent text-gray-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {!q ? (
            <div className="text-center py-8 text-zinc-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-orange-500" />
              اكتب اسم زبون، رقم هاتف، كود، أو بند مالي للبحث الفوري...
            </div>
          ) : !hasResults ? (
            <div className="text-center py-8 text-zinc-400 text-sm">
              لا توجد نتائج مطابقة لكلمة البحث "{query}"
            </div>
          ) : (
            <>
              {/* Customers Results */}
              {filteredCustomers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-orange-500 mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> الزبائن ({filteredCustomers.length})
                  </h4>
                  <div className="space-y-1">
                    {filteredCustomers.map(cust => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          onSelectCustomer(cust);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
                            {cust.code.split('-')[1] || cust.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{cust.name}</p>
                            <p className="text-xs text-zinc-400">{cust.phone} • الرصيد: {formatCurrency(cust.balance)}</p>
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-zinc-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debts Results */}
              {filteredDebts.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> الديون والمستحقات ({filteredDebts.length})
                  </h4>
                  <div className="space-y-1">
                    {filteredDebts.map(debt => (
                      <div
                        key={debt.id}
                        onClick={() => {
                          onNavigateSection('finance');
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{debt.partyName}</p>
                          <p className="text-xs text-zinc-400">
                            {debt.debtType === 'receivable' ? 'مستحق لنا' : 'علينا للطرف'} • المتبقي: {formatCurrency(debt.remainingAmount)}
                          </p>
                        </div>
                        <span className="text-xs text-orange-400 font-mono">انتقال للمالية</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses Results */}
              {filteredExpenses.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-500 mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> المصاريف ({filteredExpenses.length})
                  </h4>
                  <div className="space-y-1">
                    {filteredExpenses.map(exp => (
                      <div
                        key={exp.id}
                        onClick={() => {
                          onNavigateSection('finance');
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{exp.title}</p>
                          <p className="text-xs text-zinc-400">المبلغ: {formatCurrency(exp.amount)} • {exp.date}</p>
                        </div>
                        <span className="text-xs text-orange-400 font-mono">عرض بالمصاريف</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
