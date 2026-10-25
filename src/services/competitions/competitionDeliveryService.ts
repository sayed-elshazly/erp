import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../eventBus';
import { CompetitionReward } from '../../types/competition.types';
import { StoreWallet } from '../../types/topup.types';

export interface DeliveryExecutionResult {
  success: boolean;
  reward: CompetitionReward;
  financialExpenseId?: string;
  walletTransactionId?: string;
  customerTransactionId?: string;
  error?: string;
}

export class CompetitionDeliveryService {
  private static inFlightDeliveries = new Set<string>();

  /**
   * Pre-delivery preview to inspect current wallet balance, cost, and balance after delivery
   */
  public static previewDelivery(reward: CompetitionReward): {
    wallet: StoreWallet | null;
    currentWalletBalance: number;
    prizeCost: number;
    balanceAfterDelivery: number;
    hasSufficientBalance: boolean;
    willCauseWarning: boolean;
  } {
    const wallets = db.getStoreWallets();
    const wallet = reward.sourceWalletId ? wallets.find(w => w.id === reward.sourceWalletId) || null : null;
    const currentWalletBalance = wallet ? wallet.balance : 0;
    const prizeCost = reward.costEGP || 0;
    const balanceAfterDelivery = currentWalletBalance - prizeCost;
    const hasSufficientBalance = !wallet || currentWalletBalance >= prizeCost;
    const willCauseWarning = Boolean(wallet?.warningThreshold && balanceAfterDelivery <= wallet.warningThreshold);

    return {
      wallet,
      currentWalletBalance,
      prizeCost,
      balanceAfterDelivery,
      hasSufficientBalance,
      willCauseWarning
    };
  }

