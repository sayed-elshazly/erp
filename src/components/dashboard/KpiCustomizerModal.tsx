import React, { useState } from 'react';
import { KpiCardConfig, KpiSize } from '../../types/kpi.types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  SlidersHorizontal,
  Eye,
  EyeOff,
  Pin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Maximize2
} from 'lucide-react';

interface KpiCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiCards: KpiCardConfig[];
  onToggleVisibility: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeSize: (id: string, size: KpiSize) => void;
  onReorder: (newCards: KpiCardConfig[]) => void;
  onResetToDefaults: () => void;
}

export const KpiCustomizerModal: React.FC<KpiCustomizerModalProps> = ({
  isOpen,
  onClose,
  kpiCards,
  onToggleVisibility,
  onTogglePin,
  onChangeSize,
  onReorder,
  onResetToDefaults
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredCards = kpiCards.filter(c => {
    if (selectedCategory === 'all') return true;
    return c.category === selectedCategory;
  });

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= kpiCards.length) return;

    const newCards = [...kpiCards];
    const [moved] = newCards.splice(index, 1);
    newCards.splice(targetIndex, 0, moved);
    onReorder(newCards.map((c, i) => ({ ...c, order: i })));
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'financial':
        return 'المالية والخزنة';
      case 'customers':
        return 'الزبائن والمحافظ';
      case 'operations':
        return 'العمليات والتذاكر';
      case 'hr':
        return 'الموظفون والورديات';
      default:
        return cat;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تخصيص لوحة مؤشرات الأداء (KPI Cards Customizer)"
      subtitle="إظهار، إخفاء، ترتيب، وتغيير أحجام بطاقات الـ Dashboard الخاصة بك"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right select-none">
        {/* Category Filter Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-[#282828] pb-3">
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              الكل ({kpiCards.length})
            </button>
            <button
              onClick={() => setSelectedCategory('financial')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedCategory === 'financial'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              المالية
            </button>
            <button
              onClick={() => setSelectedCategory('customers')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedCategory === 'customers'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              الزبائن
            </button>
            <button
              onClick={() => setSelectedCategory('operations')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedCategory === 'operations'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              العمليات
            </button>
            <button
              onClick={() => setSelectedCategory('hr')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedCategory === 'hr'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              الموارد
            </button>
          </div>

          <button
            onClick={onResetToDefaults}
            className="text-xs text-orange-500 hover:underline flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> إعادة الضبط الافتراضي
          </button>
        </div>

        {/* Cards List Control */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredCards.map((card, idx) => {
            const actualIndex = kpiCards.findIndex(c => c.id === card.id);
            return (
              <div
                key={card.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  card.isVisible
                    ? 'bg-white dark:bg-[#181818] border-gray-200 dark:border-[#2E2E2E]'
                    : 'bg-gray-50 dark:bg-[#121212] border-gray-200/50 dark:border-[#222222] opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMove(actualIndex, 'up')}
                      disabled={actualIndex === 0}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMove(actualIndex, 'down')}
                      disabled={actualIndex === kpiCards.length - 1}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100">{card.title}</h4>
                      {card.isPinned && <Badge variant="orange" size="sm">مثبتة</Badge>}
                      <Badge variant="default" size="sm">{getCategoryLabel(card.category)}</Badge>
                    </div>
                  </div>
                </div>

                {/* Control Actions (Pin, Size, Visibility) */}
                <div className="flex items-center gap-2">
                  {/* Size Selector */}
                  <select
                    value={card.size}
                    onChange={e => onChangeSize(card.id, e.target.value as KpiSize)}
                    className="rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs px-2 py-1 text-zinc-200 outline-none"
                  >
                    <option value="1x">حجم عادي (1x)</option>
                    <option value="2x">عريض (2x)</option>
                    <option value="3x">عرض كامل (3x)</option>
                  </select>

                  {/* Pin Button */}
                  <button
                    onClick={() => onTogglePin(card.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      card.isPinned
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-500'
                        : 'border-gray-200 dark:border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                    title={card.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => onToggleVisibility(card.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      card.isVisible
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                        : 'border-gray-200 dark:border-zinc-700 text-zinc-500 hover:text-white'
                    }`}
                    title={card.isVisible ? 'إخفاء' : 'إظهار'}
                  >
                    {card.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-[#282828] flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            حفظ وإغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
