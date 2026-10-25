import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { MarketingCopySettings, GameCopySettings, GameTreeItem } from '../../types/topup.types';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { Copy, RotateCcw, Save, FileText, Info, Eye, Sparkles, Check, Trash2, Sliders, Globe } from 'lucide-react';
import { interpolatePlaceholders, generateGameMarketingMessage, generateRawGameMessage } from '../../utils/productCopyGenerator';
import { copyToClipboard } from '../../utils/clipboard';

interface CopyTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGameId?: string;
}

export const CopyTemplatesModal: React.FC<CopyTemplatesModalProps> = ({
  isOpen,
  onClose,
  initialGameId
}) => {
  const { showToast } = useNotifications();

  // Games list from database
  const [games, setGames] = useState<GameTreeItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('global'); // 'global' or game.id

  // Global Settings State
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [companyName, setCompanyName] = useState('JKR TOP-UP');

  // Per-Game Settings State
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [customFullMessage, setCustomFullMessage] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [gameHeaderText, setGameHeaderText] = useState('');
  const [gameFooterText, setGameFooterText] = useState('');
  const [useGlobalHeader, setUseGlobalHeader] = useState(true);
  const [useGlobalFooter, setUseGlobalFooter] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');

  // Load games and global settings
  useEffect(() => {
    if (isOpen) {
      const allGames = db.getGameTree();
      setGames(allGames);

      const defaults = db.getDefaultMarketingCopySettings();
      const s = db.getMarketingCopySettings() || defaults;
      setHeaderText(s?.headerText ?? defaults.headerText);
      setFooterText(s?.footerText ?? defaults.footerText);
      setCompanyName(s?.companyName || defaults.companyName || 'JKR TOP-UP');

      if (initialGameId && allGames.some((g: GameTreeItem) => g.id === initialGameId)) {
        setSelectedTarget(initialGameId);
      } else {
        setSelectedTarget('global');
      }
    }
  }, [isOpen, initialGameId]);

  // Load game-specific settings when selectedTarget changes
  useEffect(() => {
    if (selectedTarget === 'global') return;

    const game = games.find(g => g.id === selectedTarget);
    if (!game) return;

    const saved = db.getGameMarketingCopySettings(game.id) || game.copySettings;
    if (saved) {
      setUseCustomMessage(Boolean(saved.useCustomMessage));
      setCustomFullMessage(saved.customFullMessage || '');
      setCustomTitle(saved.customTitle || `🎮 أسعار شحن ${game.name} بالحساب`);
      setGameHeaderText(saved.headerText || '');
      setGameFooterText(saved.footerText || '');
      setUseGlobalHeader(saved.useGlobalHeader !== false);
      setUseGlobalFooter(saved.useGlobalFooter !== false);
    } else {
      setUseCustomMessage(false);
      setCustomFullMessage('');
      setCustomTitle(`🎮 أسعار شحن ${game.name} بالحساب`);
      setGameHeaderText('');
      setGameFooterText('');
      setUseGlobalHeader(true);
      setUseGlobalFooter(true);
    }
  }, [selectedTarget, games]);

  const selectedGame = useMemo(() => {
    return games.find(g => g.id === selectedTarget);
  }, [selectedTarget, games]);

  // Handle Global Save
  const handleSaveGlobalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MarketingCopySettings = {
      headerText: headerText.trim(),
      footerText: footerText.trim(),
      companyName: companyName.trim() || 'JKR TOP-UP'
    };

    db.saveMarketingCopySettings(updated);
    showToast('success', 'تم حفظ القالب العام', 'تم تحديث الترويسة والتذييل العام لكافة الألعاب بنجاح.');
    onClose();
  };

  // Handle Game-Specific Save
  const handleSaveGameSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;

    const gameSettings: GameCopySettings = {
      gameId: selectedGame.id,
      useCustomMessage,
      customFullMessage: customFullMessage.trim(),
      customTitle: customTitle.trim() || `🎮 أسعار شحن ${selectedGame.name} بالحساب`,
      headerText: gameHeaderText.trim(),
      footerText: gameFooterText.trim(),
      useGlobalHeader,
      useGlobalFooter
    };

    db.saveGameMarketingCopySettings(selectedGame.id, gameSettings);
    showToast('success', 'تم حفظ رسالة اللعبة', `تم حفظ وتحديث إعدادات رسالة (${selectedGame.name}) بنجاح.`);
    onClose();
  };

  // Reset Global to Defaults
  const handleResetGlobalToDefaults = () => {
    if (window.confirm('هل تريد استعادة نصوص الترويسة والتذييل الافتراضية للنظام؟')) {
      const defaults = db.getDefaultMarketingCopySettings();
      setHeaderText(defaults.headerText);
      setFooterText(defaults.footerText);
      setCompanyName(defaults.companyName);
      showToast('info', 'تمت الاستعادة', 'تمت استعادة النصوص الافتراضية، اضغط حفظ لتطبيقها.');
    }
  };

  // Reset Game to Global Default
  const handleResetGameToDefault = () => {
    if (!selectedGame) return;
    if (window.confirm(`هل أنت متأكد من إلغاء تخصيص رسالة (${selectedGame.name}) والعودة للقالب والتوليد الآلي العام؟`)) {
      db.deleteGameMarketingCopySettings(selectedGame.id);
      setUseCustomMessage(false);
      setCustomFullMessage('');
      setCustomTitle(`🎮 أسعار شحن ${selectedGame.name} بالحساب`);
      setGameHeaderText('');
      setGameFooterText('');
      setUseGlobalHeader(true);
      setUseGlobalFooter(true);
      showToast('info', 'تمت استعادة الإعدادات العامة', `تم إلغاء التخصيص واستعادة القالب العام للعبة (${selectedGame.name}).`);
    }
  };

  // Auto-Generate Raw Message into Custom Message Editor
  const handlePopulateFromCurrentProducts = () => {
    if (!selectedGame) return;
    const globalSettings: MarketingCopySettings = {
      headerText,
      footerText,
      companyName
    };
    const currentTempGameSettings: GameCopySettings = {
      gameId: selectedGame.id,
      customTitle,
      headerText: gameHeaderText,
      footerText: gameFooterText,
      useGlobalHeader,
      useGlobalFooter
    };
    const raw = generateRawGameMessage(selectedGame, globalSettings, currentTempGameSettings);
    setCustomFullMessage(raw);
    showToast('success', 'تم توليد النص بنجاح', 'تم استيراد قائمة الأسعار والأقسام الحالية إلى المحرر، يمكنك الآن تعديل أي سطر فيها بحرية.');
  };

  const insertVariable = (target: 'global-header' | 'global-footer' | 'game-header' | 'game-footer', variable: string) => {
    if (target === 'global-header') {
      setHeaderText(prev => prev + ' ' + variable);
    } else if (target === 'global-footer') {
      setFooterText(prev => prev + ' ' + variable);
    } else if (target === 'game-header') {
      setGameHeaderText(prev => prev + ' ' + variable);
    } else if (target === 'game-footer') {
      setGameFooterText(prev => prev + ' ' + variable);
    }
  };

  // Live Preview Computation
  const previewText = useMemo(() => {
    if (selectedTarget === 'global') {
      const previewHeader = interpolatePlaceholders(headerText, {
        companyName: companyName || 'JKR TOP-UP',
        gameName: 'Free Fire (فري فاير)'
      });

      const previewFooter = interpolatePlaceholders(footerText, {
        companyName: companyName || 'JKR TOP-UP',
        gameName: 'Free Fire (فري فاير)'
      });

      const sampleBody = `🎮 أسعار شحن Free Fire بالحساب\n\nباقات الشحن\n5600 شحنة ⬅️ 1899\n3240 شحنة ⬅️ 1149\n2180 شحنة ⬅️ 749\n1580 شحنة ⬅️ 549\n520 شحنة ⬅️ 199\n\n-------------------------\n\nالعضويات\nشهرية ⬅️ 375\nأسبوعية ⬅️ 79`;

      return [previewHeader.trim(), sampleBody, previewFooter.trim()]
        .filter(Boolean)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n');
    }

    if (selectedGame) {
      if (useCustomMessage && customFullMessage.trim()) {
        return customFullMessage.trim();
      }

      const globalSettings: MarketingCopySettings = {
        headerText,
        footerText,
        companyName
      };
      const tempGameSettings: GameCopySettings = {
        gameId: selectedGame.id,
        useCustomMessage: false,
        customTitle,
        headerText: gameHeaderText,
        footerText: gameFooterText,
        useGlobalHeader,
        useGlobalFooter
      };
      return generateRawGameMessage(selectedGame, globalSettings, tempGameSettings);
    }

    return '';
  }, [
    selectedTarget,
    selectedGame,
    headerText,
    footerText,
    companyName,
    useCustomMessage,
    customFullMessage,
    customTitle,
    gameHeaderText,
    gameFooterText,
    useGlobalHeader,
    useGlobalFooter
  ]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📋 إعدادات وتخصيص رسائل النسخ التسويقية"
      subtitle="تعديل وتخصيص رسالة كل لعبة بشكل منفصل، أو ضبط القالب العام للمتجر"
      maxWidth="5xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Game / Target Selector Toolbar */}
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <Sliders className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="font-black text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
              اختر اللعبة أو القالب:
            </span>
            <select
              value={selectedTarget}
              onChange={e => setSelectedTarget(e.target.value)}
              className="flex-1 rounded-xl bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            >
              <option value="global">🌐 القالب العام لجميع الألعاب (Global Default)</option>
              <optgroup label="🎮 تخصيص رسالة لعبة منفصلة">
                {games.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.icon || '🎮'} {g.name} ({g.products?.length || 0} منتج)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {selectedTarget !== 'global' && selectedGame && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 font-bold text-[11px] border border-orange-500/20">
                🎮 لعبة: {selectedGame.name}
              </span>
              {useCustomMessage ? (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-[11px] border border-purple-500/20">
                  ✨ رسالة مخصصة بالكامل نشطة
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-[11px] border border-blue-500/20">
                  ⚡ توليد تلقائي ذكي
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs (Edit vs Preview) */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#27272A] pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              ⚙️ {selectedTarget === 'global' ? 'تعديل نصوص القالب العام' : `تعديل رسالة (${selectedGame?.name || ''})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة الرسالة الحية (Live Preview)</span>
            </button>
          </div>

          {selectedTarget === 'global' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-zinc-400" />}
              onClick={handleResetGlobalToDefaults}
              className="text-zinc-400 hover:text-orange-500 text-xs"
            >
              استعادة الافتراضي
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              onClick={handleResetGameToDefault}
              className="text-rose-400 hover:text-rose-500 text-xs"
              title="إلغاء التخصيص واستعادة القالب العام للعبة"
            >
              إلغاء التخصيص واستعادة العام
            </Button>
          )}
        </div>

        {/* ============================================================= */}
        {/* TAB 1: SETTINGS EDIT */}
        {/* ============================================================= */}
        {activeTab === 'settings' && (
          <div>
            {/* --------------------------------------------- */}
            {/* VIEW A: GLOBAL SETTINGS FORM */}
            {/* --------------------------------------------- */}
            {selectedTarget === 'global' && (
              <form onSubmit={handleSaveGlobalSettings} className="space-y-4">
                {/* Store Name Field */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                    اسم المتجر / الشركة (يستبدل في متغيّر {'{company_name}'})
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="مثال: JKR TOP-UP"
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:border-orange-500"
                  />
                </div>

                {/* Header Section */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <span>1️⃣ ترويسة الرسالة العامة (Header) — تظهر أول الرسالة دائماً</span>
                    </label>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-zinc-500 font-bold ml-1">إدراج متغيّر:</span>
                      {['{company_name}', '{game_name}', '{today_date}', '{today_time}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable('global-header', v)}
                          className="px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono text-[10px] border border-orange-500/20 cursor-pointer"
                          title={`إدراج ${v}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={headerText}
                    onChange={e => setHeaderText(e.target.value)}
                    rows={4}
                    dir="rtl"
                    placeholder="اكتب ترويسة الرسالة هنا..."
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-3 text-zinc-900 dark:text-zinc-100 font-mono text-xs leading-relaxed outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Info Note: Clean format without gems */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-2.5">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    2️⃣ <strong>محتوى الأسعار والأقسام (Body):</strong> يتم توليده تلقائياً من بيانات اللعبة بصيغة نظيفة: <code>اسم المنتج ⬅️ السعر</code> بدون رموز جواهر إجبارية.
                  </span>
                </div>

                {/* Footer Section */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>3️⃣ تذييل الرسالة العام (Footer) — روابط التواصل وقنوات الواتساب</span>
                    </label>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-zinc-500 font-bold ml-1">إدراج متغيّر:</span>
                      {['{company_name}', '{today_date}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable('global-footer', v)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/20 cursor-pointer"
                          title={`إدراج ${v}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    rows={6}
                    dir="rtl"
                    placeholder="اكتب تذييل الرسالة وروابط التواصل وقنوات الواتساب..."
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-3 text-zinc-900 dark:text-zinc-100 font-mono text-xs leading-relaxed outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                    حفظ القالب العام
                  </Button>
                </div>
              </form>
            )}

            {/* --------------------------------------------- */}
            {/* VIEW B: SPECIFIC GAME CUSTOMIZATION FORM */}
            {/* --------------------------------------------- */}
            {selectedTarget !== 'global' && selectedGame && (
              <form onSubmit={handleSaveGameSettings} className="space-y-4">
                {/* Full Custom Message Mode Toggle Box */}
                <div className="p-4 rounded-2xl bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-orange-500/10 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <div>
                        <strong className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
                          تفعيل رسالة مخصصة بالكامل للعبة ({selectedGame.name})
                        </strong>
                        <span className="text-[11px] text-zinc-500">
                          يتيح لك كتابة وتعديل كل كلمة وسطر وسعر وملاحظة في الرسالة بحرية تامة دون أي قيود.
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomMessage}
                        onChange={e => {
                          const checked = e.target.checked;
                          setUseCustomMessage(checked);
                          if (checked && !customFullMessage.trim()) {
                            // Automatically pre-populate from products so the user doesn't start from an empty sheet!
                            const globalSettings: MarketingCopySettings = { headerText, footerText, companyName };
                            const raw = generateRawGameMessage(selectedGame, globalSettings);
                            setCustomFullMessage(raw);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                {/* Option 1: Full Custom Message Editor (When Enabled) */}
                {useCustomMessage ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span>محرر الرسالة المخصصة الكاملة — يمكنك تعديل كل شيء فيها:</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePopulateFromCurrentProducts}
                          className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-bold text-xs flex items-center gap-1 border border-orange-500/20 cursor-pointer transition-colors"
                          title="إعادة استيراد كافة المنتجات والأسعار الحالية إلى المحرر"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>استيراد وتوليد من المنتجات الحالية</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomFullMessage('')}
                          className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#222228] text-zinc-400 hover:text-rose-500 font-bold text-xs cursor-pointer transition-colors"
                          title="مسح محتوى المحرر"
                        >
                          مسح
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={customFullMessage}
                      onChange={e => setCustomFullMessage(e.target.value)}
                      rows={14}
                      dir="rtl"
                      placeholder="اكتب أو الصق رسالة اللعبة المخصصة هنا..."
                      className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-3 text-zinc-900 dark:text-zinc-100 font-mono text-xs leading-relaxed outline-none focus:border-purple-500 transition-colors"
                    />

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>💡 عند نسخ هذه اللعبة، سيتم استخدام هذا النص المكتوب هنا تماماً.</span>
                      <span className="font-mono">{customFullMessage.length} حرف</span>
                    </div>
                  </div>
                ) : (
                  /* Option 2: Structured Game Customization (Title, Header, Footer) */
                  <div className="space-y-4">
                    {/* Game Title Customization */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1.5">
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        عنوان رأس اللعبة (يظهر قبل تفاصيل الباقات)
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        placeholder={`مثال: 🎮 أسعار شحن ${selectedGame.name} بالحساب`}
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* Game-Specific Header */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span>ترويسة الرسالة لهذه اللعبة (Header)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-500">
                          <input
                            type="checkbox"
                            checked={useGlobalHeader}
                            onChange={e => setUseGlobalHeader(e.target.checked)}
                            className="rounded accent-orange-500"
                          />
                          <span>استخدام الترويسة العامة الافتراضية</span>
                        </label>
                      </div>

                      {!useGlobalHeader ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-zinc-500 font-bold ml-1">إدراج متغيّر:</span>
                            {['{company_name}', '{game_name}', '{today_date}'].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => insertVariable('game-header', v)}
                                className="px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono text-[10px] border border-orange-500/20 cursor-pointer"
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={gameHeaderText}
                            onChange={e => setGameHeaderText(e.target.value)}
                            rows={3}
                            dir="rtl"
                            placeholder="اكتب ترويسة خاصة بهذه اللعبة..."
                            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-mono text-xs leading-relaxed outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400 italic bg-gray-50 dark:bg-[#141417] p-2.5 rounded-xl border border-dashed border-gray-200 dark:border-[#27272A]">
                          يتم استخدام الترويسة العامة للمتجر تلقائياً. ألغِ التحديد أعلاه لكتابة ترويسة خاصة بهذه اللعبة.
                        </p>
                      )}
                    </div>

                    {/* Game-Specific Footer */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <span>تذييل الرسالة لهذه اللعبة (Footer)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-500">
                          <input
                            type="checkbox"
                            checked={useGlobalFooter}
                            onChange={e => setUseGlobalFooter(e.target.checked)}
                            className="rounded accent-emerald-500"
                          />
                          <span>استخدام التذييل العام الافتراضي</span>
                        </label>
                      </div>

                      {!useGlobalFooter ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-zinc-500 font-bold ml-1">إدراج متغيّر:</span>
                            {['{company_name}', '{today_date}'].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => insertVariable('game-footer', v)}
                                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/20 cursor-pointer"
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={gameFooterText}
                            onChange={e => setGameFooterText(e.target.value)}
                            rows={4}
                            dir="rtl"
                            placeholder="اكتب تذييل خاص بهذه اللعبة (روابط أو قنوات مخصصة)..."
                            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-mono text-xs leading-relaxed outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400 italic bg-gray-50 dark:bg-[#141417] p-2.5 rounded-xl border border-dashed border-gray-200 dark:border-[#27272A]">
                          يتم استخدام التذييل العام للمتجر تلقائياً. ألغِ التحديد أعلاه لكتابة تذييل وروابط خاصة بهذه اللعبة.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                    حفظ رسالة ({selectedGame.name})
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: LIVE PREVIEW */}
        {/* ============================================================= */}
        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-400">
                شكل الرسالة الحية عند نسخها ولصقها في واتساب أو تليجرام:
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Copy className="w-3.5 h-3.5 text-orange-500" />}
                onClick={() => {
                  copyToClipboard(previewText, undefined, () => {
                    showToast('success', 'تم النسخ بنجاح', 'تم نسخ الرسالة المعروضة إلى الحافظة.');
                  });
                }}
                className="text-xs font-bold"
              >
                نسخ الرسالة للتجربة
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] font-mono text-xs leading-relaxed whitespace-pre-wrap select-all max-h-[500px] overflow-y-auto text-zinc-800 dark:text-zinc-200">
              {previewText}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
