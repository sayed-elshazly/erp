// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Live Wallets & Banks Radar
// Real-time balances, low-balance alerts, internal transfers & vouchers
// =============================================================

import React from 'react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { db } from '../../../database/db';
import { formatCurrency } from '../../../utils/formatters';
import {
  Wallet,
  ArrowRightLeft,
  Building,
  Smartphone,
  ShieldAlert,
  PlusCircle,
  ChevronLeft,
  Coins
} from 'lucide-react';
import { useTabs } from '../../../context/TabsContext';

interface LiveWalletsRadarSectionProps {
  onOpenTransferModal?: () => void;
  onOpenDepositVoucher?: () => void;
  onNavigate?: (section: string) => void;
}

export const LiveWalletsRadarSection: React.FC<LiveWalletsRadarSectionProps> = ({
  onOpenTransferModal,
  onOpenDepositVoucher,
  onNavigate
}) => {
  const { openTab } = useTabs();
  const wallets = db.getStoreWallets();
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const lowBalanceThreshold = 1000;
  const lowBalanceWallets = wallets.filter(w => (w.balance || 0) < lowBalanceThreshold && !w.isSystemWallet);

  const handleOpenWallets = () => {
    openTab({
      id: 'finance_wallets',
      title: 'المحافظ والبنوك',
      section: 'finance_wallets',
      iconType: 'finance'
    });
    if (onNavigate) onNavigate('finance_wallets');
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-cyan-500/20 space-y-4 text-right transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                رادار المحافظ والحسابات البنكية اللحظي
              </h3>
              <Badge variant="info" size="sm">
                {wallets.length} محافظ نشطة
              </Badge>
              {lowBalanceWallets.length > 0 && (
                <Badge variant="danger" size="sm" className="animate-pulse">
                  ⚠️ {lowBalanceWallets.length} منخفض الرصيد
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 block font-medium">
              متابعة سيولة فودافون كاش، إنستاباي، والتحويلات البنكية الفورية
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenDepositVoucher && (
            <Button
              variant="outline"
              size="sm"
              icon={<PlusCircle className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={onOpenDepositVoucher}
              className="text-xs h-8 cursor-pointer"
            >
              سند إيداع
            </Button>
          )}

          {onOpenTransferModal && (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />}
              onClick={onOpenTransferModal}
              className="text-xs h-8 cursor-pointer"
            >
              تحويل بين المحافظ
            </Button>
          )}

          <button
            type="button"
            onClick={handleOpenWallets}
            className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors p-1"
          >
            <span>فتح قسم المحافظ</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Total Balance Summary Bar */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">إجمالي السيولة النقدية المتاحة في المحافظ:</span>
        </div>
        <strong className="text-base font-black font-mono text-cyan-500">
          {formatCurrency(totalBalance)}
        </strong>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {wallets.map(w => {
          const isLow = (w.balance || 0) < lowBalanceThreshold && !w.isSystemWallet;
          const isBank = w.category === 'bank' || w.type?.includes('bank');

          return (
            <div
              key={w.id}
              onClick={handleOpenWallets}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                isLow
                  ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60'
                  : 'bg-gray-50/50 dark:bg-zinc-900/40 border-gray-100 dark:border-[#27272A] hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${isBank ? 'bg-blue-500/15 text-blue-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                    {isBank ? <Building className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-400 transition-colors">
                      {w.name}
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {w.category || w.type || 'إلكترونية'}
                    </span>
                  </div>
                </div>

                <Badge variant={isLow ? 'danger' : 'info'} size="sm">
                  {w.currency || 'EGP'}
                </Badge>
              </div>

              <div className="flex items-end justify-between pt-2 border-t border-gray-100/60 dark:border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 font-medium">الرصيد الفعلي:</span>
                <strong className={`font-mono text-sm font-black ${isLow ? 'text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {formatCurrency(w.balance || 0, w.currency)}
                </strong>
              </div>

              {isLow && (
                <div className="mt-2 text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  <span>تنبيه: الرصيد قارب على النفاد!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
