import { CompositeClient, SubaccountInfo } from "@dydxprotocol/v4-client-js";
import { Position, BalanceInfo } from "./types";

export class PositionManager {
  private compositeClient: CompositeClient;
  private subaccount: SubaccountInfo;
  private positionsCache: Map<string, Position> = new Map();
  private balancesCache: Map<string, BalanceInfo> = new Map();
  private lastUpdateTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  constructor(compositeClient: CompositeClient, subaccount: SubaccountInfo) {
    this.compositeClient = compositeClient;
    this.subaccount = subaccount;
  }

  /**
   * Fetch all current positions.
   */
  async fetchPositions(
    forceRefresh: boolean = false
  ): Promise<Map<string, Position>> {
    try {
      const now = Date.now();

      if (
        !forceRefresh &&
        now - this.lastUpdateTime < this.CACHE_TTL &&
        this.positionsCache.size > 0
      ) {
        return this.positionsCache;
      }

      // Fetch perpetual positions
      const response =
        await this.compositeClient.indexerClient.account.getSubaccountPerpetualPositions(
          this.subaccount.address,
          this.subaccount.subaccountNumber
        );

      this.positionsCache.clear();

      if (response.positions && response.positions.length > 0) {
        for (const pos of response.positions) {
          const size = parseFloat(pos.size);
          const entryPrice = parseFloat(pos.entryPrice || "0");
          const unrealizedPnl = parseFloat(pos.unrealizedPnl || "0");
          const realizedPnl = parseFloat(pos.realizedPnl || "0");

          let side: "LONG" | "SHORT" | "NONE" = "NONE";
          if (size > 0) {
            side = "LONG";
          } else if (size < 0) {
            side = "SHORT";
          }

          const position: Position = {
            marketId: pos.market,
            side,
            size: Math.abs(size),
            entryPrice,
            unrealizedPnl,
            realizedPnl,
          };

          this.positionsCache.set(pos.market, position);
        }
      }

      this.lastUpdateTime = now;
      console.log(`📊 Fetched ${this.positionsCache.size} positions`);

      return this.positionsCache;
    } catch (error) {
      console.error(
        "❌ Error fetching positions:",
        error instanceof Error ? error.message : String(error)
      );
      return this.positionsCache;
    }
  }

  /**
   * Get position for a specific market.
   */
  async getPosition(
    marketId: string,
    forceRefresh: boolean = false
  ): Promise<Position | null> {
    const positions = await this.fetchPositions(forceRefresh);
    return positions.get(marketId) || null;
  }

  /**
   * Fetch account balances.
   */
  async fetchBalances(
    forceRefresh: boolean = false
  ): Promise<Map<string, BalanceInfo>> {
    try {
      const now = Date.now();

      if (
        !forceRefresh &&
        now - this.lastUpdateTime < this.CACHE_TTL &&
        this.balancesCache.size > 0
      ) {
        return this.balancesCache;
      }

      // Fetch asset positions (balances)
      const response =
        await this.compositeClient.indexerClient.account.getSubaccountAssetPositions(
          this.subaccount.address,
          this.subaccount.subaccountNumber
        );

      this.balancesCache.clear();

      if (response.positions && response.positions.length > 0) {
        for (const pos of response.positions) {
          const balance: BalanceInfo = {
            asset: pos.symbol,
            size: pos.size,
            available: pos.size, // Simplified - in reality you'd need to calculate locked amounts
            locked: "0",
          };

          this.balancesCache.set(pos.symbol, balance);
        }
      }

      console.log(`💰 Fetched balances for ${this.balancesCache.size} assets`);
      return this.balancesCache;
    } catch (error) {
      console.error(
        "❌ Error fetching balances:",
        error instanceof Error ? error.message : String(error)
      );
      return this.balancesCache;
    }
  }

  /**
   * Get balance for a specific asset.
   */
  async getBalance(
    asset: string,
    forceRefresh: boolean = false
  ): Promise<BalanceInfo | null> {
    const balances = await this.fetchBalances(forceRefresh);
    return balances.get(asset) || null;
  }

