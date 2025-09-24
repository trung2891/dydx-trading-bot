import {
  CompositeClient,
  OrderSide,
  Order_TimeInForce,
  OrderStatus,
  TickerType,
  SubaccountInfo,
  OrderType,
  OrderTimeInForce,
  OrderExecution,
  OrderFlags,
} from "@oraichain/lfg-client-js";
import {
  WashTradeConfig,
  WashTradeOrder,
  WashTradeStats,
  WashTradeState,
  VolumeTarget,
  TradePattern,
} from "./types";
import { CoinGeckoService } from "../mm/coingecko-service";
import {
  generateRandomClientId,
  sleep,
  isValidPrice,
  isValidSize,
  roundPrice,
  roundSize,
  randomIntRange,
} from "../mm/utils";

export class WashTradeBot {
  private compositeClient: CompositeClient;
  private subaccount: SubaccountInfo;
  private config: WashTradeConfig;
  private state: WashTradeState = WashTradeState.STOPPED;
  private activeOrders: Map<string, WashTradeOrder> = new Map();
  private coinGeckoService: CoinGeckoService;
  private volumeTarget: VolumeTarget;
  private stats: WashTradeStats;
  private isRunning: boolean = false;
  private currentPosition: number = 0;
  private unrealizedPnl: number = 0;
  private realizedPnl: number = 0;
  private startTime: number = 0;

  constructor(
    compositeClient: CompositeClient,
    subaccount: SubaccountInfo,
    config: WashTradeConfig
  ) {
    this.compositeClient = compositeClient;
    this.subaccount = subaccount;
    this.config = config;
    this.coinGeckoService = new CoinGeckoService();

    // Initialize volume target
    this.volumeTarget = {
      hourly: config.volumeTarget,
      daily: config.volumeTarget * 24,
      current: 0,
      periodStart: Date.now(),
    };

    // Initialize stats
    this.stats = {
      totalTrades: 0,
      totalVolume: 0,
      totalVolumeUSD: 0,
      averageTradeSize: 0,
      tradesPerHour: 0,
      volumePerHour: 0,
      uptime: 0,
      lastUpdate: Date.now(),
      currentPosition: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
    };
  }

