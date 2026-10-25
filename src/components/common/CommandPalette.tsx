import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useKeyboard } from '../../context/KeyboardContext';
import { useTabs } from '../../context/TabsContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../database/db';
import {
  Search,
  Command,
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  Plus,
  Moon,
  Sun,
  Printer,
  Download,
  Database,
  Ticket,
  DollarSign,
  Scale,
  ArrowRight,
  User,
  Flame,
  FileText
} from 'lucide-react';
import { Customer } from '../../types/customer.types';
import { formatCurrency } from '../../utils/formatters';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig } from '../../services/reporting/reportTypes';

interface CommandPaletteProps {
  onOpenNewCustomer?: () => void;
  onOpenNewExpense?: () => void;
  onOpenVaultDeposit?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onOpenNewCustomer,
  onOpenNewExpense,
  onOpenVaultDeposit
}) => {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useKeyboard();
  const { openTab, setActiveTabId } = useTabs();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotifications();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened and lock background scroll
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        window.scrollTo({ top: scrollPos, behavior: 'instant' as ScrollBehavior });
      };
    }
  }, [isCommandPaletteOpen]);

  const { user } = useAuth();
  const isOwner = user?.role === 'admin';
  const canFinance = isOwner || user?.department === 'finance' || Boolean(user?.permissions?.includes('manage_finance'));
  const canSettings = isOwner || Boolean(user?.permissions?.includes('manage_settings'));

  // System Commands List filtered by RBAC
  const systemCommands = useMemo(() => {
    const cmds: any[] = [
      {
        id: 'cmd_dash',
        title: 'الرئيسية (Dashboard)',
        category: 'تنقل سريع',
        icon: <LayoutDashboard className="w-4 h-4 text-orange-500" />,
        shortcut: 'Alt+1',
        action: () => {
          openTab({ id: 'dashboard', title: 'الرئيسية', section: 'dashboard', iconType: 'dashboard', closable: false });
          setCommandPaletteOpen(false);
        }
      },
      {
        id: 'cmd_cust',
        title: 'قسم الزبائن (Customers)',
        category: 'تنقل سريع',
        icon: <Users className="w-4 h-4 text-blue-400" />,
        shortcut: 'Alt+2',
        action: () => {
          openTab({ id: 'customers', title: 'الزبائن', section: 'customers', iconType: 'customers' });
          setCommandPaletteOpen(false);
        }
      }
    ];

    if (canFinance) {
      cmds.push({
        id: 'cmd_fin',
        title: 'قسم المالية (Finance & Vault)',
        category: 'تنقل سريع',
        icon: <Wallet className="w-4 h-4 text-emerald-400" />,
        shortcut: 'Alt+3',
        action: () => {
          openTab({ id: 'finance', title: 'المالية', section: 'finance', iconType: 'finance' });
          setCommandPaletteOpen(false);
        }
      });
    }

    if (canSettings) {
      cmds.push({
        id: 'cmd_set',
        title: 'الإعدادات والرقابة (Settings & Audit)',
        category: 'تنقل سريع',
        icon: <Settings className="w-4 h-4 text-purple-400" />,
        shortcut: 'Alt+4',
        action: () => {
          openTab({ id: 'settings', title: 'الإعدادات', section: 'settings', iconType: 'settings' });
          setCommandPaletteOpen(false);
        }
      });
    }

    cmds.push({
      id: 'cmd_new_cust',
      title: 'إنشاء زبون جديد (New Customer)',
      category: 'إجراءات سريعة',
      icon: <Plus className="w-4 h-4 text-orange-500" />,
      shortcut: 'Ctrl+N',
      action: () => {
        openTab({ id: 'customers', title: 'الزبائن', section: 'customers', iconType: 'customers' });
        if (onOpenNewCustomer) onOpenNewCustomer();
        setCommandPaletteOpen(false);
      }
    });

    if (canFinance) {
      cmds.push({
        id: 'cmd_new_exp',
        title: 'تسجيل مصروف جديد (New Expense)',
        category: 'إجراءات سريعة',
        icon: <DollarSign className="w-4 h-4 text-rose-400" />,
        action: () => {
          openTab({ id: 'finance', title: 'المالية', section: 'finance', iconType: 'finance' });
          if (onOpenNewExpense) onOpenNewExpense();
          setCommandPaletteOpen(false);
        }
      });

      cmds.push({
        id: 'cmd_vault_dep',
        title: 'إيداع نقدي في الخزنة (Vault Deposit)',
        category: 'إجراءات سريعة',
        icon: <Wallet className="w-4 h-4 text-emerald-400" />,
        action: () => {
          openTab({ id: 'finance', title: 'المالية', section: 'finance', iconType: 'finance' });
          if (onOpenVaultDeposit) onOpenVaultDeposit();
          setCommandPaletteOpen(false);
        }
      });
    }

    return [
      ...cmds,
    {
      id: 'cmd_theme',
      title: theme === 'dark' ? 'التبديل للوضع النهاري (Light Mode)' : 'التبديل للوضع الليلي (Dark Mode)',
      category: 'تفضيلات',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-400" />,
      shortcut: 'Ctrl+D',
      action: () => {
        toggleTheme();
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'cmd_backup',
      title: 'تنزيل نسخة احتياطية فورية (Download Backup)',
      category: 'نظام',
      icon: <Database className="w-4 h-4 text-blue-500" />,
      action: () => {
        const backupJson = db.createBackup();
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NZM_JKR_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', 'تم التنزيل', 'تم حفظ النسخة الاحتياطية بنجاح');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'cmd_print',
      title: 'إنشاء وطباعة تقرير الأداء المالي الرسمي (Report Engine)',
      category: 'أدوات',
      icon: <Printer className="w-4 h-4 text-orange-500" />,
      shortcut: 'Ctrl+P',
      action: () => {
        setCommandPaletteOpen(false);
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
        const doc = ReportEngine.generateReportDocument('dashboard', config);
        ReportEngine.printReportDocument(doc, config);
        showToast('info', 'جاري الطباعة', 'تم إرسال تقرير الأداء لمحرك الطباعة الرسمي');
      }
    }
  ];
}, [theme, openTab, toggleTheme, onOpenNewCustomer, onOpenNewExpense, onOpenVaultDeposit, setCommandPaletteOpen, showToast, canFinance, canSettings]);

  // Deep Search across entities
  const q = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!q) return [];

    const customers = db.getCustomers().filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.code.toLowerCase().includes(q)
    ).map(c => ({
      id: `cust_${c.id}`,
      title: `${c.name} (${c.code})`,
      subtitle: `هاتف: ${c.phone} • الرصيد: ${formatCurrency(c.balance)}`,
      category: 'الزبائن',
      icon: <User className="w-4 h-4 text-orange-500" />,
      action: () => {
        openTab({
          id: `cust_${c.id}`,
          title: c.name,
          section: 'customers',
          iconType: 'customer_profile',
          payload: c
        });
        setCommandPaletteOpen(false);
      }
    }));

    const debts = db.getDebts().filter(
      d => d.partyName.toLowerCase().includes(q) || (d.partyPhone && d.partyPhone.includes(q))
    ).map(d => ({
      id: `debt_${d.id}`,
      title: `دين: ${d.partyName}`,
      subtitle: `${d.debtType === 'receivable' ? 'مستحق لنا' : 'علينا للطرف'} • المتبقي: ${formatCurrency(d.remainingAmount)}`,
      category: 'الديون والمستحقات',
      icon: <Scale className="w-4 h-4 text-amber-500" />,
      action: () => {
        openTab({ id: 'finance', title: 'المالية', section: 'finance', iconType: 'finance' });
        setCommandPaletteOpen(false);
      }
    }));

    const tickets = db.getTickets().filter(
      t => t.title.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q)
    ).map(t => ({
      id: `tkt_${t.id}`,
      title: `تذكرة #${t.ticketNumber}: ${t.title}`,
      subtitle: `للزبون: ${t.customerName} (${t.status})`,
      category: 'تذاكر الدعم',
      icon: <Ticket className="w-4 h-4 text-blue-500" />,
      action: () => {
        openTab({ id: 'customers', title: 'الزبائن', section: 'customers', iconType: 'customers' });
        setCommandPaletteOpen(false);
      }
    }));

    const expenses = db.getExpenses().filter(
      e => e.title.toLowerCase().includes(q) || (e.receiptNumber && e.receiptNumber.toLowerCase().includes(q))
    ).map(e => ({
      id: `exp_${e.id}`,
      title: `مصروف: ${e.title}`,
      subtitle: `المبلغ: ${formatCurrency(e.amount)} • ${e.date}`,
      category: 'المصاريف',
      icon: <DollarSign className="w-4 h-4 text-rose-500" />,
      action: () => {
        openTab({ id: 'finance', title: 'المالية', section: 'finance', iconType: 'finance' });
        setCommandPaletteOpen(false);
      }
    }));

    return [...customers, ...debts, ...tickets, ...expenses];
  }, [q, openTab, setCommandPaletteOpen]);

  // Filtered Commands
  const filteredCommands = useMemo(() => {
    if (!q) return systemCommands;
    return systemCommands.filter(
      cmd => cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)
    );
  }, [q, systemCommands]);

  const totalItems = [...searchResults, ...filteredCommands];

  // Key navigation (Up/Down/Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems.length) % Math.max(1, totalItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalItems[selectedIndex]) {
        totalItems[selectedIndex].action();
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  const paletteNode = (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-24 px-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Command Palette Modal */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in flex flex-col max-h-[75vh]"
        dir="rtl"
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-[#2E2E2E] gap-3 bg-gray-50/50 dark:bg-[#161616]">
          <Command className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن أمر أو عميل، تذكرة، دين، أو مصروف... (Ctrl+K)"
            className="w-full bg-transparent text-gray-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none"
          />
          <kbd className="text-[11px] bg-gray-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded border border-gray-300 dark:border-zinc-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-100 dark:divide-[#252525]">
          {totalItems.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-xs">
              لا توجد نتائج أو أوامر مطابقة لـ "{query}"
            </div>
          ) : (
            <>
              {/* Deep Entity Results */}
              {searchResults.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1 text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                    نتائج البحث في قاعدة البيانات ({searchResults.length})
                  </div>
                  {searchResults.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold shadow-xs'
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-800/80 text-gray-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={isSelected ? 'text-white' : ''}>{item.icon}</span>
                          <div>
                            <p className="text-xs font-semibold">{item.title}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-zinc-400'}`}>
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 transform rotate-180 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Commands Results */}
              {filteredCommands.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    الأوامر والإجراءات السريعة
                  </div>
                  {filteredCommands.map((cmd, idx) => {
                    const itemIndex = searchResults.length + idx;
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <div
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3.5 py-2 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold shadow-xs'
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-800/80 text-gray-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={isSelected ? 'text-white' : ''}>{cmd.icon}</span>
                          <span className="text-xs">{cmd.title}</span>
                        </div>
                        {cmd.shortcut && (
                          <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isSelected
                              ? 'border-white/40 text-white bg-white/10'
                              : 'border-gray-300 dark:border-zinc-700 text-zinc-400 bg-gray-100 dark:bg-zinc-800'
                          }`}>
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2 px-4 border-t border-gray-100 dark:border-[#2E2E2E] bg-gray-50/50 dark:bg-[#161616] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span>↑↓ للتنقل</span>
            <span>↵ للاختيار</span>
            <span>ESC للإغلاق</span>
          </div>
          <span className="font-mono text-orange-500 font-bold">NZM JKR Core v1.0</span>
        </div>
      </div>
    </div>
  );

  return createPortal(paletteNode, document.body);
};
