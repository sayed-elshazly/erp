import React, { useState, useEffect } from 'react';
import { Merchant, MerchantInvoice, MerchantReminder } from '../../types/merchant.types';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { MerchantsDashboard } from './MerchantsDashboard';
import { MerchantsList } from './MerchantsList';
import { MerchantsReports } from './MerchantsReports';
import { MerchantFormModal } from './MerchantFormModal';
import { MerchantProfileModal } from './MerchantProfileModal';
import { MerchantInvoiceModal } from './MerchantInvoiceModal';
import { MerchantReminderModal } from './MerchantReminderModal';
import { ReminderTimeline } from '../../components/merchants/ReminderTimeline';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Store,
  LayoutDashboard,
  Users,
  Receipt,
  Clock,
  BarChart3,
  Plus,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  Landmark
} from 'lucide-react';
import { DealerFinanceModule } from '../dealers/finance/DealerFinanceModule';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface MerchantsModuleProps {
  initialMerchant?: Merchant | null;
}

export const MerchantsModule: React.FC<MerchantsModuleProps> = ({ initialMerchant }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Active Sub Tab
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'list' | 'invoices' | 'reminders' | 'reports' | 'finance'>('dashboard');

  // Modals & Selection
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(initialMerchant || null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [merchantForAction, setMerchantForAction] = useState<Merchant | null>(null);

  // Invoices & Reminders data
  const [allInvoices, setAllInvoices] = useState<MerchantInvoice[]>([]);
  const [allReminders, setAllReminders] = useState<MerchantReminder[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const loadData = () => {
    setAllInvoices(db.getMerchantInvoices());
    setAllReminders(db.getMerchantReminders());
    setMerchants(db.getMerchants(false));
  };

  useEffect(() => {
    loadData();
    if (initialMerchant) {
      setSelectedMerchant(initialMerchant);
    }
  }, [initialMerchant]);

  return (
    <div className="space-y-5 animate-fade-in p-2 sm:p-4 text-right">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { id: 'home', label: 'الرئيسية' },
          { id: 'merchants', label: 'قسم التجار والموردين والوكلاء', active: true }
        ]}
      />

      {/* Sub Navigation Bar */}
      <Card className="p-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'dashboard'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> لوحة التجار (Dashboard)
          </button>

          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'list'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Store className="w-4 h-4 text-blue-500" /> دليل التجار والحسابات ({merchants.length})
          </button>

          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'invoices'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-500" /> الفواتير التجارية ({allInvoices.length})
          </button>

          <button
            onClick={() => setActiveSubTab('reminders')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'reminders'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" /> المتابعات والتذكيرات ({allReminders.length})
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'reports'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-500" /> التقارير الشاملة
          </button>

          <button
            onClick={() => setActiveSubTab('finance')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'finance'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Landmark className="w-4 h-4 text-amber-500" /> المالية والخزائن
          </button>
        </div>
      </Card>

      {/* Sub Tab Views */}
      {activeSubTab === 'dashboard' && (
        <MerchantsDashboard
          onOpenNewMerchant={() => setIsFormOpen(true)}
          onOpenNewInvoice={() => {
            if (merchants.length > 0) {
              setMerchantForAction(merchants[0]);
              setIsInvoiceModalOpen(true);
            }
          }}
          onSelectMerchant={m => setSelectedMerchant(m)}
          onNavigateTab={tab => setActiveSubTab(tab as any)}
        />
      )}

      {activeSubTab === 'list' && (
        <MerchantsList initialSelectedMerchant={selectedMerchant} />
      )}

      {activeSubTab === 'invoices' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              <span>إدارة الفواتير التجارية المعتمدة</span>
            </h3>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                if (merchants.length > 0) {
                  setMerchantForAction(merchants[0]);
                  setIsInvoiceModalOpen(true);
                }
              }}
            >
              إنشاء فاتورة جديدة
            </Button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A] font-bold">
                <tr>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">التاجر / المورد</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">تاريخ الإصدار</th>
                  <th className="p-3">تاريخ الاستحقاق</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">الإجمالي الصافي</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {allInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 font-mono font-bold text-orange-500">{inv.invoiceNumber}</td>
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{inv.merchantName}</td>
                    <td className="p-3">
                      <Badge variant={inv.type === 'purchase' ? 'info' : 'success'} size="sm">
                        {inv.type === 'purchase' ? 'فاتورة شراء' : 'فاتورة بيع'}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-zinc-500">{formatDate(inv.issueDate)}</td>
                    <td className="p-3 font-mono text-zinc-500">{formatDate(inv.dueDate)}</td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">{inv.paymentMethod}</td>
                    <td className="p-3 font-mono font-black text-orange-500">{formatCurrency(inv.totalAmount)}</td>
                    <td className="p-3">
                      <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'} size="sm">
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {activeSubTab === 'reminders' && (
        <div className="space-y-4 animate-fade-in">
          <ReminderTimeline
            reminders={allReminders}
            onAddReminder={() => {
              if (merchants.length > 0) {
                setMerchantForAction(merchants[0]);
                setIsReminderModalOpen(true);
              }
            }}
            onCompleteReminder={id => {
              db.completeMerchantReminder(id);
              showToast('success', 'تم الإنجاز', 'تم إكمال التذكير');
              loadData();
            }}
            onDeleteReminder={id => {
              db.deleteMerchantReminder(id);
              showToast('warning', 'تم الحذف', 'تم حذف التذكير');
              loadData();
            }}
          />
        </div>
      )}

      {activeSubTab === 'reports' && <MerchantsReports />}

      {activeSubTab === 'finance' && <DealerFinanceModule />}

      {/* Global Modals */}
      <MerchantFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={merchantData => {
          db.saveMerchant(merchantData as Merchant);
          showToast('success', 'تمت الإضافة', 'تم إنشاء التاجر بنجاح');
          loadData();
        }}
      />

      <MerchantProfileModal
        isOpen={!!selectedMerchant}
        onClose={() => setSelectedMerchant(null)}
        merchant={selectedMerchant}
        onMerchantUpdated={loadData}
      />

      {merchantForAction && (
        <>
          <MerchantInvoiceModal
            isOpen={isInvoiceModalOpen}
            onClose={() => setIsInvoiceModalOpen(false)}
            onSave={inv => {
              db.saveMerchantInvoice(inv, user?.fullName || 'المستخدم');
              showToast('success', 'تمت الفاتورة', 'تم تسجيل الفاتورة بنجاح');
              loadData();
            }}
            merchant={merchantForAction}
          />

          <MerchantReminderModal
            isOpen={isReminderModalOpen}
            onClose={() => setIsReminderModalOpen(false)}
            onSave={rem => {
              db.saveMerchantReminder(rem);
              showToast('success', 'تم التذكير', 'تمت جدولة التذكير بنجاح');
              loadData();
            }}
            merchant={merchantForAction}
          />
        </>
      )}
    </div>
  );
};
