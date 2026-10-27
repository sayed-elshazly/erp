import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from './SortableDraggableItem';
import {
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
  GripVertical,
  CheckCircle2,
  Users,
  Store,
  ShieldCheck,
  Tv,
  Wallet,
  LayoutDashboard,
  Settings,
  Ticket,
  Trophy,
  Gamepad2,
  Tag,
  Landmark,
  BarChart3,
  Sliders,
  Layers,
  CreditCard,
  Bell,
  Receipt,
  Scale,
  Gift,
  CalendarCheck,
  TrendingUp,
  FileText
} from 'lucide-react';

interface TabsReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TabsReorderModal: React.FC<TabsReorderModalProps> = ({ isOpen, onClose }) => {
  const {
    orders,
    getOrderedItems,
    moveItemUp,
    moveItemDown,
    resetContainerOrder,
    resetAllOrders
  } = useLayoutOrder();

  const [activeContainer, setActiveContainer] = useState<string>('sidebar_main');

  // Definitions of all reorderable containers and their default items
  const containersConfig: Record<
    string,
    { label: string; icon: any; items: { id: string; label: string; icon: any }[] }
  > = {
    sidebar_main: {
      label: 'القائمة الرئيسية (الأقسام الكبرى)',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard', label: 'الداشبورد الرئيسي', icon: LayoutDashboard },
        { id: 'customers_group', label: 'قسم الزبائن والشحن', icon: Users },
        { id: 'dealers_group', label: 'قسم التجار والموزعين', icon: Store },
        { id: 'middleman_group', label: 'قسم الوساطة والضمان', icon: ShieldCheck },
        { id: 'subscriptions_group', label: 'قسم الاشتراكات', icon: Tv },
        { id: 'finance_group', label: 'المالية والخزينة', icon: Wallet },
        { id: 'settings', label: 'الإعدادات العامة والرقابة', icon: Settings }
      ]
    },
    sidebar_customers_group: {
      label: 'تبويبات قسم الزبائن والشحن',
      icon: Users,
      items: [
        { id: 'customer_dashboard', label: 'لوحة تحكم الزبائن', icon: LayoutDashboard },
        { id: 'tickets', label: 'تذاكر الشحن', icon: Ticket },
        { id: 'customers', label: 'البروفايلات والعملاء', icon: Users },
        { id: 'competitions', label: 'المسابقات والمكافآت', icon: Trophy },
        { id: 'catalog', label: 'المنتجات والمحافظ', icon: Gamepad2 },
        { id: 'coupons', label: 'كوبونات الخصم', icon: Tag },
        { id: 'customer_finance', label: 'المالية', icon: Landmark },
        { id: 'reports', label: 'تحليل البيانات والذكاء', icon: BarChart3 },
        { id: 'customer_settings', label: 'إعدادات قسم الزبائن', icon: Sliders }
      ]
    },
    sidebar_dealers_group: {
      label: 'تبويبات قسم التجار والموزعين',
      icon: Store,
      items: [
        { id: 'dealer_dashboard', label: 'لوحة تحكم التجار', icon: LayoutDashboard },
        { id: 'dealer_tickets', label: 'تذاكر شحن الجملة', icon: Ticket },
        { id: 'dealers', label: 'البروفايلات والتجار', icon: Store },
        { id: 'dealer_competitions', label: 'المسابقات والمكافآت', icon: Trophy },
        { id: 'dealer_catalog', label: 'المنتجات وأسعار الجملة', icon: Gamepad2 },
        { id: 'dealer_coupons', label: 'كوبونات خصم الجملة', icon: Tag },
        { id: 'dealer_finance', label: 'المالية', icon: Landmark },
        { id: 'dealer_reports', label: 'تحليل البيانات والذكاء', icon: BarChart3 },
        { id: 'dealer_settings', label: 'إعدادات قسم التجار', icon: Sliders }
      ]
    },
    sidebar_middleman_group: {
      label: 'تبويبات قسم الوساطة والضمان',
      icon: ShieldCheck,
      items: [
        { id: 'middleman_dashboard', label: 'لوحة تحكم الوساطة', icon: LayoutDashboard },
        { id: 'middleman_deals', label: 'الوساطات والصفقات', icon: ShieldCheck },
        { id: 'middleman_accounts', label: 'مخزن الحسابات (الأصول)', icon: Layers },
        { id: 'middleman_sell', label: 'بيع الحسابات والمطبوعات', icon: Store },
        { id: 'middleman_clients', label: 'عملاء الوساطة', icon: Users },
        { id: 'middleman_reports', label: 'التقارير والإحصائيات', icon: FileText },
        { id: 'middleman_settings', label: 'إعدادات الوساطة', icon: Sliders }
      ]
    },
    sidebar_subscriptions_group: {
      label: 'تبويبات قسم الاشتراكات',
      icon: Tv,
      items: [
        { id: 'subscriptions_dashboard', label: 'لوحة تحكم الاشتراكات', icon: LayoutDashboard },
        { id: 'subscriptions_list', label: 'سجل وإدارة الاشتراكات', icon: Tv },
        { id: 'subscriptions_clients', label: 'عملاء الاشتراكات', icon: Users },
        { id: 'subscriptions_plans', label: 'الباقات والأسعار', icon: Layers },
        { id: 'subscriptions_payments', label: 'المدفوعات والإيصالات', icon: CreditCard },
        { id: 'subscriptions_notifications', label: 'مركز التنبيهات والواتساب', icon: Bell },
        { id: 'subscriptions_reports', label: 'التقارير والإحصائيات', icon: FileText },
        { id: 'subscriptions_settings', label: 'إعدادات قسم الاشتراكات', icon: Sliders }
      ]
    },
    sidebar_finance_group: {
      label: 'تبويبات قسم المالية والخزينة',
      icon: Wallet,
      items: [
        { id: 'finance_overview', label: 'المركز المالي الشامل', icon: TrendingUp },
        { id: 'finance_vault', label: 'الخزينة والسيولة النقدية', icon: Wallet },
        { id: 'finance_wallets', label: 'المحافظ وحسابات البنوك', icon: CreditCard },
        { id: 'finance_expenses', label: 'المصروفات والبنود', icon: Receipt },
        { id: 'finance_debts', label: 'الديون والمستحقات', icon: Scale },
        { id: 'finance_commissions', label: 'الكاش باك والعمولات', icon: Gift },
        { id: 'finance_payroll', label: 'الرواتب والحضور', icon: CalendarCheck },
        { id: 'finance_settlements', label: 'التسويات والورديات', icon: CheckCircle2 },
        { id: 'finance_reports', label: 'التقارير والقوائم المالية', icon: FileText }
      ]
    }
  };

  const currentConfig = containersConfig[activeContainer] || containersConfig.sidebar_main;
  const currentItems = getOrderedItems(activeContainer, currentConfig.items, item => item.id);
  const defaultIds = currentConfig.items.map(item => item.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعادة ترتيب التبويبات والقوائم الرئيسية"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right animate-fade-in" dir="rtl">
        {/* Sub Navigation Bar for Containers */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1.5">
            اختر القسم المراد إعادة ترتيب تبويباته:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(containersConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isSelected = activeContainer === key;
              const isCustomized = Boolean(orders[key] && orders[key].length > 0);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveContainer(key)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{config.label}</span>
                  </div>
                  {isCustomized && (
                    <span
                      className="w-2 h-2 rounded-full bg-orange-500 shrink-0"
                      title="تم تخصيص ترتيب هذا القسم"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Items Reordering List */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 p-3 space-y-2 max-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-zinc-500 pb-1 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-bold">
              الترتيب الحالي للتبويبات ({currentItems.length} عنصر):
            </span>
            <button
              type="button"
              onClick={() => resetContainerOrder(activeContainer)}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>استعادة الترتيب الافتراضي لهذا القسم</span>
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            {currentItems.map((item, index) => {
              const Icon = item.icon;
              const isFirst = index === 0;
              const isLast = index === currentItems.length - 1;

              return (
                <SortableDraggableItem
                  key={item.id}
                  containerId={activeContainer}
                  itemId={item.id}
                  index={index}
                  defaultIds={defaultIds}
                  direction="vertical"
                >
                  <div
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs transition-all hover:border-orange-500/40 group select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-zinc-400 hover:text-orange-500 cursor-grab active:cursor-grabbing p-1 rounded transition-colors" title="اسحب لإعادة الترتيب">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 flex items-center justify-center font-mono text-[11px] font-bold">
                        {index + 1}
                      </span>
                      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-100">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItemUp(activeContainer, item.id, defaultIds)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isFirst
                            ? 'opacity-30 border-transparent cursor-not-allowed text-zinc-400'
                            : 'bg-zinc-100 dark:bg-zinc-700 hover:bg-orange-500 hover:text-white border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer shadow-xs'
                        }`}
                        title="تحريك التبويب للأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItemDown(activeContainer, item.id, defaultIds)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isLast
                            ? 'opacity-30 border-transparent cursor-not-allowed text-zinc-400'
                            : 'bg-zinc-100 dark:bg-zinc-700 hover:bg-orange-500 hover:text-white border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer shadow-xs'
                        }`}
                        title="تحريك التبويب للأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </SortableDraggableItem>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={resetAllOrders}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط كل الأقسام للنظام الافتراضي</span>
          </button>

          <Button
            variant="primary"
            onClick={onClose}
            className="text-xs font-black bg-orange-500 text-white gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ والعودة للواجهة</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
