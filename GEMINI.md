# Financial & Wallet Architecture Rules (Ammar ERP)

### 1. Ledger Sign & Currency Formatting Invariants
- STRICTLY use `isStoreWalletTxPositive(tx)` from `src/utils/formatters.ts` to determine the financial direction (inflow vs outflow).
- NEVER prepend an explicit minus sign `-` to currency formatting functions without wrapping the amount in `Math.abs()`.
- Outgoing transfers (`transfer_out`), withdrawals, losses, fees, and refunds must strictly map to outgoing/negative flows (`wallet_withdrawal`).

### 2. Cross-Source Ledger Deduplication
- When aggregating unified transaction feeds from multiple tables (e.g. `storeWalletTransactions` and `depositBondsFIFO`), cross-referenced records (such as approved bond deposits) must be explicitly deduplicated to prevent 2x double counting.
- Cleanup utilities (e.g. `cleanupDuplicateWalletTransactions`) must operate on BOTH retail wallets (`STORAGE_KEYS.STORE_WALLETS`) and wholesale dealer wallets (`STORAGE_KEYS.DEALER_WALLETS`).

### 3. Wholesale (`mw_*`) vs Retail (`w_*`) Wallet Isolation
- All automated system wallet debits, credits, and adjustments (`cashback`, `referrals`, `debts`, `profits`) must strictly respect the `isDealer` flag:
  - If `isDealer: true`, route to `getDealerWallets()` (`mw_*`) and persist to `STORAGE_KEYS.DEALER_WALLETS`.
  - If `isDealer: false`, route to `getStoreWallets()` (`w_*`) and persist to `STORAGE_KEYS.STORE_WALLETS`.

### 4. Ticket Lifecycle Financial Parity
- Status transitions to `canceled` or `refunded` must immediately invoke full financial rollbacks (`rollbackTicketFinancials` or `refundTicket`).
- Forgiving shortage debt (`shortageAmount`) and reversing overpayment (`overpaymentAmount`) is mandatory on full refund or cancellation.
- Reconciling ticket edits (`reconcileTicketEdit`) must persist updated tickets to storage BEFORE invoking customer/dealer profile recalculations to prevent auto-reversal of cashback.

### 5. Manual Pricing & FIFO Cost Invariants
- Custom manual prices (`customSellingPriceEGP`, `dealerCustomSellingPriceEGP`) strictly take precedence over formulaic price calculations when `isManualPricing` is active.
- Global catalog recalculations must preserve manual product cost prices (`costPriceEGP`) and avoid zeroing them out.

### 6. Product Wallet Cascading & Multi-Item Parity
- Product points availability evaluation must cascade through `primaryWalletId` -> `walletSources` (by priority) -> `alternativeWalletIds`.
- Support both JKR SubWallets and `StoreWallet` points balances during points consumption and refund restoration.
- `reconcileTicketEdit` must evaluate and reconcile stock across all items in multi-item tickets.

### 7. Referral Hierarchy & Circular Loop Protection
- Enforce strict Ancestry Traversal (`visitedAncestors`) during referral linking to prevent circular referral loops.
- Referral commission payouts and vouchers must strictly separate cash withdrawals (`redeemed`) from wallet balance transfers (`adjustment`).

### 8. Supabase Cloud Database & Storage Architecture Invariants
- **Single Source of Truth**: All operational and financial records are persisted in Supabase (PostgreSQL 17).
- **Reactive In-Memory Caching (0ms UI latency)**: All synchronous `db.getItem` operations query the in-memory cache directly, ensuring zero network lag on UI rendering. Writes (`db.setItem`) update the in-memory cache immediately and dispatch debounced asynchronous upserts to Supabase tables.
- **Table vs System KV Mapping**: Entity collections (users, customers, dealers, tickets, wallets, transactions, competitions, etc.) map to dedicated PostgreSQL tables via `KEY_TO_TABLE_MAP`. Singleton configurations and nested tree states (e.g. `gamesTree`, `systemSettings`) map to `system_kv` as JSONB.
- **Local Storage Decommissioning**: The application must never rely on browser `localStorage` as a primary database. Legacy storage keys (`nzm_jkr_*`, `jkr_*`) are automatically cleared upon hydration to protect against stale data and local storage quota limits.
- **Migration Synchronization**: Any future schema modification must be authored as a versioned `.sql` file in `scripts/` before applying to Supabase.