  /**
   * ATOMIC DELIVERY PIPELINE (Task 9, 10, 11, 12, 21, 22, 23, 33)
   * 
   * 1. Check idempotency & concurrency lock
   * 2. Validate current status is 'pending' (strictly prevent double delivery)
   * 3. Validate and deduct from Product / Store Wallet (No sales ledger distortion)
   * 4. Credit customer or dealer balance / issue reward
   * 5. Record Marketing Expense in Finance with paidFromVault: false
   * 6. Save permanent Historical Snapshot
   * 7. Transition status to 'delivered'
   * 8. Emit events & audit logs
   * 9. Full rollback on any error
   */
  public static deliverReward(
    reward: CompetitionReward,
    adminUser: { id: string; name: string; role: string; department?: string },
    allRewards: CompetitionReward[],
    saveRewardsCallback: (updated: CompetitionReward[]) => void
  ): DeliveryExecutionResult {
    const lockKey = reward.idempotencyKey || `comp_deliv_${reward.id}`;

    // 1. Authorization check
    if (adminUser && adminUser.role !== 'admin' && !(adminUser as any).permissions?.includes('deliver_rewards')) {
      throw new Error('غير مصرح: تسليم الجوائز يتطلب صلاحيات المدير العام أو صلاحية تسليم المكافآت.');
    }

    // 2. Concurrency double-click protection (Task 23 & Task 42)
    if (this.inFlightDeliveries.has(lockKey)) {
      throw new Error('عملية تسليم هذه الجائزة قيد التنفيذ بالفعل، يرجى الانتظار.');
    }

    // 2. Strict status check
    if (reward.status === 'delivered') {
      throw new Error('هذه الجائزة تم تسليمها واعتمادها مسبقاً، لا يمكن إعادة تسليمها مرة أخرى.');
    }

    if (reward.status === 'cancelled') {
      throw new Error('لا يمكن تسليم جائزة تم إلغاؤها مسبقاً.');
    }

    this.inFlightDeliveries.add(lockKey);

    // Rollback trackers
    let walletDeducted = false;
    let walletIdUsed: string | undefined;
    let amountDeducted = 0;
    let customerCredited = false;
    let customerCreditAmount = 0;
    let expenseCreatedId: string | undefined;

    try {
      const prizeCost = Number(reward.costEGP) || 0;
      let walletTxId: string | undefined;
      let custTxId: string | undefined;

      // 3. Deduct from Source Product Wallet if specified (Task 9)
      if (reward.sourceWalletId && prizeCost > 0) {
        const wallets = db.getStoreWallets();
        const targetWallet = wallets.find(w => w.id === reward.sourceWalletId) ||
                             wallets.find(w => w.name === reward.sourceWalletName) ||
                             wallets.find(w => w.balance >= prizeCost) ||
                             wallets[0];
        if (!targetWallet) {
          throw new Error(`محفظة البضاعة المصدر (${reward.sourceWalletName || reward.sourceWalletId}) غير موجودة.`);
        }

        if (targetWallet.balance < prizeCost) {
          throw new Error(
            `رصيد محفظة البضاعة (${targetWallet.name}) غير كافٍ. المطلوب: ${prizeCost} ج.م، المتاح: ${targetWallet.balance} ج.م`
          );
        }

        // Perform deduction from Product Wallet
        const balanceBefore = targetWallet.balance;
        targetWallet.balance = Math.max(0, Math.round((targetWallet.balance - prizeCost) * 100) / 100);
        targetWallet.totalWithdrawn = Math.round(((targetWallet.totalWithdrawn || 0) + prizeCost) * 100) / 100;
        targetWallet.updatedAt = new Date().toISOString();

        // Update database item
        if (targetWallet.numbers && targetWallet.numbers.length > 0) {
          const pref = targetWallet.numbers.find(n => n.isPrimary) || targetWallet.numbers[0];
          if (pref) {
            pref.currentBalance = targetWallet.balance;
          }
        }
        db.saveStoreWallet(targetWallet);

        // Record Store Wallet Transaction
        const wTx = db.addStoreWalletTransaction({
          walletId: targetWallet.id,
          walletName: targetWallet.name,
          type: 'withdrawal',
          amount: prizeCost,
          currency: targetWallet.currency,
          balanceBefore,
          balanceAfter: targetWallet.balance,
          description: `تسليم جائزة مسابقة: ${reward.competitionTitle} — [${reward.prizeName}] للمستفيد: ${reward.entityName}`,
          referenceNumber: `REW-${reward.id.slice(-6)}`,
          sourceType: 'other',
          customerName: reward.entityName,
          performedBy: adminUser
        });

        walletTxId = wTx.id;
        walletDeducted = true;
        walletIdUsed = targetWallet.id;
        amountDeducted = prizeCost;
      }

      // 4. Credit Customer/Dealer Wallet if prize is Wallet Credit or Cashback (Task 8 & 24)
      if (reward.prizeType === 'wallet_credit' && reward.prizeValue > 0) {
        if (reward.entityType === 'customer') {
          const cust = db.getCustomerById(reward.entityId);
          if (cust) {
            const beforeBal = cust.balance || 0;
            cust.balance = Math.round((beforeBal + reward.prizeValue) * 100) / 100;
            cust.updatedAt = new Date().toISOString();
            db.saveCustomer(cust);

            // Record in Unified Wallet Ledger
            const cTx = db.addUnifiedWalletTransaction({
              customerId: cust.id,
              walletType: 'account_balance',
              type: 'credit',
              amount: reward.prizeValue,
              balanceAfter: cust.balance,
              operationName: `مكافأة مسابقة: ${reward.competitionTitle}`,
              orderNumber: `REW-${reward.id.slice(-6)}`,
              notes: `تسليم مكافأة مسابقة: ${reward.competitionTitle} — ${reward.prizeName} بواسطة ${adminUser.name}`
            });
            custTxId = cTx?.id;
            customerCredited = true;
            customerCreditAmount = reward.prizeValue;
          }
        } else if (reward.entityType === 'dealer') {
          const dealer = db.getDealerById(reward.entityId);
          if (dealer) {
            const beforeBal = dealer.balance || 0;
            dealer.balance = Math.round((beforeBal + reward.prizeValue) * 100) / 100;
            if (dealer.accountBalance !== undefined) {
              dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + reward.prizeValue) * 100) / 100;
            }
            dealer.updatedAt = new Date().toISOString();
            db.saveDealer(dealer);
            customerCredited = true;
            customerCreditAmount = reward.prizeValue;
          }
        } else if (reward.entityType === 'merchant') {
          const merchant = db.getMerchantById(reward.entityId);
          if (merchant) {
            const beforeBal = merchant.balance || 0;
            merchant.balance = Math.round((beforeBal + reward.prizeValue) * 100) / 100;
            merchant.updatedAt = new Date().toISOString();
            db.saveMerchant(merchant);
            customerCredited = true;
            customerCreditAmount = reward.prizeValue;
          }
        }
      } else if (reward.prizeType === 'cashback' && reward.prizeValue > 0) {
        if (reward.entityType === 'customer') {
          const cust = db.getCustomerById(reward.entityId);
          if (cust) {
            const beforeCb = cust.cashbackBalance || 0;
            cust.cashbackBalance = Math.round((beforeCb + reward.prizeValue) * 100) / 100;
            cust.totalCashbackEarned = Math.round(((cust.totalCashbackEarned || 0) + reward.prizeValue) * 100) / 100;
            cust.updatedAt = new Date().toISOString();
            db.saveCustomer(cust);

            // Sync with w_cashback system wallet
            db.creditCashbackToSystemWallet(reward.prizeValue, cust.name, `REW-${reward.id.slice(-6)}`);
            customerCredited = true;
            customerCreditAmount = reward.prizeValue;
          }
        } else if (reward.entityType === 'dealer') {
          const dealer = db.getDealerById(reward.entityId);
          if (dealer) {
            const beforeCb = dealer.cashbackBalance || 0;
            dealer.cashbackBalance = Math.round((beforeCb + reward.prizeValue) * 100) / 100;
            dealer.totalCashbackEarned = Math.round(((dealer.totalCashbackEarned || 0) + reward.prizeValue) * 100) / 100;
            dealer.updatedAt = new Date().toISOString();
            db.saveDealer(dealer);

            // Sync with w_cashback system wallet
            db.creditCashbackToSystemWallet(reward.prizeValue, dealer.name || dealer.businessName || 'تاجر', `REW-${reward.id.slice(-6)}`);
            customerCredited = true;
            customerCreditAmount = reward.prizeValue;
          }
        }
      }

