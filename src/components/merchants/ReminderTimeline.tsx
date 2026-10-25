import React from 'react';
import { MerchantReminder, ReminderType, ReminderPriority, ReminderStatus } from '../../types/merchant.types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  RotateCw,
  Plus,
  Trash2,
  CreditCard,
  PhoneCall,
  Users,
  FileSignature,
  DollarSign
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface ReminderTimelineProps {
  reminders: MerchantReminder[];
  onAddReminder: () => void;
  onCompleteReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const ReminderTimeline: React.FC<ReminderTimelineProps> = ({
  reminders,
  onAddReminder,
  onCompleteReminder,
  onDeleteReminder
}) => {
  const getReminderTypeIcon = (type: ReminderType) => {
    switch (type) {
      case 'payment_due':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'collection_due':
        return <CreditCard className="w-4 h-4 text-orange-500" />;
      case 'call':
        return <PhoneCall className="w-4 h-4 text-blue-500" />;
      case 'meeting':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'contract_renewal':
      case 'contract_expiry':
        return <FileSignature className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getReminderTypeLabel = (type: ReminderType) => {
    switch (type) {
      case 'payment_due':
        return 'موعد سداد';
      case 'collection_due':
        return 'موعد تحصيل';
      case 'follow_up':
        return 'متابعة';
      case 'call':
        return 'اتصال هاتفي';
      case 'meeting':
        return 'اجتماع';
      case 'visit':
        return 'زيارة عمل';
      case 'contract_renewal':
        return 'تجديد اتفاق';
      case 'contract_expiry':
        return 'انتهاء عقد';
      default:
        return 'تذكير مخصص';
    }
  };

  const getPriorityBadge = (p: ReminderPriority) => {
    switch (p) {
      case 'urgent':
        return <Badge variant="danger" size="sm">عاجل جداً</Badge>;
      case 'high':
        return <Badge variant="orange" size="sm">أولوية عالية</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">متوسطة</Badge>;
      default:
        return <Badge variant="default" size="sm">عادية</Badge>;
    }
  };

  const getStatusStyle = (s: ReminderStatus) => {
    switch (s) {
      case 'overdue':
        return 'border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/10';
      case 'today':
        return 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/10';
      case 'completed':
        return 'border-emerald-500/30 bg-emerald-500/5 opacity-70';
      default:
        return 'border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]';
    }
  };

  return (
    <Card className="p-5 space-y-4 text-right border border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272A]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            الجدول الزمني للمتابعات والتذكيرات (Follow-up Timeline)
          </h3>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAddReminder}>
          تذكير جديد
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="py-8 text-center text-zinc-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
          <p className="text-xs">لا توجد تذكيرات مسجلة لهذا التاجر حالياً</p>
        </div>
      ) : (
        <div className="relative pl-2 pr-4 space-y-3">
          {/* Vertical Connecting Line */}
          <div className="absolute top-3 bottom-3 right-6 w-0.5 bg-gray-200 dark:bg-zinc-800 -z-0" />

          {reminders.map(rem => (
            <div
              key={rem.id}
              className={`relative z-10 p-3.5 rounded-2xl border transition-all ${getStatusStyle(
                rem.status
              )}`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xs">
                    {getReminderTypeIcon(rem.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{rem.title}</span>
                      {rem.status === 'overdue' && (
                        <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-md animate-pulse">
                          متأخر!
                        </span>
                      )}
                      {rem.status === 'today' && (
                        <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-md">
                          اليوم
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      نوع المتابعة: {getReminderTypeLabel(rem.type)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getPriorityBadge(rem.priority)}
                  {rem.status !== 'completed' && (
                    <button
                      onClick={() => onCompleteReminder(rem.id)}
                      className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      title="تم الإنجاز"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteReminder(rem.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="حذف التذكير"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed mr-10">
                {rem.description}
              </p>

              {rem.notes && (
                <div className="mt-2 mr-10 p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-[11px] text-zinc-500 border border-gray-100 dark:border-zinc-800">
                  <strong>ملاحظات المتابعة:</strong> {rem.notes}
                </div>
              )}

              <div className="mt-2 mr-10 pt-2 border-t border-gray-100 dark:border-[#27272A] flex flex-wrap items-center justify-between text-[10px] text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-orange-500" />
                    الموعد: {formatDate(rem.dueDate)} {rem.dueTime && `(${rem.dueTime})`}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" />
                    المسؤول: {rem.assignedTo}
                  </span>
                </div>
                {rem.recurrence !== 'none' && (
                  <span className="flex items-center gap-1 text-purple-400 font-semibold">
                    <RotateCw className="w-3 h-3" />
                    تكرار: {rem.recurrence}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
