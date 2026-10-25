/**
 * @deprecated Removed in Phase 1 Reset. Will be redesigned in Phase 2.
 */
export class WalletConsumptionEngine {
  public static getResolvedWalletSources(product: any): any[] {
    return [];
  }

  public static evaluateProductAvailability(product: any, quantity = 1, wallets: any[] = []): any {
    return {
      isAvailable: product?.isActive !== false,
      availableUnits: product?.availableQuantity ?? 999999,
      message: 'متاح'
    };
  }

  public static executeConsumption(product: any, quantity: number, orderId: string, user: any, wallets: any[] = []): any {
    return {
      success: true,
      totalCostEGP: 0,
      consumedSources: []
    };
  }
}
