import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { GameProduct, GameTreeItem } from '../../types/topup.types';
import { db } from '../../database/db';
import { formatCurrency } from '../../utils/formatters';
import {
  Target,
  Search,
  Sparkles,
  Zap,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowDown,
  ArrowUp,
  Layers
} from 'lucide-react';

interface BudgetHunterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: GameProduct, game: GameTreeItem, isFirstShipment?: boolean) => void;
  defaultGameId?: string;
  defaultTicketType?: 'regular' | 'first_shipping';
}

export const BudgetHunterModal: React.FC<BudgetHunterModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  defaultGameId,
  defaultTicketType = 'regular'
}) => {
  const games = useMemo(() => (isOpen ? db.getGameTree() : []), [isOpen]);
  const [budget, setBudget] = useState<number>(100);
  const [selectedGameId, setSelectedGameId] = useState<string>(defaultGameId || 'all');
  const [ticketType, setTicketType] = useState<'regular' | 'first_shipping'>(defaultTicketType);

  // Flatten all enabled products with their respective game info
  const allProducts = useMemo(() => {
    const list: { product: GameProduct; game: GameTreeItem; effectivePrice: number }[] = [];
    games.forEach(game => {
      if (!game.isActive) return;
      if (selectedGameId !== 'all' && game.id !== selectedGameId) return;

      (game.products || []).forEach(prod => {
        // Skip disabled products unless specifically viewing
        if (!prod.isActive) return;
        // Check available quantity
        if (prod.availableQuantity !== undefined && prod.availableQuantity !== null && prod.availableQuantity <= 0) {
          return;
        }

        const effectivePrice = ticketType === 'first_shipping'
          ? (prod.firstOrderCostPriceEGP || prod.costUSD * (db.getExchangeRate()?.rateUSD_EGP || 50))
          : (prod.calculatedPriceEGP || (prod.costUSD * (db.getExchangeRate()?.rateUSD_EGP || 50) * 1.1));

        list.push({
          product: prod,
          game,
          effectivePrice: Math.round(effectivePrice)
        });
      });
    });
    return list;
  }, [games, selectedGameId, ticketType]);

  // Match categories:
  // 1. Exact matches (effectivePrice === budget)
  // 2. Closest under budget (effectivePrice < budget)
  // 3. Closest over budget (effectivePrice > budget)
  const exactMatches = useMemo(() => {
    if (budget <= 0) return [];
    return allProducts.filter(item => item.effectivePrice === budget);
  }, [allProducts, budget]);

  const closestUnder = useMemo(() => {
    if (budget <= 0) return [];
    return allProducts
      .filter(item => item.effectivePrice < budget)
      .sort((a, b) => b.effectivePrice - a.effectivePrice)
      .slice(0, 5);
  }, [allProducts, budget]);

  const closestOver = useMemo(() => {
    if (budget <= 0) return [];
    return allProducts
      .filter(item => item.effectivePrice > budget)
      .sort((a, b) => a.effectivePrice - b.effectivePrice)
      .slice(0, 5);
  }, [allProducts, budget]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎯 صائد الميزانية الذكي (Budget Hunter)"
      subtitle="اقتراح أفضل باقات الشحن والمنتجات المطابقة تماماً لميزانية العميل"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-right text-xs">
        {/* Top Filter Bar */}
        <div className="p-4 rounded-2xl bg-linear-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 border border-orange-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              ميزانية العميل (جنيه مصري) *
            </label>
            <div className="relative">
              <Target className="w-4 h-4 text-orange-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="1"
                step="5"
                value={budget || ''}
                onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                placeholder="أدخل ميزانية العميل..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 pr-9 pl-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono font-black text-sm outline-none focus:border-orange-500"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              تحديد اللعبة (اختياري)
            </label>
            <select
              value={selectedGameId}
              onChange={e => setSelectedGameId(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-orange-500 font-semibold"
            >
              <option value="all">🎮 كل الألعاب المتاحة</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              نوع التذكرة / التسعير
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <button
                type="button"
                onClick={() => setTicketType('regular')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ticketType === 'regular'
                    ? 'bg-white dark:bg-[#18181B] text-orange-500 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                شحن عادي
              </button>
              <button
                type="button"
                onClick={() => setTicketType('first_shipping')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ticketType === 'first_shipping'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-purple-400'
                }`}
              >
                🌱 أول شحنة
              </button>
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-2 flex-wrap text-zinc-500 text-[11px]">
          <span className="font-bold">ميزانيات شائعة:</span>
          {[50, 100, 150, 200, 250, 300, 500, 1000].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => setBudget(val)}
              className={`px-2.5 py-0.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                budget === val
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-[#18181B] hover:bg-orange-500/10 hover:text-orange-500'
              }`}
            >
              {val} ج
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {/* 1. Exact Matches */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                1. المطابق تماماً للميزانية ({formatCurrency(budget)})
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-500 font-mono">
                {exactMatches.length} باقة
              </span>
            </div>

            {exactMatches.length === 0 ? (
              <p className="text-zinc-400 text-xs py-2 text-center bg-gray-50 dark:bg-[#141417] rounded-xl border border-dashed border-gray-200 dark:border-[#27272A]">
                لا توجد باقة بسعر {formatCurrency(budget)} تماماً
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {exactMatches.map(({ product, game, effectivePrice }) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-500 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{game.icon}</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span>{game.name}</span>
                        <span>•</span>
                        <span className="text-emerald-500 font-bold font-mono">
                          {formatCurrency(effectivePrice)}
                        </span>
                      </div>
                    </div>

                    {onSelectProduct && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => {
                          onSelectProduct(product, game, ticketType === 'first_shipping');
                          onClose();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      >
                        إضافة
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Closest Under Budget */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-blue-500/30">
              <ArrowDown className="w-4 h-4 text-blue-500" />
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                2. الأقرب تحت الميزانية (توفير للعميل 💵)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-500 font-mono">
                {closestUnder.length} باقة
              </span>
            </div>

            {closestUnder.length === 0 ? (
              <p className="text-zinc-400 text-xs py-2 text-center bg-gray-50 dark:bg-[#141417] rounded-xl border border-dashed border-gray-200 dark:border-[#27272A]">
                لا توجد باقات أقل من هذه الميزانية
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {closestUnder.map(({ product, game, effectivePrice }) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between gap-3 shadow-xs hover:border-blue-500 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{game.icon}</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span className="text-blue-500 font-bold font-mono">
                          {formatCurrency(effectivePrice)}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-500 font-mono">
                          (وفر {formatCurrency(budget - effectivePrice)})
                        </span>
                      </div>
                    </div>

                    {onSelectProduct && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => {
                          onSelectProduct(product, game, ticketType === 'first_shipping');
                          onClose();
                        }}
                        className="text-xs font-bold"
                      >
                        إضافة
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Closest Over Budget */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-purple-500/30">
              <ArrowUp className="w-4 h-4 text-purple-500" />
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                3. الأقرب فوق الميزانية (Upsell & أفضل قيمة 🚀)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-400 font-mono">
                {closestOver.length} باقة
              </span>
            </div>

            {closestOver.length === 0 ? (
              <p className="text-zinc-400 text-xs py-2 text-center bg-gray-50 dark:bg-[#141417] rounded-xl border border-dashed border-gray-200 dark:border-[#27272A]">
                لا توجد باقات أعلى من هذه الميزانية
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {closestOver.map(({ product, game, effectivePrice }) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-purple-500/20 flex items-center justify-between gap-3 shadow-xs hover:border-purple-500 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{game.icon}</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span className="text-purple-400 font-bold font-mono">
                          {formatCurrency(effectivePrice)}
                        </span>
                        <span>•</span>
                        <span className="text-amber-500 font-mono">
                          (فارق +{formatCurrency(effectivePrice - budget)})
                        </span>
                      </div>
                    </div>

                    {onSelectProduct && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => {
                          onSelectProduct(product, game, ticketType === 'first_shipping');
                          onClose();
                        }}
                        className="text-xs font-bold text-purple-400 hover:bg-purple-500 hover:text-white"
                      >
                        إضافة
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
