import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HistoryProvider } from './context/HistoryContext';
import { NotificationProvider } from './context/NotificationContext';
import { TabsProvider, useTabs } from './context/TabsContext';
import { LayoutOrderProvider } from './context/LayoutOrderContext';
import { KeyboardProvider } from './context/KeyboardContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { SplashScreen } from './modules/splash/SplashScreen';
import { UserSelection } from './modules/auth/UserSelection';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TabsBar } from './components/layout/TabsBar';
import { CommandPalette } from './components/common/CommandPalette';
import { Dashboard } from './modules/dashboard/Dashboard';
import { TicketsModule } from './modules/tickets/TicketsModule';
import { CustomersList } from './modules/customers/CustomersList';
import { CustomersDashboard } from './modules/customers/CustomersDashboard';
import { DealersList } from './modules/dealers/DealersList';
import { DealersDashboard } from './modules/dealers/DealersDashboard';
import { CatalogModule } from './modules/catalog/CatalogModule';
import { CouponsModule } from './modules/coupons/CouponsModule';
import { ReportsModule } from './modules/reports/ReportsModule';
import { DataAnalyticsModule } from './modules/analytics/DataAnalyticsModule';
import { FinanceModule } from './modules/finance/FinanceModule';
import { MerchantsModule } from './modules/merchants/MerchantsModule';
import { SettingsModule } from './modules/settings/SettingsModule';
import { CustomerSettingsSubModule } from './modules/customerSettings/CustomerSettingsSubModule';
import { CustomerFinanceModule } from './modules/customers/finance/CustomerFinanceModule';
import { DealerFinanceModule } from './modules/dealers/finance/DealerFinanceModule';
import { DealerSettingsSubModule } from './modules/dealerSettings/DealerSettingsSubModule';
import { MiddlemanDashboard } from './modules/middleman/MiddlemanDashboard';
import { MiddlemanDealsList } from './modules/middleman/MiddlemanDealsList';
import { MiddlemanAccountsInventory } from './modules/middleman/MiddlemanAccountsInventory';
import { MiddlemanSalesList } from './modules/middleman/MiddlemanSalesList';
import { MiddlemanClientsList } from './modules/middleman/MiddlemanClientsList';
import { MiddlemanReports } from './modules/middleman/MiddlemanReports';
import { MiddlemanSettingsSubModule } from './modules/middleman/MiddlemanSettingsSubModule';
import { SubscriptionsDashboard } from './modules/subscriptions/SubscriptionsDashboard';
import { SubscriptionsList } from './modules/subscriptions/SubscriptionsList';
import { SubscriptionsClientsList } from './modules/subscriptions/SubscriptionsClientsList';
import { SubscriptionsPlansList } from './modules/subscriptions/SubscriptionsPlansList';
import { SubscriptionsPaymentsList } from './modules/subscriptions/SubscriptionsPaymentsList';
import { SubscriptionsNotificationsList } from './modules/subscriptions/SubscriptionsNotificationsList';
import { SubscriptionsReports } from './modules/subscriptions/SubscriptionsReports';
import { SubscriptionsSettingsSubModule } from './modules/subscriptions/SubscriptionsSettingsSubModule';
import { CompetitionsModule } from './modules/competitions/CompetitionsModule';
import { ToastContainer } from './components/feedback/ToastContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ShieldAlert } from 'lucide-react';
import { db } from './database/db';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, canAccessDepartment, hasPermission } = useAuth();
  const { activeTab, openTab } = useTabs();
  const [showSplash, setShowSplash] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Quick action triggers for Command Palette
  const [openNewCustomerTrigger, setOpenNewCustomerTrigger] = useState(false);
  const [openNewExpenseTrigger, setOpenNewExpenseTrigger] = useState(false);
  const [openVaultDepositTrigger, setOpenVaultDepositTrigger] = useState(false);

  // If splash screen is still running
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // If user is not authenticated, show User Selection (Manager vs Employee)
  if (!isAuthenticated) {
    return (
      <UserSelection
        onSuccess={(targetSection?: string) => {
          if (targetSection && targetSection !== 'all') {
            const titleMap: Record<string, string> = {
              dashboard: 'الداشبورد',
              customer_dashboard: 'لوحة تحكم الزبائن',
              dealer_dashboard: 'لوحة تحكم التجار',
              tickets: 'تذاكر الشحن',
              customers: 'البروفايلات والعملاء',
              dealers: 'البروفايلات والتجار',
              dealer_tickets: 'تذاكر شحن الجملة',
              dealer_catalog: 'المنتجات وأسعار الجملة',
              dealer_coupons: 'كوبونات خصم الجملة',
              dealer_competitions: '🎯 المسابقات والمكافآت (التجار)',
              dealer_finance: 'المالية',
              dealer_reports: 'تحليل البيانات والذكاء',
              dealer_settings: 'إعدادات قسم التجار',
              catalog: 'المنتجات والمحافظ',
              coupons: 'كوبونات الخصم',
              customer_settings: 'إعدادات قسم الزبائن',
              competitions: '🎯 المسابقات والمكافآت',
              customer_finance: 'المالية',
              reports: 'تحليل البيانات والذكاء',
              finance: 'المالية والخزينة',
              finance_overview: 'المركز المالي الشامل',
              finance_vault: 'الخزينة والسيولة النقدية',
              finance_wallets: 'المحافظ وحسابات البنوك',
              finance_expenses: 'المصروفات والبنود',
              finance_debts: 'الديون والمستحقات',
              finance_commissions: 'الكاش باك والعمولات',
              finance_payroll: 'الرواتب والحضور',
              finance_settlements: 'التسويات والورديات',
              finance_reports: 'التقارير والقوائم المالية',
              merchants: 'الموردين والخزائن الخارجية',
              settings: 'الإعدادات والرقابة',
              middleman_dashboard: 'لوحة تحكم الوساطة',
              middleman_deals: 'الوساطات والصفقات',
              middleman_accounts: 'مخزن الحسابات (الأصول)',
              middleman_sell: 'بيع الحسابات والمطبوعات',
              middleman_clients: 'عملاء الوساطة',
              middleman_reports: 'تقارير الوساطة',
              middleman_settings: 'إعدادات الوساطة',
              subscriptions: 'لوحة تحكم الاشتراكات',
              subscriptions_dashboard: 'لوحة تحكم الاشتراكات',
              subscriptions_list: 'سجل الاشتراكات',
              subscriptions_clients: 'عملاء الاشتراكات',
              subscriptions_plans: 'باقات الاشتراك',
              subscriptions_payments: 'المدفوعات والمستردات',
              subscriptions_notifications: 'تنبيهات التجديد',
              subscriptions_reports: 'تقارير الاشتراكات',
              subscriptions_settings: 'إعدادات الاشتراكات'
            };
            const effectiveSection =
              targetSection === 'brokerage'
                ? 'middleman_dashboard'
                : targetSection === 'subscriptions'
                ? 'subscriptions_dashboard'
                : targetSection === 'customers'
                ? 'customer_dashboard'
                : targetSection === 'dealers'
                ? 'dealer_dashboard'
                : targetSection;
            openTab({
              id: effectiveSection,
              title: titleMap[effectiveSection] || 'القسم المخصص',
              section: effectiveSection,
              iconType: effectiveSection as any
            });
          } else {
            openTab({
              id: 'dashboard',
              title: 'الداشبورد',
              section: 'dashboard',
              iconType: 'dashboard',
              closable: false
            });
          }
        }}
      />
    );
  }

  const currentSection = activeTab?.section || 'dashboard';

  const getSectionTitle = (sec: string) => {
    switch (sec) {
      case 'customer_dashboard':
        return 'لوحة تحكم الزبائن';
      case 'dealer_dashboard':
        return 'لوحة تحكم التجار';
      case 'tickets':
        return 'تذاكر الشحن';
      case 'customers':
        return 'البروفايلات والعملاء';
      case 'dealers':
        return 'البروفايلات والتجار';
      case 'dealer_tickets':
        return 'تذاكر شحن الجملة';
      case 'dealer_catalog':
        return 'المنتجات وأسعار الجملة';
      case 'dealer_coupons':
        return 'كوبونات خصم الجملة';
      case 'dealer_competitions':
        return '🎯 المسابقات والمكافآت (التجار والموزعين)';
      case 'dealer_finance':
        return 'المالية';
      case 'dealer_reports':
        return 'تحليل البيانات والذكاء (التجار)';
      case 'dealer_settings':
        return 'إعدادات قسم التجار';
      case 'catalog':
        return 'المنتجات والمحافظ';
      case 'coupons':
        return 'كوبونات الخصم';
      case 'customer_settings':
        return 'إعدادات قسم الزبائن';
      case 'competitions':
        return '🎯 المسابقات والمكافآت';
      case 'customer_finance':
        return 'المالية';
      case 'reports':
        return 'تحليل البيانات والذكاء (الزبائن)';
      case 'finance':
        return 'المالية والخزينة';
      case 'finance_overview':
        return 'المركز المالي الشامل';
      case 'finance_vault':
        return 'الخزينة والسيولة النقدية';
      case 'finance_wallets':
        return 'المحافظ وحسابات البنوك';
      case 'finance_expenses':
        return 'المصروفات والبنود';
      case 'finance_debts':
        return 'الديون والمستحقات';
      case 'finance_commissions':
        return 'الكاش باك والعمولات';
      case 'finance_payroll':
        return 'الرواتب والحضور';
      case 'finance_settlements':
        return 'التسويات والورديات';
      case 'finance_reports':
        return 'التقارير والقوائم المالية';
      case 'merchants':
        return 'الموردين والخزائن الخارجية';
      case 'middleman_dashboard':
        return 'لوحة تحكم الوساطة';
      case 'middleman_deals':
        return 'الوساطات والصفقات';
      case 'middleman_accounts':
        return 'مخزن الحسابات (الأصول)';
      case 'middleman_sell':
        return 'بيع الحسابات والمطبوعات';
      case 'middleman_clients':
        return 'عملاء الوساطة';
      case 'middleman_reports':
        return 'تقارير وإحصائيات الوساطة';
      case 'middleman_settings':
        return 'إعدادات الوساطة والضمان';
      case 'subscriptions_dashboard':
        return 'لوحة تحكم الاشتراكات';
      case 'subscriptions_list':
        return 'سجل الاشتراكات';
      case 'subscriptions_clients':
        return 'عملاء الاشتراكات';
      case 'subscriptions_plans':
        return 'باقات الاشتراك';
      case 'subscriptions_payments':
        return 'المدفوعات والمستردات';
      case 'subscriptions_notifications':
        return 'تنبيهات التجديد';
      case 'subscriptions_reports':
        return 'تقارير الاشتراكات';
      case 'subscriptions_settings':
        return 'إعدادات الاشتراكات';
      case 'settings':
        return 'الإعدادات والرقابة';
      default:
        return 'الداشبورد';
    }
  };

  const isSectionAllowed = (sec: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (sec === 'settings') return Boolean(hasPermission('manage_settings'));
    if (sec === 'finance' || sec.startsWith('finance_')) {
      return user.department === 'finance' || Boolean(hasPermission('manage_finance'));
    }
    if (sec === 'customer_settings') return canAccessDepartment('customers');
    if (sec === 'dealer_settings') return canAccessDepartment('dealers');
    if (sec === 'middleman_settings') return canAccessDepartment('brokerage');
    if (sec === 'subscriptions_settings') return canAccessDepartment('subscriptions');
    if (sec.startsWith('middleman_')) return canAccessDepartment('brokerage');
    if (sec.startsWith('subscriptions_')) return canAccessDepartment('subscriptions');
    if (sec.startsWith('dealer_')) return canAccessDepartment('dealers');
    return true;
  };

  const allowedToViewCurrent = isSectionAllowed(currentSection);

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0E0E10] text-[#0B0B0B] dark:text-[#FFFFFF] overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <Sidebar
        activeSection={currentSection}
        onNavigate={sec => {
          openTab({
            id: sec,
            title: getSectionTitle(sec),
            section: sec,
            iconType: sec as any,
            closable: sec !== 'dashboard'
          });
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header activeSection={currentSection} />

        {/* Chrome/VS Code Style Multi-Tabs Bar */}
        <TabsBar />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          {!allowedToViewCurrent ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-lg shadow-rose-500/10">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-2">غير مصرح بالوصول إلى هذا القسم</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
                حسابك الحالي [{user?.fullName}] بصفة [{user?.role === 'admin' ? '👑 مدير عام' : user?.jobTitle || 'موظف'}] لا يمتلك الصلاحيات الإدارية المطلوبة لفتح هذا القسم. تم توثيق المحاولة في سجل التدقيق الأمني.
              </p>
              <button
                type="button"
                onClick={() => openTab({ id: 'dashboard', title: 'الداشبورد', section: 'dashboard', iconType: 'dashboard', closable: false })}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                العودة للداشبورد المتاح
              </button>
            </div>
          ) : (
            <>
              {currentSection === 'dashboard' && (
            <Dashboard
              onNavigate={sec =>
                openTab({
                  id: sec,
                  title: getSectionTitle(sec),
                  section: sec,
                  iconType: sec as any
                })
              }
              onOpenCustomerModal={() => setOpenNewCustomerTrigger(true)}
              onOpenExpenseModal={() => setOpenNewExpenseTrigger(true)}
              onOpenVaultModal={() => setOpenVaultDepositTrigger(true)}
            />
          )}

          {/* Customer Department Sub-Tabs */}
          {currentSection === 'customer_dashboard' && (
            <CustomersDashboard
              onOpenNewCustomer={() => {
                openTab({
                  id: 'customers',
                  title: 'البروفايلات والعملاء',
                  section: 'customers',
                  iconType: 'customers'
                });
              }}
              onSelectCustomer={c => {
                openTab({
                  id: `customer_${c.id}`,
                  title: `عميل: ${c.name}`,
                  section: 'customers',
                  iconType: 'customer_profile' as any,
                  payload: c
                });
              }}
              onNavigateToDirectory={() => {
                openTab({
                  id: 'customers',
                  title: 'البروفايلات والعملاء',
                  section: 'customers',
                  iconType: 'customers'
                });
              }}
            />
          )}

          {/* Customer Shipping Sub-Tabs */}
          {currentSection === 'tickets' && <TicketsModule department="customers" />}

          {currentSection === 'customers' && (
            <CustomersList
              initialSelectedCustomer={activeTab?.iconType === 'customer_profile' ? activeTab.payload : null}
            />
          )}

          {/* Dealer Wholesale Sub-Tabs (Full 8 Sections) */}
          {currentSection === 'dealer_dashboard' && (
            <DealersDashboard
              onOpenNewDealer={() => {
                openTab({
                  id: 'dealers',
                  title: 'البروفايلات والتجار',
                  section: 'dealers',
                  iconType: 'dealers'
                });
              }}
              onSelectDealer={d => {
                openTab({
                  id: `dealer_${d.id}`,
                  title: `تاجر: ${d.name}`,
                  section: 'dealers',
                  iconType: 'dealer_profile' as any,
                  payload: d
                });
              }}
              onNavigateToDirectory={() => {
                openTab({
                  id: 'dealers',
                  title: 'البروفايلات والتجار',
                  section: 'dealers',
                  iconType: 'dealers'
                });
              }}
            />
          )}

          {currentSection === 'dealer_tickets' && <TicketsModule department="dealers" />}

          {currentSection === 'dealers' && (
            <DealersList
              initialSelectedDealer={activeTab?.iconType === 'dealer_profile' ? activeTab.payload : null}
            />
          )}

          {currentSection === 'dealer_catalog' && <CatalogModule department="dealers" />}

          {currentSection === 'dealer_coupons' && <CouponsModule department="dealers" />}

          {currentSection === 'dealer_competitions' && (
            <CompetitionsModule defaultAudience="dealers" />
          )}

          {currentSection === 'dealer_reports' && <DataAnalyticsModule department="dealers" />}

          {currentSection === 'dealer_finance' && <DealerFinanceModule />}

          {currentSection === 'dealer_settings' && <DealerSettingsSubModule />}

          {/* Middleman & Escrow Section (Full 7 Sub-tabs) */}
          {currentSection === 'middleman_dashboard' && (
            <MiddlemanDashboard
              onNavigateTab={sec =>
                openTab({
                  id: sec,
                  title: getSectionTitle(sec),
                  section: sec,
                  iconType: sec as any
                })
              }
            />
          )}

          {currentSection === 'middleman_deals' && (
            <MiddlemanDealsList initialSelectedDealId={activeTab?.payload?.dealId} />
          )}

          {currentSection === 'middleman_accounts' && <MiddlemanAccountsInventory />}

          {currentSection === 'middleman_sell' && <MiddlemanSalesList />}

          {currentSection === 'middleman_clients' && (
            <MiddlemanClientsList
              initialSelectedCustomer={activeTab?.payload?.customer || (activeTab?.payload?.id ? activeTab.payload : null)}
              initialFilterToday={Boolean(activeTab?.payload?.filterToday)}
            />
          )}

          {currentSection === 'middleman_reports' && <MiddlemanReports />}

          {currentSection === 'middleman_settings' && <MiddlemanSettingsSubModule />}

          {/* Subscriptions Module Section (Full 8 Sub-tabs) */}
          {currentSection === 'subscriptions_dashboard' && (
            <SubscriptionsDashboard
              onNavigateToTab={sec =>
                openTab({
                  id: sec,
                  title: getSectionTitle(sec),
                  section: sec,
                  iconType: sec as any
                })
              }
            />
          )}

          {currentSection === 'subscriptions_list' && (
            <SubscriptionsList
              initialSelectedSubscriptionId={activeTab?.payload?.subscriptionId}
              initialAction={activeTab?.payload?.action}
            />
          )}

          {currentSection === 'subscriptions_clients' && <SubscriptionsClientsList />}

          {currentSection === 'subscriptions_plans' && <SubscriptionsPlansList />}

          {currentSection === 'subscriptions_payments' && <SubscriptionsPaymentsList />}

          {currentSection === 'subscriptions_notifications' && <SubscriptionsNotificationsList />}

          {currentSection === 'subscriptions_reports' && <SubscriptionsReports />}

          {currentSection === 'subscriptions_settings' && <SubscriptionsSettingsSubModule />}

          {/* Shared / Other Sections */}
          {currentSection === 'catalog' && <CatalogModule department="customers" />}

          {currentSection === 'coupons' && <CouponsModule department="customers" />}

          {currentSection === 'reports' && <DataAnalyticsModule department="customers" />}

          {currentSection === 'customer_settings' && <CustomerSettingsSubModule />}

          {currentSection === 'competitions' && <CompetitionsModule defaultAudience="customers" />}

          {currentSection === 'customer_finance' && <CustomerFinanceModule />}

          {(currentSection === 'finance' || currentSection.startsWith('finance_')) && (
            <FinanceModule subSection={currentSection} />
          )}

          {currentSection === 'merchants' && (
            <MerchantsModule
              initialMerchant={activeTab?.iconType === 'merchant_profile' ? activeTab.payload : null}
            />
          )}

          {currentSection === 'settings' && <SettingsModule />}
            </>
          )}
        </main>
      </div>

      {/* Command Palette (VS Code / Raycast Style - Ctrl+K) */}
      <CommandPalette
        onOpenNewCustomer={() => setOpenNewCustomerTrigger(true)}
        onOpenNewExpense={() => setOpenNewExpenseTrigger(true)}
        onOpenVaultDeposit={() => setOpenVaultDepositTrigger(true)}
      />

      {/* Floating Notifications Toast Container */}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <NotificationProvider>
          <AuthProvider>
            <LayoutOrderProvider>
              <HistoryProvider>
                <TabsProvider>
                  <WorkspaceProvider>
                    <KeyboardProvider>
                      <ErrorBoundary>
                        <MainApp />
                      </ErrorBoundary>
                    </KeyboardProvider>
                  </WorkspaceProvider>
                </TabsProvider>
              </HistoryProvider>
            </LayoutOrderProvider>
          </AuthProvider>
        </NotificationProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
};

export default App;
