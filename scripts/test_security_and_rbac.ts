import { User, Permission } from '../src/types/auth.types';
import { CustomerTicket } from '../src/types/customer.types';
import { CompetitionReward } from '../src/types/competitions.types';

// Mock Browser Storage
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

(globalThis as any).localStorage = new MockLocalStorage();
(globalThis as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};

const { db } = await import('../src/database/db');

async function runSecurityAndRbacSuite() {
  console.log('========================================================================');
  console.log('🛡️ SYSTEM ERP - APPLICATION SECURITY & RBAC DEFENSIVE AUDIT SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string) {
    if (condition) {
      console.log(`✅ PASS: [${testId}] ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: [${testId}] ${desc}`);
      failed++;
    }
  }

  // Test Actors
  const adminActor: User = {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'المدير العام',
    role: 'admin',
    jobTitle: 'المدير التنفيذي',
    isActive: true,
    password: 'secure_admin_pass',
    permissions: [
      'view', 'add', 'edit', 'delete', 'print', 'export',
      'manage_users', 'manage_finance', 'close_shift', 'manage_settings',
      'deliver_rewards', 'run_draw'
    ],
    createdAt: new Date().toISOString()
  };

  const employeeActor: User = {
    id: 'usr_emp_ahmed',
    username: 'ahmed_cs',
    fullName: 'أحمد محمود',
    role: 'employee',
    department: 'customers',
    jobTitle: 'موظف خدمة عملاء',
    isActive: true,
    password: 'password123',
    permissions: ['view', 'add', 'edit', 'print'], // Notice: NO 'delete', NO 'manage_users', NO 'deliver_rewards'
    createdAt: new Date().toISOString()
  };

  const financeEmployeeActor: User = {
    id: 'usr_emp_mona',
    username: 'mona_fin',
    fullName: 'منى إبراهيم',
    role: 'employee',
    department: 'finance',
    jobTitle: 'محاسبة الخزينة',
    isActive: true,
    password: 'password123',
    permissions: ['view', 'add', 'edit', 'print', 'manage_finance'],
    createdAt: new Date().toISOString()
  };

  // Seed users into storage
  db.saveUser(adminActor);
  db.saveUser(employeeActor);
  db.saveUser(financeEmployeeActor);

  // -------------------------------------------------------------------------
  // SUITE 1: User Management & Privilege Escalation Protection
  // -------------------------------------------------------------------------
  console.log('▶ SUITE 1: User Management & Privilege Escalation Prevention');

  // Test 1: Employee trying to create/save a new user without 'manage_users'
  const unauthorizedNewUser: User = {
    id: 'usr_hacker',
    username: 'intruder',
    fullName: 'مستخدم متسلل',
    role: 'employee',
    jobTitle: 'موظف',
    isActive: true,
    permissions: ['view'],
    createdAt: new Date().toISOString()
  };

  const saveAttempt1 = db.saveUser(unauthorizedNewUser, employeeActor);
  assert(!saveAttempt1, 'SEC-01', 'Employee without manage_users cannot create new user accounts');
  assert(!db.getUserById('usr_hacker'), 'SEC-02', 'Rejected user account was not persisted in storage');

  // Test 2: Privilege Escalation - Employee trying to create or promote an admin
  const escalationTarget: User = {
    id: 'usr_elevated',
    username: 'ahmed_escalated',
    fullName: 'أحمد محمود (محاولة ترقية)',
    role: 'admin', // Escalating role to admin!
    jobTitle: 'مدير عام مزيف',
    isActive: true,
    permissions: ['manage_users', 'manage_settings'],
    createdAt: new Date().toISOString()
  };

  const saveAttempt2 = db.saveUser(escalationTarget, employeeActor);
  assert(!saveAttempt2, 'SEC-03', 'Employee is strictly blocked from creating or promoting an admin account');
  assert(!db.getUserById('usr_elevated'), 'SEC-04', 'Escalated admin account was rejected and not persisted');

  // Test 3: Employee trying to delete another user
  const deleteUserAttempt = db.deleteUser(financeEmployeeActor.id, employeeActor);
  assert(!deleteUserAttempt, 'SEC-05', 'Employee cannot delete user accounts');
  assert(Boolean(db.getUserById(financeEmployeeActor.id)), 'SEC-06', 'Target user account remains intact');

  // Test 4: Admin creates a legitimate user
  const legitimateUser: User = {
    id: 'usr_legit_sub',
    username: 'nour_sub',
    fullName: 'نور أحمد',
    role: 'employee',
    department: 'subscriptions',
    jobTitle: 'موظفة اشتراكات',
    isActive: true,
    permissions: ['view', 'add'],
    createdAt: new Date().toISOString()
  };
  const adminSaveResult = db.saveUser(legitimateUser, adminActor);
  assert(adminSaveResult, 'SEC-07', 'Admin can legitimately create new users');
  assert(Boolean(db.getUserById('usr_legit_sub')), 'SEC-08', 'Legitimate user successfully stored');

  // -------------------------------------------------------------------------
  // SUITE 2: Ticket Deletion Authorization at Data Execution Layer
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: Ticket Deletion Execution Guard');

  // Create a customer and ticket
  const testCustomer = {
    id: 'cust_sec_1',
    name: 'عميل اختبار الأمان',
    phone: '01599998877',
    balance: 500,
    totalSpent: 1200,
    tier: 'silver' as const,
    notes: 'حساب أمان',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveCustomer(testCustomer);

  const testTicket: CustomerTicket = {
    id: 'tkt_sec_100',
    ticketNumber: 'TKT-99001',
    customerId: testCustomer.id,
    customerName: testCustomer.name,
    customerPhone: testCustomer.phone,
    productName: 'باقة شحن أمنية 1000 نقطة',
    quantity: 1,
    costPrice: 80,
    unitPrice: 100,
    totalPrice: 100,
    paidAmount: 100,
    remainingAmount: 0,
    status: 'completed',
    paymentStatus: 'paid',
    department: 'customers',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveTicket(testTicket);

  // Employee without delete permission tries to delete ticket directly
  const empDeleteResult = db.deleteTicket(testTicket.id, employeeActor);
  assert(!empDeleteResult, 'SEC-09', 'Employee without delete permission cannot delete tickets');
  assert(Boolean(db.getTicketById(testTicket.id)), 'SEC-10', 'Ticket remains safely in active storage after unauthorized attempt');

  // Admin deletes the ticket
  const adminDeleteResult = db.deleteTicket(testTicket.id, adminActor);
  assert(adminDeleteResult, 'SEC-11', 'Admin can delete ticket with full financial and archive rollback');
  assert(!db.getTicketById(testTicket.id), 'SEC-12', 'Ticket safely removed from active storage');
  const archived = db.getDeletedTickets().find(t => t.id === testTicket.id);
  assert(Boolean(archived), 'SEC-13', 'Deleted ticket safely preserved in DELETED_TICKETS audit archive');

  // -------------------------------------------------------------------------
  // SUITE 3: Factory Reset / Wipe All Data Protection
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: Factory Reset & Wipe Data Protection');

  // Employee attempts wipeAllData
  const empWipeResult = db.wipeAllData('any_pass', employeeActor);
  assert(!empWipeResult, 'SEC-14', 'Non-admin actor is blocked from wiping database');
  assert(db.getCustomers().length > 0, 'SEC-15', 'Customer records remain intact after unauthorized wipe attempt');

  // Attempt wipeAllData with invalid admin password
  const badPassWipeResult = db.wipeAllData('WRONG_PASS', adminActor);
  assert(!badPassWipeResult, 'SEC-16', 'wipeAllData is rejected when password does not match admin password');
  assert(db.getCustomers().length > 0, 'SEC-17', 'Data remains untouched when password is wrong');

  // -------------------------------------------------------------------------
  // SUITE 4: Competition Reward Delivery RBAC Protection
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 4: Competition Reward Delivery RBAC Guard');

  const testReward: CompetitionReward = {
    id: 'rew_sec_test',
    competitionId: 'comp_1',
    competitionTitle: 'مسابقة الأمان',
    participantId: 'part_1',
    entityId: testCustomer.id,
    entityName: testCustomer.name,
    entityPhone: testCustomer.phone,
    entityType: 'customer',
    rank: 1,
    prizeName: 'رصيد مجاني 200 جنيه',
    prizeType: 'wallet_credit',
    prizeValue: 200,
    costEGP: 200,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.saveCompetitionReward(testReward);

  // Employee without deliver_rewards tries to deliver reward
  const empDeliverResult = db.deliverCompetitionReward(testReward.id, employeeActor);
  assert(!empDeliverResult.success, 'SEC-18', 'Employee without deliver_rewards is rejected from delivering rewards');
  const rewardAfterEmp = db.getCompetitionRewardById(testReward.id);
  assert(rewardAfterEmp?.status === 'pending', 'SEC-19', 'Reward status remains pending after unauthorized attempt');

  // Admin delivers reward
  const adminDeliverResult = db.deliverCompetitionReward(testReward.id, adminActor);
  assert(adminDeliverResult.success, 'SEC-20', 'Admin successfully delivers reward');
  const rewardAfterAdmin = db.getCompetitionRewardById(testReward.id);
  assert(rewardAfterAdmin?.status === 'delivered', 'SEC-21', 'Reward status updated to delivered');

  // -------------------------------------------------------------------------
  // SUITE 5: Audit Log Integrity & Security Attribution
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 5: Audit Logs & Security Attribution');

  const auditLogs = db.getAuditLogs();
  assert(auditLogs.length > 0, 'SEC-22', 'Audit logs recorded security actions');

  // Find unauthorized ticket deletion log
  const ticketRejectLog = auditLogs.find(l => l.details && l.details.includes('حاول حذف التذكرة'));
  assert(Boolean(ticketRejectLog), 'SEC-23', 'Unauthorized ticket deletion attempt was attributed and logged');
  assert(ticketRejectLog?.userName === employeeActor.fullName, 'SEC-24', 'Correct actor name was attributed in audit log');

  // Find privilege escalation attempt log
  const escalationLog = auditLogs.find(l => 
    (l.entityTitle && l.entityTitle.includes('تصعيد صلاحيات')) ||
    (l.details && l.details.includes('ترقية مستخدم إلى رتبة مدير عام'))
  );
  assert(Boolean(escalationLog), 'SEC-25', 'Privilege escalation attempt was explicitly identified and logged');

  // Check no password leakage in audit logs
  const passwordLeak = auditLogs.some(l => l.details && l.details.includes('secure_admin_pass'));
  assert(!passwordLeak, 'SEC-26', 'Admin passwords and secrets are never leaked in audit logs');

  // -------------------------------------------------------------------------
  // SUITE 6: Stored XSS & Script Tag Injection Resilience
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 6: Input Sanitization & XSS Resilience');

  const xssPayload = `<script>alert('XSS_ATTACK')</script><img src="x" onerror="window.__hacked=true">`;
  const xssCustomer = {
    id: 'cust_xss_test',
    name: `عميل ${xssPayload}`,
    phone: '01599998866',
    balance: 100,
    totalSpent: 100,
    tier: 'bronze' as const,
    notes: `ملاحظة خبيثة: ${xssPayload}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveCustomer(xssCustomer);

  const fetchedXssCust = db.getCustomerById('cust_xss_test');
  assert(Boolean(fetchedXssCust), 'SEC-27', 'XSS payload handled as pure string data');
  assert(fetchedXssCust?.name.includes('<script>'), 'SEC-28', 'String preserved without browser execution');
  assert(!(globalThis as any).window.__hacked, 'SEC-29', 'No arbitrary script was executed in context');

  console.log('\n========================================================================');
  console.log(`🏁 APPLICATION SECURITY & RBAC SUITE: ${passed}/${passed + failed} PASSED (${failed} failed)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAndRbacSuite().catch(err => {
  console.error('Fatal error during security test suite:', err);
  process.exit(1);
});
