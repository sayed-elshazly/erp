import { CustomerTicket, Customer } from '../types/customer.types';
import { Dealer } from '../types/dealer.types';
import { db } from '../database/db';
import { isSamePhoneNumber } from './phoneUtils';

export interface TicketCustomerBalanceSnapshot {
  primaryBalance: number;
  cashbackBalance: number;
  referralBalance: number;
}

/**
 * Calculates or retrieves the exact frozen balance snapshots of a customer
 * at the time of a specific ticket, preventing later transactions from altering historical invoices.
 */
export function getTicketCustomerBalanceSnapshot(
  ticket: CustomerTicket,
  customer?: Customer | Dealer | null
): TicketCustomerBalanceSnapshot {
  // 1. If snapshots are already explicitly preserved on the ticket, use them directly
  const hasCashbackSnap = ticket.cashbackBalanceSnapshot !== undefined && ticket.cashbackBalanceSnapshot !== null;
  const hasPrimarySnap = ticket.primaryBalanceSnapshot !== undefined && ticket.primaryBalanceSnapshot !== null;
  const hasReferralSnap = ticket.referralBalanceSnapshot !== undefined && ticket.referralBalanceSnapshot !== null;

  if (hasCashbackSnap && hasPrimarySnap) {
    return {
      primaryBalance: ticket.primaryBalanceSnapshot!,
      cashbackBalance: Math.max(0, ticket.cashbackBalanceSnapshot!),
      referralBalance: Math.max(0, ticket.referralBalanceSnapshot ?? 0)
    };
  }

  // Resolve matching customer or dealer if not provided
  const client = customer || (ticket.customerId ? (db.getCustomerById(ticket.customerId) || db.getDealerById(ticket.customerId)) : null)
    || db.findCustomerByPhone(ticket.customerPhone)
    || db.findDealerByPhone(ticket.customerPhone)
    || db.getCustomers(true).find(c => isSamePhoneNumber(c.phone, ticket.customerPhone))
    || db.getDealers(true).find(d => isSamePhoneNumber(d.phone, ticket.customerPhone));

  const customerId = client?.id || ticket.customerId;

  // Retrieve ledger transactions if available
  const unifiedTxs = customerId
    ? (db.getUnifiedWalletTransactions(customerId) || [])
    : [];

  const dealerTxs = (client && 'balance' in client && 'totalCashbackEarned' in client)
    ? (db.getDealerUnifiedWalletTransactions ? db.getDealerUnifiedWalletTransactions(client.id) : [])
    : [];

  const allTxs = [...unifiedTxs, ...dealerTxs];

  // 2. Resolve Cashback Balance
  let resolvedCashback: number;
  if (hasCashbackSnap) {
    resolvedCashback = ticket.cashbackBalanceSnapshot!;
  } else {
    // Check if there is an exact ledger transaction for this ticket
    const cbTx = allTxs.find(
      t => t.orderNumber === ticket.ticketNumber && t.walletType === 'cashback'
    );
    if (cbTx && cbTx.balanceAfter !== undefined) {
      resolvedCashback = cbTx.balanceAfter;
    } else {
      // Calculate historical running cashback up to this ticket's creation date
      const allCustomerTickets = [
        ...db.getTickets(),
        ...(db.getDealerTickets ? db.getDealerTickets() : [])
      ].filter(t => {
        if (customerId && t.customerId === customerId) return true;
        if (ticket.customerPhone && isSamePhoneNumber(t.customerPhone, ticket.customerPhone)) return true;
        return false;
      });

      // Sort chronologically ascending
      allCustomerTickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let runningCb = 0;
      let foundTicket = false;

      for (const t of allCustomerTickets) {
        const isThisTicket = t.id === ticket.id || t.ticketNumber === ticket.ticketNumber;
        const used = t.cashbackUsed || 0;
        const earned = t.cashbackEarned || 0;

        runningCb = Math.max(0, runningCb - used);

        const isPendingRes = (t.isReservation || t.operationMode === 'reservation') && t.status !== 'completed';
        if (!isPendingRes) {
          runningCb += earned;
        }

        if (isThisTicket) {
          foundTicket = true;
          break;
        }
      }

      if (foundTicket && runningCb > 0) {
        resolvedCashback = Math.round(runningCb * 100) / 100;
      } else if (ticket.cashbackEarned || ticket.cashbackUsed) {
        // Fallback for single or first transaction
        resolvedCashback = Math.max(0, (ticket.cashbackEarned || 0) - (ticket.cashbackUsed || 0));
      } else {
        resolvedCashback = client ? (client.cashbackBalance ?? 0) : 0;
      }
    }
  }

  // 3. Resolve Primary Account Balance (المحفظة الأساسية / الرصيد الدائن أو المدين)
  let resolvedPrimary: number;
  if (hasPrimarySnap) {
    resolvedPrimary = ticket.primaryBalanceSnapshot!;
  } else {
    const accTx = allTxs.find(
      t => t.orderNumber === ticket.ticketNumber && t.walletType === 'account_balance'
    );
    if (accTx && accTx.balanceAfter !== undefined) {
      resolvedPrimary = accTx.balanceAfter;
    } else {
      // Calculate historical running account balance up to this ticket
      const allCustomerTickets = [
        ...db.getTickets(),
        ...(db.getDealerTickets ? db.getDealerTickets() : [])
      ].filter(t => {
        if (customerId && t.customerId === customerId) return true;
        if (ticket.customerPhone && isSamePhoneNumber(t.customerPhone, ticket.customerPhone)) return true;
        return false;
      });

      allCustomerTickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let runningPrimary = 0;
      let foundTicket = false;

      for (const t of allCustomerTickets) {
        const isThisTicket = t.id === ticket.id || t.ticketNumber === ticket.ticketNumber;
        const overpayment = t.overpaymentAmount || 0;
        const shortage = t.shortageAmount || 0;
        const creditUsed = t.accountBalanceUsed || 0;

        runningPrimary = runningPrimary + overpayment - shortage - creditUsed;

        if (isThisTicket) {
          foundTicket = true;
          break;
        }
      }

      if (foundTicket && (ticket.overpaymentAmount || ticket.shortageAmount || ticket.accountBalanceUsed)) {
        resolvedPrimary = Math.round(runningPrimary * 100) / 100;
      } else if (ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
        resolvedPrimary = ticket.overpaymentAmount;
      } else if (ticket.shortageAmount && ticket.shortageAmount > 0) {
        resolvedPrimary = -ticket.shortageAmount;
      } else {
        resolvedPrimary = client ? (client.accountBalance !== undefined ? client.accountBalance : (client.balance ?? 0)) : 0;
      }
    }
  }

  // 4. Resolve Referral Balance
  let resolvedReferral: number;
  if (hasReferralSnap) {
    resolvedReferral = ticket.referralBalanceSnapshot!;
  } else {
    const refTx = allTxs.find(
      t => t.orderNumber === ticket.ticketNumber && t.walletType === 'referral'
    );
    if (refTx && refTx.balanceAfter !== undefined) {
      resolvedReferral = refTx.balanceAfter;
    } else {
      resolvedReferral = client ? (client.referralWalletBalance ?? 0) : 0;
    }
  }

  return {
    primaryBalance: resolvedPrimary,
    cashbackBalance: resolvedCashback,
    referralBalance: resolvedReferral
  };
}
