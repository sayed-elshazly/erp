import React from 'react';
import { Dealer } from '../../types/dealer.types';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { RotateCcw, Archive } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface ArchivedDealersModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedDealers: Dealer[];
  onRestore: (dealerId: string) => void;
}

export const ArchivedDealersModal: React.FC<ArchivedDealersModalProps> = ({
  isOpen,
  onClose,
  archivedDealers,
  onRestore
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="أرشيف التجار والموزعين (Soft Deleted)"
      subtitle="سجل التجار المؤرشفين مع إمكانية استعادتهم بالكامل في أي وقت"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {archivedDealers.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">
            <Archive className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
            <p className="text-sm font-semibold">الأرشيف فارغ حالياً</p>
            <p className="text-xs text-zinc-500 mt-1">لا يوجد أي تاجر مؤرشف في النظام.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#2E2E2E] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl overflow-hidden">
            {archivedDealers.map(dlr => (
              <div
                key={dlr.id}
                className="p-4 flex items-center justify-between bg-white dark:bg-[#191919] hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm">
                    {dlr.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">{dlr.name}</h4>
                      <Badge variant="default" size="sm">مؤرشف</Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {dlr.phone} • {dlr.businessName || 'نشاط تجاري'} • الرصيد: {formatCurrency(dlr.balance)} • تاريخ الأرشفة: {formatDateTime(dlr.updatedAt)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
                  onClick={() => onRestore(dlr.id)}
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
