export const SYSTEM_EVENTS = {
  // Navigation & UI
  NAVIGATE: 'system:navigate',
  OPEN_TAB: 'system:open_tab',
  CLOSE_TAB: 'system:close_tab',
  TRIGGER_SEARCH_FOCUS: 'system:trigger_search_focus',
  TRIGGER_PRINT: 'system:trigger_print',
  TRIGGER_EXPORT: 'system:trigger_export',
  TRIGGER_NEW: 'system:trigger_new',
  TRIGGER_SAVE: 'system:trigger_save',
  RECORD_UNDOABLE_ACTION: 'system:record_undoable_action',

  // Customer Events
  CUSTOMER_CREATED: 'customer:created',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_ARCHIVED: 'customer:archived',
  CUSTOMER_RESTORED: 'customer:restored',
  CUSTOMER_DELETED: 'customer:deleted',
  WALLET_DEPOSIT: 'customer:wallet_deposit',
  WALLET_WITHDRAW: 'customer:wallet_withdraw',
  TICKET_CREATED: 'customer:ticket_created',
  TICKET_UPDATED: 'customer:ticket_updated',

  // Dealer Events
  DEALER_CREATED: 'dealer:created',
  DEALER_UPDATED: 'dealer:updated',

  // Merchant & Supplier Events (Phase 2)
  MERCHANT_CREATED: 'merchant:created',
  MERCHANT_UPDATED: 'merchant:updated',
  MERCHANT_ARCHIVED: 'merchant:archived',
  MERCHANT_RESTORED: 'merchant:restored',
  MERCHANT_DELETED: 'merchant:deleted',
  MERCHANT_INVOICE_CREATED: 'merchant:invoice_created',
  MERCHANT_INVOICE_UPDATED: 'merchant:invoice_updated',
  MERCHANT_INVOICE_PAID: 'merchant:invoice_paid',
  MERCHANT_REMINDER_ADDED: 'merchant:reminder_added',
  MERCHANT_REMINDER_COMPLETED: 'merchant:reminder_completed',
  MERCHANT_REMINDER_OVERDUE: 'merchant:reminder_overdue',
  MERCHANT_TRANSACTION_RECORDED: 'merchant:transaction_recorded',
  MERCHANT_RATING_UPDATED: 'merchant:rating_updated',

  // Finance & Accounting Events
  TRANSACTION_RECORDED: 'finance:transaction_recorded',
  VAULT_UPDATED: 'finance:vault_updated',
  EXPENSE_ADDED: 'finance:expense_added',
  DEBT_UPDATED: 'finance:debt_updated',
  SETTLEMENT_PROCESSED: 'finance:settlement_processed',
  EMPLOYEE_MUTATED: 'finance:employee_mutated',
  PAYROLL_UPDATED: 'finance:payroll_updated',

  // Catalog & Products Events
  PRODUCTS_UPDATED: 'products:updated',
  GAME_UPDATED: 'game:updated',
  WALLET_MUTATED: 'wallet:mutated',
  COUPON_MUTATED: 'coupon:mutated',

  // Competitions & Rewards Events
  COMPETITION_CREATED: 'competition:created',
  COMPETITION_UPDATED: 'competition:updated',
  COMPETITION_DRAW_EXECUTED: 'competition:draw_executed',
  COMPETITION_REWARD_DELIVERED: 'competition:reward_delivered',
  COMPETITION_REWARD_CANCELLED: 'competition:reward_cancelled',
  COMPETITIONS_UPDATED: 'competitions:updated',

  // System & Settings Events
  SETTINGS_UPDATED: 'settings:updated',
  AUDIT_LOGGED: 'audit:logged',
  BACKUP_CREATED: 'system:backup_created',
  BACKUP_RESTORED: 'system:backup_restored'
} as const;

type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  subscribe<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    const callbacks = this.subscribers.get(event)!;
    callbacks.add(callback);

    // Return un-subscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(event);
      }
    };
  }

  publish<T = any>(event: string, data?: T): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for event "${event}":`, error);
        }
      });
    }
  }

  clearAll(): void {
    this.subscribers.clear();
  }
}

export const eventBus = new EventBus();
