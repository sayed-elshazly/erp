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
