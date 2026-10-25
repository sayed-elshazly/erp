import React from 'react';
import { Customer } from '../../types/customer.types';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { RotateCcw, Archive, User } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface ArchivedCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedCustomers: Customer[];
  onRestore: (customerId: string) => void;
}

export const ArchivedCustomersModal: React.FC<ArchivedCustomersModalProps> = ({
  isOpen,
  onClose,
  archivedCustomers,
  onRestore
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="أرشيف الزبائن (Soft Deleted)"
      subtitle="سجل الزبائن المؤرشفين مع إمكانية استعادتهم بالكامل في أي وقت"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {archivedCustomers.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">
            <Archive className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-500" />
            <p className="text-sm font-semibold">الأرشيف فارغ حالياً</p>
            <p className="text-xs text-zinc-500 mt-1">لا يوجد أي زبون مؤرشف في النظام.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#2E2E2E] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl overflow-hidden">
            {archivedCustomers.map(cust => (
              <div
                key={cust.id}
                className="p-4 flex items-center justify-between bg-white dark:bg-[#191919] hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-sm">
                    {cust.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">{cust.name}</h4>
                      <Badge variant="default" size="sm">مؤرشف</Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {cust.phone} • الرصيد: {formatCurrency(cust.balance)} • تاريخ الأرشفة: {formatDateTime(cust.updatedAt)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
                  onClick={() => onRestore(cust.id)}
                >
                  استعادة للحسابات النشطة
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
