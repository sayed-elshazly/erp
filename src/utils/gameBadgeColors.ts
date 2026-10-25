// =============================================================
// NZM JKR TOP UP ERP — Middleman Standard Game & Type Badge Styles
// =============================================================

export const getGameBadgeStyle = (gameName?: string): string => {
  if (!gameName) return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  const name = gameName.toLowerCase().trim();

  if (name.includes('pubg') || name.includes('ببجي')) {
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  }
  if (name.includes('free fire') || name.includes('فراي فاير') || name.includes('فري فاير')) {
    return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
  }
  if (name.includes('valorant') || name.includes('فالورانت') || name.includes('فالورنت')) {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  }
  if (
    name.includes('fifa') ||
    name.includes('ea fc') ||
    name.includes('fc 24') ||
    name.includes('fc 25') ||
    name.includes('فيفا') ||
    name.includes('fc25') ||
    name.includes('fc24')
  ) {
    return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
  }
  if (name.includes('roblox') || name.includes('روبلوكس')) {
    return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
  }
  if (
    name.includes('league') ||
    name.includes('lol') ||
    name.includes('wild rift') ||
    name.includes('ليج')
  ) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }
  if (name.includes('gta') || name.includes('جراند') || name.includes('gta v')) {
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }
  if (name.includes('genshin') || name.includes('جينشن')) {
    return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
  }
  if (name.includes('call of duty') || name.includes('cod') || name.includes('كود') || name.includes('warzone')) {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  }
  if (name.includes('fortnite') || name.includes('فورت نايت') || name.includes('فورتنايت')) {
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
  }

  // Dynamic hash fallback
  let hash = 0;
  for (let i = 0; i < gameName.length; i++) {
    hash = gameName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    'bg-blue-500/10 text-blue-500 border-blue-500/30',
    'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'bg-rose-500/10 text-rose-400 border-rose-500/30',
    'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const getDealTypeBadgeStyle = (
  dealType?: string,
  customLabel?: string
): { label: string; badgeClass: string } => {
  switch (dealType) {
    case 'account_sale':
      return { label: '🏷️ بيع حساب', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
    case 'account_purchase':
      return { label: '🛒 شراء حساب', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/30' };
    case 'currency_sale':
      return { label: '💰 بيع عملات', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'currency_purchase':
      return { label: '💎 شراء عملات', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    case 'script_sale':
      return { label: '📜 بيع سكربت', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
    case 'digital_product':
      return { label: '📦 منتج رقمي', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    case 'service':
      return { label: '⚡ خدمة شحن/دعم', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/30' };
    case 'other':
      return { label: customLabel || '🛡️ وساطة أخرى', badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' };
    default:
      return { label: customLabel || '🛡️ وساطة عامة', badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' };
  }
};
