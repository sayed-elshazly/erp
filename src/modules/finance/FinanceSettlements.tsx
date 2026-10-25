import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ShiftSettlement } from '../../types/finance.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Search,
  ShieldCheck,
  UserCheck,
  Landmark
} from 'lucide-react';

interface FinanceSettlementsProps {
  settlements: ShiftSettlement[];
  onVerifySettlement?: (id: string) => void;
}

export const FinanceSettlements: React.FC<FinanceSettlementsProps> = ({
  settlements,
  onVerifySettlement
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return settlements;
    const q = searchQuery.toLowerCase();
    return settlements.filter(
      s =>
        s.shiftNumber.toLowerCase().includes(q) ||
        s.employeeName.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    );
  }, [settlements, searchQuery]);

  const handleExport = () => {
    const data = filteredSettlements.map(s => ({
      'رقم الوردية': s.shiftNumber,
      'الموظف المسئول': s.employeeName,
      'القسم': s.department,
      'وقت البداية': formatDateTime(s.startTime),
      'وقت النهاية': formatDateTime(s.endTime),
      'النقد المتوقع (ج.م)': s.expectedCash,
      'النقد الفعلي (ج.م)': s.actualCash,
      'الفارق (فائض/عجز)': s.difference,
      'وجهة الأموال': s.destination === 'vault_main' ? 'الخزنة الرئيسية' : (s.destination || 'الخزنة الرئيسية'),
      'المحول للخزنة (ج.م)': s.totalTransferredEGP || 0,
      'المحول للخزنة (USDT)': s.totalTransferredUSDT || 0,
      'الحالة': s.status === 'verified' ? 'معتمدة' : s.status === 'closed' ? 'مغلقة' : 'مفتوحة',
      'ملاحظات': s.notes || '-'
    }));
    exportToExcel(data, `تسويات_الورديات_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 rounded-2xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                التسويات المالية وتقفيل الورديات (Shift Settlements)
              </h2>
              <span className="text-xs text-zinc-400">
                مطابقة النقد الفعلي بالصندوق مع الحركات المسجلة دفترياً لكل وردية
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
            className="text-xs cursor-pointer"
          >
            تصدير لـ Excel
          </Button>
        </div>
      </div>

      {/* Settlements Table */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            سجل إغلاق وجرد الورديات ({filteredSettlements.length})
          </h3>

          <div className="relative">
            <input
              type="text"
              placeholder="بحث في الورديات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pr-7 text-zinc-900 dark:text-zinc-100 outline-none w-52"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-3">رقم الوردية</th>
                <th className="p-3">الموظف</th>
                <th className="p-3">القسم</th>
                <th className="p-3">وقت البداية / النهاية</th>
                <th className="p-3">النقد المتوقع</th>
                <th className="p-3">النقد الفعلي</th>
                <th className="p-3">الفارق (عجز/فائض)</th>
                <th className="p-3">وجهة الأموال والمحول</th>
                <th className="p-3">الحالة</th>
                {onVerifySettlement && <th className="p-3 text-center">اعتماد</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    لا توجد تسويات ورديات مسجلة
                  </td>
                </tr>
              ) : (
                filteredSettlements.map(settlement => {
                  const hasDifference = settlement.difference !== 0;
                  const isSurplus = settlement.difference > 0;

                  return (
                    <tr
                      key={settlement.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-orange-500">
                        {settlement.shiftNumber}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {settlement.employeeName}
                      </td>
                      <td className="p-3 text-zinc-400">{settlement.department}</td>
                      <td className="p-3 font-mono text-[11px] text-zinc-400">
                        <div>{formatDateTime(settlement.startTime)}</div>
                        <div className="text-[10px] text-zinc-500">إلى: {formatDateTime(settlement.endTime)}</div>
                      </td>
                      <td className="p-3 font-bold text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(settlement.expectedCash, 'EGP')}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(settlement.actualCash, 'EGP')}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {!hasDifference ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> مطابق تماماً
                          </span>
                        ) : (
                          <span
                            className={`font-black flex items-center gap-1 ${
                              isSurplus ? 'text-cyan-400' : 'text-rose-500'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {isSurplus ? 'فائض: +' : 'عجز: '}
                            {formatCurrency(Math.abs(settlement.difference), 'EGP')}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{settlement.destination === 'vault_main' ? 'الخزنة الرئيسية' : (settlement.destination || 'الخزنة الرئيسية')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
                          {(settlement.totalTransferredEGP || 0) > 0 && (
                            <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                              +{formatCurrency(settlement.totalTransferredEGP, 'EGP')}
                            </span>
                          )}
                          {(settlement.totalTransferredUSDT || 0) > 0 && (
                            <span className="text-cyan-500 dark:text-cyan-400 font-bold">
                              +${settlement.totalTransferredUSDT?.toFixed(2)}
                            </span>
                          )}
                          {(!settlement.totalTransferredEGP && !settlement.totalTransferredUSDT) && (
                            <span className="text-zinc-500">بدون تحويل إضافي</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant={
                            settlement.status === 'verified'
                              ? 'success'
                              : settlement.status === 'closed'
                              ? 'warning'
                              : 'default'
                          }
                          className="text-[10px]"
                        >
                          {settlement.status === 'verified'
                            ? 'معتمدة'
                            : settlement.status === 'closed'
                            ? 'مغلقة'
                            : 'مفتوحة'}
                        </Badge>
                      </td>
                      {onVerifySettlement && (
                        <td className="p-3 text-center whitespace-nowrap">
                          {settlement.status !== 'verified' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onVerifySettlement(settlement.id)}
                              className="text-[10px] h-7 px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              اعتماد الوردية
                            </Button>
                          ) : (
                            <span className="text-emerald-500 text-xs">✓ معتمد</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
