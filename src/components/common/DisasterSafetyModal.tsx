// =============================================================
// NZM JKR TOP UP ERP — Disaster Safety & Action Confirmation Modal
// =============================================================

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

interface DisasterSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  actionType: 'refund' | 'cancel' | 'delete' | 'upgrade' | 'downgrade' | 'suspend';
  itemTitle: string;
  details?: { label: string; value: string | number; color?: string }[];
  warningMessage?: string;
  requireReason?: boolean;
}

export const DisasterSafetyModal: React.FC<DisasterSafetyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionType,
  itemTitle,
  details = [],
  warningMessage,
  requireReason = true
}) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const isDangerous = actionType === 'delete' || actionType === 'cancel' || actionType === 'refund';

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('يرجى توضيح سبب تنفيذ هذه العملية للمتابعة والرقابة');
      return;
    }
    setError('');
    onConfirm(reason.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Warning Banner */}
        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
          isDangerous
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        }`}>
          <div className={`p-2 rounded-xl shrink-0 ${
            isDangerous ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm">مراجعة أمان العملية الحساسة</h4>
            <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
              {warningMessage || 'يرجى مراجعة تفاصيل العملية وتأكيد الرغبة في التنفيذ. سيتم توثيق كافة التفاصيل في سجل الرقابة المالي.'}
            </p>
          </div>
        </div>

        {/* Action Details Grid */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#27272A]">
            <span className="text-zinc-400 font-bold">العنصر المستهدف:</span>
            <span className="font-black text-zinc-900 dark:text-zinc-100 text-xs font-mono">{itemTitle}</span>
          </div>

          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">{d.label}:</span>
              <span className={`font-bold font-mono ${d.color || 'text-zinc-900 dark:text-zinc-100'}`}>{d.value}</span>
            </div>
          ))}
        </div>

        {/* Reason Input */}
        {requireReason && (
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">
              سبب الإجراء / ملاحظات الإدارة <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="اكتب سبب العملية بدقة لتوثيقها في سجل الرقابة..."
              className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-orange-500"
            />
            {error && <p className="text-[10px] text-rose-500 font-bold mt-1">{error}</p>}
          </div>
        )}

        {/* Safety Checkbox Confirmation */}
        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/50 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 accent-orange-500 cursor-pointer"
          />
          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
            أقر بأنني راجعت البيانات وأتحمل مسؤولية تنفيذ هذا الإجراء
          </span>
        </label>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-[#27272A]">
          <Button variant="secondary" onClick={onClose}>
            إلغاء وتراجع
          </Button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              !confirmed
                ? 'opacity-40 cursor-not-allowed bg-zinc-500'
                : isDangerous
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد وتنفيذ نهائي</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
