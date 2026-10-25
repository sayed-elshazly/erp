import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Department, Permission } from '../types/auth.types';
import { db } from '../database/db';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  selectedDepartment: Department | 'all' | null;
  loginAsAdmin: (password: string) => boolean;
  loginAsEmployee: (department: Department, username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  canAccessDepartment: (dept: Department) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nzm_jkr_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all' | null>(() => {
    const saved = localStorage.getItem('nzm_jkr_current_dept');
    return (saved as Department | 'all') || null;
  });

  const isAuthenticated = !!user;

  useEffect(() => {
    if (user) {
      localStorage.setItem('nzm_jkr_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nzm_jkr_current_user');
    }
  }, [user]);

  useEffect(() => {
    if (selectedDepartment) {
      localStorage.setItem('nzm_jkr_current_dept', selectedDepartment);
    } else {
      localStorage.removeItem('nzm_jkr_current_dept');
    }
  }, [selectedDepartment]);

  const loginAsAdmin = (password: string): boolean => {
    const adminUser = db.getUsers().find(u => u.role === 'admin') || {
      id: 'usr_admin',
      username: 'admin',
      fullName: 'المدير العام',
      role: 'admin',
      jobTitle: 'المدير التنفيذي',
      isActive: true,
      permissions: [
        'view',
        'add',
        'edit',
        'delete',
        'print',
        'export',
        'manage_users',
        'manage_finance',
        'close_shift',
        'manage_settings'
      ],
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const validAdminPass = adminUser.password
      ? password === adminUser.password
      : (password === 'admin' || password === '123456' || password === 'admin123');

    if (validAdminPass) {
      adminUser.lastLogin = new Date().toISOString();
      db.saveUser(adminUser);
      setUser(adminUser);
      setSelectedDepartment('all');

      db.logAction(
        { id: adminUser.id, name: adminUser.fullName, role: 'admin', department: 'الإدارة العامة' },
        'login',
        'جلسة عمل',
        adminUser.id,
        'تسجيل دخول المدير',
        'تم تسجيل دخول المدير العام بنجاح وبصلاحيات كاملة.'
      );

      return true;
    }
    return false;
  };

  const loginAsEmployee = (
    department: Department,
    username: string,
    password: string
  ): { success: boolean; message?: string } => {
    let users = db.getUsers();
    let found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    // Auto-create default employee user for department if missing from localStorage
    if (!found) {
      if (department === 'subscriptions' && (username.trim().toLowerCase() === 'sara_subs' || username.trim().toLowerCase() === 'subscriptions' || username.trim().toLowerCase() === 'sub')) {
        const newSubUser: User = {
          id: 'usr_subs_1',
          username: username.trim().toLowerCase(),
          fullName: 'سارة أحمد',
          role: 'employee',
          department: 'subscriptions',
          jobTitle: 'مسؤولة قسم الاشتراكات وخدمات البث',
          isActive: true,
          permissions: ['view', 'add', 'edit', 'print', 'export'],
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        db.saveUser(newSubUser);
        found = newSubUser;
      } else {
        return { success: false, message: 'اسم المستخدم غير موجود في النظام (للاشتراكات: sara_subs)' };
      }
    }

    if (!found.isActive) {
      return { success: false, message: 'هذا الحساب معطل، يرجى مراجعة المدير' };
    }

    // Passwords accepted: user's custom password if set, or 123456, or password, or username, or admin
    const validPassword =
      (found.password && password === found.password) ||
      password === '123456' ||
      password === 'admin' ||
      password === 'password' ||
      password === username;

    if (!validPassword) {
      return { success: false, message: 'كلمة المرور غير صحيحة (التجريبية: 123456)' };
    }

    if (found.role !== 'admin' && found.department && found.department !== department) {
      return { success: false, message: `هذا الحساب مخصص لقسم (${found.department}) وليس لهذا القسم` };
    }

    found.lastLogin = new Date().toISOString();
    db.saveUser(found);
    setUser(found);
    setSelectedDepartment(department);

    db.logAction(
      { id: found.id, name: found.fullName, role: found.role, department: department },
      'login',
      'جلسة عمل',
      found.id,
      `تسجيل دخول موظف: ${found.fullName}`,
      `تم تسجيل الدخول لقسم: ${department}`
    );

    return { success: true };
  };

  const logout = () => {
    if (user) {
      db.logAction(
        { id: user.id, name: user.fullName, role: user.role, department: user.department },
        'logout',
        'جلسة عمل',
        user.id,
        `تسجيل خروج: ${user.fullName}`,
        'تم إنهاء جلسة العمل.'
      );
    }
    setUser(null);
    setSelectedDepartment(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const canAccessDepartment = (dept: Department): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.department === dept;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        selectedDepartment,
        loginAsAdmin,
        loginAsEmployee,
        logout,
        hasPermission,
        canAccessDepartment
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