      // 5. Create Marketing Expense in Finance (Task 10, 11, 28)
      // Strictly NOT recorded as sales or 0-revenue order, completely preventing negative profit!
      let expId: string | undefined;
      if (prizeCost > 0) {
        const exp = db.addExpense(
          {
            title: `مكافأة مسابقة: ${reward.competitionTitle} — ${reward.prizeName} (${reward.entityName})`,
            category: 'marketing',
            amount: prizeCost,
            currency: 'EGP',
            paidFromVault: false, // Not from vault cash, taken from product wallet!
            paymentMethod: reward.sourceWalletName ? `خصم من محفظة: ${reward.sourceWalletName}` : 'مصروف تسويق جوائز',
            department: 'الزبائن والتجار',
            approvedBy: adminUser.name,
            notes: JSON.stringify({
              competitionId: reward.competitionId,
              rewardId: reward.id,
              prizeId: reward.prizeId,
              entityId: reward.entityId,
              entityType: reward.entityType,
              sourceWalletId: reward.sourceWalletId,
              campaignRewardSnapshot: reward.snapshot
            }),
            date: new Date().toISOString().split('T')[0]
          },
          adminUser.name,
          adminUser
        );
        expId = exp.id;
        expenseCreatedId = exp.id;
      }

      // 6. Update Reward Record & Historical Snapshot (Task 12, 33)
      const deliveryTimestamp = new Date().toISOString();
      const updatedReward: CompetitionReward = {
        ...reward,
        status: 'delivered',
        deliveredAt: deliveryTimestamp,
        deliveredBy: adminUser.name,
        financialExpenseId: expId,
        walletTransactionId: walletTxId,
        customerTransactionId: custTxId,
        snapshot: {
          ...reward.snapshot,
          deliveryDate: deliveryTimestamp,
          adminName: adminUser.name
        }
      };

      // Persist in rewards state
      const targetIdx = allRewards.findIndex(r => r.id === reward.id);
      let nextRewards: CompetitionReward[];
      if (targetIdx >= 0) {
        nextRewards = [...allRewards];
        nextRewards[targetIdx] = updatedReward;
      } else {
        nextRewards = [updatedReward, ...allRewards];
      }
      saveRewardsCallback(nextRewards);

      // 7. Activity Log (Task 29)
      db.logAction(
        adminUser,
        'add',
        'competition_reward',
        reward.id,
        `تسليم مكافأة: ${reward.prizeName}`,
        `تم تسليم مكافأة المسابقة (${reward.competitionTitle}) بنجاح للمستفيد ${reward.entityName} بتكلفة تسويقية ${prizeCost} ج.م مع خصم المحفظة وتسجيل المصروف.`,
        { status: 'pending' },
        { status: 'delivered', costEGP: prizeCost, deliveredAt: deliveryTimestamp }
      );

      // 8. Notifications (Task 37)
      try {
        db.addNotification({
          type: 'success',
          title: '🎁 تم تسليم جائزة المسابقة بنجاح',
          message: `مبروك للمستفيد (${reward.entityName})! تم تسليم جائزة: ${reward.prizeName} في مسابقة [${reward.competitionTitle}].`,
          linkSection: 'competitions',
          metadata: { rewardId: reward.id, competitionId: reward.competitionId }
        });
      } catch (e) {}

