import React, { useState, useEffect, useMemo } from 'react';
import {
  GameTreeItem,
  GameProduct,
  GameSection,
  GameGroup,
  StoreWallet,
  DepositBondFIFO,
  DailyExchangeRate,
  ProductCopyTemplate,
  WalletPriorityItem,
  ProductWalletSource
} from '../../types/topup.types';
import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Wallet,
  ArrowRightLeft,
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Calculator,
  Percent,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Gamepad2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  FolderInput,
  ArrowRight,
  Search,
  Move,
  ArrowUp,
  ArrowDown,
  Upload,
  ImageIcon,
  X,
  Info,
  Printer,
  Copy,
  Check,
  Tag,
  Coins,
  Lock,
  Package,
  ShieldAlert,
  BarChart3,
  User,
  Phone,
  Target,
  ToggleLeft,
  ToggleRight,
  Filter,
  Eye,
  EyeOff,
  RotateCcw,
  History,
  CheckSquare,
  Square,
  GripVertical
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { ReportTemplateType } from '../../services/reporting/reportTypes';
import { PricingEngine } from '../../services/pricing/pricingEngine';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { PricingBreakdownModal } from '../../components/pricing/PricingBreakdownModal';
import { PricingBreakdown } from '../../types/pricing.types';
import {
  generateGameMarketingMessage,
  generateSectionMarketingMessage,
  generateGroupMarketingMessage,
  generateProductMarketingMessage
} from '../../utils/productCopyGenerator';
import { ProductReportsTab } from './ProductReportsTab';
import { MediaUploadField } from '../../components/common/MediaUploadField';
import { JKRWallet } from '../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../services/financial/jkrWalletEngine';
import { JKRWalletCreateModal } from './wallets/JKRWalletCreateModal';
import { JKRMainWalletFundingModal } from './wallets/JKRMainWalletFundingModal';
import { JKRSubWalletDepositModal } from './wallets/JKRSubWalletDepositModal';
import { JKRWalletDetailsModal } from './wallets/JKRWalletDetailsModal';
import { JKRProductWalletPrioritySelect } from './wallets/JKRProductWalletPrioritySelect';
import { JKRWalletTransactionsTab } from './wallets/JKRWalletTransactionsTab';
import { JKRWalletDeleteModal } from './wallets/JKRWalletDeleteModal';
import { JKRMainWalletWithdrawModal } from './wallets/JKRMainWalletWithdrawModal';
import { CopyTemplatesModal } from './CopyTemplatesModal';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../../components/common/SortableDraggableItem';

export interface MoveUndoAction {
  description: string;
  type: 'product' | 'group' | 'batch_products';
  items: {
    id: string;
    name: string;
    sourceGameId: string;
    sourceSectionId: string;
    sourceGroupId?: string;
  }[];
  groupData?: {
    groupId: string;
    groupName: string;
    sourceGameId: string;
    sourceSectionId: string;
  };
  timestamp: number;
}

export interface MoveAuditEntry {
  id: string;
  itemName: string;
  itemType: 'product' | 'group' | 'batch_products';
  count?: number;
  sourcePath: string;
  targetPath: string;
  performedBy: string;
  timestamp: string;
}

interface CatalogModuleProps {
  department?: 'customers' | 'dealers';
}

