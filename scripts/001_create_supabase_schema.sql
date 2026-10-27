-- Migration 001: Create Supabase Schema for Ammar ERP
-- PostgreSQL 17 compatible schema with JSONB data persistence, primary key indexing, and fast lookup indexes.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. users
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. customers
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers ((data->>'phone'));
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers ((data->>'systemCode'));
CREATE INDEX IF NOT EXISTS idx_customers_ref_code ON public.customers ((data->>'referralCode'));
CREATE INDEX IF NOT EXISTS idx_customers_gin ON public.customers USING GIN (data);
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- 3. dealers
CREATE TABLE IF NOT EXISTS public.dealers (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealers_phone ON public.dealers ((data->>'phone'));
CREATE INDEX IF NOT EXISTS idx_dealers_code ON public.dealers ((data->>'systemCode'));
CREATE INDEX IF NOT EXISTS idx_dealers_gin ON public.dealers USING GIN (data);
ALTER TABLE public.dealers DISABLE ROW LEVEL SECURITY;

-- 4. merchants
CREATE TABLE IF NOT EXISTS public.merchants (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchants_phone ON public.merchants ((data->>'phone'));
ALTER TABLE public.merchants DISABLE ROW LEVEL SECURITY;

-- 5. tickets (Retail Tickets)
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets ((data->>'ticketNumber'));
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets ((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON public.tickets ((data->>'customerId'));
CREATE INDEX IF NOT EXISTS idx_tickets_phone ON public.tickets ((data->>'customerPhone'));
CREATE INDEX IF NOT EXISTS idx_tickets_date ON public.tickets ((data->>'createdAt'));
CREATE INDEX IF NOT EXISTS idx_tickets_gin ON public.tickets USING GIN (data);
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;

-- 6. dealer_tickets (Wholesale Tickets)
CREATE TABLE IF NOT EXISTS public.dealer_tickets (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_tickets_number ON public.dealer_tickets ((data->>'ticketNumber'));
CREATE INDEX IF NOT EXISTS idx_dealer_tickets_status ON public.dealer_tickets ((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_dealer_tickets_dealer ON public.dealer_tickets ((data->>'dealerId'));
CREATE INDEX IF NOT EXISTS idx_dealer_tickets_date ON public.dealer_tickets ((data->>'createdAt'));
CREATE INDEX IF NOT EXISTS idx_dealer_tickets_gin ON public.dealer_tickets USING GIN (data);
ALTER TABLE public.dealer_tickets DISABLE ROW LEVEL SECURITY;

-- 7. store_wallets (Retail Wallets w_*)
CREATE TABLE IF NOT EXISTS public.store_wallets (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_wallets_type ON public.store_wallets ((data->>'type'));
CREATE INDEX IF NOT EXISTS idx_store_wallets_gin ON public.store_wallets USING GIN (data);
ALTER TABLE public.store_wallets DISABLE ROW LEVEL SECURITY;

-- 8. store_wallet_transactions (Retail Wallet Ledger)
CREATE TABLE IF NOT EXISTS public.store_wallet_transactions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_tx_wallet ON public.store_wallet_transactions ((data->>'walletId'));
CREATE INDEX IF NOT EXISTS idx_store_tx_order ON public.store_wallet_transactions ((data->>'orderNumber'));
CREATE INDEX IF NOT EXISTS idx_store_tx_date ON public.store_wallet_transactions ((data->>'date'));
CREATE INDEX IF NOT EXISTS idx_store_tx_type ON public.store_wallet_transactions ((data->>'type'));
CREATE INDEX IF NOT EXISTS idx_store_tx_gin ON public.store_wallet_transactions USING GIN (data);
ALTER TABLE public.store_wallet_transactions DISABLE ROW LEVEL SECURITY;

-- 9. dealer_wallets (Wholesale Wallets mw_*)
CREATE TABLE IF NOT EXISTS public.dealer_wallets (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_wallets_type ON public.dealer_wallets ((data->>'type'));
CREATE INDEX IF NOT EXISTS idx_dealer_wallets_gin ON public.dealer_wallets USING GIN (data);
ALTER TABLE public.dealer_wallets DISABLE ROW LEVEL SECURITY;

-- 10. dealer_wallet_transactions (Wholesale Wallet Ledger)
CREATE TABLE IF NOT EXISTS public.dealer_wallet_transactions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_tx_wallet ON public.dealer_wallet_transactions ((data->>'walletId'));
CREATE INDEX IF NOT EXISTS idx_dealer_tx_order ON public.dealer_wallet_transactions ((data->>'orderNumber'));
CREATE INDEX IF NOT EXISTS idx_dealer_tx_date ON public.dealer_wallet_transactions ((data->>'date'));
CREATE INDEX IF NOT EXISTS idx_dealer_tx_gin ON public.dealer_wallet_transactions USING GIN (data);
ALTER TABLE public.dealer_wallet_transactions DISABLE ROW LEVEL SECURITY;

-- 11. deposit_bonds_fifo (FIFO Inventory Lots)
CREATE TABLE IF NOT EXISTS public.deposit_bonds_fifo (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bonds_wallet ON public.deposit_bonds_fifo ((data->>'walletId'));
CREATE INDEX IF NOT EXISTS idx_bonds_status ON public.deposit_bonds_fifo ((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_bonds_gin ON public.deposit_bonds_fifo USING GIN (data);
ALTER TABLE public.deposit_bonds_fifo DISABLE ROW LEVEL SECURITY;

-- 12. safe_transactions (Retail Treasury / Cash Box)
CREATE TABLE IF NOT EXISTS public.safe_transactions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safe_tx_date ON public.safe_transactions ((data->>'date'));
CREATE INDEX IF NOT EXISTS idx_safe_tx_shift ON public.safe_transactions ((data->>'shiftId'));
ALTER TABLE public.safe_transactions DISABLE ROW LEVEL SECURITY;

-- 13. dealer_safe_transactions (Dealer Treasury)
CREATE TABLE IF NOT EXISTS public.dealer_safe_transactions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_safe_tx_date ON public.dealer_safe_transactions ((data->>'date'));
ALTER TABLE public.dealer_safe_transactions DISABLE ROW LEVEL SECURITY;

-- 14. expenses (Retail Operational Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses ((data->>'date'));
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- 15. dealer_expenses (Dealer Expenses)
CREATE TABLE IF NOT EXISTS public.dealer_expenses (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_expenses DISABLE ROW LEVEL SECURITY;

-- 16. debts (Retail Debts & Installments)
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON public.debts ((data->>'customerId'));
ALTER TABLE public.debts DISABLE ROW LEVEL SECURITY;

-- 17. dealer_debts (Dealer Debts)
CREATE TABLE IF NOT EXISTS public.dealer_debts (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_debts_dealer ON public.dealer_debts ((data->>'dealerId'));
ALTER TABLE public.dealer_debts DISABLE ROW LEVEL SECURITY;

-- 18. shift_settlements (Retail Shift Closures & Audits)
CREATE TABLE IF NOT EXISTS public.shift_settlements (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.shift_settlements ((data->>'date'));
ALTER TABLE public.shift_settlements DISABLE ROW LEVEL SECURITY;

-- 19. dealer_settlements (Dealer Shift Settlements)
CREATE TABLE IF NOT EXISTS public.dealer_settlements (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_settlements DISABLE ROW LEVEL SECURITY;

-- 20. employees (Staff)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- 21. dealer_employees
CREATE TABLE IF NOT EXISTS public.dealer_employees (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_employees DISABLE ROW LEVEL SECURITY;

-- 22. attendance
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- 23. dealer_attendance
CREATE TABLE IF NOT EXISTS public.dealer_attendance (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_attendance DISABLE ROW LEVEL SECURITY;

-- 24. salaries
CREATE TABLE IF NOT EXISTS public.salaries (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.salaries DISABLE ROW LEVEL SECURITY;

-- 25. dealer_salaries
CREATE TABLE IF NOT EXISTS public.dealer_salaries (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_salaries DISABLE ROW LEVEL SECURITY;

-- 26. audit_logs (Activity & Security Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.audit_logs ((data->>'timestamp'));
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs ((data->>'action'));
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 27. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 28. competitions
CREATE TABLE IF NOT EXISTS public.competitions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.competitions DISABLE ROW LEVEL SECURITY;

-- 29. competition_participants
CREATE TABLE IF NOT EXISTS public.competition_participants (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_part_comp ON public.competition_participants ((data->>'competitionId'));
CREATE INDEX IF NOT EXISTS idx_comp_part_cust ON public.competition_participants ((data->>'customerId'));
ALTER TABLE public.competition_participants DISABLE ROW LEVEL SECURITY;

-- 30. competition_rewards
CREATE TABLE IF NOT EXISTS public.competition_rewards (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.competition_rewards DISABLE ROW LEVEL SECURITY;

-- 31. competition_draws
CREATE TABLE IF NOT EXISTS public.competition_draws (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.competition_draws DISABLE ROW LEVEL SECURITY;

-- 32. coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons ((data->>'code'));
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

-- 33. merchant_invoices
CREATE TABLE IF NOT EXISTS public.merchant_invoices (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchant_inv_merch ON public.merchant_invoices ((data->>'merchantId'));
ALTER TABLE public.merchant_invoices DISABLE ROW LEVEL SECURITY;

-- 34. merchant_transactions
CREATE TABLE IF NOT EXISTS public.merchant_transactions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchant_tx_merch ON public.merchant_transactions ((data->>'merchantId'));
ALTER TABLE public.merchant_transactions DISABLE ROW LEVEL SECURITY;

-- 35. merchant_reminders
CREATE TABLE IF NOT EXISTS public.merchant_reminders (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.merchant_reminders DISABLE ROW LEVEL SECURITY;

-- 36. merchant_product_rules
CREATE TABLE IF NOT EXISTS public.merchant_product_rules (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.merchant_product_rules DISABLE ROW LEVEL SECURITY;

-- 37. merchant_notes
CREATE TABLE IF NOT EXISTS public.merchant_notes (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.merchant_notes DISABLE ROW LEVEL SECURITY;

-- 38. merchant_files
CREATE TABLE IF NOT EXISTS public.merchant_files (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.merchant_files DISABLE ROW LEVEL SECURITY;

-- 39. customer_notes
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_notes_cust ON public.customer_notes ((data->>'customerId'));
ALTER TABLE public.customer_notes DISABLE ROW LEVEL SECURITY;

-- 40. dealer_notes
CREATE TABLE IF NOT EXISTS public.dealer_notes (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_notes_dealer ON public.dealer_notes ((data->>'dealerId'));
ALTER TABLE public.dealer_notes DISABLE ROW LEVEL SECURITY;

-- 41. middleman_deals
CREATE TABLE IF NOT EXISTS public.middleman_deals (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_middleman_deals_status ON public.middleman_deals ((data->>'status'));
ALTER TABLE public.middleman_deals DISABLE ROW LEVEL SECURITY;

-- 42. middleman_accounts
CREATE TABLE IF NOT EXISTS public.middleman_accounts (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.middleman_accounts DISABLE ROW LEVEL SECURITY;

-- 43. middleman_notifications
CREATE TABLE IF NOT EXISTS public.middleman_notifications (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.middleman_notifications DISABLE ROW LEVEL SECURITY;

-- 44. middleman_followups
CREATE TABLE IF NOT EXISTS public.middleman_followups (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.middleman_followups DISABLE ROW LEVEL SECURITY;

-- 45. subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;

-- 46. subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_customer ON public.subscriptions ((data->>'customerId'));
CREATE INDEX IF NOT EXISTS idx_subs_status ON public.subscriptions ((data->>'status'));
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- 47. subscription_payments
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscription_payments DISABLE ROW LEVEL SECURITY;

-- 48. subscription_notifications
CREATE TABLE IF NOT EXISTS public.subscription_notifications (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscription_notifications DISABLE ROW LEVEL SECURITY;

-- 49. balance_withdrawals
CREATE TABLE IF NOT EXISTS public.balance_withdrawals (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.balance_withdrawals DISABLE ROW LEVEL SECURITY;

-- 50. dealer_balance_withdrawals
CREATE TABLE IF NOT EXISTS public.dealer_balance_withdrawals (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_balance_withdrawals DISABLE ROW LEVEL SECURITY;

-- 51. daily_closures
CREATE TABLE IF NOT EXISTS public.daily_closures (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.daily_closures DISABLE ROW LEVEL SECURITY;

-- 52. dealer_daily_closures
CREATE TABLE IF NOT EXISTS public.dealer_daily_closures (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dealer_daily_closures DISABLE ROW LEVEL SECURITY;

-- 53. marketing_campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.marketing_campaigns DISABLE ROW LEVEL SECURITY;

-- 54. system_kv (Key-Value storage for trees, singleton settings, templates, etc.)
CREATE TABLE IF NOT EXISTS public.system_kv (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_kv DISABLE ROW LEVEL SECURITY;