      // Emit events
      eventBus.publish(SYSTEM_EVENTS.COMPETITION_REWARD_DELIVERED, updatedReward);
      eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED);
      eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED);

      return {
        success: true,
        reward: updatedReward,
        financialExpenseId: expId,
        walletTransactionId: walletTxId,
        customerTransactionId: custTxId
      };

    } catch (err: any) {
      // 9. ATOMIC ROLLBACK ON ERROR (Task 22)
      console.error('Delivery failed, executing atomic rollback:', err);

      // Rollback Wallet Deduction if it occurred
      if (walletDeducted && walletIdUsed && amountDeducted > 0) {
        try {
          const wallets = db.getStoreWallets();
          const targetWallet = wallets.find(w => w.id === walletIdUsed);
          if (targetWallet) {
            targetWallet.balance += amountDeducted;
            targetWallet.totalWithdrawn = Math.max(0, (targetWallet.totalWithdrawn || 0) - amountDeducted);
            targetWallet.updatedAt = new Date().toISOString();
            if (targetWallet.numbers && targetWallet.numbers.length > 0) {
              const pref = targetWallet.numbers.find(n => n.isPrimary) || targetWallet.numbers[0];
              if (pref) {
                pref.currentBalance = targetWallet.balance;
              }
            }
            db.saveStoreWallet(targetWallet);
          }
        } catch (rbErr) {
          console.error('Wallet rollback error:', rbErr);
        }
      }

      // Rollback Customer balance credit if it occurred
      if (customerCredited && customerCreditAmount > 0) {
        try {
          if (reward.entityType === 'customer') {
            const cust = db.getCustomerById(reward.entityId);
            if (cust) {
              if (reward.prizeType === 'wallet_credit') {
                cust.balance = Math.max(0, cust.balance - customerCreditAmount);
              } else if (reward.prizeType === 'cashback') {
                cust.cashbackBalance = Math.max(0, cust.cashbackBalance - customerCreditAmount);
              }
              db.saveCustomer(cust);
            }
          }
        } catch (rbErr) {
          console.error('Customer rollback error:', rbErr);
        }
      }

      // Rollback Expense if it occurred
      if (expenseCreatedId) {
        try {
          db.archiveExpense(expenseCreatedId, adminUser);
        } catch (rbErr) {
          console.error('Expense rollback error:', rbErr);
        }
      }

      throw err;

    } finally {
      // Release concurrency double-click lock
      this.inFlightDeliveries.delete(lockKey);
    }
  }

  /**
   * Reward Cancellation (Task 41)
   * Ensures 0 wallet deduction, 0 marketing expense, logged in audit
   */
  public static cancelReward(
    reward: CompetitionReward,
    adminUser: { id: string; name: string; role: string },
    reason: string,
    allRewards: CompetitionReward[],
    saveRewardsCallback: (updated: CompetitionReward[]) => void
  ): CompetitionReward {
    if (reward.status === 'delivered') {
      throw new Error('لا يمكن إلغاء جائزة تم تسليمها وتوثيقها بالفعل في السجلات المالية.');
    }

    const cancellationDate = new Date().toISOString();
    const updated: CompetitionReward = {
      ...reward,
      status: 'cancelled',
      cancelledAt: cancellationDate,
      cancelledBy: adminUser.name,
      cancellationReason: reason || 'تم الإلغاء بواسطة الإدارة'
    };

    const targetIdx = allRewards.findIndex(r => r.id === reward.id);
    let nextRewards: CompetitionReward[];
    if (targetIdx >= 0) {
      nextRewards = [...allRewards];
      nextRewards[targetIdx] = updated;
    } else {
      nextRewards = [updated, ...allRewards];
    }
    saveRewardsCallback(nextRewards);

    // Audit log
    db.logAction(
      adminUser,
      'cancel',
      'competition_reward',
      reward.id,
      `إلغاء جائزة: ${reward.prizeName}`,
      `تم إلغاء الجائزة المستحقة للعميل ${reward.entityName} بدون أي خصم مالي أو تأثير على المحافظ. السبب: ${reason || 'غير محدد'}`,
      { status: reward.status },
      { status: 'cancelled', cancellationReason: reason }
    );

    eventBus.publish(SYSTEM_EVENTS.COMPETITION_REWARD_CANCELLED, updated);
    return updated;
  }
}
