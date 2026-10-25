import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Department } from '../../types/auth.types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { JkrLogo } from '../../components/common/JkrLogo';
import {
  Crown,
  Briefcase,
  KeyRound,
  User,
  Users,
  Store,
  ArrowRightLeft,
  Tv,
  Wallet,
  ArrowRight,
  Lock,
  Moon,
  Sun
} from 'lucide-react';

interface UserSelectionProps {
  onSuccess: (targetSection?: string) => void;
}

export const UserSelection: React.FC<UserSelectionProps> = ({ onSuccess }) => {
  const { loginAsAdmin, loginAsEmployee } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'select' | 'admin' | 'employee_dept' | 'employee_login'
  const [step, setStep] = useState<'select' | 'admin' | 'employee_dept' | 'employee_login'>('select');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Admin form
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Employee form
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empError, setEmpError] = useState('');

  const departments: { id: Department; name: string; icon: any; color: string; isAvailable: boolean }[] = [
    { id: 'customers', name: 'الزبائن', icon: Users, color: 'text-orange-500 bg-orange-500/10 border-orange-500/30', isAvailable: true },
    { id: 'dealers', name: 'التجار', icon: Store, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', isAvailable: true },
    { id: 'brokerage', name: 'الوساطة', icon: ArrowRightLeft, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30', isAvailable: true },
    { id: 'subscriptions', name: 'الاشتراكات', icon: Tv, color: 'text-pink-500 bg-pink-500/10 border-pink-500/30', isAvailable: true },
    { id: 'finance', name: 'المالية', icon: Wallet, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', isAvailable: true }
  ];

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminPassword) {
      setAdminError('يرجى إدخال كلمة المرور');
      return;
    }

    const success = loginAsAdmin(adminPassword);
    if (success) {
      onSuccess('dashboard');
    } else {
      setAdminError('كلمة المرور غير صحيحة (التجريبية: 123456 أو admin)');
    }
  };

  const handleEmployeeLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError('');
    if (!selectedDept) {
      setEmpError('يرجى اختيار القسم أولاً');
      return;
    }
    if (!empUsername.trim() || !empPassword) {
      setEmpError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const res = loginAsEmployee(selectedDept, empUsername, empPassword);
    if (res.success) {
      onSuccess(selectedDept);
    } else {
      setEmpError(res.message || 'فشل تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#080808] text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 selection:bg-orange-500 relative overflow-hidden transition-colors duration-200" dir="rtl">
      {/* Background Ambience Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Left Theme Switcher Button */}
      <div className="absolute top-5 left-5 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-md text-zinc-700 dark:text-zinc-200 hover:border-orange-500 transition-all flex items-center gap-2 text-xs font-bold"
          title="تبديل الوضع الليلي / النهاري"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>الوضع النهاري</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-zinc-700" />
              <span>الوضع الليلي</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand Header with Official JKR Logo */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-[#000000] border border-zinc-800 shadow-xl shadow-orange-500/20 mb-3 inline-flex items-center justify-center">
            <JkrLogo size="lg" showSubtitle={true} />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">نظام إدارة العمليات والخدمات الرقمية</p>
        </div>

        {/* Step 1: User Type Selection (المدير / الموظف) */}
        {step === 'select' && (
          <div className="p-6 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-xl space-y-4">
            <h2 className="text-center font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-1">
              اختر نوع الحساب للمتابعة
            </h2>

            <div className="grid grid-cols-1 gap-3.5">
              {/* Admin Button */}
              <button
                onClick={() => {
                  setStep('admin');
                  setAdminError('');
                  setAdminPassword('');
                }}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#27272A] bg-gray-50/70 dark:bg-[#202023] hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-500/5 dark:hover:bg-[#27272C] transition-all group cursor-pointer text-right"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl font-bold group-hover:scale-105 transition-transform">
                    👑
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors">
                      المدير العام
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">دخول كامل لكافة أقسام وإعدادات النظام</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transform rotate-180 transition-all" />
              </button>

              {/* Employee Button */}
              <button
                onClick={() => {
                  setStep('employee_dept');
                  setEmpError('');
                  setEmpUsername('');
                  setEmpPassword('');
                }}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#27272A] bg-gray-50/70 dark:bg-[#202023] hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-500/5 dark:hover:bg-[#27272C] transition-all group cursor-pointer text-right"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 text-2xl font-bold group-hover:scale-105 transition-transform">
                    👨💼
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors">
                      الموظف
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">دخول مخصص حسب القسم والصلاحيات</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transform rotate-180 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2A: Admin Password Form */}
        {step === 'admin' && (
          <div className="p-6 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3 mb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">تسجيل دخول المدير</h3>
              </div>
              <button
                onClick={() => setStep('select')}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-orange-500 flex items-center gap-1 font-semibold"
              >
                تغيير <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <Input
                label="كلمة مرور المدير"
                type="password"
                placeholder="أدخل كلمة المرور (التجريبية: 123456)"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                error={adminError}
                icon={<Lock className="w-4 h-4" />}
                autoFocus
              />

              <Button type="submit" variant="primary" size="lg" className="w-full">
                دخول النظام
              </Button>
            </form>
          </div>
        )}

        {/* Step 2B: Employee Department Selection */}
        {step === 'employee_dept' && (
          <div className="p-6 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3 mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">اختر القسم المخصص لك</h3>
              </div>
              <button
                onClick={() => setStep('select')}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-orange-500 flex items-center gap-1 font-semibold"
              >
                رجوع <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {departments.map(dept => {
                const Icon = dept.icon;
                return (
                  <button
                    key={dept.id}
                    disabled={!dept.isAvailable}
                    onClick={() => {
                      if (dept.isAvailable) {
                        setSelectedDept(dept.id);
                        setStep('employee_login');
                        if (dept.id === 'customers') {
                          setEmpUsername('ahmed_cust');
                          setEmpPassword('123456');
                        } else if (dept.id === 'dealers') {
                          setEmpUsername('tamer_dealer');
                          setEmpPassword('123456');
                        } else if (dept.id === 'brokerage') {
                          setEmpUsername('hassan_broker');
                          setEmpPassword('123456');
                        } else if (dept.id === 'finance') {
                          setEmpUsername('mustafa_fin');
                          setEmpPassword('123456');
                        }
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-right ${
                      dept.isAvailable
                        ? 'border-gray-200 dark:border-[#27272A] bg-gray-50/70 dark:bg-[#202023] hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-500/5 dark:hover:bg-[#27272C] cursor-pointer'
                        : 'border-gray-100 dark:border-[#1E1E22] bg-gray-50/30 dark:bg-[#141417] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg border ${dept.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{dept.name}</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {dept.isAvailable ? 'متاح للدخول الفوري' : 'قيد التطوير للمراحل القادمة'}
                        </p>
                      </div>
                    </div>
                    {dept.isAvailable && (
                      <ArrowRight className="w-4 h-4 text-zinc-400 transform rotate-180" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2C: Employee Credentials Login */}
        {step === 'employee_login' && selectedDept && (
          <div className="p-6 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3 mb-2">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>تسجيل دخول الموظف</span>
                  <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/30">
                    {departments.find(d => d.id === selectedDept)?.name}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setStep('employee_dept')}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-orange-500 flex items-center gap-1 font-semibold"
              >
                تغيير القسم <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleEmployeeLoginSubmit} className="space-y-3.5">
              <Input
                label="اسم المستخدم"
                placeholder="أدخل اسم المستخدم (مثال: ahmed_cust أو mustafa_fin)"
                value={empUsername}
                onChange={e => setEmpUsername(e.target.value)}
                icon={<User className="w-4 h-4" />}
                autoFocus
              />

              <Input
                label="كلمة المرور"
                type="password"
                placeholder="أدخل كلمة المرور (التجريبية: 123456)"
                value={empPassword}
                onChange={e => setEmpPassword(e.target.value)}
                icon={<KeyRound className="w-4 h-4" />}
              />

              {empError && (
                <p className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {empError}
                </p>
              )}

              {/* Quick Fill Demo Employee Account */}
              {(() => {
                const demoUser =
                  selectedDept === 'customers' ? 'ahmed_cust' :
                  selectedDept === 'dealers' ? 'tamer_dealer' :
                  selectedDept === 'brokerage' ? 'hassan_broker' :
                  selectedDept === 'subscriptions' ? 'sara_subs' : 'mustafa_fin';

                return (
                  <button
                    type="button"
                    onClick={() => {
                      setEmpUsername(demoUser);
                      setEmpPassword('123456');
                      setEmpError('');
                    }}
                    className="w-full p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-right cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                        💡 <span className="font-bold">حساب تجريبي سريع (اضغط للتعبئة التلقائية):</span>
                      </p>
                      <p className="text-[11px] font-mono mt-0.5">
                        مستخدم: <strong className="text-orange-600 dark:text-orange-400 font-bold">{demoUser}</strong> • باسورد: <strong className="text-amber-500 font-bold">123456</strong>
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-orange-500 text-white font-bold text-[10px] shadow-xs group-hover:scale-105 transition-transform">
                      تعبئة ودخول ⚡
                    </span>
                  </button>
                );
              })()}

              <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
                دخول القسم
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