  /**
   * Start the wash trading bot
   */
  async start(): Promise<void> {
    if (this.state === WashTradeState.RUNNING) {
      console.log("⚠️ Wash trade bot is already running");
      return;
    }

    console.log("🚀 Starting Wash Trade Bot...");
    this.state = WashTradeState.STARTING;
    this.isRunning = true;
    this.startTime = Date.now();

    try {
      // Initialize volume tracking
      this.volumeTarget.periodStart = Date.now();
      this.volumeTarget.current = 0;

      this.state = WashTradeState.RUNNING;
      console.log("✅ Wash Trade Bot started successfully");

      // Start the main trading loop
      await this.runTradingLoop();
    } catch (error) {
      this.state = WashTradeState.ERROR;
      console.error(
        "❌ Failed to start wash trade bot:",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Stop the wash trading bot
   */
  async stop(): Promise<void> {
    console.log("🛑 Stopping Wash Trade Bot...");
    this.isRunning = false;
    this.state = WashTradeState.STOPPED;

    // Cancel all active orders
    await this.cancelAllOrders();

    console.log("✅ Wash Trade Bot stopped");
  }

  /**
   * Main trading loop
   */
  private async runTradingLoop(): Promise<void> {
    while (this.isRunning && this.state === WashTradeState.RUNNING) {
      try {
        await this.executeWashTrade();
        await this.updateStats();
        await this.logStats();

        // Calculate next trade delay based on strategy
        const delay = this.calculateNextTradeDelay();
        await sleep(delay);
      } catch (error) {
        console.error(
          "❌ Error in trading loop:",
          error instanceof Error ? error.message : String(error)
        );
        await sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Execute a wash trade (buy and sell sequence)
   */
  private async executeWashTrade(): Promise<void> {
    try {
      // Get current market price
      const marketPrice = await this.getCurrentMarketPrice();
      if (!marketPrice) {
        console.warn("⚠️ Could not get market price, skipping trade");
        return;
      }

      // Generate trade pattern
      const pattern = this.generateTradePattern();

      // Execute the wash trade based on pattern
      switch (pattern.type) {
        case "BUY_SELL":
          await this.executeBuySellPattern(marketPrice, pattern);
          break;
        case "SELL_BUY":
          await this.executeSellBuyPattern(marketPrice, pattern);
          break;
        case "RANDOM":
          await this.executeRandomPattern(marketPrice, pattern);
          break;
      }
    } catch (error) {
      console.error(
        "❌ Error executing wash trade:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute buy-then-sell pattern with market orders
   */
  private async executeBuySellPattern(
    marketPrice: number,
    pattern: TradePattern
  ): Promise<void> {
    // Place buy market order
    const buySize = this.calculateTradeSize();

    const buyOrder = await this.placeWashOrder(
      OrderSide.BUY,
      marketPrice, // Price is not used for market orders
      buySize
    );

    if (buyOrder) {
      // Short delay for market orders (they execute immediately)
      await sleep(this.getRandomDelay(100, 500));

      // Place sell market order
      const sellSize = buySize; // Same size for wash trade

      await this.placeWashOrder(OrderSide.SELL, marketPrice, sellSize);
    }
  }

  /**
   * Execute sell-then-buy pattern with market orders
   */
  private async executeSellBuyPattern(
    marketPrice: number,
    pattern: TradePattern
  ): Promise<void> {
    // Place sell market order
    const sellSize = this.calculateTradeSize();

    const sellOrder = await this.placeWashOrder(
      OrderSide.SELL,
      marketPrice, // Price is not used for market orders
      sellSize
    );

    if (sellOrder) {
      // Short delay for market orders (they execute immediately)
      await sleep(this.getRandomDelay(100, 500));

      // Place buy market order
      const buySize = sellSize; // Same size for wash trade

      await this.placeWashOrder(OrderSide.BUY, marketPrice, buySize);
    }
  }

  /**
   * Execute random pattern
   */
  private async executeRandomPattern(
    marketPrice: number,
    pattern: TradePattern
  ): Promise<void> {
    const isBuyFirst = Math.random() > 0.5;

    if (isBuyFirst) {
      await this.executeBuySellPattern(marketPrice, pattern);
    } else {
      await this.executeSellBuyPattern(marketPrice, pattern);
    }
  }

  /**
   * Place a wash trade order using market orders for immediate execution
   */
  private async placeWashOrder(
    side: OrderSide,
    price: number,
    size: number
  ): Promise<WashTradeOrder | null> {
    try {
      const clientId = generateRandomClientId();
      const roundedSize = roundSize(
        size,
        this.config.orderConfig.roundSize || 4
      );

      if (!isValidSize(roundedSize)) {
        console.warn(`Invalid size ${roundedSize}`);
        return null;
      }

      // Get current market price for reference
      const currentMarketPrice = await this.getCurrentMarketPrice();
      if (!currentMarketPrice) {
        console.warn("Could not get current market price for reference");
        return null;
      }

      // Place market order for immediate execution
      const currentBlock =
        await this.compositeClient.validatorClient.get.latestBlockHeight();
      const goodTilBlocks = this.config.orderConfig.goodTilBlocks || 10;
      const goodTilBlock = currentBlock + goodTilBlocks;

      // Use market order (price = 0 for market orders)
      const tx = await this.compositeClient.placeShortTermOrder(
        this.subaccount,
        this.config.marketId,
        side,
        0, // Market order price (0 for market orders)
        roundedSize,
        clientId,
        goodTilBlock,
        Order_TimeInForce.TIME_IN_FORCE_IOC, // Immediate or Cancel for market orders
        false // postOnly
      );

      const washOrder: WashTradeOrder = {
        marketId: this.config.marketId,
        clientId,
        side,
        price: currentMarketPrice, // Use current market price for tracking
        size: roundedSize,
        timestamp: Date.now(),
        orderId:
          typeof tx.hash === "string"
            ? tx.hash
            : Buffer.from(tx.hash).toString("hex"),
        isWashTrade: true,
      };

      // Track the order
      this.activeOrders.set(clientId.toString(), washOrder);

      // Update position and volume using current market price
      this.updatePositionAndVolume(side, roundedSize, currentMarketPrice);

      console.log(
        `🔄 Wash ${side} MARKET order: ${roundedSize} ${
          this.config.marketId
        } at market price ~$${currentMarketPrice.toFixed(
          2
        )} (Client ID: ${clientId})`
      );

      return washOrder;
    } catch (error) {
      console.error(
        `❌ Failed to place wash ${side} market order:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Calculate trade price with variation
   */
  private calculateTradePrice(basePrice: number, side: OrderSide): number {
    const variation = this.config.priceVariation / 100;
    const randomVariation = (Math.random() - 0.5) * 2 * variation;

    let price = basePrice * (1 + randomVariation);

    // Add spread for wash trading
    const spread = this.config.spread / 100;
    if (side === OrderSide.BUY) {
      price = price * (1 - spread / 2);
    } else {
      price = price * (1 + spread / 2);
    }

    return roundPrice(price, this.config.orderConfig.roundPrice || 3);
  }

  /**
   * Calculate trade size with variation
   */
  private calculateTradeSize(): number {
    const baseSize = this.config.orderSize;
    const variation = 0.2; // 20% variation
    const randomVariation = (Math.random() - 0.5) * 2 * variation;

    const size = baseSize * (1 + randomVariation);
    return roundSize(size, this.config.orderConfig.roundSize || 4);
  }

  /**
   * Generate trade pattern
   */
  private generateTradePattern(): TradePattern {
    const patterns: TradePattern[] = [
      {
        type: "BUY_SELL",
        minDelay: 1000,
        maxDelay: 5000,
        priceOffset: 0.1,
      },
      {
        type: "SELL_BUY",
        minDelay: 1000,
        maxDelay: 5000,
        priceOffset: 0.1,
      },
      {
        type: "RANDOM",
        minDelay: 500,
        maxDelay: 3000,
        priceOffset: 0.05,
      },
    ];

    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  /**
   * Calculate next trade delay based on strategy
   */
  private calculateNextTradeDelay(): number {
    switch (this.config.volumeStrategy.type) {
      case "CONSTANT":
        return this.getRandomDelay(
          this.config.minInterval,
          this.config.maxInterval
        );
      case "RANDOM":
        return this.getRandomDelay(
          this.config.minInterval,
          this.config.maxInterval * 2
        );
      case "BURST":
        // For burst strategy, we'll implement burst logic in the main loop
        return this.getRandomDelay(100, 500);
      default:
        return this.config.minInterval;
    }
  }

  /**
   * Get random delay between min and max
   */
  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get current market price
   */
  private async getCurrentMarketPrice(): Promise<number | null> {
    try {
      // Try to get price from orderbook first
      const orderbook =
        await this.compositeClient.indexerClient.markets.getPerpetualMarketOrderbook(
          this.config.marketId
        );

      if (
        orderbook &&
        orderbook.bids &&
        orderbook.bids.length > 0 &&
        orderbook.asks &&
        orderbook.asks.length > 0
      ) {
        const bestBid = parseFloat(orderbook.bids[0].price);
        const bestAsk = parseFloat(orderbook.asks[0].price);
        return (bestBid + bestAsk) / 2;
      }

      // Fallback to CoinGecko
      return await this.coinGeckoService.getPrice(this.config.marketId);
    } catch (error) {
      console.error("Error getting market price:", error);
      return null;
    }
  }

  /**
   * Update position and volume tracking
   */
  private updatePositionAndVolume(
    side: OrderSide,
    size: number,
    price: number
  ): void {
    const volumeUSD = size * price;

    // Update position
    if (side === OrderSide.BUY) {
      this.currentPosition += size;
    } else {
      this.currentPosition -= size;
    }

    // Update volume tracking
    this.volumeTarget.current += volumeUSD;
    this.stats.totalVolume += size;
    this.stats.totalVolumeUSD += volumeUSD;
    this.stats.totalTrades++;
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const now = Date.now();
    const uptime = now - this.startTime;

    this.stats.uptime = uptime;
    this.stats.lastUpdate = now;
    this.stats.currentPosition = this.currentPosition;
    this.stats.unrealizedPnl = this.unrealizedPnl;
    this.stats.realizedPnl = this.realizedPnl;

    if (this.stats.totalTrades > 0) {
      this.stats.averageTradeSize =
        this.stats.totalVolume / this.stats.totalTrades;
    }

    // Calculate hourly rates
    const hours = uptime / (1000 * 60 * 60);
    if (hours > 0) {
      this.stats.tradesPerHour = this.stats.totalTrades / hours;
      this.stats.volumePerHour = this.stats.totalVolumeUSD / hours;
    }
  }

  /**
   * Log current statistics
   */
  private logStats(): void {
    const now = new Date().toISOString();
    console.log(`\n📊 Wash Trade Stats [${now}]`);
    console.log(`   Total Trades: ${this.stats.totalTrades}`);
    console.log(
      `   Total Volume: ${this.stats.totalVolume.toFixed(4)} ${
        this.config.marketId.split("-")[0]
      }`
    );
    console.log(
      `   Total Volume USD: $${this.stats.totalVolumeUSD.toFixed(2)}`
    );
    console.log(
      `   Current Position: ${this.stats.currentPosition.toFixed(4)}`
    );
    console.log(`   Trades/Hour: ${this.stats.tradesPerHour.toFixed(2)}`);
    console.log(`   Volume/Hour: $${this.stats.volumePerHour.toFixed(2)}`);
    console.log(
      `   Uptime: ${(this.stats.uptime / 1000 / 60).toFixed(1)} minutes`
    );
  }

  /**
   * Cancel all active orders
   */
  private async cancelAllOrders(): Promise<void> {
    try {
      const clientIds = Array.from(this.activeOrders.keys()).map((id) =>
        parseInt(id)
      );

      if (clientIds.length === 0) {
        console.log("No active orders to cancel");
        return;
      }

      const currentBlock =
        await this.compositeClient.validatorClient.get.latestBlockHeight();
      const goodTilBlock = currentBlock + 10;

      const tx =
        await this.compositeClient.batchCancelShortTermOrdersWithMarketId(
          this.subaccount,
          [{ marketId: this.config.marketId, clientIds }],
          goodTilBlock
        );

      this.activeOrders.clear();
      console.log(`✅ Cancelled ${clientIds.length} wash trade orders`);
    } catch (error) {
      console.error(
        "❌ Error cancelling orders:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get current statistics
   */
  getStats(): WashTradeStats {
    return { ...this.stats };
  }

  /**
   * Get current state
   */
  getState(): WashTradeState {
    return this.state;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WashTradeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("✅ Configuration updated");
  }
}