  /**
   * Get USDC balance (main collateral).
   */
  async getUSDCBalance(forceRefresh: boolean = false): Promise<number> {
    const balance = await this.getBalance("USDC", forceRefresh);
    return balance ? parseFloat(balance.available) : 0;
  }

  /**
   * Calculate total portfolio value.
   */
  async calculatePortfolioValue(): Promise<number> {
    try {
      const [positions, balances] = await Promise.all([
        this.fetchPositions(),
        this.fetchBalances(),
      ]);

      let totalValue = 0;

      // Add cash balance (USDC)
      const usdcBalance = balances.get("USDC");
      if (usdcBalance) {
        totalValue += parseFloat(usdcBalance.size);
      }

      // Add unrealized PnL from positions
      positions.forEach((position) => {
        totalValue += position.unrealizedPnl;
      });

      return totalValue;
    } catch (error) {
      console.error(
        "❌ Error calculating portfolio value:",
        error instanceof Error ? error.message : String(error)
      );
      return 0;
    }
  }

  /**
   * Get position size for risk management.
   */
  async getPositionSize(marketId: string): Promise<number> {
    const position = await this.getPosition(marketId);
    return position ? position.size : 0;
  }

  /**
   * Check if position exceeds maximum allowed size.
   */
  async isPositionSizeExceeded(
    marketId: string,
    maxSize: number
  ): Promise<boolean> {
    const currentSize = await this.getPositionSize(marketId);
    return currentSize >= maxSize;
  }

  /**
   * Get all positions with non-zero size.
   */
  async getActivePositions(): Promise<Position[]> {
    const positions = await this.fetchPositions();
    return Array.from(positions.values()).filter((pos) => pos.size > 0);
  }

  /**
   * Calculate total unrealized PnL across all positions.
   */
  async getTotalUnrealizedPnL(): Promise<number> {
    const positions = await this.fetchPositions();
    return Array.from(positions.values()).reduce(
      (total, pos) => total + pos.unrealizedPnl,
      0
    );
  }

  /**
   * Calculate total realized PnL across all positions.
   */
  async getTotalRealizedPnL(): Promise<number> {
    const positions = await this.fetchPositions();
    return Array.from(positions.values()).reduce(
      (total, pos) => total + pos.realizedPnl,
      0
    );
  }

  /**
   * Get position summary for logging.
   */
  async getPositionSummary(): Promise<string> {
    try {
      const positions = await this.getActivePositions();
      const totalUnrealized = await this.getTotalUnrealizedPnL();
      const totalRealized = await this.getTotalRealizedPnL();
      const usdcBalance = await this.getUSDCBalance();

      let summary = `\n📊 Position Summary:\n`;
      summary += `💰 USDC Balance: $${usdcBalance.toFixed(2)}\n`;
      summary += `📈 Total Unrealized PnL: $${totalUnrealized.toFixed(2)}\n`;
      summary += `💵 Total Realized PnL: $${totalRealized.toFixed(2)}\n`;
      summary += `🎯 Active Positions: ${positions.length}\n`;

      if (positions.length > 0) {
        summary += `\n📍 Position Details:\n`;
        for (const pos of positions) {
          const sideEmoji = pos.side === "LONG" ? "🟢" : "🔴";
          summary += `${sideEmoji} ${pos.marketId}: ${pos.side} ${
            pos.size
          } @ $${pos.entryPrice} (PnL: $${pos.unrealizedPnl.toFixed(2)})\n`;
        }
      }

      return summary;
    } catch (error) {
      console.error(
        "❌ Error generating position summary:",
        error instanceof Error ? error.message : String(error)
      );
      return "❌ Error generating position summary";
    }
  }

  /**
   * Clear position cache.
   */
  clearCache(): void {
    this.positionsCache.clear();
    this.balancesCache.clear();
    this.lastUpdateTime = 0;
  }

  /**
   * Get cached positions without API call.
   */
  getCachedPositions(): Map<string, Position> {
    return new Map(this.positionsCache);
  }

  /**
   * Get cached balances without API call.
   */
  getCachedBalances(): Map<string, BalanceInfo> {
    return new Map(this.balancesCache);
  }
}
