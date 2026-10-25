import React, { useState } from 'react';
import { Merchant, MerchantReminder, ReminderType, ReminderPriority, ReminderRecurrence } from '../../types/merchant.types';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { Bell, Calendar, Clock, RotateCw, Flag, User } from 'lucide-react';

interface MerchantReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: MerchantReminder) => void;
  merchant: Merchant;
}

export const MerchantReminderModal: React.FC<MerchantReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  merchant
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ReminderType>('payment_due');
  const [priority, setPriority] = useState<ReminderPriority>('high');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('12:00');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none');
  const [assignedTo, setAssignedTo] = useState(user?.fullName || 'مسؤول الحساب');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newReminder: MerchantReminder = {
      id: 'rem_' + Date.now(),
      merchantId: merchant.id,
      merchantName: merchant.name,
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      dueDate,
      dueTime,
      assignedTo,
      status: 'upcoming',
      notes: notes.trim(),
      recurrence,
      createdAt: new Date().toISOString()
    };

    onSave(newReminder);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء تذكير ومتابعة ذكية للتاجر"
      subtitle={`التاجر: ${merchant.name} (${merchant.companyName})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <Input
          label="عنوان التذكير *"
          placeholder="مثال: موعد تحصيل دفعة الحساب الأسبوعية ($1,500)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          icon={<Bell className="w-4 h-4 text-orange-500" />}
          autoFocus
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              نوع التذكير والمتابعة
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ReminderType)}
              className="w-full rounded-xl bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 text-xs p-2.5 outline-none focus:border-orange-500"
            >
              <option value="payment_due">موعد سداد مستحقات (Payment Due)</option>
              <option value="collection_due">موعد تحصيل ديون (Collection Due)</option>
              <option value="follow_up">موعد متابعة عامة (Follow Up)</option>
              <option value="call">مكالمة هاتفية (Phone Call)</option>
              <option value="meeting">اجتماع عمل (Meeting)</option>
              <option value="visit">زيارة ميدانية للمحل (Visit)</option>
              <option value="contract_renewal">تجديد عقد / اتفاقية (Renewal)</option>
              <option value="contract_expiry">انتهاء فترة الاتفاق (Expiry)</option>
              <option value="custom">تذكير مخصص (Custom)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              مستوى الأولوية
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as ReminderPriority)}
              className="w-full rounded-xl bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 text-xs p-2.5 outline-none focus:border-orange-500"
            >
              <option value="low">منخفضة (Low)</option>
              <option value="medium">متوسطة (Medium)</option>
              <option value="high">عالية (High)</option>
              <option value="urgent">عاجلة جداً (Urgent 🚨)</option>
            </select>
          </div>

          <Input
            label="تاريخ الاستحقاق *"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            icon={<Calendar className="w-4 h-4 text-orange-500" />}
          />

          <Input
            label="الوقت المفضل"
            type="time"
            value={dueTime}
            onChange={e => setDueTime(e.target.value)}
            icon={<Clock className="w-4 h-4 text-blue-400" />}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              تكرار التذكير
            </label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as ReminderRecurrence)}
              className="w-full rounded-xl bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 text-xs p-2.5 outline-none focus:border-orange-500"
            >
              <option value="none">بدون تكرار (مرة واحدة)</option>
              <option value="daily">يومي (Daily)</option>
              <option value="weekly">أسبوعي (Weekly)</option>
              <option value="monthly">شهري (Monthly)</option>
              <option value="yearly">سنوي (Yearly)</option>
            </select>
          </div>

          <Input
            label="الموظف المسؤول"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            icon={<User className="w-4 h-4" />}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">تفاصيل التذكير</label>
          <textarea
            rows={2}
            placeholder="اكتب تفاصيل إضافية لتسهيل المتابعة..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#151518] border border-gray-200 dark:border-[#27272A] p-2.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary">
            حفظ وجدولة التذكير
          </Button>
        </div>
      </form>
    </Modal>
  );
};
