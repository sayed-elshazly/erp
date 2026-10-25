import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useHistory } from '../../context/HistoryContext';
import { useKeyboard } from '../../context/KeyboardContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTabs } from '../../context/TabsContext';
import {
  Home,
  Search,
  Undo2,
  Redo2,
  Moon,
  Sun,
  LogOut,
  User,
  Command,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  activeSection: string;
}

export const Header: React.FC<HeaderProps> = ({ activeSection }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { undo, redo, canUndo, canRedo, lastActionDescription, nextActionDescription } = useHistory();
  const { toggleCommandPalette } = useKeyboard();
  const { increaseFontSize, decreaseFontSize, resetFontSize, fontSize } = useAccessibility();
  const { openTab } = useTabs();

  return (
    <header className="h-16 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-[#2E2E2E] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left Side (RTL Start): Home & Command Palette Trigger */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() =>
            openTab({
              id: 'dashboard',
              title: 'الرئيسية',
              section: 'dashboard',
              iconType: 'dashboard',
              closable: false
            })
          }
          className={`p-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all ${
            activeSection === 'dashboard'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
          title="الرئيسية"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">الرئيسية</span>
        </button>

        {/* Command Palette Trigger (VS Code Style) */}
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#2E2E2E] text-zinc-400 hover:text-zinc-200 hover:border-orange-500/50 transition-all text-xs w-44 sm:w-64"
        >
          <Command className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="truncate">الأوامر والبحث العام...</span>
          <kbd className="hidden sm:inline-block mr-auto text-[10px] bg-white dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-gray-300 dark:border-zinc-700 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Side (RTL End): Accessibility, Undo/Redo, Theme, Notifications, User, Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Font Scaling Controls (Accessibility) */}
        <div className="hidden lg:flex items-center bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#2E2E2E] rounded-xl p-0.5 text-xs font-bold text-zinc-400">
          <button
            onClick={increaseFontSize}
            className="px-2 py-1 hover:text-orange-500 hover:bg-white dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
            title="تكبير الخط (A+)"
          >
            A+
          </button>
          <button
            onClick={resetFontSize}
            className="px-1.5 py-1 hover:text-orange-500 hover:bg-white dark:hover:bg-[#1E1E1E] rounded-lg transition-colors font-mono text-[11px]"
            title="إعادة ضبط حجم الخط"
          >
            {fontSize.toUpperCase()}
          </button>
          <button
            onClick={decreaseFontSize}
            className="px-2 py-1 hover:text-orange-500 hover:bg-white dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
            title="تصغير الخط (A-)"
          >
            A-
          </button>
        </div>

        {/* Undo / Redo Buttons */}
        <div className="flex items-center bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#2E2E2E] rounded-xl p-0.5 shadow-sm">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all relative ${
              canUndo
                ? 'text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-[#1E1E1E] hover:shadow-xs active:scale-95 cursor-pointer'
                : 'text-zinc-400/40 cursor-not-allowed'
            }`}
            title={canUndo ? `تراجع (Ctrl+Z): ${lastActionDescription || 'آخر عملية'}` : 'لا توجد عملية للتراجع (Ctrl+Z)'}
          >
            <Undo2 className="w-4 h-4" />
            {canUndo && (
              <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <div className="w-[1px] h-4 bg-gray-300 dark:bg-[#2E2E2E]" />
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all relative ${
              canRedo
                ? 'text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-[#1E1E1E] hover:shadow-xs active:scale-95 cursor-pointer'
                : 'text-zinc-400/40 cursor-not-allowed'
            }`}
            title={canRedo ? `إعادة تطبيق (Ctrl+Y): ${nextActionDescription || 'آخر عملية'}` : 'لا توجد عملية للإعادة (Ctrl+Y)'}
          >
            <Redo2 className="w-4 h-4" />
            {canRedo && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title={theme === 'dark' ? 'التحويل للوضع النهاري (Ctrl+D)' : 'التحويل للوضع الليلي (Ctrl+D)'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 animate-fade-in" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-zinc-700 animate-fade-in" />
          )}
        </button>

        {/* Notifications Center */}
        <NotificationCenter
          onNavigateSection={sec =>
            openTab({
              id: sec,
              title: sec === 'customers' ? 'الزبائن' : sec === 'finance' ? 'المالية' : 'الإعدادات',
              section: sec,
              iconType: sec as any
            })
          }
        />

        <div className="h-6 w-[1px] bg-gray-200 dark:bg-[#2E2E2E] mx-1" />

        {/* User Profile Badge */}
        <div className="flex items-center gap-2.5 px-2 py-1 rounded-xl bg-gray-50 dark:bg-[#151515] border border-gray-200/60 dark:border-[#2E2E2E]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            {user?.role === 'admin' ? '👑' : <User className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1">
              <span>{user?.fullName || 'مستخدم'}</span>
              {user?.role === 'admin' && (
                <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.2 bg-amber-400/10 rounded">
                  مدير
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400">{user?.jobTitle || 'موظف'}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
          title="تسجيل الخروج من النظام"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};
