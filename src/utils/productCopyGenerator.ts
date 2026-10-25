import { GameTreeItem, GameSection, GameGroup, GameProduct, MarketingCopySettings, GameCopySettings } from '../types/topup.types';
import { db } from '../database/db';

/**
 * Replace dynamic template placeholders like {company_name}, {game_name}, {today_date}, etc.
 */
export function interpolatePlaceholders(
  template: string,
  context: {
    companyName?: string;
    gameName?: string;
    sectionName?: string;
    groupName?: string;
    productName?: string;
  }
): string {
  if (!template) return '';

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }) || now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  const company = context.companyName || 'JKR TOP-UP';

  return template
    .replace(/{company_name}/gi, company)
    .replace(/{game_name}/gi, context.gameName || '')
    .replace(/{section_name}/gi, context.sectionName || '')
    .replace(/{group_name}/gi, context.groupName || '')
    .replace(/{product_name}/gi, context.productName || '')
    .replace(/{today_date}/gi, dateStr)
    .replace(/{today_time}/gi, timeStr);
}

/**
 * Format a single product line cleanly without automatic gems or icons: "اسم المنتج ⬅️ 1899"
 */
export function formatProductPriceLine(prod: GameProduct): string {
  const price = prod.calculatedPriceEGP || prod.customSellingPriceEGP || 0;
  const name = prod.name.trim();
  return `${name} ⬅️ ${price}`;
}

export function getSafeSettings(customSettings?: MarketingCopySettings): MarketingCopySettings {
  const defaults = db.getDefaultMarketingCopySettings();
  const s = customSettings || db.getMarketingCopySettings() || defaults;
  return {
    headerText: typeof s?.headerText === 'string' ? s.headerText : defaults.headerText,
    footerText: typeof s?.footerText === 'string' ? s.footerText : defaults.footerText,
    companyName: typeof s?.companyName === 'string' && s.companyName.trim() ? s.companyName : defaults.companyName
  };
}

/**
 * Generates the raw dynamic message body/lines for a Game, without checking for full custom message override.
 * Useful for prefilling or importing into the custom message editor.
 */