export const CatalogModule: React.FC<CatalogModuleProps> = ({ department = 'customers' }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { getOrderedItems } = useLayoutOrder();
  const isOwner = user?.role === 'admin';

  // Sub-tabs: 'tree' | 'first_shipping_tree' | 'reports' | 'wallets' | 'transactions'
  const [activeTab, setActiveTab] = useState<'tree' | 'first_shipping_tree' | 'reports' | 'wallets' | 'transactions'>('tree');
  const isFirstShippingTab = activeTab === 'first_shipping_tree';

  // Catalog Data
  const [regularGames, setRegularGames] = useState<GameTreeItem[]>([]);
  const [firstShippingGames, setFirstShippingGames] = useState<GameTreeItem[]>([]);
  const [wallets, setWallets] = useState<StoreWallet[]>([]);
  const [bonds, setBonds] = useState<DepositBondFIFO[]>([]);
  const [exchangeRate, setExchangeRate] = useState<DailyExchangeRate>(db.getExchangeRate());

  // Active Tree selection
  const games = isFirstShippingTab ? firstShippingGames : regularGames;

  // Tree Filters
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('all');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterGameId, setFilterGameId] = useState('all');
  const [filterSectionId, setFilterSectionId] = useState('all');
  const [filterGroupId, setFilterGroupId] = useState('all');
  const [filterProductId, setFilterProductId] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'most_sold'>('newest');

  // Collapse / Expand Persistence via LocalStorage
  const [collapsedGames, setCollapsedGames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sys_catalog_collapsed_games');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sys_catalog_collapsed_sections');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sys_catalog_collapsed_groups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // Save collapsed state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('sys_catalog_collapsed_games', JSON.stringify(Array.from(collapsedGames)));
    } catch { }
  }, [collapsedGames]);

  useEffect(() => {
    try {
      localStorage.setItem('sys_catalog_collapsed_sections', JSON.stringify(Array.from(collapsedSections)));
    } catch { }
  }, [collapsedSections]);

  useEffect(() => {
    try {
      localStorage.setItem('sys_catalog_collapsed_groups', JSON.stringify(Array.from(collapsedGroups)));
    } catch { }
  }, [collapsedGroups]);

  // Pricing Breakdown Modal State
  const [selectedBreakdown, setSelectedBreakdown] = useState<PricingBreakdown | null>(null);
  const [breakdownProductName, setBreakdownProductName] = useState('');

  // Central Rate Modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [newRateValue, setNewRateValue] = useState(exchangeRate.rateUSD_EGP);
  const [newFixedCost, setNewFixedCost] = useState(exchangeRate.fixedCostPerOrderEGP);

  // Add / Edit Game Modal
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState('');
  const [newGameCode, setNewGameCode] = useState('');
  const [newGamePublisher, setNewGamePublisher] = useState('');
  const [newGameIcon, setNewGameIcon] = useState('🎮');
  const [newGameImage, setNewGameImage] = useState('');
  const [newGameDescription, setNewGameDescription] = useState('');
  const [newGameCashback, setNewGameCashback] = useState(true);
  const [newGameReferral, setNewGameReferral] = useState(true);
  const [newGameIsActive, setNewGameIsActive] = useState(true);
  const [newGameDisabledReason, setNewGameDisabledReason] = useState('');

  // Add / Edit Section Modal
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionGameId, setSectionGameId] = useState('');
  const [sectionParentId, setSectionParentId] = useState<string | undefined>(undefined);
  const [sectionNameInput, setSectionNameInput] = useState('');
  const [sectionImageInput, setSectionImageInput] = useState('');
  const [sectionDescriptionInput, setSectionDescriptionInput] = useState('');
  const [sectionIsActive, setSectionIsActive] = useState(true);
  const [sectionDisabledReason, setSectionDisabledReason] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Add / Edit Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupGameId, setGroupGameId] = useState('');
  const [groupSectionId, setGroupSectionId] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupImageInput, setGroupImageInput] = useState('');
  const [groupDescriptionInput, setGroupDescriptionInput] = useState('');
  const [groupIsActive, setGroupIsActive] = useState(true);
  const [groupDisabledReason, setGroupDisabledReason] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Add / Edit Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodGameId, setProdGameId] = useState('');
  const [prodSectionId, setProdSectionId] = useState('');
  const [prodGroupId, setProdGroupId] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodCostUSD, setProdCostUSD] = useState<number | string>('');
  const [prodProfitMarginPercent, setProdProfitMarginPercent] = useState<number | string>(7);
  const [prodCashbackPercent, setProdCashbackPercent] = useState<number | string>(1);
  const [prodReferralPercent, setProdReferralPercent] = useState<number | string>(3);
  const [prodMinProfitEGP, setProdMinProfitEGP] = useState<number>(0);
  const [prodAvailableQuantity, setProdAvailableQuantity] = useState<string>('');
  const [prodAutoPricing, setProdAutoPricing] = useState<boolean>(true);
  const [prodCustomSellingPrice, setProdCustomSellingPrice] = useState<number | string>('');
  const [prodDealerCustomPrice, setProdDealerCustomPrice] = useState<number | string>('');
  const [prodManualCostEGP, setProdManualCostEGP] = useState<number | string>('');
  const [prodFirstOrderCostPrice, setProdFirstOrderCostPrice] = useState<number | string>('');
  const [prodFixedCost, setProdFixedCost] = useState<number | string>(0);
  const [prodReservePercent, setProdReservePercent] = useState<number | string>(1);
  const [prodDevelopmentPercent, setProdDevelopmentPercent] = useState<number | string>(0.5);
  const [prodIsActive, setProdIsActive] = useState<boolean>(true);
  const [prodDisabledReason, setProdDisabledReason] = useState<string>('');

  // Quick Move Product Modal States
  const [quickMoveProduct, setQuickMoveProduct] = useState<GameProduct | null>(null);
  const [targetMoveGameId, setTargetMoveGameId] = useState<string>('');
  const [targetMoveSectionId, setTargetMoveSectionId] = useState<string>('');
  const [targetMoveGroupId, setTargetMoveGroupId] = useState<string>('');

  // Move Group Modal States
  const [quickMoveGroup, setQuickMoveGroup] = useState<{ gameId: string; sectionId: string; group: GameGroup } | null>(null);
  const [targetMoveGroupGameId, setTargetMoveGroupGameId] = useState<string>('');
  const [targetMoveGroupSectionId, setTargetMoveGroupSectionId] = useState<string>('');

  // Multi-Product Selection & Batch Move States
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState<boolean>(false);
  const [batchTargetGameId, setBatchTargetGameId] = useState<string>('');
  const [batchTargetSectionId, setBatchTargetSectionId] = useState<string>('');
  const [batchTargetGroupId, setBatchTargetGroupId] = useState<string>('');

  // Drag & Drop States
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{ title: string; itemName: string; fromPath: string; toPath: string; onConfirm: () => void } | null>(null);

  // Undo System State
  const [lastUndoAction, setLastUndoAction] = useState<MoveUndoAction | null>(null);
  const [undoBanner, setUndoBanner] = useState<{ message: string; timestamp: number } | null>(null);

  // Move Audit Log States
  const [isMoveAuditModalOpen, setIsMoveAuditModalOpen] = useState<boolean>(false);
  const [moveAuditLogs, setMoveAuditLogs] = useState<MoveAuditEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sys_catalog_move_audit_logs') || '[]');
    } catch {
      return [];
    }
  });

  // Copy Templates Modal
  const [isCopyTemplatesOpen, setIsCopyTemplatesOpen] = useState(false);
  const [selectedGameForCopySettings, setSelectedGameForCopySettings] = useState<string | undefined>(undefined);

  // Quick Price Edit Modal State
  const [quickEditPriceProduct, setQuickEditPriceProduct] = useState<GameProduct | null>(null);
  const [quickFirstOrderPrice, setQuickFirstOrderPrice] = useState<number>(0);
  const [quickRegularPrice, setQuickRegularPrice] = useState<number>(0);

  // New JKR Wallets States
  const [jkrWallets, setJkrWallets] = useState<JKRWallet[]>([]);
  const [isCreateWalletOpen, setIsCreateWalletOpen] = useState(false);
  const [selectedWalletForDetails, setSelectedWalletForDetails] = useState<JKRWallet | null>(null);
  const [selectedWalletForDeposit, setSelectedWalletForDeposit] = useState<JKRWallet | null>(null);
  const [selectedWalletForFunding, setSelectedWalletForFunding] = useState<JKRWallet | null>(null);
  const [selectedWalletForWithdraw, setSelectedWalletForWithdraw] = useState<JKRWallet | null>(null);
  const [selectedWalletForDelete, setSelectedWalletForDelete] = useState<JKRWallet | null>(null);
  const [walletFilterType, setWalletFilterType] = useState<'all' | 'MAIN' | 'SUB'>('all');

  // Product Wallets Priority States
  const [prodPrimaryWalletId, setProdPrimaryWalletId] = useState<string>('');
  const [prodAlternativeWalletIds, setProdAlternativeWalletIds] = useState<string[]>([]);
  const [prodPointsCost, setProdPointsCost] = useState<number | string>('');
  const [prodIsCashbackEnabled, setProdIsCashbackEnabled] = useState<boolean>(true);
  const [prodIsReferralEnabled, setProdIsReferralEnabled] = useState<boolean>(true);
  const [prodCostEGP, setProdCostEGP] = useState<number>(0);

  // Note: Cost in USD is 100% manual as requested. No auto-calculation from wallet points or FIFO.

  const livePricing = useMemo(() => {
    let costU = typeof prodCostUSD === 'number' ? prodCostUSD : (parseFloat(String(prodCostUSD)) || 0);
    const pts = typeof prodPointsCost === 'number' ? prodPointsCost : (parseFloat(String(prodPointsCost)) || 0);

    if (costU <= 0 && prodPrimaryWalletId && pts > 0) {
      const fifoInfo = JKRWalletEngine.getWalletEffectivePointCost(prodPrimaryWalletId, pts);
      if (fifoInfo.totalCostUSD > 0) {
        costU = fifoInfo.totalCostUSD;
      }
    }

    const margin = typeof prodProfitMarginPercent === 'number' ? prodProfitMarginPercent : (parseFloat(String(prodProfitMarginPercent)) || 0);
    const cb = typeof prodCashbackPercent === 'number' ? prodCashbackPercent : (parseFloat(String(prodCashbackPercent)) || 0);
    const ref = typeof prodReferralPercent === 'number' ? prodReferralPercent : (parseFloat(String(prodReferralPercent)) || 0);
    const res = typeof prodReservePercent === 'number' ? prodReservePercent : (parseFloat(String(prodReservePercent)) || 0);
    const dev = typeof prodDevelopmentPercent === 'number' ? prodDevelopmentPercent : (parseFloat(String(prodDevelopmentPercent)) || 0);
    const fixedC = typeof prodFixedCost === 'number' ? prodFixedCost : (parseFloat(String(prodFixedCost)) || 0);

    return PricingEngine.calculateSellingPrice({
      gameId: prodGameId,
      costUSD: costU > 0 ? costU : undefined,
      customProfitMarginPercent: margin,
      customCashbackPercent: cb,
      customReferralPercent: ref,
      customReservePercent: res,
      customDevelopmentPercent: dev,
      customFixedCostEGP: fixedC,
      isCashbackEnabled: prodIsCashbackEnabled,
      isReferralEnabled: prodIsReferralEnabled
    });
  }, [
    prodCostUSD,
    prodPointsCost,
    prodPrimaryWalletId,
    prodProfitMarginPercent,
    prodCashbackPercent,
    prodReferralPercent,
    prodReservePercent,
    prodDevelopmentPercent,
    prodFixedCost,
    prodGameId,
    prodIsCashbackEnabled,
    prodIsReferralEnabled
  ]);


  const loadData = () => {
    setRegularGames(db.getGameTree());
    setFirstShippingGames(db.getFirstShippingGameTree());
    setWallets(db.getStoreWallets());
    setBonds(db.getDepositBondsFIFO());
    setExchangeRate(db.getExchangeRate());
    const freshJkrWallets = JKRWalletEngine.getWallets(department);
    setJkrWallets(freshJkrWallets);
    setSelectedWalletForDetails(prev => {
      if (!prev) return null;
      const fresh = JKRWalletEngine.getWalletById(prev.id);
      return fresh ? { ...fresh } : prev;
    });
  };

  useEffect(() => {
    loadData();
    const unsubProducts = eventBus.subscribe(SYSTEM_EVENTS.PRODUCTS_UPDATED, loadData);
    const unsubSettings = eventBus.subscribe(SYSTEM_EVENTS.SETTINGS_UPDATED, loadData);
    window.addEventListener('storage', loadData);
    return () => {
      unsubProducts();
      unsubSettings();
      window.removeEventListener('storage', loadData);
    };
  }, [department]);



  // Collapse / Expand handlers
  const toggleGameCollapse = (gameId: string) => {
    setCollapsedGames(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  const toggleGroupCollapse = (grpId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(grpId)) next.delete(grpId);
      else next.add(grpId);
      return next;
    });
  };

  const toggleDescriptionExpand = (prodId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(prodId)) next.delete(prodId);
      else next.add(prodId);
      return next;
    });
  };

  const handleCollapseAll = () => {
    const allGIds = new Set(games.map(g => g.id));
    const allSIds = new Set(games.flatMap(g => (g.sections || []).map(s => s.id)));
    const allGrpIds = new Set(games.flatMap(g => (g.groups || []).map(gr => gr.id)));
    setCollapsedGames(allGIds);
    setCollapsedSections(allSIds);
    setCollapsedGroups(allGrpIds);
    showToast('info', 'تم طي الشجرة بالكامل', 'تم طي كافة الألعاب والأقسام والمجموعات');
  };

  const handleExpandAll = () => {
    setCollapsedGames(new Set());
    setCollapsedSections(new Set());
    setCollapsedGroups(new Set());
    showToast('info', 'تم توسيع الشجرة بالكامل', 'تم فتح كافة الألعاب والأقسام والمجموعات');
  };

  // Pricing Breakdown
  const handleOpenProductBreakdown = (product: GameProduct, gameId?: string) => {
    const b = FinancialEngine.calculateProductPricing({
      costUSD: product.costUSD,
      customProfitMarginPercent: product.profitMarginPercent,
      walletId: product.primaryWalletId || product.walletTypeId,
      gameId: gameId || product.gameId
    });
    setSelectedBreakdown(b);
    setBreakdownProductName(product.name);
  };

  const handleRecalculateSingleProduct = (prod: GameProduct, gameId: string) => {
    if (prod.autoPricingEnabled === false || prod.useCustomPricing) {
      showToast('warning', 'منتج بتسعير يدوي', `المنتج "${prod.name}" يعمل بنظام التسعير اليدوي المستقل ومحمي من الحساب الآلي.`);
      return;
    }

    let costUSD = prod.costUSD;
    const pts = prod.pointsCostPerUnit || 0;
    const walletId = prod.primaryWalletId || prod.walletTypeId;
    if ((!costUSD || costUSD <= 0) && walletId && pts > 0) {
      const fifo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts);
      if (fifo.totalCostUSD > 0) costUSD = fifo.totalCostUSD;
    }

    const b = PricingEngine.calculateSellingPrice({
      gameId,
      productId: prod.id,
      costUSD,
      customProfitMarginPercent: prod.profitMarginPercent,
      customFixedCostEGP: prod.fixedCostPerOrder !== undefined ? prod.fixedCostPerOrder : 0,
      isCashbackEnabled: prod.isCashbackEnabled,
      isReferralEnabled: prod.isReferralEnabled
    });

    const updated: GameProduct = {
      ...prod,
      costUSD: b.costUSD,
      costPriceEGP: b.costEGP,
      calculatedPriceEGP: b.finalSellingPriceEGP,
      firstOrderCostPriceEGP: b.firstOrderCostPriceEGP,
      fixedCostPerOrder: b.fixedCostPerOrderEGP,
      lastPricingRecalculationAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isFirstShippingTab) {
      db.saveFirstShippingProduct(updated);
    } else {
      db.saveGameProduct(updated);
    }

    loadData();
    showToast('success', 'تمت إعادة احتساب السعر', `المنتج "${prod.name}": سعر البيع ${b.finalSellingPriceEGP} ج`);
  };

  // Copy to clipboard with formatted marketing messages
  const handleCopyProduct = async (prod: GameProduct, game: GameTreeItem, section?: GameSection, group?: GameGroup) => {
    const msg = generateProductMarketingMessage(prod, game, section, group);
    await copyToClipboard(msg, undefined, () => {
      showToast('success', 'تم النسخ بنجاح', '✅ تم نسخ الرسالة بنجاح.');
    });
  };

  const handleCopyGroup = async (game: GameTreeItem, section: GameSection, group: GameGroup) => {
    const msg = generateGroupMarketingMessage(game, section, group);
    await copyToClipboard(msg, undefined, () => {
      showToast('success', 'تم النسخ بنجاح', '✅ تم نسخ الرسالة بنجاح.');
    });
  };

  const handleCopySection = async (game: GameTreeItem, section: GameSection) => {
    const msg = generateSectionMarketingMessage(game, section);
    await copyToClipboard(msg, undefined, () => {
      showToast('success', 'تم النسخ بنجاح', '✅ تم نسخ الرسالة بنجاح.');
    });
  };

  const handleCopyGame = async (game: GameTreeItem) => {
    const msg = generateGameMarketingMessage(game);
    await copyToClipboard(msg, undefined, () => {
      showToast('success', 'تم النسخ بنجاح', '✅ تم نسخ الرسالة بنجاح.');
    });
  };

  // =============================================================
  // 🔀 REORDERING & MOVING HANDLERS (Games, Sections, Groups, Products)
  // =============================================================

  // 1. Move Game
  const handleMoveGame = (gameId: string, direction: 'up' | 'down') => {
    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const currentIndex = currentList.findIndex(g => g.id === gameId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const temp = currentList[currentIndex];
    currentList[currentIndex] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    currentList.forEach((g, idx) => {
      g.orderIndex = idx;
    });

    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }
    loadData();
    showToast('info', 'تمت إعادة الترتيب', 'تم حفظ ترتيب الألعاب بنجاح');
  };

  // 2. Move Section
  const handleMoveSection = (gameId: string, sectionId: string, direction: 'up' | 'down') => {
    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const g = currentList.find(item => item.id === gameId);
    if (!g || !g.sections) return;

    const currentIndex = g.sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= g.sections.length) return;

    const temp = g.sections[currentIndex];
    g.sections[currentIndex] = g.sections[targetIndex];
    g.sections[targetIndex] = temp;

    g.sections.forEach((s, idx) => {
      s.order = idx;
    });

    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }
    loadData();
    showToast('info', 'تمت إعادة الترتيب', 'تم حفظ ترتيب الأقسام بنجاح');
  };

  // 3. Move Group
  const handleMoveGroup = (gameId: string, sectionId: string, groupId: string, direction: 'up' | 'down') => {
    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const g = currentList.find(item => item.id === gameId);
    if (!g || !g.groups) return;

    const sectionGroups = g.groups.filter(grp => grp.sectionId === sectionId);
    const currentSecIdx = sectionGroups.findIndex(grp => grp.id === groupId);
    if (currentSecIdx === -1) return;
    const targetSecIdx = direction === 'up' ? currentSecIdx - 1 : currentSecIdx + 1;
    if (targetSecIdx < 0 || targetSecIdx >= sectionGroups.length) return;

    const otherGrp = sectionGroups[targetSecIdx];
    const idxA = g.groups.findIndex(grp => grp.id === groupId);
    const idxB = g.groups.findIndex(grp => grp.id === otherGrp.id);
    if (idxA === -1 || idxB === -1) return;

    const temp = g.groups[idxA];
    g.groups[idxA] = g.groups[idxB];
    g.groups[idxB] = temp;

    g.groups.forEach((grp, idx) => {
      grp.order = idx;
      grp.orderIndex = idx;
    });

    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }
    loadData();
    showToast('info', 'تمت إعادة الترتيب', 'تم حفظ ترتيب المجموعات بنجاح');
  };

  // 4. Move Product (reorder among siblings in same section & group)
  const handleMoveProduct = (gameId: string, productId: string, direction: 'up' | 'down') => {
    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const g = currentList.find(item => item.id === gameId);
    if (!g || !g.products) return;

    const targetProd = g.products.find(p => p.id === productId);
    if (!targetProd) return;

    const siblings = g.products.filter(
      p => p.sectionId === targetProd.sectionId && (p.groupId || '') === (targetProd.groupId || '')
    );
    const currentSibIdx = siblings.findIndex(p => p.id === productId);
    if (currentSibIdx === -1) return;
    const targetSibIdx = direction === 'up' ? currentSibIdx - 1 : currentSibIdx + 1;
    if (targetSibIdx < 0 || targetSibIdx >= siblings.length) return;

    const otherProd = siblings[targetSibIdx];
    const idxA = g.products.findIndex(p => p.id === productId);
    const idxB = g.products.findIndex(p => p.id === otherProd.id);
    if (idxA === -1 || idxB === -1) return;

    const temp = g.products[idxA];
    g.products[idxA] = g.products[idxB];
    g.products[idxB] = temp;

    g.products.forEach((p, idx) => {
      p.orderIndex = idx;
    });

    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }
    loadData();
    showToast('info', 'تمت إعادة الترتيب', 'تم حفظ ترتيب المنتجات بنجاح');
  };

  // =============================================================
  // 📁 FILE EXPLORER STYLE MOVE & REORGANIZATION ENGINE
  // =============================================================

  // 1. Audit Log Recorder
  const recordMoveAudit = (entry: {
    itemName: string;
    itemType: 'product' | 'group' | 'batch_products';
    count?: number;
    sourcePath: string;
    targetPath: string;
  }) => {
    const newEntry: MoveAuditEntry = {
      id: 'm_log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      itemName: entry.itemName,
      itemType: entry.itemType,
      count: entry.count,
      sourcePath: entry.sourcePath,
      targetPath: entry.targetPath,
      performedBy: user?.fullName || user?.username || 'المدير',
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...moveAuditLogs].slice(0, 200);
    setMoveAuditLogs(updated);
    try {
      localStorage.setItem('sys_catalog_move_audit_logs', JSON.stringify(updated));
    } catch { }

    // Register in central system audit logs
    db.addAuditLog(
      user,
      'edit',
      'catalog_item',
      newEntry.id,
      `نقل ${entry.itemType === 'group' ? 'مجموعة' : entry.itemType === 'batch_products' ? 'منتجات جماعية' : 'منتج'}: "${entry.itemName}" من [${entry.sourcePath}] إلى [${entry.targetPath}]`
    );
  };

  // 2. Core Move Product Implementation
  const executeMoveProduct = (
    prod: GameProduct,
    targetGId: string,
    targetSId: string,
    targetGrId?: string,
    showCustomToast: boolean = true
  ): boolean => {
    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const srcGame = currentList.find(g => g.id === prod.gameId);
    const targetGame = currentList.find(g => g.id === targetGId);

    if (!srcGame || !targetGame) {
      showToast('error', 'خطأ في النقل', 'لم يتم العثور على اللعبة المستهدفة');
      return false;
    }

    const targetSection = targetGame.sections.find(s => s.id === targetSId);
    if (!targetSection) {
      showToast('error', 'خطأ في النقل', 'القسم المستهدف غير موجود');
      return false;
    }

    const targetGroup = targetGrId ? targetGame.groups?.find(gr => gr.id === targetGrId) : undefined;

    // Check if location is already identical
    if (prod.gameId === targetGId && prod.sectionId === targetSId && (prod.groupId || '') === (targetGrId || '')) {
      showToast('info', 'تنبيه', 'المنتج موجود بالفعل في هذا الموقع المحدد');
      return false;
    }

    // Save undo snapshot
    const undoAction: MoveUndoAction = {
      description: `نقل "${prod.name}"`,
      type: 'product',
      items: [{
        id: prod.id,
        name: prod.name,
        sourceGameId: prod.gameId,
        sourceSectionId: prod.sectionId,
        sourceGroupId: prod.groupId
      }],
      timestamp: Date.now()
    };

    // Remove from source game
    srcGame.products = (srcGame.products || []).filter(p => p.id !== prod.id);

    // Build paths for audit log
    const sourcePath = `${prod.gameName || srcGame.name} > ${prod.sectionName || 'عام'} ${prod.groupName ? '> ' + prod.groupName : ''}`;
    const targetPath = `${targetGame.name} > ${targetSection.name} ${targetGroup ? '> ' + targetGroup.name : ''}`;

    // Update product pointer fields while keeping 100% of all data untouched
    const updatedProd: GameProduct = {
      ...prod,
      gameId: targetGame.id,
      gameName: targetGame.name,
      sectionId: targetSection.id,
      sectionName: targetSection.name,
      sectionPath: targetSection.parentId
        ? `${targetGame.sections.find(s => s.id === targetSection.parentId)?.name || ''} > ${targetSection.name}`
        : targetSection.name,
      groupId: targetGrId || undefined,
      groupName: targetGroup?.name || undefined,
      updatedAt: new Date().toISOString()
    };

    if (!targetGame.products) targetGame.products = [];
    targetGame.products.push(updatedProd);

    // Persist to database
    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }

    setLastUndoAction(undoAction);
    setUndoBanner({
      message: `تم نقل "${prod.name}" إلى [${targetPath}] بنجاح`,
      timestamp: Date.now()
    });

    recordMoveAudit({
      itemName: prod.name,
      itemType: 'product',
      sourcePath,
      targetPath
    });

    loadData();
    if (showCustomToast) {
      showToast('success', 'تم نقل المنتج بنجاح', `تم نقل "${prod.name}" إلى [${targetPath}]`);
    }
    return true;
  };

  // 3. Quick Move Product (via Modal)
  const handleOpenQuickMoveProduct = (prod: GameProduct) => {
    setQuickMoveProduct(prod);
    setTargetMoveGameId(prod.gameId);
    setTargetMoveSectionId(prod.sectionId);
    setTargetMoveGroupId(prod.groupId || '');
  };

  const handleSaveQuickMoveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMoveProduct) return;
    const success = executeMoveProduct(
      quickMoveProduct,
      targetMoveGameId,
      targetMoveSectionId,
      targetMoveGroupId
    );
    if (success) {
      setQuickMoveProduct(null);
    }
  };

  // 4. Core Move Group Implementation (Moves group + ALL its products atomically)
  const executeMoveGroup = (
    srcGameId: string,
    srcSectionId: string,
    group: GameGroup,
    targetGId: string,
    targetSId: string
  ): boolean => {
    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const srcGame = currentList.find(g => g.id === srcGameId);
    const targetGame = currentList.find(g => g.id === targetGId);

    if (!srcGame || !targetGame) {
      showToast('error', 'خطأ في النقل', 'لم يتم العثور على اللعبة المستهدفة');
      return false;
    }

    const targetSection = targetGame.sections.find(s => s.id === targetSId);
    if (!targetSection) {
      showToast('error', 'خطأ في النقل', 'القسم المستهدف غير موجود');
      return false;
    }

    if (srcGameId === targetGId && srcSectionId === targetSId) {
      showToast('info', 'تنبيه', 'المجموعة موجودة بالفعل في هذا القسم المحدد');
      return false;
    }

    // Find all products currently inside this group
    const groupProducts = (srcGame.products || []).filter(p => p.groupId === group.id);

    // Save undo snapshot
    const undoAction: MoveUndoAction = {
      description: `نقل المجموعة "${group.name}" مع ${groupProducts.length} منتج`,
      type: 'group',
      items: groupProducts.map(p => ({
        id: p.id,
        name: p.name,
        sourceGameId: srcGameId,
        sourceSectionId: srcSectionId,
        sourceGroupId: group.id
      })),
      groupData: {
        groupId: group.id,
        groupName: group.name,
        sourceGameId: srcGameId,
        sourceSectionId: srcSectionId
      },
      timestamp: Date.now()
    };

    // 1. Move group object
    srcGame.groups = (srcGame.groups || []).filter(gr => gr.id !== group.id);
    if (!targetGame.groups) targetGame.groups = [];

    const updatedGroup: GameGroup = {
      ...group,
      sectionId: targetSection.id,
      order: targetGame.groups.filter(gr => gr.sectionId === targetSection.id).length
    };
    targetGame.groups.push(updatedGroup);

    // 2. Move ALL products belonging to this group atomically
    srcGame.products = (srcGame.products || []).filter(p => p.groupId !== group.id);
    if (!targetGame.products) targetGame.products = [];

    const updatedProducts: GameProduct[] = groupProducts.map(p => ({
      ...p,
      gameId: targetGame.id,
      gameName: targetGame.name,
      sectionId: targetSection.id,
      sectionName: targetSection.name,
      sectionPath: targetSection.parentId
        ? `${targetGame.sections.find(s => s.id === targetSection.parentId)?.name || ''} > ${targetSection.name}`
        : targetSection.name,
      groupId: group.id,
      groupName: group.name,
      updatedAt: new Date().toISOString()
    }));

    targetGame.products.push(...updatedProducts);

    // Persist
    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }

    const srcSectionName = srcGame.sections.find(s => s.id === srcSectionId)?.name || 'عام';
    const sourcePath = `${srcGame.name} > ${srcSectionName} > ${group.name}`;
    const targetPath = `${targetGame.name} > ${targetSection.name} > ${group.name}`;

    setLastUndoAction(undoAction);
    setUndoBanner({
      message: `تم نقل المجموعة "${group.name}" مع (${groupProducts.length}) منتجات بنجاح`,
      timestamp: Date.now()
    });

    recordMoveAudit({
      itemName: group.name,
      itemType: 'group',
      count: groupProducts.length,
      sourcePath,
      targetPath
    });

    loadData();
    showToast('success', 'تم نقل المجموعة بكل محتوياتها', `تم نقل "${group.name}" وجميع منتجاتها (${groupProducts.length} منتج) إلى [${targetPath}]`);
    return true;
  };

  const handleOpenQuickMoveGroup = (gameId: string, sectionId: string, group: GameGroup) => {
    setQuickMoveGroup({ gameId, sectionId, group });
    setTargetMoveGroupGameId(gameId);
    const g = games.find(item => item.id === gameId);
    const otherSec = (g?.sections || []).find(s => s.id !== sectionId) || g?.sections[0];
    setTargetMoveGroupSectionId(otherSec?.id || '');
  };

  const handleSaveQuickMoveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMoveGroup) return;
    const success = executeMoveGroup(
      quickMoveGroup.gameId,
      quickMoveGroup.sectionId,
      quickMoveGroup.group,
      targetMoveGroupGameId,
      targetMoveGroupSectionId
    );
    if (success) {
      setQuickMoveGroup(null);
    }
  };

  // 5. Core Batch Move Implementation
  const executeBatchMove = (
    productIds: string[],
    targetGId: string,
    targetSId: string,
    targetGrId?: string
  ): boolean => {
    if (productIds.length === 0) return false;

    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];
    const targetGame = currentList.find(g => g.id === targetGId);
    if (!targetGame) {
      showToast('error', 'خطأ في النقل', 'لم يتم العثور على اللعبة المستهدفة');
      return false;
    }

    const targetSection = targetGame.sections.find(s => s.id === targetSId);
    if (!targetSection) {
      showToast('error', 'خطأ في النقل', 'القسم المستهدف غير موجود');
      return false;
    }

    const targetGroup = targetGrId ? targetGame.groups?.find(gr => gr.id === targetGrId) : undefined;
    const targetPath = `${targetGame.name} > ${targetSection.name} ${targetGroup ? '> ' + targetGroup.name : ''}`;

    const undoItems: MoveUndoAction['items'] = [];
    const movedProducts: GameProduct[] = [];

    productIds.forEach(pId => {
      for (const g of currentList) {
        const found = (g.products || []).find(p => p.id === pId);
        if (found) {
          undoItems.push({
            id: found.id,
            name: found.name,
            sourceGameId: found.gameId,
            sourceSectionId: found.sectionId,
            sourceGroupId: found.groupId
          });

          g.products = (g.products || []).filter(p => p.id !== pId);

          const updated: GameProduct = {
            ...found,
            gameId: targetGame.id,
            gameName: targetGame.name,
            sectionId: targetSection.id,
            sectionName: targetSection.name,
            sectionPath: targetSection.parentId
              ? `${targetGame.sections.find(s => s.id === targetSection.parentId)?.name || ''} > ${targetSection.name}`
              : targetSection.name,
            groupId: targetGrId || undefined,
            groupName: targetGroup?.name || undefined,
            updatedAt: new Date().toISOString()
          };
          movedProducts.push(updated);
          break;
        }
      }
    });

    if (movedProducts.length === 0) {
      showToast('error', 'خطأ', 'لم يتم العثور على المنتجات المحددة');
      return false;
    }

    if (!targetGame.products) targetGame.products = [];
    targetGame.products.push(...movedProducts);

    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }

    const undoAction: MoveUndoAction = {
      description: `نقل جماعي لـ ${movedProducts.length} منتج`,
      type: 'batch_products',
      items: undoItems,
      timestamp: Date.now()
    };

    setLastUndoAction(undoAction);
    setUndoBanner({
      message: `تم نقل (${movedProducts.length}) منتجات إلى [${targetPath}] بنجاح`,
      timestamp: Date.now()
    });

    recordMoveAudit({
      itemName: `${movedProducts.length} منتجات مختارة`,
      itemType: 'batch_products',
      count: movedProducts.length,
      sourcePath: 'مواقع متعددة',
      targetPath
    });

    setSelectedProductIds(new Set());
    loadData();
    showToast('success', 'تم النقل الجماعي بنجاح', `تم نقل ${movedProducts.length} منتجات دفعة واحدة إلى [${targetPath}]`);
    return true;
  };

  const handleOpenBatchMove = () => {
    if (selectedProductIds.size === 0) return;
    const firstGame = games[0];
    setBatchTargetGameId(firstGame?.id || '');
    setBatchTargetSectionId(firstGame?.sections[0]?.id || '');
    setBatchTargetGroupId('');
    setIsBatchMoveOpen(true);
  };

  const handleSaveBatchMove = (e: React.FormEvent) => {
    e.preventDefault();
    const success = executeBatchMove(
      Array.from(selectedProductIds),
      batchTargetGameId,
      batchTargetSectionId,
      batchTargetGroupId
    );
    if (success) {
      setIsBatchMoveOpen(false);
    }
  };

  // 6. Undo Mechanism
  const handleUndoLastMove = () => {
    if (!lastUndoAction) return;

    const currentList = isFirstShippingTab ? [...firstShippingGames] : [...regularGames];

    if (lastUndoAction.type === 'group' && lastUndoAction.groupData) {
      const { groupId, sourceGameId, sourceSectionId } = lastUndoAction.groupData;
      const currGame = currentList.find(g => (g.groups || []).some(gr => gr.id === groupId));
      const origGame = currentList.find(g => g.id === sourceGameId);

      if (currGame && origGame) {
        const theGroup = (currGame.groups || []).find(gr => gr.id === groupId);
        if (theGroup) {
          currGame.groups = (currGame.groups || []).filter(gr => gr.id !== groupId);
          theGroup.sectionId = sourceSectionId;
          if (!origGame.groups) origGame.groups = [];
          origGame.groups.push(theGroup);

          const origSection = origGame.sections.find(s => s.id === sourceSectionId);
          lastUndoAction.items.forEach(item => {
            for (const g of currentList) {
              const p = (g.products || []).find(x => x.id === item.id);
              if (p) {
                g.products = (g.products || []).filter(x => x.id !== item.id);
                const restoredProd: GameProduct = {
                  ...p,
                  gameId: origGame.id,
                  gameName: origGame.name,
                  sectionId: sourceSectionId,
                  sectionName: origSection?.name || 'عام',
                  groupId: theGroup.id,
                  groupName: theGroup.name,
                  updatedAt: new Date().toISOString()
                };
                if (!origGame.products) origGame.products = [];
                origGame.products.push(restoredProd);
                break;
              }
            }
          });
        }
      }
    } else {
      lastUndoAction.items.forEach(item => {
        const origGame = currentList.find(g => g.id === item.sourceGameId);
        if (!origGame) return;
        const origSection = origGame.sections.find(s => s.id === item.sourceSectionId);
        const origGroup = item.sourceGroupId ? origGame.groups?.find(gr => gr.id === item.sourceGroupId) : undefined;

        for (const g of currentList) {
          const p = (g.products || []).find(x => x.id === item.id);
          if (p) {
            g.products = (g.products || []).filter(x => x.id !== item.id);
            const restoredProd: GameProduct = {
              ...p,
              gameId: origGame.id,
              gameName: origGame.name,
              sectionId: item.sourceSectionId,
              sectionName: origSection?.name || 'عام',
              groupId: item.sourceGroupId,
              groupName: origGroup?.name,
              updatedAt: new Date().toISOString()
            };
            if (!origGame.products) origGame.products = [];
            origGame.products.push(restoredProd);
            break;
          }
        }
      });
    }

    if (isFirstShippingTab) {
      db.setFirstShippingGamesTree(currentList);
    } else {
      db.setGamesTree(currentList);
    }

    showToast('info', 'تم التراجع عن النقل ↩', `تمت استعادة العناصر إلى مواقعها السابقة بنجاح`);
    setLastUndoAction(null);
    setUndoBanner(null);
    loadData();
  };

  // 7. Drag & Drop Handlers
  const handleDragStartProduct = (e: React.DragEvent, prod: GameProduct) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'product', productId: prod.id, gameId: prod.gameId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartGroup = (e: React.DragEvent, gameId: string, sectionId: string, group: GameGroup) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'group', groupId: group.id, sectionId, gameId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverTarget = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId);
    }
  };

  const handleDragLeaveTarget = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDropOnSection = (e: React.DragEvent, targetGameId: string, targetSectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      const targetGame = games.find(g => g.id === targetGameId);
      const targetSec = targetGame?.sections.find(s => s.id === targetSectionId);
      if (!targetGame || !targetSec) return;

      if (data.type === 'group') {
        const srcGame = games.find(g => g.id === data.gameId);
        const group = srcGame?.groups?.find(gr => gr.id === data.groupId);
        if (!group) return;

        if (data.gameId === targetGameId && data.sectionId === targetSectionId) {
          showToast('info', 'تنبيه', 'المجموعة موجودة بالفعل في هذا القسم');
          return;
        }

        const srcSec = srcGame?.sections.find(s => s.id === data.sectionId);
        const fromPath = `${srcGame?.name} > ${srcSec?.name || 'عام'} > ${group.name}`;
        const toPath = `${targetGame.name} > ${targetSec.name} > ${group.name}`;

        setDropConfirm({
          title: 'تأكيد نقل المجموعة بكل محتوياتها 📁',
          itemName: `المجموعة: "${group.name}"`,
          fromPath,
          toPath,
          onConfirm: () => {
            executeMoveGroup(data.gameId, data.sectionId, group, targetGameId, targetSectionId);
            setDropConfirm(null);
          }
        });
      } else if (data.type === 'product') {
        const srcGame = games.find(g => g.id === data.gameId);
        const prod = srcGame?.products?.find(p => p.id === data.productId);
        if (!prod) return;

        if (prod.gameId === targetGameId && prod.sectionId === targetSectionId && !prod.groupId) {
          showToast('info', 'تنبيه', 'المنتج موجود بالفعل مباشرة في هذا القسم');
          return;
        }

        const fromPath = `${prod.gameName} > ${prod.sectionName} ${prod.groupName ? '> ' + prod.groupName : ''}`;
        const toPath = `${targetGame.name} > ${targetSec.name} (مباشر في القسم)`;

        setDropConfirm({
          title: 'تأكيد نقل المنتج إلى القسم 📄',
          itemName: `المنتج: "${prod.name}"`,
          fromPath,
          toPath,
          onConfirm: () => {
            executeMoveProduct(prod, targetGameId, targetSectionId, undefined);
            setDropConfirm(null);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGameId: string, targetSectionId: string, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'group') {
        showToast('error', 'عملية غير صالحة ⛔', 'لا يمكن وضع مجموعة داخل مجموعة أخرى في التسلسل الهرمي!');
        return;
      }

      if (data.type === 'product') {
        const targetGame = games.find(g => g.id === targetGameId);
        const targetSec = targetGame?.sections.find(s => s.id === targetSectionId);
        const targetGrp = targetGame?.groups?.find(gr => gr.id === targetGroupId);
        if (!targetGame || !targetSec || !targetGrp) return;

        const srcGame = games.find(g => g.id === data.gameId);
        const prod = srcGame?.products?.find(p => p.id === data.productId);
        if (!prod) return;

        if (prod.gameId === targetGameId && prod.sectionId === targetSectionId && prod.groupId === targetGroupId) {
          showToast('info', 'تنبيه', 'المنتج موجود بالفعل في هذه المجموعة');
          return;
        }

        const fromPath = `${prod.gameName} > ${prod.sectionName} ${prod.groupName ? '> ' + prod.groupName : ''}`;
        const toPath = `${targetGame.name} > ${targetSec.name} > ${targetGrp.name}`;

        setDropConfirm({
          title: 'تأكيد نقل المنتج إلى المجموعة 📄',
          itemName: `المنتج: "${prod.name}"`,
          fromPath,
          toPath,
          onConfirm: () => {
            executeMoveProduct(prod, targetGameId, targetSectionId, targetGroupId);
            setDropConfirm(null);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Multi-Select Handlers
  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSelectAllProductsInView = () => {
    const allIds = new Set<string>();
    displayedGames.forEach(g => {
      (g.products || []).forEach(p => allIds.add(p.id));
    });
    setSelectedProductIds(allIds);
  };

  const handleClearProductSelection = () => {
    setSelectedProductIds(new Set());
  };

  // USD Rate Update
  const handleSaveExchangeRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRateValue <= 0) {
      showToast('error', 'السعر غير صحيح', 'يرجى إدخال سعر صرف أكبر من 0');
      return;
    }

    // 1. Update Central Pricing Config in PricingEngine (recalculates all automatic products strictly ONCE)
    PricingEngine.updatePricingConfig(
      {
        rateUSD_EGP: newRateValue
      },
      user || undefined,
      'تعديل سعر صرف USDT المركزي'
    );

    // 2. Update DB exchange rate for consistency (preserving current fixed cost)
    db.updateExchangeRate(newRateValue, exchangeRate.fixedCostPerOrderEGP, undefined, user?.fullName, 'تعديل سعر صرف USDT المركزي');

    showToast(
      'success',
      'تم تحديث سعر USDT المركزي',
      `تم اعتماد سعر USDT = ${newRateValue} ج وإعادة حساب أسعار كافة المنتجات التي تعمل بالتسعير الآلي فوراً مع الحفاظ على مصروفات وهوامش كل باقة.`
    );

    setIsRateModalOpen(false);
    loadData();
  };

  // One-Click Toggles for Game Card
  const handleToggleGameActive = (game: GameTreeItem) => {
    const updated: GameTreeItem = {
      ...game,
      isActive: game.isActive === false ? true : false,
      disabledReason: game.isActive !== false ? 'معطل مؤقتاً' : undefined
    };
    if (isFirstShippingTab) {
      db.saveFirstShippingGameTreeItem(updated);
    } else {
      db.saveGameTreeItem(updated);
    }
    loadData();
    showToast('info', updated.isActive ? 'تم تفعيل اللعبة' : 'تم تعطيل اللعبة', `حالة لعبة "${game.name}": ${updated.isActive ? 'متاحة للبيع والتذاكر' : 'معطلة ومحجوبة عن التذاكر'}`);
  };

  const handleToggleGameCashback = (game: GameTreeItem) => {
    const nextState = game.cashbackEnabled === false ? true : false;
    const updated: GameTreeItem = {
      ...game,
      cashbackEnabled: nextState
    };
    if (isFirstShippingTab) {
      db.saveFirstShippingGameTreeItem(updated);
    } else {
      db.saveGameTreeItem(updated);
    }
    loadData();
    showToast('info', 'تحديث إعدادات اللعبة', `الكاش باك للعبة "${game.name}": ${nextState ? 'مفعل وممنوح للعملاء' : 'معطل (0 كاش باك)'}`);
  };

  const handleToggleGameReferral = (game: GameTreeItem) => {
    const nextState = game.referralEnabled === false ? true : false;
    const updated: GameTreeItem = {
      ...game,
      referralEnabled: nextState
    };
    if (isFirstShippingTab) {
      db.saveFirstShippingGameTreeItem(updated);
    } else {
      db.saveGameTreeItem(updated);
    }
    loadData();
    showToast('info', 'تحديث إعدادات اللعبة', `عمولات الإحالة للعبة "${game.name}": ${nextState ? 'مفعلة وتمنح للشركاء' : 'معطلة (0 عمولة)'}`);
  };

  // Game CRUD Handlers
  const handleOpenAddGame = () => {
    setEditingGameId(null);
    setNewGameName('');
    setNewGameCode('');
    setNewGamePublisher('');
    setNewGameIcon('🎮');
    setNewGameImage('');
    setNewGameDescription('');
    setNewGameCashback(!isFirstShippingTab);
    setNewGameReferral(!isFirstShippingTab);
    setNewGameIsActive(true);
    setNewGameDisabledReason('');
    setIsAddGameModalOpen(true);
  };

  const handleOpenEditGame = (game: GameTreeItem) => {
    setEditingGameId(game.id);
    setNewGameName(game.name);
    setNewGameCode(game.code);
    setNewGamePublisher(game.publisher);
    setNewGameIcon(game.icon || '🎮');
    setNewGameImage(game.image || '');
    setNewGameDescription(game.description || '');
    setNewGameCashback(game.cashbackEnabled !== false);
    setNewGameReferral(game.referralEnabled !== false);
    setNewGameIsActive(game.isActive !== false);
    setNewGameDisabledReason(game.disabledReason || '');
    setIsAddGameModalOpen(true);
  };

  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) {
      showToast('error', 'الاسم مطلوب', 'يرجى إدخال اسم اللعبة');
      return;
    }

    const existingGame = editingGameId ? games.find(g => g.id === editingGameId) : null;
    const gameItem: GameTreeItem = {
      id: editingGameId || (isFirstShippingTab ? 'f_game_' : 'game_') + Date.now(),
      name: newGameName.trim(),
      code: newGameCode.trim().toUpperCase() || newGameName.slice(0, 3).toUpperCase(),
      publisher: newGamePublisher.trim() || 'Global',
      icon: newGameIcon || '🎮',
      image: newGameImage.trim() || undefined,
      description: newGameDescription.trim() || undefined,
      isActive: newGameIsActive,
      disabledReason: !newGameIsActive ? (newGameDisabledReason.trim() || 'غير متاح الآن') : undefined,
      cashbackEnabled: newGameCashback,
      referralEnabled: newGameReferral,
      sections: existingGame?.sections || [
        { id: `sec_${Date.now()}_root`, gameId: editingGameId || 'game_' + Date.now(), name: 'باقات الشحن المباشر', level: 0, order: 1, productsCount: 0 }
      ],
      groups: existingGame?.groups || [],
      products: existingGame?.products || []
    };

    if (isFirstShippingTab) {
      db.saveFirstShippingGameTreeItem(gameItem);
    } else {
      db.saveGameTreeItem(gameItem);
    }
    showToast('success', editingGameId ? 'تم تعديل اللعبة' : 'تمت إضافة اللعبة', `تم حفظ لعبة "${gameItem.name}" بنجاح`);
    setIsAddGameModalOpen(false);
    loadData();
  };

  const handleDeleteGame = (gameId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه اللعبة وكافة تصنيفاتها ومنتجاتها؟')) {
      if (isFirstShippingTab) {
        db.deleteFirstShippingGameTreeItem(gameId);
      } else {
        db.deleteGameTreeItem(gameId);
      }
      showToast('info', 'تم الحذف', 'تم حذف اللعبة بنجاح');
      loadData();
    }
  };

  // Section CRUD Handlers
  const handleOpenAddSection = (gameId: string, parentId?: string) => {
    setEditingSectionId(null);
    setSectionGameId(gameId);
    setSectionParentId(parentId);
    setSectionNameInput('');
    setSectionImageInput('');
    setSectionDescriptionInput('');
    setSectionIsActive(true);
    setSectionDisabledReason('');
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (gameId: string, sec: GameSection) => {
    setEditingSectionId(sec.id);
    setSectionGameId(gameId);
    setSectionParentId(sec.parentId);
    setSectionNameInput(sec.name);
    setSectionImageInput(sec.image || '');
    setSectionDescriptionInput(sec.description || '');
    setSectionIsActive(sec.isActive !== false);
    setSectionDisabledReason(sec.disabledReason || '');
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionNameInput.trim()) {
      showToast('error', 'الاسم مطلوب', 'يرجى إدخال اسم القسم');
      return;
    }

    const sec: GameSection = {
      id: editingSectionId || `sec_${Date.now()}`,
      gameId: sectionGameId,
      parentId: sectionParentId,
      name: sectionNameInput.trim(),
      image: sectionImageInput.trim() || undefined,
      description: sectionDescriptionInput.trim() || undefined,
      level: sectionParentId ? 1 : 0,
      order: 1,
      productsCount: 0,
      isActive: sectionIsActive,
      disabledReason: !sectionIsActive ? (sectionDisabledReason.trim() || 'غير متاح الآن') : undefined
    };

    if (isFirstShippingTab) {
      db.saveFirstShippingSection(sectionGameId, sec);
    } else {
      db.saveGameSection(sectionGameId, sec);
    }
    showToast('success', editingSectionId ? 'تم تعديل القسم' : 'تمت إضافة القسم', `تم حفظ قسم "${sec.name}" بنجاح`);
    setIsSectionModalOpen(false);
    loadData();
  };

  const handleDeleteSection = (gameId: string, secId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القسم وكافة مجموعاته ومنتجاته؟')) {
      if (isFirstShippingTab) {
        db.deleteFirstShippingSection(gameId, secId);
      } else {
        db.deleteGameSection(gameId, secId);
      }
      showToast('info', 'تم الحذف', 'تم حذف القسم بنجاح');
      loadData();
    }
  };

  // Group CRUD Handlers
  const handleOpenAddGroup = (gameId: string, sectionId: string) => {
    setEditingGroupId(null);
    setGroupGameId(gameId);
    setGroupSectionId(sectionId);
    setGroupNameInput('');
    setGroupImageInput('');
    setGroupDescriptionInput('');
    setGroupIsActive(true);
    setGroupDisabledReason('');
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (gameId: string, grp: GameGroup) => {
    setEditingGroupId(grp.id);
    setGroupGameId(gameId);
    setGroupSectionId(grp.sectionId);
    setGroupNameInput(grp.name);
    setGroupImageInput(grp.image || '');
    setGroupDescriptionInput(grp.description || '');
    setGroupIsActive(grp.isActive !== false);
    setGroupDisabledReason(grp.disabledReason || '');
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) {
      showToast('error', 'الاسم مطلوب', 'يرجى إدخال اسم المجموعة');
      return;
    }

    const grp: GameGroup = {
      id: editingGroupId || `grp_${Date.now()}`,
      sectionId: groupSectionId,
      gameId: groupGameId,
      name: groupNameInput.trim(),
      image: groupImageInput.trim() || undefined,
      description: groupDescriptionInput.trim() || undefined,
      order: 1,
      isActive: groupIsActive,
      disabledReason: !groupIsActive ? (groupDisabledReason.trim() || 'غير متاح الآن') : undefined
    };

    if (isFirstShippingTab) {
      db.saveFirstShippingGroup(groupGameId, grp);
    } else {
      db.saveGameGroup(groupGameId, grp);
    }
    showToast('success', editingGroupId ? 'تم تعديل المجموعة' : 'تمت إضافة المجموعة', `تم حفظ مجموعة "${grp.name}" بنجاح`);
    setIsGroupModalOpen(false);
    loadData();
  };

  const handleDeleteGroup = (gameId: string, grpId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
      if (isFirstShippingTab) {
        db.deleteFirstShippingGroup(gameId, grpId);
      } else {
        db.deleteGameGroup(gameId, grpId);
      }
      showToast('info', 'تم الحذف', 'تم حذف المجموعة بنجاح');
      loadData();
    }
  };

  // Product CRUD Handlers
  const handleOpenAddProduct = (gameId?: string, sectionId?: string, groupId?: string) => {
    const cfg = PricingEngine.getConfig();
    setEditingProductId(null);
    const targetGame = gameId ? games.find(g => g.id === gameId) : games[0];
    const targetGameId = targetGame?.id || '';
    setProdGameId(targetGameId);
    setProdSectionId(sectionId || targetGame?.sections[0]?.id || '');
    setProdGroupId(groupId || '');
    setProdName('');
    setProdSku(`SKU-${Date.now().toString().slice(-4)}`);
    setProdDescription('');
    setProdImage('');
    setProdCostUSD('');
    setProdProfitMarginPercent(isFirstShippingTab ? 0 : (cfg.defaultProfitMarginPercent ?? 7));
    setProdCashbackPercent(isFirstShippingTab ? 0 : (cfg.cashbackPercent ?? 1));
    setProdReferralPercent(isFirstShippingTab ? 0 : (cfg.referralPercent ?? 3));
    setProdReservePercent(cfg.reservePercent ?? 0);
    setProdDevelopmentPercent(cfg.developmentPercent ?? 0);
    setProdMinProfitEGP(0);
    setProdFixedCost(cfg.manualFixedCostEGP ?? 0);
    setProdAvailableQuantity('');
    setProdAutoPricing(!isFirstShippingTab);
    setProdCustomSellingPrice('');
    setProdDealerCustomPrice('');
    setProdManualCostEGP('');
    setProdFirstOrderCostPrice('');
    setProdPrimaryWalletId(jkrWallets.find(w => w.type === 'SUB')?.id || '');
    setProdAlternativeWalletIds([]);
    setProdPointsCost('');
    setProdIsCashbackEnabled(true);
    setProdIsReferralEnabled(true);
    setProdCostEGP(0);
    setProdIsActive(true);
    setProdDisabledReason('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: GameProduct) => {
    const cfg = PricingEngine.getConfig();
    setEditingProductId(prod.id);
    setProdGameId(prod.gameId);
    setProdSectionId(prod.sectionId);
    setProdGroupId(prod.groupId || '');
    setProdName(prod.name);
    setProdSku(prod.sku);
    setProdDescription(prod.description || '');
    setProdImage(prod.image || '');
    const primaryWId = prod.primaryWalletId || (Array.isArray(prod.walletSources) ? prod.walletSources.find(s => s.priority === 1)?.walletId : undefined) || (prod.walletTypeId !== 'default' ? prod.walletTypeId : '');
    setProdPrimaryWalletId(primaryWId || '');

    const altWIds = Array.isArray(prod.alternativeWalletIds) && prod.alternativeWalletIds.length > 0
      ? prod.alternativeWalletIds
      : (Array.isArray(prod.walletSources) && prod.walletSources.length > 0
          ? prod.walletSources.filter(s => s.priority > 1).sort((a, b) => a.priority - b.priority).map(s => s.walletId)
          : (Array.isArray(prod.alternativeWallets) ? prod.alternativeWallets.map(a => a.walletId) : []));
    setProdAlternativeWalletIds(altWIds || []);
    setProdPointsCost(prod.pointsCostPerUnit !== undefined && prod.pointsCostPerUnit !== null ? prod.pointsCostPerUnit : '');
    setProdIsCashbackEnabled(prod.isCashbackEnabled !== false);
    setProdIsReferralEnabled(prod.isReferralEnabled !== false);
    setProdCostEGP(prod.costPriceEGP || 0);

    // Cost in USD is 100% manual and preserved exactly as entered by manager
    setProdCostUSD(prod.costUSD !== undefined && prod.costUSD !== null ? prod.costUSD : '');
    setProdProfitMarginPercent(prod.profitMarginPercent ?? (isFirstShippingTab ? 0 : (cfg.defaultProfitMarginPercent ?? 7)));
    setProdCashbackPercent(prod.cashbackPercent ?? (isFirstShippingTab ? 0 : (cfg.cashbackPercent ?? 1)));
    setProdReferralPercent(prod.partnerCommissionPercent ?? (isFirstShippingTab ? 0 : (cfg.referralPercent ?? 3)));
    setProdReservePercent(prod.reservePercent !== undefined ? prod.reservePercent : (cfg.reservePercent ?? 0));
    setProdDevelopmentPercent(prod.developmentPercent !== undefined ? prod.developmentPercent : (cfg.developmentPercent ?? 0));
    setProdFixedCost(prod.fixedCostPerOrder !== undefined ? prod.fixedCostPerOrder : (cfg.manualFixedCostEGP ?? 0));
    setProdMinProfitEGP(prod.minProfitMarginEGP || 0);
    setProdAvailableQuantity(prod.availableQuantity !== undefined && prod.availableQuantity !== null ? prod.availableQuantity.toString() : '');
    
    // Explicit manual check: if autoPricingEnabled === false or useCustomPricing === true
    const isManualPricing = prod.autoPricingEnabled === false || Boolean(prod.useCustomPricing);
    setProdAutoPricing(!isManualPricing);
    setProdCustomSellingPrice(
      prod.customSellingPriceEGP !== undefined && prod.customSellingPriceEGP !== null
        ? prod.customSellingPriceEGP
        : (prod.calculatedPriceEGP || '')
    );
    setProdDealerCustomPrice(
      prod.dealerCustomSellingPriceEGP !== undefined && prod.dealerCustomSellingPriceEGP !== null
        ? prod.dealerCustomSellingPriceEGP
        : (prod.dealerPriceEGP || '')
    );
    setProdManualCostEGP(
      prod.costPriceEGP !== undefined && prod.costPriceEGP !== null ? prod.costPriceEGP : ''
    );
    setProdFirstOrderCostPrice(prod.firstOrderCostPriceEGP || '');
    setProdIsActive(prod.isActive !== false);
    setProdDisabledReason(prod.disabledReason || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('error', 'الاسم مطلوب', 'يرجى إدخال اسم المنتج');
      return;
    }

    const g = games.find(game => game.id === prodGameId);
    const sec = g?.sections.find(s => s.id === prodSectionId);
    const grp = g?.groups?.find(gr => gr.id === prodGroupId);

    let calculatedSellingPrice = typeof prodCustomSellingPrice === 'number' ? prodCustomSellingPrice : (parseFloat(String(prodCustomSellingPrice)) || 0);
    const manualDealerPrice = prodDealerCustomPrice !== '' ? (parseFloat(String(prodDealerCustomPrice)) || calculatedSellingPrice) : calculatedSellingPrice;
    let manualCost = prodManualCostEGP !== '' ? (parseFloat(String(prodManualCostEGP)) || 0) : undefined;
    let firstOrderCost = typeof prodFirstOrderCostPrice === 'number' ? prodFirstOrderCostPrice : (parseFloat(String(prodFirstOrderCostPrice)) || calculatedSellingPrice);
    const numCostUSD = typeof prodCostUSD === 'number' ? prodCostUSD : (parseFloat(String(prodCostUSD)) || 0);
    const ptsCost = typeof prodPointsCost === 'number' ? prodPointsCost : (parseFloat(String(prodPointsCost)) || 0);
    let resolvedCostUSD = numCostUSD;
    let calculatedCostEGP: number | undefined = prodCostEGP > 0 ? prodCostEGP : undefined;
    let dealerSellingPrice: number | undefined = manualDealerPrice;

    if (resolvedCostUSD <= 0 && prodPrimaryWalletId && ptsCost > 0) {
      const fifoInfo = JKRWalletEngine.getWalletEffectivePointCost(prodPrimaryWalletId, ptsCost);
      if (fifoInfo.totalCostUSD > 0) {
        resolvedCostUSD = fifoInfo.totalCostUSD;
      }
      if (!calculatedCostEGP && fifoInfo.totalCostEGP > 0) {
        calculatedCostEGP = fifoInfo.totalCostEGP;
      }
    }

    if (prodAutoPricing) {
      const b = PricingEngine.calculateSellingPrice({
        costUSD: resolvedCostUSD > 0 ? resolvedCostUSD : undefined,
        costEGP: resolvedCostUSD > 0 ? undefined : (calculatedCostEGP && calculatedCostEGP > 0 ? calculatedCostEGP : undefined),
        customProfitMarginPercent: typeof prodProfitMarginPercent === 'number' ? prodProfitMarginPercent : (parseFloat(String(prodProfitMarginPercent)) || 0),
        customCashbackPercent: typeof prodCashbackPercent === 'number' ? prodCashbackPercent : (parseFloat(String(prodCashbackPercent)) || 0),
        customReferralPercent: typeof prodReferralPercent === 'number' ? prodReferralPercent : (parseFloat(String(prodReferralPercent)) || 0),
        customReservePercent: typeof prodReservePercent === 'number' ? prodReservePercent : (parseFloat(String(prodReservePercent)) || 0),
        customDevelopmentPercent: typeof prodDevelopmentPercent === 'number' ? prodDevelopmentPercent : (parseFloat(String(prodDevelopmentPercent)) || 0),
        customFixedCostEGP: typeof prodFixedCost === 'number' ? prodFixedCost : (parseFloat(String(prodFixedCost)) || 0),
        gameId: prodGameId,
        isCashbackEnabled: prodIsCashbackEnabled,
        isReferralEnabled: prodIsReferralEnabled
      });
      calculatedSellingPrice = b.finalSellingPriceEGP;
      firstOrderCost = b.firstOrderCostPriceEGP;
      calculatedCostEGP = b.costEGP;
      dealerSellingPrice = b.dealerPriceEGP;
    } else {
      if (manualCost !== undefined) {
        calculatedCostEGP = manualCost;
      } else if (resolvedCostUSD > 0) {
        const cfg = PricingEngine.getPricingConfig();
        calculatedCostEGP = Math.round(resolvedCostUSD * (cfg.rateUSD_EGP || 50) * 100) / 100;
      }
      dealerSellingPrice = manualDealerPrice;
    }

    const qtyNumber = prodAvailableQuantity.trim() !== '' ? parseFloat(prodAvailableQuantity.trim()) : undefined;

    const prodItem: GameProduct = {
      id: editingProductId || (isFirstShippingTab ? 'f_prod_' : 'prod_') + `${prodGameId}_${Date.now()}`,
      gameId: prodGameId,
      gameName: g?.name || 'لعبة',
      sectionId: prodSectionId,
      sectionName: sec?.name || 'عام',
      sectionPath: sec ? (sec.parentId ? `${g?.sections.find(s => s.id === sec.parentId)?.name || ''} > ${sec.name}` : sec.name) : 'عام',
      groupId: prodGroupId || undefined,
      groupName: grp?.name || undefined,
      name: prodName.trim(),
      sku: prodSku || `SKU-${Date.now().toString().slice(-4)}`,
      description: prodDescription.trim() || undefined,
      image: prodImage.trim() || undefined,
      primaryWalletId: prodPrimaryWalletId || undefined,
      walletTypeId: prodPrimaryWalletId || 'default',
      alternativeWalletIds: prodAlternativeWalletIds.filter(id => id && id !== prodPrimaryWalletId),
      walletSources: [
        ...(prodPrimaryWalletId ? [{ walletId: prodPrimaryWalletId, priority: 1 }] : []),
        ...prodAlternativeWalletIds.filter(id => id && id !== prodPrimaryWalletId).map((id, index) => ({ walletId: id, priority: index + 2 }))
      ],
      alternativeWallets: prodAlternativeWalletIds.filter(id => id && id !== prodPrimaryWalletId).map((id, index) => ({ walletId: id, priority: index + 2 })),
      pointsCostPerUnit: typeof prodPointsCost === 'number' ? prodPointsCost : (parseFloat(String(prodPointsCost)) || 0),
      costUSD: resolvedCostUSD,
      costPriceEGP: calculatedCostEGP && calculatedCostEGP > 0 ? calculatedCostEGP : undefined,
      fixedCostPerOrder: typeof prodFixedCost === 'number' ? prodFixedCost : (parseFloat(String(prodFixedCost)) || 0),
      reservePercent: typeof prodReservePercent === 'number' ? prodReservePercent : (parseFloat(String(prodReservePercent)) || 0),
      developmentPercent: typeof prodDevelopmentPercent === 'number' ? prodDevelopmentPercent : (parseFloat(String(prodDevelopmentPercent)) || 0),
      profitMarginPercent: typeof prodProfitMarginPercent === 'number' ? prodProfitMarginPercent : (parseFloat(String(prodProfitMarginPercent)) || 0),
      partnerCommissionPercent: typeof prodReferralPercent === 'number' ? prodReferralPercent : (parseFloat(String(prodReferralPercent)) || 0),
      cashbackPercent: typeof prodCashbackPercent === 'number' ? prodCashbackPercent : (parseFloat(String(prodCashbackPercent)) || 0),
      isCashbackEnabled: prodIsCashbackEnabled,
      isReferralEnabled: prodIsReferralEnabled,
      companyNetMarginPercent: typeof prodProfitMarginPercent === 'number' ? prodProfitMarginPercent : (parseFloat(String(prodProfitMarginPercent)) || 0),
      minProfitMarginEGP: prodMinProfitEGP || undefined,
      availableQuantity: qtyNumber,
      autoPricingEnabled: prodAutoPricing,
      useCustomPricing: !prodAutoPricing,
      customSellingPriceEGP: !prodAutoPricing ? calculatedSellingPrice : undefined,
      dealerPriceEGP: !prodAutoPricing ? manualDealerPrice : dealerSellingPrice,
      dealerCustomSellingPriceEGP: !prodAutoPricing ? manualDealerPrice : undefined,
      calculatedPriceEGP: calculatedSellingPrice,
      firstOrderCostPriceEGP: firstOrderCost,
      isActive: prodIsActive,
      disabledReason: !prodIsActive ? (prodDisabledReason.trim() || 'غير متاح الآن') : undefined,
      createdAt: editingProductId ? (games.flatMap(g => g.products || []).find(p => p.id === editingProductId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isFirstShippingTab) {
      db.saveFirstShippingProduct(prodItem);
    } else {
      db.saveGameProduct(prodItem);
    }
    showToast('success', editingProductId ? 'تم تعديل المنتج' : 'تمت إضافة المنتج', `تم حفظ المنتج "${prodItem.name}" بنجاح (${calculatedSellingPrice} ج)`);
    setIsProductModalOpen(false);
    loadData();
  };

  const handleDeleteProduct = (gameId: string, prodId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      if (isFirstShippingTab) {
        db.deleteFirstShippingProduct(gameId, prodId);
      } else {
        db.deleteGameProduct(gameId, prodId);
      }
      showToast('info', 'تم الحذف', 'تم حذف المنتج بنجاح');
      loadData();
    }
  };

  // Quick Price Edit Handler
  const handleOpenQuickPriceEdit = (p: GameProduct) => {
    setQuickEditPriceProduct(p);
    setQuickFirstOrderPrice(p.firstOrderCostPriceEGP);
    setQuickRegularPrice(p.calculatedPriceEGP);
  };

  const handleSaveQuickPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditPriceProduct) return;

    const updated: GameProduct = {
      ...quickEditPriceProduct,
      firstOrderCostPriceEGP: quickFirstOrderPrice,
      calculatedPriceEGP: quickRegularPrice,
      customSellingPriceEGP: quickRegularPrice,
      dealerPriceEGP: quickEditPriceProduct.dealerPriceEGP || quickRegularPrice,
      dealerCustomSellingPriceEGP: quickEditPriceProduct.dealerCustomSellingPriceEGP || quickRegularPrice,
      useCustomPricing: true,
      autoPricingEnabled: false,
      updatedAt: new Date().toISOString()
    };

    if (isFirstShippingTab) {
      db.saveFirstShippingProduct(updated);
    } else {
      db.saveGameProduct(updated);
    }
    showToast('success', 'تم تحديث السعر', `تم حفظ السعر لمنتج "${updated.name}"`);
    setQuickEditPriceProduct(null);
    loadData();
  };



  // Cascading Filter Data for Tree
  const filterAvailableSections = useMemo(() => {
    if (filterGameId === 'all') return [];
    const g = games.find(game => game.id === filterGameId);
    return g?.sections || [];
  }, [games, filterGameId]);

  const filterAvailableGroups = useMemo(() => {
    if (filterGameId === 'all' || filterSectionId === 'all') return [];
    const g = games.find(game => game.id === filterGameId);
    return (g?.groups || []).filter(grp => grp.sectionId === filterSectionId);
  }, [games, filterGameId, filterSectionId]);

  const filterAvailableProducts = useMemo(() => {
    let prods: GameProduct[] = [];
    if (filterGameId === 'all') {
      games.forEach(g => prods.push(...(g.products || [])));
    } else {
      const g = games.find(game => game.id === filterGameId);
      prods = g?.products || [];
      if (filterSectionId !== 'all') prods = prods.filter(p => p.sectionId === filterSectionId);
      if (filterGroupId !== 'all') prods = prods.filter(p => p.groupId === filterGroupId);
    }
    return prods;
  }, [games, filterGameId, filterSectionId, filterGroupId]);

  // Filtered & Sorted Tree Display Logic
  const displayedGames = useMemo(() => {
    let result = [...games];

    // Filter by specific game
    if (filterGameId !== 'all') {
      result = result.filter(g => g.id === filterGameId);
    }

    // Filter by active / inactive status
    if (filterStatus === 'active') {
      result = result.filter(g => g.isActive !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter(g => g.isActive === false);
    }

    // Filter by keyword search
    if (treeSearchQuery.trim()) {
      const q = treeSearchQuery.trim().toLowerCase();
      result = result.filter(g => {
        const matchGame = g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q);
        const matchSections = (g.sections || []).some(s => s.name.toLowerCase().includes(q));
        const matchGroups = (g.groups || []).some(grp => grp.name.toLowerCase().includes(q));
        const matchProducts = (g.products || []).some(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        return matchGame || matchSections || matchGroups || matchProducts;
      });
    }

    // Process nested sections & products if section/group/product filter is active
    if (filterSectionId !== 'all' || filterGroupId !== 'all' || filterProductId !== 'all') {
      result = result.map(g => {
        let prods = g.products || [];
        if (filterSectionId !== 'all') prods = prods.filter(p => p.sectionId === filterSectionId);
        if (filterGroupId !== 'all') prods = prods.filter(p => p.groupId === filterGroupId);
        if (filterProductId !== 'all') prods = prods.filter(p => p.id === filterProductId);

        let secs = g.sections || [];
        if (filterSectionId !== 'all') secs = secs.filter(s => s.id === filterSectionId);

        let grps = g.groups || [];
        if (filterGroupId !== 'all') grps = grps.filter(grp => grp.id === filterGroupId);

        return {
          ...g,
          sections: secs,
          groups: grps,
          products: prods
        };
      });
    }

    // Sorting
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    return result;
  }, [games, filterGameId, filterSectionId, filterGroupId, filterProductId, filterStatus, treeSearchQuery, sortBy]);

  return (
    <div className="space-y-6 text-right text-xs">
      {/* Top Header & Centralized USDT Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              كتالوج المنتجات والمحافظ وشجرة الألعاب (Catalog & Wallets)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-bold">
              {games.length} ألعاب
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            إدارة شجرة المنتجات الأساسية وشجرة منتجات أول شحنة المستقلة، والتسعير المالي، وتقارير المبيعات.
          </p>
        </div>

        {/* Central USDT & Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Centralized Rate Badge */}
          <div
            onClick={() => isOwner && setIsRateModalOpen(true)}
            className={`p-2 px-3.5 rounded-2xl bg-linear-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 flex items-center gap-3 shadow-xs transition-all ${isOwner ? 'cursor-pointer hover:border-orange-500' : ''
              }`}
            title={isOwner ? 'انقر لتحديث سعر USDT المركزي وتطبيق التسعير الآلي' : undefined}
          >
            <div className="flex items-center gap-1.5 font-bold text-orange-500">
              <DollarSign className="w-4 h-4" />
              <span>سعر USDT اليوم:</span>
            </div>
            <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
              {exchangeRate.rateUSD_EGP} ج
            </span>
            {isOwner && <Edit2 className="w-3.5 h-3.5 text-zinc-400" />}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Copy className="w-4 h-4 text-orange-500" />}
            onClick={() => {
              setSelectedGameForCopySettings(undefined);
              setIsCopyTemplatesOpen(true);
            }}
            className="border-orange-500/20 font-bold"
          >
            📋 إعدادات رسائل النسخ
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<History className="w-4 h-4 text-orange-500" />}
            onClick={() => setIsMoveAuditModalOpen(true)}
            className="border-gray-200 dark:border-[#27272A] font-bold"
            title="عرض سجل كافة عمليات النقل والترتيب"
          >
            📜 سجل النقل
            {moveAuditLogs.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono mr-1">
                {moveAuditLogs.length}
              </span>
            )}
          </Button>

          {isOwner && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddGame}
            >
              {isFirstShippingTab ? '➕ لعبة أول شحنة جديدة' : '➕ لعبة جديدة'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation (Drag & Drop Reorderable) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#27272A] pb-2 overflow-x-auto no-scrollbar">
        {getOrderedItems('catalog_tabs', [
          {
            id: 'tree',
            label: `📦 شجرة المنتجات الأساسية (${regularGames.length})`,
            icon: Gamepad2,
            activeColor: 'bg-orange-500 text-white shadow-xs'
          },
          {
            id: 'first_shipping_tree',
            label: `🎁 شجرة منتجات أول شحنة (مستقلة بالكامل) (${firstShippingGames.length})`,
            icon: Sparkles,
            activeColor: 'bg-purple-600 text-white shadow-xs'
          },
          {
            id: 'reports',
            label: '📊 تقارير وأداء المنتجات',
            icon: BarChart3,
            activeColor: 'bg-orange-500 text-white shadow-xs'
          },
          {
            id: 'wallets',
            label: '💳 المحافظ',
            icon: Wallet,
            activeColor: 'bg-orange-500 text-white shadow-xs'
          },
          {
            id: 'transactions',
            label: '📑 حركات المحافظ (Wallet Transactions)',
            icon: FileText,
            activeColor: 'bg-orange-500 text-white shadow-xs'
          }
        ]).map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <SortableDraggableItem
              key={tab.id}
              id={tab.id}
              index={idx}
              containerId="catalog_tabs"
              direction="horizontal"
              className="shrink-0"
            >
              <button
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? tab.activeColor
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            </SortableDraggableItem>
          );
        })}
      </div>

      {/* ============================================================= */}
      {/* 🌳 TAB 1 & TAB 2: PRODUCT TREE VIEWS (REGULAR vs FIRST SHIPPING) */}
      {/* ============================================================= */}
      {(activeTab === 'tree' || activeTab === 'first_shipping_tree') && (
        <div className="space-y-4">
          {/* Tree Mode Banner */}
          {isFirstShippingTab && (
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-4 text-purple-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 shrink-0" />
                <div>
                  <strong className="font-bold text-xs block">شجرة منتجات أول شحنة المستقلة بالكامل</strong>
                  <span className="text-[11px] text-zinc-400">
                    هذا القسم مستقل تماماً عن المنتجات العادية. يتم استدعاؤه تلقائياً عند اختيار تذكرة "أول شحنة" مع التحقق الأمني من الأهلية.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Filter Toolbar for the Catalog */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  الفلتر المتقدم لشجرة المنتجات
                </span>
              </div>

              {/* Collapse All / Expand All Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCollapseAll}
                  icon={<EyeOff className="w-3.5 h-3.5" />}
                  title="طي كافة الأقسام والمنتجات"
                >
                  طي الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandAll}
                  icon={<Eye className="w-3.5 h-3.5" />}
                  title="فتح وتوسيع كافة الأقسام والمنتجات"
                >
                  توسيع الكل
                </Button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Game Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">اللعبة:</label>
                <select
                  value={filterGameId}
                  onChange={e => {
                    setFilterGameId(e.target.value);
                    setFilterSectionId('all');
                    setFilterGroupId('all');
                    setFilterProductId('all');
                  }}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="all">🎮 كل الألعاب ({games.length})</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">القسم:</label>
                <select
                  value={filterSectionId}
                  onChange={e => {
                    setFilterSectionId(e.target.value);
                    setFilterGroupId('all');
                    setFilterProductId('all');
                  }}
                  disabled={filterGameId === 'all' || filterAvailableSections.length === 0}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none disabled:opacity-50"
                >
                  <option value="all">📂 كل الأقسام</option>
                  {filterAvailableSections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">المجموعة:</label>
                <select
                  value={filterGroupId}
                  onChange={e => {
                    setFilterGroupId(e.target.value);
                    setFilterProductId('all');
                  }}
                  disabled={filterSectionId === 'all' || filterAvailableGroups.length === 0}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none disabled:opacity-50"
                >
                  <option value="all">📑 كل المجموعات</option>
                  {filterAvailableGroups.map(grp => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">المنتج:</label>
                <select
                  value={filterProductId}
                  onChange={e => setFilterProductId(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="all">📦 كل المنتجات</option>
                  {filterAvailableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">حالة التوفر:</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="all">الكل (مفعل ومعطل)</option>
                  <option value="active">🟢 متاح ومفعل فقط</option>
                  <option value="inactive">⛔ معطل فقط</option>
                </select>
              </div>
            </div>

            {/* Keyword Search & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="بحث سريع في اللعبة، القسم، المجموعة، أو اسم المنتج..."
                  value={treeSearchQuery}
                  onChange={e => setTreeSearchQuery(e.target.value)}
                  icon={<Search className="w-4 h-4 text-orange-500" />}
                />
                {treeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTreeSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-bold">ترتيب:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="rounded-xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="newest">الأحدث</option>
                  <option value="oldest">الأقدم</option>
                  <option value="name">الاسم (أ - ي)</option>
                  <option value="most_sold">الأكثر طلباً</option>
                </select>
              </div>
            </div>
          </div>

          {/* ↩ Instant Undo Banner */}
          {undoBanner && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <strong className="font-bold text-xs block text-zinc-900 dark:text-zinc-100">{undoBanner.message}</strong>
                  <span className="text-[11px] text-zinc-500">يمكنك التراجع الفوري عن هذه العملية لإعادة كافة العناصر إلى أماكنها السابقة تماماً.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleUndoLastMove}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  ↩ تراجع الآن
                </Button>
                <button
                  type="button"
                  onClick={() => setUndoBanner(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
                  title="إغلاق التنبيه"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 📦 Sticky Multi-Select Batch Action Bar */}
          {selectedProductIds.size > 0 && (
            <div className="sticky top-4 z-40 p-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 border border-white/20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                  {selectedProductIds.size}
                </div>
                <div>
                  <strong className="text-sm font-bold block">
                    تم تحديد {selectedProductIds.size} منتج
                  </strong>
                  <span className="text-[11px] text-orange-100">
                    يمكنك الآن نقل المنتجات المحددة دفعة واحدة إلى قسم أو مجموعة أخرى
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenBatchMove}
                  icon={<FolderInput className="w-4 h-4 text-orange-600" />}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-black shadow-md border-0"
                >
                  🔄 نقل المنتجات المحددة معاً إلى...
                </Button>
                <button
                  type="button"
                  onClick={handleSelectAllProductsInView}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-bold text-white border border-white/20"
                >
                  تحديد كل المعروض
                </button>
                <button
                  type="button"
                  onClick={handleClearProductSelection}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-bold text-white border border-white/20"
                >
                  إلغاء التحديد ({selectedProductIds.size})
                </button>
              </div>
            </div>
          )}

          {/* Games List */}
          <div className="space-y-4">
            {displayedGames.length === 0 ? (
              <Card className="p-8 text-center text-zinc-400 space-y-2">
                <Gamepad2 className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
                <p>لا توجد ألعاب مطابقة لمعايير الفلتر والبحث</p>
                {isOwner && (
                  <Button variant="primary" size="sm" onClick={handleOpenAddGame}>
                    {isFirstShippingTab ? '➕ إضافة أول لعبة لأول شحنة' : '➕ إضافة أول لعبة'}
                  </Button>
                )}
              </Card>
            ) : (
              displayedGames.map((game, gameIdx) => {
                const isGameActive = game.isActive !== false;
                const isGameCollapsed = collapsedGames.has(game.id);
                const gameProducts = game.products || [];

                return (
                  <div
                    key={game.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${isGameActive
                        ? 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] shadow-xs'
                        : 'bg-gray-50/70 dark:bg-[#141417] border-rose-500/30 opacity-85'
                      }`}
                  >
                    {/* Level 1: Game Header */}
                    <div className="p-4 bg-gray-50/50 dark:bg-[#141417] border-b border-gray-100 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Collapse / Expand Chevron */}
                        <button
                          type="button"
                          onClick={() => toggleGameCollapse(game.id)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-[#222228] text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
                          title={isGameCollapsed ? 'توسيع اللعبة' : 'طي اللعبة'}
                        >
                          {isGameCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Drag & Reorder buttons */}
                        {isOwner && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={gameIdx === 0}
                              onClick={() => handleMoveGame(game.id, 'up')}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#27272A] text-zinc-400 hover:text-zinc-800 disabled:opacity-30 cursor-pointer"
                              title="تحريك لأعلى"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={gameIdx === displayedGames.length - 1}
                              onClick={() => handleMoveGame(game.id, 'down')}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#27272A] text-zinc-400 hover:text-zinc-800 disabled:opacity-30 cursor-pointer"
                              title="تحريك لأسفل"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Game Icon or Image */}
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center text-xl overflow-hidden border border-orange-500/20">
                          {game.image ? (
                            <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                          ) : (
                            game.icon || '🎮'
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100">{game.name}</h3>
                            <Badge variant="default" size="sm">{game.code}</Badge>

                            {!isGameActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> معطلة ومحجوبة ⛔ {game.disabledReason ? `(${game.disabledReason})` : ''}
                              </span>
                            )}

                            {/* Cashback & Referral Badges */}
                            {game.cashbackEnabled === false && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                🚫 الكاش باك ملغي
                              </span>
                            )}
                            {game.referralEnabled === false && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                🚫 الإحالة ملغاة
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                            <span>{game.publisher}</span>
                            <span>•</span>
                            <span>{(game.sections || []).length} أقسام</span>
                            <span>•</span>
                            <span>{gameProducts.length} منتجات</span>
                            {game.description && (
                              <span className="text-zinc-500 font-normal italic truncate max-w-xs">
                                — {game.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Game Action Controls & Quick Toggles */}
                      <div className="flex items-center gap-2">
                        {/* Quick Toggles */}
                        {isOwner && (
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#141417] p-1 rounded-xl border border-gray-200 dark:border-[#27272A]">
                            <button
                              type="button"
                              onClick={() => handleToggleGameActive(game)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isGameActive
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-rose-500 text-white shadow-xs'
                                }`}
                              title="تبديل حالة التوفر (Active/Inactive)"
                            >
                              {isGameActive ? '🟢 مفعل' : '⛔ معطل'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleGameCashback(game)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${game.cashbackEnabled !== false
                                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                  : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              title="تفعيل/تعطيل الكاش باك لهذه اللعبة"
                            >
                              {game.cashbackEnabled !== false ? '💰 كاش باك' : '🚫 كاش باك'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleGameReferral(game)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${game.referralEnabled !== false
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              title="تفعيل/تعطيل الإحالة لهذه اللعبة"
                            >
                              {game.referralEnabled !== false ? '🤝 إحالة' : '🚫 إحالة'}
                            </button>
                          </div>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Copy className="w-3.5 h-3.5" />}
                          onClick={() => handleCopyGame(game)}
                          className="text-xs"
                          title="نسخ تفاصيل اللعبة"
                        >
                          نسخ
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<FileText className="w-3.5 h-3.5 text-orange-500" />}
                          onClick={() => {
                            setSelectedGameForCopySettings(game.id);
                            setIsCopyTemplatesOpen(true);
                          }}
                          className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-orange-500"
                          title="تعديل وتخصيص رسالة هذه اللعبة"
                        >
                          تعديل الرسالة
                        </Button>


                        {isOwner && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<FolderPlus className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenAddSection(game.id)}
                            >
                              ➕ قسم
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Plus className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenAddProduct(game.id)}
                            >
                              ➕ منتج
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenEditGame(game)}
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => handleDeleteGame(game.id)}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Level 2 & 3 & 4: Sections, Groups, Products (Hidden if game is collapsed) */}
                    {!isGameCollapsed && (
                      <div className="p-4 space-y-4">
                        {(game.sections || []).length === 0 ? (
                          <div className="text-center py-4 text-zinc-400 text-xs">
                            لا توجد أقسام في هذه اللعبة بعد.
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddSection(game.id)}
                                className="text-orange-500 font-bold mx-1 hover:underline cursor-pointer"
                              >
                                إضافة قسم الآن
                              </button>
                            )}
                          </div>
                        ) : (
                          game.sections.map((section, secIdx) => {
                            const isSecCollapsed = collapsedSections.has(section.id);
                            const sectionGroups = (game.groups || []).filter(grp => grp.sectionId === section.id);
                            const sectionDirectProducts = gameProducts.filter(
                              p => p.sectionId === section.id && !p.groupId
                            );

                            return (
                              <div
                                key={section.id}
                                onDragOver={(e) => handleDragOverTarget(e, `sec_${section.id}`)}
                                onDragLeave={handleDragLeaveTarget}
                                onDrop={(e) => handleDropOnSection(e, game.id, section.id)}
                                className={`rounded-xl border transition-all overflow-hidden ${
                                  dragOverTarget === `sec_${section.id}`
                                    ? 'border-2 border-dashed border-orange-500 bg-orange-500/10 shadow-lg scale-[1.002]'
                                    : 'border-gray-100 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#18181B]/50'
                                }`}
                              >
                                {dragOverTarget === `sec_${section.id}` && (
                                  <div className="bg-orange-500 text-white font-bold text-center py-1.5 text-xs animate-pulse">
                                    📥 إفلات هنا للنقل إلى قسم: {section.name}
                                  </div>
                                )}

                                {/* Level 2: Section Header */}
                                <div className="p-3 bg-gray-100/50 dark:bg-[#141417]/80 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-[#27272A]">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleSectionCollapse(section.id)}
                                      className="p-1 rounded text-zinc-400 hover:text-orange-500 cursor-pointer"
                                      title={isSecCollapsed ? 'توسيع القسم' : 'طي القسم'}
                                    >
                                      {isSecCollapsed ? (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    {/* Move Section Up / Down */}
                                    {isOwner && (
                                      <div className="flex items-center bg-gray-200/60 dark:bg-[#27272A] rounded-lg p-0.5">
                                        <button
                                          type="button"
                                          disabled={secIdx === 0}
                                          onClick={() => handleMoveSection(game.id, section.id, 'up')}
                                          className="p-1 rounded hover:bg-white dark:hover:bg-[#18181B] text-zinc-500 hover:text-orange-500 disabled:opacity-20 cursor-pointer"
                                          title="تحريك القسم لأعلى"
                                        >
                                          <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={secIdx === (game.sections || []).length - 1}
                                          onClick={() => handleMoveSection(game.id, section.id, 'down')}
                                          className="p-1 rounded hover:bg-white dark:hover:bg-[#18181B] text-zinc-500 hover:text-orange-500 disabled:opacity-20 cursor-pointer"
                                          title="تحريك القسم لأسفل"
                                        >
                                          <ArrowDown className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}

                                    {section.image ? (
                                      <img
                                        src={section.image}
                                        alt={section.name}
                                        className="w-5 h-5 rounded object-cover"
                                      />
                                    ) : (
                                      <Folder className="w-4 h-4 text-orange-500" />
                                    )}

                                    <strong className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                      {section.name}
                                    </strong>

                                    {section.isActive === false && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-400">
                                        معطل
                                      </span>
                                    )}

                                    {section.description && (
                                      <span className="text-[10px] text-zinc-400 italic truncate max-w-xs">
                                        — {section.description}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopySection(game, section)}
                                      icon={<Copy className="w-3 h-3 text-zinc-400 hover:text-orange-500" />}
                                      title="نسخ أسعار ومنتجات هذا القسم"
                                    >
                                      نسخ
                                    </Button>

                                    {isOwner && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenAddGroup(game.id, section.id)}
                                          icon={<FolderPlus className="w-3 h-3 text-zinc-500" />}
                                        >
                                          مجموعة
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenAddProduct(game.id, section.id)}
                                          icon={<Plus className="w-3 h-3 text-orange-500" />}
                                        >
                                          منتج
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenEditSection(game.id, section)}
                                          icon={<Edit2 className="w-3 h-3 text-zinc-400" />}
                                        />

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSection(game.id, section.id)}
                                          icon={<Trash2 className="w-3 h-3 text-rose-400" />}
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Section Content (Groups & Direct Products) */}
                                {!isSecCollapsed && (
                                  <div className="p-3 space-y-3">
                                    {/* Level 3: Groups */}
                                    {sectionGroups.map((group, grpIdx) => {
                                      const isGrpCollapsed = collapsedGroups.has(group.id);
                                      const groupProducts = gameProducts.filter(p => p.groupId === group.id);

                                      return (
                                        <div
                                          key={group.id}
                                          draggable={isOwner}
                                          onDragStart={(e) => handleDragStartGroup(e, game.id, section.id, group)}
                                          onDragOver={(e) => handleDragOverTarget(e, `grp_${group.id}`)}
                                          onDragLeave={handleDragLeaveTarget}
                                          onDrop={(e) => handleDropOnGroup(e, game.id, section.id, group.id)}
                                          className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                                            dragOverTarget === `grp_${group.id}`
                                              ? 'border-2 border-dashed border-purple-500 bg-purple-500/10 shadow-lg scale-[1.002]'
                                              : 'border-gray-100 dark:border-[#27272A] bg-white dark:bg-[#141417]'
                                          }`}
                                        >
                                          {dragOverTarget === `grp_${group.id}` && (
                                            <div className="bg-purple-600 text-white font-bold text-center py-1.5 text-xs rounded-lg animate-pulse">
                                              📥 إفلات هنا لنقل المنتج إلى مجموعة: {group.name}
                                            </div>
                                          )}

                                          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-[#222228] pb-2">
                                            <div className="flex items-center gap-2">
                                              {/* Drag Handle for Group */}
                                              {isOwner && (
                                                <div
                                                  className="text-zinc-300 dark:text-zinc-600 hover:text-purple-400 cursor-grab active:cursor-grabbing p-0.5"
                                                  title="اسحب هذه المجموعة لنقلها بكل محتوياتها إلى أي قسم آخر"
                                                >
                                                  <GripVertical className="w-3.5 h-3.5" />
                                                </div>
                                              )}

                                              <button
                                                type="button"
                                                onClick={() => toggleGroupCollapse(group.id)}
                                                className="p-1 rounded text-zinc-400 hover:text-orange-500 cursor-pointer"
                                                title={isGrpCollapsed ? 'توسيع المجموعة' : 'طي المجموعة'}
                                              >
                                                {isGrpCollapsed ? (
                                                  <ChevronRight className="w-3.5 h-3.5" />
                                                ) : (
                                                  <ChevronDown className="w-3.5 h-3.5" />
                                                )}
                                              </button>

                                              {/* Move Group Up / Down */}
                                              {isOwner && (
                                                <div className="flex items-center bg-gray-200/60 dark:bg-[#27272A] rounded-lg p-0.5">
                                                  <button
                                                    type="button"
                                                    disabled={grpIdx === 0}
                                                    onClick={() => handleMoveGroup(game.id, section.id, group.id, 'up')}
                                                    className="p-1 rounded hover:bg-white dark:hover:bg-[#18181B] text-zinc-500 hover:text-orange-500 disabled:opacity-20 cursor-pointer"
                                                    title="تحريك المجموعة لأعلى"
                                                  >
                                                    <ArrowUp className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={grpIdx === sectionGroups.length - 1}
                                                    onClick={() => handleMoveGroup(game.id, section.id, group.id, 'down')}
                                                    className="p-1 rounded hover:bg-white dark:hover:bg-[#18181B] text-zinc-500 hover:text-orange-500 disabled:opacity-20 cursor-pointer"
                                                    title="تحريك المجموعة لأسفل"
                                                  >
                                                    <ArrowDown className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              )}

                                              {group.image ? (
                                                <img
                                                  src={group.image}
                                                  alt={group.name}
                                                  className="w-4 h-4 rounded object-cover"
                                                />
                                              ) : (
                                                <Tag className="w-3.5 h-3.5 text-purple-400" />
                                              )}

                                              <strong className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                                                {group.name}
                                              </strong>

                                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono font-bold">
                                                {groupProducts.length} منتجات
                                              </span>

                                              {group.description && (
                                                <span className="text-[10px] text-zinc-400 italic">
                                                  — {group.description}
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                              {/* Move Group Button */}
                                              {isOwner && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => handleOpenQuickMoveGroup(game.id, section.id, group)}
                                                  icon={<FolderInput className="w-3 h-3 text-purple-400" />}
                                                  className="text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                                  title="نقل هذه المجموعة بكل محتوياتها إلى قسم آخر"
                                                >
                                                  نقل المجموعة
                                                </Button>
                                              )}

                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopyGroup(game, section, group)}
                                                icon={<Copy className="w-3 h-3 text-zinc-400 hover:text-orange-500" />}
                                                title="نسخ أسعار هذه المجموعة فقط"
                                              >
                                                نسخ
                                              </Button>
                                              {isOwner && (
                                                <>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenAddProduct(game.id, section.id, group.id)}
                                                    icon={<Plus className="w-3 h-3 text-orange-500" />}
                                                  >
                                                    منتج
                                                  </Button>

                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenEditGroup(game.id, group)}
                                                    icon={<Edit2 className="w-3 h-3 text-zinc-400" />}
                                                  />

                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteGroup(game.id, group.id)}
                                                    icon={<Trash2 className="w-3 h-3 text-rose-400" />}
                                                  />
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          {/* Group Products */}
                                          {!isGrpCollapsed && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                              {groupProducts.map((prod, pIdx) => (
                                                <ProductCard
                                                  key={prod.id}
                                                  product={prod}
                                                  game={game}
                                                  section={section}
                                                  group={group}
                                                  isOwner={isOwner}
                                                  isExpandedDesc={expandedDescriptions.has(prod.id)}
                                                  onToggleDesc={() => toggleDescriptionExpand(prod.id)}
                                                  onCopy={() => handleCopyProduct(prod, game, section, group)}
                                                  onEdit={() => handleOpenEditProduct(prod)}
                                                  onDelete={() => handleDeleteProduct(game.id, prod.id)}
                                                  onOpenBreakdown={() => handleOpenProductBreakdown(prod, game.id)}
                                                  onMoveUp={() => handleMoveProduct(game.id, prod.id, 'up')}
                                                  onMoveDown={() => handleMoveProduct(game.id, prod.id, 'down')}
                                                  canMoveUp={pIdx > 0}
                                                  canMoveDown={pIdx < groupProducts.length - 1}
                                                  onQuickMove={() => handleOpenQuickMoveProduct(prod)}
                                                  isSelected={selectedProductIds.has(prod.id)}
                                                  onToggleSelect={() => handleToggleSelectProduct(prod.id)}
                                                  onDragStart={(e) => handleDragStartProduct(e, prod)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* Direct Products in Section without Group */}
                                    {sectionDirectProducts.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                        {sectionDirectProducts.map((prod, pIdx) => (
                                          <ProductCard
                                            key={prod.id}
                                            product={prod}
                                            game={game}
                                            section={section}
                                            isOwner={isOwner}
                                            isExpandedDesc={expandedDescriptions.has(prod.id)}
                                            onToggleDesc={() => toggleDescriptionExpand(prod.id)}
                                            onCopy={() => handleCopyProduct(prod, game, section)}
                                            onEdit={() => handleOpenEditProduct(prod)}
                                            onDelete={() => handleDeleteProduct(game.id, prod.id)}
                                            onOpenBreakdown={() => handleOpenProductBreakdown(prod, game.id)}
                                            onMoveUp={() => handleMoveProduct(game.id, prod.id, 'up')}
                                            onMoveDown={() => handleMoveProduct(game.id, prod.id, 'down')}
                                            canMoveUp={pIdx > 0}
                                            canMoveDown={pIdx < sectionDirectProducts.length - 1}
                                            onQuickMove={() => handleOpenQuickMoveProduct(prod)}
                                            isSelected={selectedProductIds.has(prod.id)}
                                            onToggleSelect={() => handleToggleSelectProduct(prod.id)}
                                            onDragStart={(e) => handleDragStartProduct(e, prod)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 📊 TAB 3: PRODUCT REPORTS */}
      {/* ============================================================= */}
      {activeTab === 'reports' && <ProductReportsTab games={[...regularGames, ...firstShippingGames]} />}

      {/* ============================================================= */}
      {/* 💼 TAB 4: JKR WALLETS DASHBOARD (MAIN + SUB + FIFO + LEDGER)  */}
      {/* ============================================================= */}
      {activeTab === 'wallets' && (
        <div className="space-y-6 my-4">
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                  المحافظ والخزينة (JKR Wallets Management)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  Two-Tier Architecture
                </span>
              </div>
              <span className="text-zinc-500 text-xs mt-0.5 block">
                نظام محافظ ثنائي المستوى: رئيسية (Money/USD Lots) وفرعية (Points/FIFO Lots) مع سجل أستاذ غير قابل للمسح.
              </span>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateWalletOpen(true)}
                  className="font-bold shadow-xs"
                >
                  ➕ إنشاء محفظة جديدة
                </Button>
              </div>
            )}
          </div>

          {/* Empty State Fallback (If No Wallets Created Yet) */}
          {jkrWallets.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4 my-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
                <Wallet className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  لا توجد محافظ حالياً
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  يمكنك البدء بإنشاء محفظة رئيسية لتمويل الرصيد بالدولار، ثم إنشاء محافظ فرعية لشحن واستهلاك النقاط.
                </p>
              </div>
              {isOwner && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsCreateWalletOpen(true)}
                    className="px-6 py-2.5 font-bold"
                  >
                    إنشاء محفظة جديدة
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Dashboard Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {/* 1. Total Wallets */}
                <div
                  onClick={() => setWalletFilterType('all')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${walletFilterType === 'all'
                      ? 'bg-orange-500/10 border-orange-500 shadow-xs'
                      : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/40'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-bold">إجمالي المحافظ</span>
                    <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-500">
                      <Wallet className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <strong className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-1 block font-mono">
                    {jkrWallets.length}
                  </strong>
                  <span className="text-[10px] text-zinc-400">جميع الخزائن والنقاط</span>
                </div>

                {/* 2. Main Wallets */}
                <div
                  onClick={() => setWalletFilterType('MAIN')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${walletFilterType === 'MAIN'
                      ? 'bg-blue-500/10 border-blue-500 shadow-xs'
                      : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-blue-500/40'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-500 font-bold">المحافظ الرئيسية</span>
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <DollarSign className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <strong className="text-lg font-black text-blue-500 mt-1 block font-mono">
                    {jkrWallets.filter(w => w.type === 'MAIN').length}
                  </strong>
                  <span className="text-[10px] text-zinc-400">محافظ تمويل دولارية</span>
                </div>

                {/* 3. Sub Wallets */}
                <div
                  onClick={() => setWalletFilterType('SUB')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${walletFilterType === 'SUB'
                      ? 'bg-orange-500/10 border-orange-500 shadow-xs'
                      : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/40'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-500 font-bold">المحافظ الفرعية</span>
                    <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                      <Coins className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <strong className="text-lg font-black text-orange-500 mt-1 block font-mono">
                    {jkrWallets.filter(w => w.type === 'SUB').length}
                  </strong>
                  <span className="text-[10px] text-zinc-400">مخزون نقاط الألعاب</span>
                </div>

                {/* 4. Total USD Available */}
                <div className="p-3.5 rounded-2xl border bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-bold">الرصيد الدولاري المتاح</span>
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <DollarSign className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <strong className="text-lg font-black text-blue-500 mt-1 block font-mono">
                    ${jkrWallets.filter(w => w.type === 'MAIN').reduce((s, w) => s + (w.balanceUSD || 0), 0).toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-zinc-400">جاهز لتمويل المحافظ</span>
                </div>

                {/* 5. Total Points Available */}
                <div className="p-3.5 rounded-2xl border bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-bold">إجمالي رصيد النقاط</span>
                    <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                      <Coins className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <strong className="text-lg font-black text-orange-500 mt-1 block font-mono">
                    {jkrWallets.filter(w => w.type === 'SUB').reduce((s, w) => s + (w.pointsBalance || 0), 0).toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-zinc-400">نقاط متاحة للاستهلاك</span>
                </div>
              </div>

              {/* SECTION 1: MAIN WALLETS (MONEY WALLETS) */}
              {(walletFilterType === 'all' || walletFilterType === 'MAIN') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      المحافظ الرئيسية (MAIN Money Wallets) — تمويل الرصيد بـ FIFO دولاري
                    </h4>
                    <span className="text-[10px] text-zinc-400">
                      {jkrWallets.filter(w => w.type === 'MAIN').length} محفظة رئيسية
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jkrWallets.filter(w => w.type === 'MAIN').map(mw => (
                      <div
                        key={mw.id}
                        className="p-4 rounded-2xl border transition-all space-y-3 shadow-xs bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-blue-500/40"
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setSelectedWalletForDetails(mw)}
                          >
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                              <strong className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors block">
                                {mw.name}
                              </strong>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                محفظة مالية رئيسية (USD / EGP)
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                            🟢 نشطة
                          </span>
                        </div>

                        {/* Section 16 Main Wallet Metrics */}
                        {(() => {
                          const mwTxs = JKRWalletEngine.getTransactions({ walletId: mw.id });
                          let totalInUSD = 0;
                          let totalInEGP = 0;
                          let totalOutUSD = 0;
                          let totalOutEGP = 0;

                          for (const t of mwTxs) {
                            if (t.transactionType === 'FUNDING' || (t.quantityIn && t.quantityIn > 0)) {
                              totalInUSD += t.quantityIn || t.amountUSD || 0;
                              totalInEGP += t.amountEGP || 0;
                            }
                            if (t.transactionType === 'PURCHASE' || t.transactionType === 'WITHDRAWAL' || (t.quantityOut && t.quantityOut > 0)) {
                              totalOutUSD += t.quantityOut || t.amountUSD || 0;
                              totalOutEGP += t.amountEGP || 0;
                            }
                          }

                          return (
                            <div className="space-y-2">
                              {/* Balances Display: Available USD & EGP */}
                              <div
                                className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228] flex items-center justify-between font-mono cursor-pointer hover:border-blue-500/30 transition-all"
                                onClick={() => setSelectedWalletForDetails(mw)}
                              >
                                <div>
                                  <span className="text-[10px] text-zinc-400 block">الرصيد المتاح (USD):</span>
                                  <strong className="text-base font-black text-blue-500">
                                    ${(mw.balanceUSD || 0).toLocaleString()} USD
                                  </strong>
                                </div>

                                <div className="text-left">
                                  <span className="text-[10px] text-zinc-400 block">التقييم بالجنيه:</span>
                                  <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatCurrency(mw.balanceEGP || 0)}
                                  </strong>
                                </div>
                              </div>

                              {/* Section 16: Total In & Out from creation date */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                  <span className="text-zinc-400 block">إجمالي وارد (من الإنشاء):</span>
                                  <strong className="text-emerald-500 font-bold block mt-0.5">
                                    +${totalInUSD.toLocaleString()}
                                  </strong>
                                  <span className="text-[9px] text-zinc-400 block">+{formatCurrency(totalInEGP)}</span>
                                </div>

                                <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                                  <span className="text-zinc-400 block">إجمالي صادر (من الإنشاء):</span>
                                  <strong className="text-rose-500 font-bold block mt-0.5">
                                    -${totalOutUSD.toLocaleString()}
                                  </strong>
                                  <span className="text-[9px] text-zinc-400 block">-{formatCurrency(totalOutEGP)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => setSelectedWalletForDelete(mw)}
                              className="text-xs text-rose-500 hover:bg-rose-500/10 border border-rose-500/20"
                              title="حذف المحفظة"
                            >
                              حذف
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedWalletForDetails(mw)}
                            className="text-xs"
                          >
                            👤 بروفايل وسجل
                          </Button>
                          {isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<ArrowUp className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => setSelectedWalletForWithdraw(mw)}
                              className="text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                              title="سحب لأي محفظة أخرى مع تسجيل الوجهة (Section 16)"
                            >
                              سحب وتوجيه
                            </Button>
                          )}
                          {isOwner && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<DollarSign className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedWalletForFunding(mw)}
                              className="text-xs"
                              title="تمويل دولاري (Section 16: من محفظة التشغيل، تمويل خارجي، أو تحويل أرباح)"
                            >
                              تمويل دولاري
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: SUB WALLETS (POINTS WALLETS) */}
              {(walletFilterType === 'all' || walletFilterType === 'SUB') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <Coins className="w-4 h-4" />
                      المحافظ الفرعية (SUB Points Wallets) — مخزون النقاط المستقل للألعاب
                    </h4>
                    <span className="text-[10px] text-zinc-400">
                      {jkrWallets.filter(w => w.type === 'SUB').length} محفظة فرعية
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jkrWallets.filter(w => w.type === 'SUB').map(sw => {
                      const isFrozen = sw.status === 'FROZEN';
                      const isLimitExceeded = sw.status === 'SAFETY_LIMIT_REACHED';
                      const isWarning = sw.status === 'LOW_BALANCE';
                      const parentMw = jkrWallets.find(w => w.id === sw.parentWalletId);

                      return (
                        <div
                          key={sw.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs flex flex-col justify-between ${isFrozen
                              ? 'bg-rose-500/5 border-rose-500/30'
                              : isLimitExceeded
                                ? 'bg-purple-500/5 border-purple-500/40 shadow-purple-500/5'
                                : isWarning
                                  ? 'bg-amber-500/5 border-amber-500/30'
                                  : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/40'
                            }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div
                                className="flex items-center gap-2 cursor-pointer group"
                                onClick={() => setSelectedWalletForDetails(sw)}
                              >
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                  <Coins className="w-5 h-5" />
                                </div>
                                <div>
                                  <strong className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors block">
                                    {sw.name}
                                  </strong>
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                                    <span>نوع الرصيد: {sw.pointType || 'نقاط'}</span>
                                    {parentMw && <span>• الممولة: {parentMw.name}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {isFrozen ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    🔒 مجمدة
                                  </span>
                                ) : isLimitExceeded ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    ⛔ حد الأمان السالب
                                  </span>
                                ) : isWarning ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                    ⚠️ رصيد منخفض
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                                    🟢 نشطة
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Balance Display */}
                            <div
                              className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228] flex items-center justify-between font-mono cursor-pointer hover:border-orange-500/30 transition-all"
                              onClick={() => setSelectedWalletForDetails(sw)}
                            >
                              <div>
                                <span className="text-[10px] text-zinc-400 block">رصيد النقاط (Points):</span>
                                <strong className={`text-base font-black ${sw.pointsBalance < 0 ? 'text-purple-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                  {(sw.pointsBalance || 0).toLocaleString()} نقطة
                                </strong>
                              </div>

                              <div className="text-left text-[10px] text-zinc-400">
                                <span>حد الأمان: {sw.safetyLimit || -500}</span>
                                <span className="block">حد التنبيه: {sw.alertThreshold || 1000}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                                onClick={() => setSelectedWalletForDelete(sw)}
                                className="text-xs text-rose-500 hover:bg-rose-500/10 border border-rose-500/20"
                                title="حذف المحفظة"
                              >
                                حذف
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedWalletForDetails(sw)}
                              className="text-xs"
                            >
                              👤 بروفايل وسجل
                            </Button>
                            {isOwner && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Plus className="w-3.5 h-3.5" />}
                                onClick={() => setSelectedWalletForDeposit(sw)}
                                className="text-xs text-orange-500 font-bold"
                              >
                                إيداع نقاط
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 📑 TAB 5: WALLET TRANSACTIONS AUDIT LEDGER */}
      {/* ============================================================= */}
      {activeTab === 'transactions' && (
        <JKRWalletTransactionsTab wallets={jkrWallets} />
      )}

      {/* ============================================================= */}
      {/* ⚙️ MODAL: CENTRAL USD EXCHANGE RATE UPDATE */}
      {/* ============================================================= */}
      {isRateModalOpen && (
        <Modal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          title="💵 تحديث سعر صرف USDT المركزي"
          maxWidth="md"
        >
          <form onSubmit={handleSaveExchangeRate} className="space-y-4 text-right text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold">
              💡 تنبيه: تحديث سعر الصرف سيعيد حساب أسعار البيع والتكلفة لكافة المنتجات فوراً وفق معادلة التسعير الآلي مع الحفاظ على مصروفات كل باقة وهوامش أرباحها.
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                سعر صرف USDT مقابل الجنيه (USD / EGP) *
              </label>
              <Input
                type="number"
                step="0.1"
                min="1"
                value={newRateValue}
                onChange={e => setNewRateValue(parseFloat(e.target.value) || 0)}
                required
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRateModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm">
                تطبيق وحفظ السعر
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 🎮 MODAL: ADD / EDIT GAME */}
      {/* ============================================================= */}
      {isAddGameModalOpen && (
        <Modal
          isOpen={isAddGameModalOpen}
          onClose={() => setIsAddGameModalOpen(false)}
          title={
            editingGameId
              ? `✏️ تعديل بيانات اللعبة (${newGameName})`
              : isFirstShippingTab
                ? '🎁 إضافة لعبة جديدة لشجرة أول شحنة'
                : '🎮 إضافة لعبة جديدة إلى الشجرة'
          }
          maxWidth="lg"
        >
          <form onSubmit={handleSaveGame} className="space-y-4 text-right text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اسم اللعبة *</label>
                <input
                  type="text"
                  value={newGameName}
                  onChange={e => setNewGameName(e.target.value)}
                  placeholder="مثال: Free Fire أو PUBG Mobile"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">كود اللعبة (رمز مختصر)</label>
                <input
                  type="text"
                  value={newGameCode}
                  onChange={e => setNewGameCode(e.target.value)}
                  placeholder="مثال: FF-GARENA أو PUBG"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">الناشر أو المطور</label>
                <input
                  type="text"
                  value={newGamePublisher}
                  onChange={e => setNewGamePublisher(e.target.value)}
                  placeholder="مثال: Garena أو Tencent"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">أيقونة أو رمز</label>
                <input
                  type="text"
                  value={newGameIcon}
                  onChange={e => setNewGameIcon(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            </div>

            {/* Game Media (Device Upload: Image / Video) */}
            <MediaUploadField
              mediaUrl={newGameImage}
              onChange={url => setNewGameImage(url)}
              onClear={() => setNewGameImage('')}
              label="صورة أو فيديو اللعبة (من جهازك 🖼️/🎬)"
            />

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                وصف اللعبة وملاحظاتها (اختياري 📝)
              </label>
              <textarea
                rows={2}
                value={newGameDescription}
                onChange={e => setNewGameDescription(e.target.value)}
                placeholder="نبذة عن اللعبة أو تعليمات خاصة بالشحن..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none resize-none"
              />
            </div>

            {/* Cashback & Referral Toggles */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
              <label className="flex items-center justify-between cursor-pointer font-bold select-none">
                <span>تفعيل نظام الكاش باك لهذه اللعبة</span>
                <input
                  type="checkbox"
                  checked={newGameCashback}
                  onChange={e => setNewGameCashback(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer font-bold select-none">
                <span>تفعيل عمولات الإحالة والشركاء لهذه اللعبة</span>
                <input
                  type="checkbox"
                  checked={newGameReferral}
                  onChange={e => setNewGameReferral(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer font-bold select-none text-emerald-500">
                <span>حالة توفر اللعبة (Active)</span>
                <input
                  type="checkbox"
                  checked={newGameIsActive}
                  onChange={e => setNewGameIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded"
                />
              </label>
            </div>

            {!newGameIsActive && (
              <div>
                <label className="block font-bold text-rose-500 mb-1">سبب التعطيل (يظهر للموظفين كتحذير ⚠️)</label>
                <input
                  type="text"
                  value={newGameDisabledReason}
                  onChange={e => setNewGameDisabledReason(e.target.value)}
                  placeholder="مثال: صيانة سيرفرات اللعبة أو توقف الشحن مؤقتاً"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/30 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddGameModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {editingGameId ? 'حفظ التعديلات' : 'إضافة اللعبة'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 📁 MODAL: ADD / EDIT SECTION */}
      {/* ============================================================= */}
      {isSectionModalOpen && (
        <Modal
          isOpen={isSectionModalOpen}
          onClose={() => setIsSectionModalOpen(false)}
          title={editingSectionId ? '✏️ تعديل القسم' : '📂 إضافة قسم جديد'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveSection} className="space-y-4 text-right text-xs">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اسم القسم *</label>
              <input
                type="text"
                value={sectionNameInput}
                onChange={e => setSectionNameInput(e.target.value)}
                placeholder="مثال: باقات الشحن اليومية أو العضويات"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                required
                autoFocus
              />
            </div>

            {/* Section Media (Device Upload: Image / Video) */}
            <MediaUploadField
              mediaUrl={sectionImageInput}
              onChange={url => setSectionImageInput(url)}
              onClear={() => setSectionImageInput('')}
              label="صورة أو فيديو القسم (من جهازك 🖼️/🎬)"
            />

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">وصف القسم (اختياري 📝)</label>
              <textarea
                rows={2}
                value={sectionDescriptionInput}
                onChange={e => setSectionDescriptionInput(e.target.value)}
                placeholder="نبذة عن محتويات هذا القسم..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
              <label className="flex items-center justify-between cursor-pointer font-bold select-none">
                <span>حالة توفر القسم (Active)</span>
                <input
                  type="checkbox"
                  checked={sectionIsActive}
                  onChange={e => setSectionIsActive(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded"
                />
              </label>
            </div>

            {!sectionIsActive && (
              <div>
                <label className="block font-bold text-rose-500 mb-1">سبب التعطيل ⚠️</label>
                <input
                  type="text"
                  value={sectionDisabledReason}
                  onChange={e => setSectionDisabledReason(e.target.value)}
                  placeholder="سبب عدم التوفر..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/30 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSectionModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm">
                حفظ القسم
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 📑 MODAL: ADD / EDIT GROUP */}
      {/* ============================================================= */}
      {isGroupModalOpen && (
        <Modal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          title={editingGroupId ? '✏️ تعديل المجموعة' : '📑 إضافة مجموعة جديدة داخل القسم'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveGroup} className="space-y-4 text-right text-xs">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اسم المجموعة *</label>
              <input
                type="text"
                value={groupNameInput}
                onChange={e => setGroupNameInput(e.target.value)}
                placeholder="مثال: باقات الخصم 50% أو شحن بطاقات الهدايا"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                required
                autoFocus
              />
            </div>

            {/* Group Media (Device Upload: Image / Video) */}
            <MediaUploadField
              mediaUrl={groupImageInput}
              onChange={url => setGroupImageInput(url)}
              onClear={() => setGroupImageInput('')}
              label="صورة أو فيديو المجموعة (من جهازك 🖼️/🎬)"
            />

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">وصف المجموعة (اختياري 📝)</label>
              <textarea
                rows={2}
                value={groupDescriptionInput}
                onChange={e => setGroupDescriptionInput(e.target.value)}
                placeholder="نبذة عن هذه المجموعة..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
              <label className="flex items-center justify-between cursor-pointer font-bold select-none">
                <span>حالة توفر المجموعة (Active)</span>
                <input
                  type="checkbox"
                  checked={groupIsActive}
                  onChange={e => setGroupIsActive(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded"
                />
              </label>
            </div>

            {!groupIsActive && (
              <div>
                <label className="block font-bold text-rose-500 mb-1">سبب التعطيل ⚠️</label>
                <input
                  type="text"
                  value={groupDisabledReason}
                  onChange={e => setGroupDisabledReason(e.target.value)}
                  placeholder="سبب عدم التوفر..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/30 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsGroupModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm">
                حفظ المجموعة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 📦 MODAL: ADD / EDIT PRODUCT */}
      {/* ============================================================= */}
      {isProductModalOpen && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={editingProductId ? '✏️ تعديل بيانات وتسعير المنتج' : '➕ إضافة منتج جديد إلى الشجرة'}
          maxWidth="4xl"
        >
          <form onSubmit={handleSaveProduct} className="space-y-4 text-right text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اللعبة *</label>
                <select
                  value={prodGameId}
                  onChange={e => {
                    setProdGameId(e.target.value);
                    const targetGame = games.find(g => g.id === e.target.value);
                    setProdSectionId(targetGame?.sections[0]?.id || '');
                    setProdGroupId('');
                  }}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                  required
                >
                  {games.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">القسم *</label>
                <select
                  value={prodSectionId}
                  onChange={e => {
                    setProdSectionId(e.target.value);
                    setProdGroupId('');
                  }}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                  required
                >
                  {(games.find(g => g.id === prodGameId)?.sections || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">المجموعة (اختياري)</label>
                <select
                  value={prodGroupId}
                  onChange={e => setProdGroupId(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="">-- بدون مجموعة (مباشر داخل القسم) --</option>
                  {(games.find(g => g.id === prodGameId)?.groups || [])
                    .filter(grp => grp.sectionId === prodSectionId)
                    .map(grp => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اسم المنتج / الباقة *</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="مثال: شحن 520 جوهرة فري فاير"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">كود المنتج (SKU)</label>
                <input
                  type="text"
                  value={prodSku}
                  onChange={e => setProdSku(e.target.value)}
                  placeholder="FF-520-D"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
              </div>
            </div>

            {/* Image & Description */}
            {/* Product Media (Device Upload: Image / Video) */}
            <MediaUploadField
              mediaUrl={prodImage}
              onChange={url => setProdImage(url)}
              onClear={() => setProdImage('')}
              label="صورة أو فيديو الباقة / المنتج (من جهازك 🖼️/🎬)"
            />

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">وصف المنتج (اختياري 📝)</label>
              <input
                type="text"
                value={prodDescription}
                onChange={e => setProdDescription(e.target.value)}
                placeholder="ملاحظات أو تفاصيل إضافية عن الباقة..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>

            {/* JKR Wallets Priority & Points Integration */}
            <JKRProductWalletPrioritySelect
              subWallets={jkrWallets.filter(w => w.type === 'SUB')}
              primaryWalletId={prodPrimaryWalletId}
              onPrimaryWalletChange={setProdPrimaryWalletId}
              alternativeWalletIds={prodAlternativeWalletIds}
              onAlternativeWalletsChange={setProdAlternativeWalletIds}
              pointsCostPerUnit={prodPointsCost}
              onPointsCostChange={setProdPointsCost}
              onApplyCalculatedCostUSD={setProdCostUSD}
            />


            {/* إعدادات المنتج: تفعيل/تعطيل الكاش باك والإحالة */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2 text-right">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block">
                إعدادات المنتج ومزايا العميل
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-xs p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                  <input
                    type="checkbox"
                    checked={prodIsCashbackEnabled}
                    onChange={e => setProdIsCashbackEnabled(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <span className="text-zinc-900 dark:text-zinc-100 block">تفعيل الكاش باك لهذا المنتج</span>
                    <span className="text-[10px] text-zinc-400 font-normal">يتم احتسابه وإيداعه للعميل وخصمه من الربح</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-xs p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                  <input
                    type="checkbox"
                    checked={prodIsReferralEnabled}
                    onChange={e => setProdIsReferralEnabled(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <div>
                    <span className="text-zinc-900 dark:text-zinc-100 block">تفعيل الإحالة لهذا المنتج</span>
                    <span className="text-[10px] text-zinc-400 font-normal">تُصرف للمُحيل، وإن عُطّلت تعود لربح الشركة</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block">نظام وتحديد تسعير الباقة</span>
                  <span className="text-[10px] text-zinc-400">اختر طريقة تسعير المنتج (آلي عبر المحرك أو يدوي مباشر)</span>
                </div>

                {/* Segmented Switch */}
                <div className="flex items-center bg-gray-200 dark:bg-[#27272A] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setProdAutoPricing(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      prodAutoPricing
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تسعير آلي مركزي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdAutoPricing(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      !prodAutoPricing
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تسعير يدوي مخصص</span>
                  </button>
                </div>
              </div>

              {prodAutoPricing ? (
                /* Central Pricing Active */
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* التكلفة الحالية بالدولار (يدوي 100% غير مرتبط بالمحافظ أو FIFO) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-zinc-600 dark:text-zinc-400">التكلفة الحالية بالدولار (يدوي 100%) *</label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodCostUSD}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdCostUSD(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pl-12 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold focus:border-orange-500"
                        />
                        <span className="absolute left-2.5 top-2 text-zinc-400 font-bold text-xs pointer-events-none">USD</span>
                      </div>
                      {livePricing.costEGP > 0 && (
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1 flex items-center justify-between">
                          <span>التكلفة (C):</span>
                          <strong className="text-orange-500 font-bold">{livePricing.costEGP.toLocaleString()} ج</strong>
                        </div>
                      )}
                    </div>

                    {/* هامش الربح */}
                    <div>
                      <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">هامش الربح (P %)</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodProfitMarginPercent}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdProfitMarginPercent(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold focus:border-orange-500"
                        />
                        <span className="absolute left-2.5 top-2 text-zinc-400 font-bold text-xs pointer-events-none">%</span>
                      </div>
                    </div>

                    {/* كاش باك */}
                    <div>
                      <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">% CashBack</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodCashbackPercent}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdCashbackPercent(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold focus:border-orange-500"
                        />
                        <span className="absolute left-2.5 top-2 text-zinc-400 font-bold text-xs pointer-events-none">%</span>
                      </div>
                    </div>

                    {/* إحالة */}
                    <div>
                      <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">% Referral</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodReferralPercent}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdReferralPercent(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold focus:border-orange-500"
                        />
                        <span className="absolute left-2.5 top-2 text-zinc-400 font-bold text-xs pointer-events-none">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions breakdown: Reserve %, Development %, Fixed Cost F */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Reserve % (الاحتياطي) */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-xs">
                      <label className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold block mb-1">% Reserve (الاحتياطي)</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodReservePercent}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdReservePercent(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full bg-transparent outline-none font-mono font-bold text-zinc-900 dark:text-zinc-100 pl-6"
                        />
                        <span className="absolute left-1 top-0 text-zinc-400 font-bold text-xs pointer-events-none">%</span>
                      </div>
                    </div>

                    {/* Development % (صندوق التطوير) */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-xs">
                      <label className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold block mb-1">% Development (صندوق التطوير)</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodDevelopmentPercent}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdDevelopmentPercent(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full bg-transparent outline-none font-mono font-bold text-zinc-900 dark:text-zinc-100 pl-6"
                        />
                        <span className="absolute left-1 top-0 text-zinc-400 font-bold text-xs pointer-events-none">%</span>
                      </div>
                    </div>

                    {/* المصروف الثابت للباقة (F جنيه) */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 text-xs">
                      <label className="text-orange-500 text-[10px] font-bold block mb-1">المصروف الثابت للباقة (F جنيه)</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodFixedCost}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdFixedCost(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="0.00"
                          className="w-full bg-transparent outline-none font-mono font-bold text-zinc-900 dark:text-zinc-100 pl-6"
                        />
                        <span className="absolute left-1 top-0 text-zinc-400 font-bold text-xs pointer-events-none">ج</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Final Selling Price & Recalculate Button */}
                  <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-orange-400 block">سعر البيع النهائي للعميل (S):</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-mono font-black text-orange-500">
                          {livePricing.finalSellingPriceEGP} ج
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          (التكلفة: {livePricing.costEGP} ج | هامش الربح: {livePricing.targetMarkupEGP} ج)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Manual Pricing Active: SHOW ONLY Manual Price! Fully decoupled from auto pricing */
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>التسعير اليدوي المباشر:</strong> هذا المنتج يعمل بسعر بيع يدوي محدد بالجنيه، مفصول تماماً عن سعر صرف الدولار وحسابات الهوامش. يمكنك تشغيله وبيعه فوراً في تذاكر الشحن.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Customer Manual Selling Price */}
                    <div>
                      <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                        سعر البيع للعملاء (قطاعي - جنيه) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodCustomSellingPrice}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdCustomSellingPrice(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder="مثال: 150"
                          className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 p-2.5 pl-10 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-base focus:border-orange-500 shadow-xs"
                          required={!prodAutoPricing}
                        />
                        <span className="absolute left-3 top-3 text-zinc-400 font-bold text-xs pointer-events-none">ج.م</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block mt-1">
                        السعر الذي يظهر للزبون عند طلب هذا المنتج في تذاكر الشحن.
                      </span>
                    </div>

                    {/* Dealer Manual Selling Price */}
                    <div>
                      <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                        سعر البيع للتجار والموزعين (جملة - جنيه)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prodDealerCustomPrice}
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setProdDealerCustomPrice(val);
                          }}
                          onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                          placeholder={prodCustomSellingPrice ? String(prodCustomSellingPrice) : "0.00"}
                          className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-purple-500/40 p-2.5 pl-10 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-base focus:border-purple-500 shadow-xs"
                        />
                        <span className="absolute left-3 top-3 text-purple-400 font-bold text-xs pointer-events-none">ج.م</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block mt-1">
                        (اختياري) إذا تُرك فارغاً سيتم اعتماد نفس سعر العملاء في تذاكر الجملة.
                      </span>
                    </div>
                  </div>

                  {/* Manual Cost (Optional) */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1">
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                      تكلفة المنتج بالجنيه (اختياري - لحساب صافي الربح في التقارير المالية والتذاكر)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={prodManualCostEGP}
                        onChange={e => {
                          const val = e.target.value.replace(/,/g, '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) setProdManualCostEGP(val);
                        }}
                        onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                        placeholder="0.00"
                        className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 pl-10 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-bold text-xs"
                      />
                      <span className="absolute left-3 top-2 text-zinc-400 font-bold text-xs pointer-events-none">ج.م</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Status & Disabled Reason */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
              <label className="flex items-center justify-between cursor-pointer font-bold select-none">
                <span>حالة توفر المنتج (Active)</span>
                <input
                  type="checkbox"
                  checked={prodIsActive}
                  onChange={e => setProdIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded"
                />
              </label>
            </div>

            {!prodIsActive && (
              <div>
                <label className="block font-bold text-rose-500 mb-1">سبب التعطيل (يظهر كتحذير ⚠️ للموظف)</label>
                <input
                  type="text"
                  value={prodDisabledReason}
                  onChange={e => setProdDisabledReason(e.target.value)}
                  placeholder="مثال: نفاد المخزون أو صيانة المزود"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/30 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsProductModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm">
                حفظ المنتج
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 🔄 MODAL: QUICK MOVE PRODUCT TO ANOTHER GAME/SECTION/GROUP */}
      {/* ============================================================= */}
      {quickMoveProduct && (
        <Modal
          isOpen={!!quickMoveProduct}
          onClose={() => setQuickMoveProduct(null)}
          title={`🔄 نقل وتغيير مكان "${quickMoveProduct.name}"`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveQuickMoveProduct} className="space-y-4 text-right text-xs">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs">
              حدد الوجهة الجديدة (اللعبة أو القسم أو المجموعة) لنقل هذا المنتج وتغيير مكانه فوراً، مع الحفاظ الكامل على كافة الإعدادات والأسعار والأكواد والمحافظ المرتبطة.
            </div>

            {/* Current Location Display */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
              <span className="text-[11px] font-bold text-zinc-500 block">الموقع الحالي:</span>
              <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 flex-wrap">
                <span>{games.find(g => g.id === quickMoveProduct.gameId)?.name || quickMoveProduct.gameName || 'اللعبة الحالية'}</span>
                <span className="text-zinc-400">›</span>
                <span>{games.find(g => g.id === quickMoveProduct.gameId)?.sections.find(s => s.id === quickMoveProduct.sectionId)?.name || quickMoveProduct.sectionName || 'القسم'}</span>
                {quickMoveProduct.groupId && (
                  <>
                    <span className="text-zinc-400">›</span>
                    <span className="text-orange-500">{games.find(g => g.id === quickMoveProduct.gameId)?.groups?.find(gr => gr.id === quickMoveProduct.groupId)?.name || quickMoveProduct.groupName || 'المجموعة'}</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اللعبة المستهدفة *</label>
              <select
                value={targetMoveGameId}
                onChange={e => {
                  setTargetMoveGameId(e.target.value);
                  const targetG = games.find(g => g.id === e.target.value);
                  setTargetMoveSectionId(targetG?.sections[0]?.id || '');
                  setTargetMoveGroupId('');
                }}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                required
              >
                {games.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">القسم المستهدَف *</label>
              <select
                value={targetMoveSectionId}
                onChange={e => {
                  setTargetMoveSectionId(e.target.value);
                  setTargetMoveGroupId('');
                }}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                required
              >
                {(games.find(g => g.id === targetMoveGameId)?.sections || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">المجموعة المستهدفة (اختياري)</label>
              <select
                value={targetMoveGroupId}
                onChange={e => setTargetMoveGroupId(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none"
              >
                <option value="">-- بدون مجموعة (مباشر داخل القسم) --</option>
                {(games.find(g => g.id === targetMoveGameId)?.groups || [])
                  .filter(grp => grp.sectionId === targetMoveSectionId)
                  .map(grp => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickMoveProduct(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={<FolderInput className="w-4 h-4" />}>
                تأكيد النقل وحفظ المكان
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 🔄 MODAL: QUICK MOVE GROUP WITH ALL CHILD PRODUCTS */}
      {/* ============================================================= */}
      {quickMoveGroup && (
        <Modal
          isOpen={!!quickMoveGroup}
          onClose={() => setQuickMoveGroup(null)}
          title={`🔄 نقل المجموعة "${quickMoveGroup.group.name}" بالكامل`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveQuickMoveGroup} className="space-y-4 text-right text-xs">
            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 space-y-1">
              <strong className="block font-bold">نقل ذري متكامل لكافة المنتجات:</strong>
              <p className="text-[11px] leading-relaxed">
                سيتم نقل هذه المجموعة مع كافة المنتجات التابعة لها تلقائياً إلى القسم الجديد دون الحاجة لنقل المنتجات فرادى، مع الحفاظ الكامل على كافة الإعدادات والأسعار والأكواد.
              </p>
            </div>

            {/* Current Location */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
              <span className="text-[11px] font-bold text-zinc-500 block">الموقع الحالي:</span>
              <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200">
                <span>{games.find(g => g.id === quickMoveGroup.gameId)?.name}</span>
                <span className="text-zinc-400">›</span>
                <span>{games.find(g => g.id === quickMoveGroup.gameId)?.sections.find(s => s.id === quickMoveGroup.sectionId)?.name}</span>
                <span className="text-zinc-400">›</span>
                <span className="text-orange-500">{quickMoveGroup.group.name}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اللعبة المستهدفة *</label>
              <select
                value={targetMoveGroupGameId}
                onChange={e => {
                  setTargetMoveGroupGameId(e.target.value);
                  const targetG = games.find(g => g.id === e.target.value);
                  setTargetMoveGroupSectionId(targetG?.sections[0]?.id || '');
                }}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                required
              >
                {games.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">القسم المستهدف *</label>
              <select
                value={targetMoveGroupSectionId}
                onChange={e => setTargetMoveGroupSectionId(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                required
              >
                {(games.find(g => g.id === targetMoveGroupGameId)?.sections || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickMoveGroup(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={<FolderInput className="w-4 h-4" />}>
                تأكيد نقل المجموعة ومنتجاتها
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 📦 MODAL: BATCH MOVE SELECTED PRODUCTS */}
      {/* ============================================================= */}
      {isBatchMoveOpen && (
        <Modal
          isOpen={isBatchMoveOpen}
          onClose={() => setIsBatchMoveOpen(false)}
          title={`🔄 نقل جماعي لـ (${selectedProductIds.size}) منتج`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveBatchMove} className="space-y-4 text-right text-xs">
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 space-y-1">
              <strong className="block font-bold">تم اختيار {selectedProductIds.size} منتج للنقل دفعة واحدة:</strong>
              <p className="text-[11px] leading-relaxed">
                حدد الوجهة الجديدة. سيتم نقل كافة المنتجات المحددة وتحديث تبعيتها دون المساس ببياناتها، أو سجل مبيعاتها، أو محافظها.
              </p>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">اللعبة المستهدفة *</label>
              <select
                value={batchTargetGameId}
                onChange={e => {
                  setBatchTargetGameId(e.target.value);
                  const targetG = games.find(g => g.id === e.target.value);
                  setBatchTargetSectionId(targetG?.sections[0]?.id || '');
                  setBatchTargetGroupId('');
                }}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                required
              >
                {games.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">القسم المستهدف *</label>
              <select
                value={batchTargetSectionId}
                onChange={e => {
                  setBatchTargetSectionId(e.target.value);
                  setBatchTargetGroupId('');
                }}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
                required
              >
                {(games.find(g => g.id === batchTargetGameId)?.sections || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">المجموعة المستهدفة (اختياري)</label>
              <select
                value={batchTargetGroupId}
                onChange={e => setBatchTargetGroupId(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none"
              >
                <option value="">-- بدون مجموعة (مباشر داخل القسم) --</option>
                {(games.find(g => g.id === batchTargetGameId)?.groups || [])
                  .filter(grp => grp.sectionId === batchTargetSectionId)
                  .map(grp => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBatchMoveOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={<FolderInput className="w-4 h-4" />}>
                نقل كافة ({selectedProductIds.size}) المنتجات الآن
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 📥 MODAL: CONFIRM DRAG & DROP MOVE */}
      {/* ============================================================= */}
      {dropConfirm && (
        <Modal
          isOpen={!!dropConfirm}
          onClose={() => setDropConfirm(null)}
          title={dropConfirm.title}
          maxWidth="md"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
              <span className="font-bold">هل أنت متأكد من رغبتك في نقل هذا العنصر عبر السحب والإفلات؟</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
              <div>
                <span className="text-[11px] text-zinc-500 block">العنصر المراد نقله:</span>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{dropConfirm.itemName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <div>
                  <span className="text-[10px] text-zinc-500 block">الموقع السابق:</span>
                  <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{dropConfirm.fromPath}</span>
                </div>
                <div>
                  <span className="text-[10px] text-orange-500 block font-bold">الوجهة الجديدة:</span>
                  <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">{dropConfirm.toPath}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setDropConfirm(null)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<FolderInput className="w-4 h-4" />}
                onClick={() => {
                  dropConfirm.onConfirm();
                }}
              >
                تأكيد النقل الآن
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 📜 MODAL: MOVE AUDIT LOG */}
      {/* ============================================================= */}
      {isMoveAuditModalOpen && (
        <Modal
          isOpen={isMoveAuditModalOpen}
          onClose={() => setIsMoveAuditModalOpen(false)}
          title="📜 سجل عمليات نقل وترتيب المنتجات والمجموعات"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                يعرض هذا السجل كافة عمليات النقل والترتيب الأخيرة التي تمت في النظام لضمان التتبع والأمان.
              </span>
              {moveAuditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('sys_catalog_move_audit_logs');
                    setMoveAuditLogs([]);
                    showToast('info', 'تم مسح السجل', 'تم تفريغ سجل عمليات النقل المحلية');
                  }}
                  className="text-[11px] text-rose-500 hover:underline font-bold"
                >
                  مسح السجل
                </button>
              )}
            </div>

            {moveAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 border border-dashed border-gray-200 dark:border-[#27272A] rounded-2xl">
                <History className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p>لا توجد أي عمليات نقل مسجلة حتى الآن.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {moveAuditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.itemType === 'group'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : log.itemType === 'batch_products'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        }`}>
                          {log.itemType === 'group' ? 'مجموعة' : log.itemType === 'batch_products' ? 'نقل جماعي' : 'منتج'}
                        </span>
                        <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{log.itemName}</strong>
                        {log.count && log.count > 1 && (
                          <span className="text-[10px] text-zinc-400">({log.count} عنصر)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap font-mono">
                        <span className="text-zinc-400">{log.sourcePath}</span>
                        <ArrowRight className="w-3 h-3 text-orange-500" />
                        <span className="text-orange-600 dark:text-orange-400 font-bold">{log.targetPath}</span>
                      </div>
                    </div>

                    <div className="text-left text-[10px] text-zinc-400 shrink-0">
                      <div>بواسطة: {log.performedBy}</div>
                      <div>{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} - {new Date(log.timestamp).toLocaleDateString('ar-EG')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMoveAuditModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}



      {/* ============================================================= */}
      {/* ✏️ MODAL: QUICK FIRST SHIPMENT PRICE EDIT */}
      {/* ============================================================= */}
      {quickEditPriceProduct && (
        <Modal
          isOpen={!!quickEditPriceProduct}
          onClose={() => setQuickEditPriceProduct(null)}
          title={`✏️ تعديل سعر "${quickEditPriceProduct.name}"`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveQuickPrice} className="space-y-4 text-right text-xs">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">سعر أول شحنة الترويجي (جنيه) *</label>
              <input
                type="number"
                min="1"
                value={quickFirstOrderPrice}
                onChange={e => setQuickFirstOrderPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-purple-500/40 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-black text-sm outline-none text-purple-400"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">سعر الشحن العادي (جنيه) *</label>
              <input
                type="number"
                min="1"
                value={quickRegularPrice}
                onChange={e => setQuickRegularPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-black text-sm outline-none text-orange-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickEditPriceProduct(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm">
                تأكيد وحفظ السعر
              </Button>
            </div>
          </form>
        </Modal>
      )}


      {/* ============================================================= */}
      {/* 📋 MODAL: COPY TEMPLATES */}
      {/* ============================================================= */}
      {isCopyTemplatesOpen && (
        <CopyTemplatesModal
          isOpen={isCopyTemplatesOpen}
          onClose={() => {
            setIsCopyTemplatesOpen(false);
            setSelectedGameForCopySettings(undefined);
          }}
          initialGameId={selectedGameForCopySettings}
        />
      )}

      {/* ============================================================= */}
      {/* 🧮 MODAL: PRICING BREAKDOWN DETAILS */}
      {/* ============================================================= */}
      {selectedBreakdown && (
        <PricingBreakdownModal
          isOpen={!!selectedBreakdown}
          onClose={() => setSelectedBreakdown(null)}
          breakdown={selectedBreakdown}
          title={`تفاصيل تسعير: ${breakdownProductName}`}
        />
      )}
      {/* ============================================================= */}
      {/* 💼 JKR WALLET MODALS (CREATE, FUNDING, DEPOSIT, DETAILS, DELETE) */}
      {/* ============================================================= */}
      <JKRWalletCreateModal
        isOpen={isCreateWalletOpen}
        onClose={() => setIsCreateWalletOpen(false)}
        onCreated={() => loadData()}
        mainWallets={jkrWallets.filter(w => w.type === 'MAIN' && (w.isActive !== false))}
        department={department}
      />

      {selectedWalletForFunding && (
        <JKRMainWalletFundingModal
          isOpen={!!selectedWalletForFunding}
          onClose={() => setSelectedWalletForFunding(null)}
          wallet={selectedWalletForFunding}
          onSuccess={() => loadData()}
          department={department}
        />
      )}

      {selectedWalletForWithdraw && (
        <JKRMainWalletWithdrawModal
          isOpen={!!selectedWalletForWithdraw}
          onClose={() => setSelectedWalletForWithdraw(null)}
          wallet={selectedWalletForWithdraw}
          onSuccess={() => loadData()}
        />
      )}

      {selectedWalletForDeposit && (
        <JKRSubWalletDepositModal
          isOpen={!!selectedWalletForDeposit}
          onClose={() => setSelectedWalletForDeposit(null)}
          wallet={selectedWalletForDeposit}
          mainWallets={jkrWallets.filter(w => w.type === 'MAIN' && (w.isActive !== false))}
          onSuccess={() => loadData()}
        />
      )}

      {selectedWalletForDetails && (
        <JKRWalletDetailsModal
          isOpen={!!selectedWalletForDetails}
          onClose={() => setSelectedWalletForDetails(null)}
          wallet={selectedWalletForDetails}
          onUpdated={() => loadData()}
          onOpenDepositModal={
            selectedWalletForDetails.type === 'SUB'
              ? () => {
                const target = selectedWalletForDetails;
                setSelectedWalletForDetails(null);
                setSelectedWalletForDeposit(target);
              }
              : undefined
          }
          onOpenFundingModal={
            selectedWalletForDetails.type === 'MAIN'
              ? () => {
                const target = selectedWalletForDetails;
                setSelectedWalletForDetails(null);
                setSelectedWalletForFunding(target);
              }
              : undefined
          }
          onOpenDeleteModal={
            isOwner
              ? () => {
                const target = selectedWalletForDetails;
                setSelectedWalletForDetails(null);
                setSelectedWalletForDelete(target);
              }
              : undefined
          }
        />
      )}

      {selectedWalletForDelete && (
        <JKRWalletDeleteModal
          isOpen={!!selectedWalletForDelete}
          wallet={selectedWalletForDelete}
          onClose={() => setSelectedWalletForDelete(null)}
          onDeleted={() => loadData()}
        />
      )}
    </div>
  );
};

// =============================================================
// SUB-COMPONENT: PRODUCT CARD (Level 4 in Hierarchy)
// =============================================================
interface ProductCardProps {
  product: GameProduct;
  game: GameTreeItem;
  section?: GameSection;
  group?: GameGroup;
  isOwner: boolean;
  isExpandedDesc: boolean;
  onToggleDesc: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenBreakdown: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onQuickMove?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  game,
  section,
  group,
  isOwner,
  isExpandedDesc,
  onToggleDesc,
  onCopy,
  onEdit,
  onDelete,
  onOpenBreakdown,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onQuickMove,
  isSelected,
  onToggleSelect,
  onDragStart
}) => {
  const isProdActive = product.isActive !== false;
  const isOutOfStock = product.availableQuantity !== undefined && product.availableQuantity !== null && product.availableQuantity <= 0;

  return (
    <div
      draggable={isOwner}
      onDragStart={onDragStart}
      className={`p-3 rounded-2xl border transition-all space-y-2.5 shadow-xs relative group ${
        isSelected
          ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/40'
          : !isProdActive || isOutOfStock
          ? 'bg-rose-500/5 border-rose-500/30'
          : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/50'
      }`}
    >
      {/* Top: Product Name, Drag Handle, Select Box & Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Multi-Select Checkbox */}
          {isOwner && onToggleSelect && (
            <button
              type="button"
              onClick={onToggleSelect}
              className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'text-orange-500'
                  : 'text-zinc-300 dark:text-zinc-600 hover:text-orange-500'
              }`}
              title={isSelected ? 'إلغاء تحديد المنتج' : 'تحديد المنتج للنقل الجماعي'}
            >
              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          )}

          {/* Drag Handle */}
          {isOwner && (
            <div
              className="text-zinc-300 dark:text-zinc-600 hover:text-orange-500 cursor-grab active:cursor-grabbing p-0.5 shrink-0"
              title="اسحب هذا المنتج لإسقاطه في أي مجموعة أو قسم"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          {product.image && (
            <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover border border-gray-200 dark:border-[#27272A] shrink-0" />
          )}

          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{product.name}</strong>

              {/* Manual pricing badge */}
              {(product.useCustomPricing || product.autoPricingEnabled === false) && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  ✍️ تسعير يدوي
                </span>
              )}

              {/* Description Info Icon ℹ️ */}
              {product.description && (
                <button
                  type="button"
                  onClick={onToggleDesc}
                  className="p-0.5 rounded text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                  title={product.description}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Disabled Reason Alert Icon ⚠️ */}
              {(!isProdActive || isOutOfStock) && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1"
                  title={product.disabledReason || (isOutOfStock ? 'نفدت الكمية' : 'معطل')}
                >
                  <AlertTriangle className="w-3 h-3" /> غير متاح الآن
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono block">{product.sku}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Move & Reordering - Admin Only */}
          {isOwner && (
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-[#202024] p-0.5 rounded-lg border border-gray-200 dark:border-[#27272A] ml-1">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="p-1 rounded text-zinc-400 hover:text-orange-500 hover:bg-white dark:hover:bg-[#2a2a2f] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="تحريك لأعلى"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="p-1 rounded text-zinc-400 hover:text-orange-500 hover:bg-white dark:hover:bg-[#2a2a2f] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="تحريك لأسفل"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              {onQuickMove && (
                <button
                  type="button"
                  onClick={onQuickMove}
                  className="p-1 rounded text-zinc-400 hover:text-orange-500 hover:bg-white dark:hover:bg-[#2a2a2f] transition-all cursor-pointer"
                  title="نقل المنتج لقسم/مجموعة أخرى"
                >
                  <FolderInput className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Pricing breakdown button - Admin Only */}
          {isOwner && (
            <button
              type="button"
              onClick={onOpenBreakdown}
              className="p-1 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              title="عرض تفاصيل التسعير والمعادلة"
            >
              <Calculator className="w-3.5 h-3.5" />
            </button>
          )}


          <button
            type="button"
            onClick={onCopy}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272A] text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
            title="نسخ بالقالب"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272A] text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                title="تعديل"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description Expanded Box */}
      {isExpandedDesc && product.description && (
        <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-400 font-semibold animate-fade-in">
          {product.description}
        </div>
      )}

      {/* Price Bar */}
      <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228] flex items-center justify-between font-mono text-xs">
        <span className="text-[11px] text-zinc-400 font-bold">
          {(product.useCustomPricing || product.autoPricingEnabled === false) ? 'سعر البيع اليدوي (قطاعي):' : 'سعر البيع النهائي (S):'}
        </span>
        <div className="flex items-center gap-2">
          <strong className="text-orange-500 font-black text-sm">
            {formatCurrency(PricingEngine.getEffectiveProductPrice(product, { isDealer: false }))}
          </strong>
          {product.dealerPriceEGP && product.dealerPriceEGP !== (product.calculatedPriceEGP || product.customSellingPriceEGP) && (
            <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20" title="سعر الجملة للتجار">
              جملة: {formatCurrency(PricingEngine.getEffectiveProductPrice(product, { isDealer: true }))}
            </span>
          )}
        </div>
      </div>

      {/* Complete Pricing Breakdown Strip - Admin Only */}
      {isOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228] font-mono text-[10px] text-zinc-400">
          <div>
            <span>التكلفة C:</span>
            <strong className="text-zinc-800 dark:text-zinc-200 block">
              {product.costPriceEGP ? `${product.costPriceEGP} ج` : `$${product.costUSD}`}
            </strong>
          </div>
          <div>
            <span>الهامش P%:</span>
            <strong className="text-emerald-500 block">
              {product.profitMarginPercent}%
            </strong>
          </div>
          <div>
            <span>الكاش باك:</span>
            <strong className={product.isCashbackEnabled !== false ? 'text-amber-500 block' : 'text-zinc-500 block'}>
              {product.isCashbackEnabled !== false ? `${product.cashbackPercent}%` : 'معطل'}
            </strong>
          </div>
          <div>
            <span>الإحالة:</span>
            <strong className={product.isReferralEnabled !== false ? 'text-purple-400 block' : 'text-zinc-500 block'}>
              {product.isReferralEnabled !== false ? `${product.partnerCommissionPercent}%` : 'معطل'}
            </strong>
          </div>
        </div>
      )}

      {/* Quantity & Points Cost Chips */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-0.5">
        <span>
          الكمية: {product.availableQuantity !== undefined && product.availableQuantity !== null ? `${product.availableQuantity} متبقي` : 'غير محدود ♾️'}
        </span>
        {product.pointsCostPerUnit ? (
          <span className="text-orange-500 font-bold">
            {product.pointsCostPerUnit} نقطة
          </span>
        ) : null}
      </div>
    </div>
  );
};