export function generateRawGameMessage(
  game: GameTreeItem,
  customSettings?: MarketingCopySettings,
  specificGameSettings?: GameCopySettings
): string {
  const gameSettings = specificGameSettings || db.getGameMarketingCopySettings(game.id) || game.copySettings;
  const globalSettings = getSafeSettings(customSettings);
  const company = globalSettings.companyName || 'JKR TOP-UP';

  const effectiveHeaderText = (gameSettings && gameSettings.useGlobalHeader === false && gameSettings.headerText !== undefined)
    ? gameSettings.headerText
    : globalSettings.headerText;

  const effectiveFooterText = (gameSettings && gameSettings.useGlobalFooter === false && gameSettings.footerText !== undefined)
    ? gameSettings.footerText
    : globalSettings.footerText;

  const header = interpolatePlaceholders(effectiveHeaderText, {
    companyName: company,
    gameName: game.name
  });

  const footer = interpolatePlaceholders(effectiveFooterText, {
    companyName: company,
    gameName: game.name
  });

  const lines: string[] = [];

  // Game Header Title (Custom per game or default)
  const gameTitle = gameSettings?.customTitle?.trim() || `🎮 أسعار شحن ${game.name} بالحساب`;
  lines.push(gameTitle);
  lines.push('');

  const activeSections = (game.sections || []).filter(s => s.isActive !== false);
  const allProducts = (game.products || []).filter(p => p.isActive !== false);
  const allGroups = (game.groups || []).filter(gr => gr.isActive !== false);

  activeSections.forEach((section, sIdx) => {
    // Section header (clean without any gems icon)
    lines.push(section.name);
    lines.push('');

    // Groups in this section
    const secGroups = allGroups.filter(gr => gr.sectionId === section.id);
    secGroups.forEach(group => {
      const groupProds = allProducts.filter(p => p.sectionId === section.id && p.groupId === group.id);
      if (groupProds.length > 0) {
        lines.push(`📁 ${group.name}`);
        groupProds.forEach(p => {
          lines.push(formatProductPriceLine(p));
        });
        lines.push('');
      }
    });

    // Direct products in this section (not in group)
    const directProds = allProducts.filter(p => p.sectionId === section.id && (!p.groupId || p.groupId === ''));
    if (directProds.length > 0) {
      directProds.forEach(p => {
        lines.push(formatProductPriceLine(p));
      });
      lines.push('');
    }

    // Separator between sections if not last section
    if (sIdx < activeSections.length - 1) {
      lines.push('-------------------------');
      lines.push('');
    }
  });

  const body = lines.join('\n').trim();

  return [header.trim(), body, footer.trim()].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Generate full marketing message for a whole Game.
 * Supports complete custom message override per game or custom headers/titles.
 */
export function generateGameMarketingMessage(
  game: GameTreeItem,
  customSettings?: MarketingCopySettings
): string {
  const gameSettings = db.getGameMarketingCopySettings(game.id) || game.copySettings;

  // 1. If the game has a custom full message enabled and filled, return it directly!
  if (gameSettings?.useCustomMessage && gameSettings?.customFullMessage?.trim()) {
    return gameSettings.customFullMessage.trim();
  }

  // 2. Otherwise generate dynamically with custom header/footer/title if configured
  return generateRawGameMessage(game, customSettings, gameSettings);
}

/**
 * Generate marketing message for a Section.
 */
export function generateSectionMarketingMessage(
  game: GameTreeItem,
  section: GameSection,
  customSettings?: MarketingCopySettings
): string {
  const settings = getSafeSettings(customSettings);
  const company = settings.companyName || 'JKR TOP-UP';

  const header = interpolatePlaceholders(settings.headerText, {
    companyName: company,
    gameName: game.name,
    sectionName: section.name
  });

  const footer = interpolatePlaceholders(settings.footerText, {
    companyName: company,
    gameName: game.name,
    sectionName: section.name
  });

  const lines: string[] = [];

  // Section title (clean without gems icon)
  lines.push(section.name);
  lines.push('');

  const allProducts = (game.products || []).filter(p => p.isActive !== false && p.sectionId === section.id);
  const allGroups = (game.groups || []).filter(gr => gr.isActive !== false && gr.sectionId === section.id);

  // Groups
  allGroups.forEach(group => {
    const groupProds = allProducts.filter(p => p.groupId === group.id);
    if (groupProds.length > 0) {
      lines.push(`📁 ${group.name}`);
      groupProds.forEach(p => {
        lines.push(formatProductPriceLine(p));
      });
      lines.push('');
    }
  });

  // Direct products
  const directProds = allProducts.filter(p => !p.groupId || p.groupId === '');
  directProds.forEach(p => {
    lines.push(formatProductPriceLine(p));
  });

  const body = lines.join('\n').trim();

  return [header.trim(), body, footer.trim()].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Generate marketing message for a Group.
 */
export function generateGroupMarketingMessage(
  game: GameTreeItem,
  section: GameSection,
  group: GameGroup,
  customSettings?: MarketingCopySettings
): string {
  const settings = getSafeSettings(customSettings);
  const company = settings.companyName || 'JKR TOP-UP';

  const header = interpolatePlaceholders(settings.headerText, {
    companyName: company,
    gameName: game.name,
    sectionName: section.name,
    groupName: group.name
  });

  const footer = interpolatePlaceholders(settings.footerText, {
    companyName: company,
    gameName: game.name,
    sectionName: section.name,
    groupName: group.name
  });

  const lines: string[] = [];
  lines.push(`📁 ${group.name}`);
  lines.push('');

  const groupProds = (game.products || []).filter(p => p.isActive !== false && p.sectionId === section.id && p.groupId === group.id);
  groupProds.forEach(p => {
    lines.push(formatProductPriceLine(p));
  });

  const body = lines.join('\n').trim();

  return [header.trim(), body, footer.trim()].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Generate marketing message for a single Product.
 */
export function generateProductMarketingMessage(
  prod: GameProduct,
  game: GameTreeItem,
  section?: GameSection,
  group?: GameGroup,
  customSettings?: MarketingCopySettings
): string {
  const settings = getSafeSettings(customSettings);
  const company = settings.companyName || 'JKR TOP-UP';

  const header = interpolatePlaceholders(settings.headerText, {
    companyName: company,
    gameName: game.name,
    sectionName: section?.name,
    groupName: group?.name,
    productName: prod.name
  });

  const footer = interpolatePlaceholders(settings.footerText, {
    companyName: company,
    gameName: game.name,
    sectionName: section?.name,
    groupName: group?.name,
    productName: prod.name
  });

  const price = prod.calculatedPriceEGP || prod.customSellingPriceEGP || 0;
  const prodTitle = prod.name;

  const body = `${prodTitle}\nالسعر: ${price} جنيه`;

  return [header.trim(), body, footer.trim()].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
}
