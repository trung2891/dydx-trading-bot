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
import { BinancePriceService } from "./binance-price-service";
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
  private binancePriceService: BinancePriceService;
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
    this.binancePriceService = new BinancePriceService();

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
      // Test Binance connection
      console.log("🔗 Testing Binance connection...");
      const binanceConnected = await this.binancePriceService.testConnection();
      if (!binanceConnected) {
        console.warn(
          "⚠️ Binance connection failed, will use fallback price sources"
        );
      }

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
   * Execute arbitrage-based wash trade between orderbook and Binance prices
   */
  private async executeWashTrade(): Promise<void> {
    try {
      // Get both orderbook and Binance prices for comparison
      const orderbookPrice = await this.getOrderbookPrice();
      const binancePrice = await this.getBinancePrice();

      if (!orderbookPrice || !binancePrice) {
        console.warn(
          "⚠️ Could not get both orderbook and Binance prices, skipping trade"
        );
        return;
      }

      const priceDiff = orderbookPrice - binancePrice;
      const priceDiffPercent = (priceDiff / binancePrice) * 100;

      console.log(
        `📊 Price Comparison: Orderbook: $${orderbookPrice.toFixed(
          2
        )} | Binance: $${binancePrice.toFixed(2)} | Diff: $${priceDiff.toFixed(
          2
        )} (${priceDiffPercent.toFixed(3)}%)`
      );

      // Execute arbitrage strategy
      if (orderbookPrice > binancePrice) {
        // Orderbook price is higher than Binance -> SHORT at Binance price
        console.log(
          `📉 Orderbook > Binance: SHORTING at Binance price $${binancePrice.toFixed(
            2
          )}`
        );
        await this.executeShortArbitrage(binancePrice);
      } else if (orderbookPrice < binancePrice) {
        // Orderbook price is lower than Binance -> LONG at Binance price
        console.log(
          `📈 Orderbook < Binance: LONGING at Binance price $${binancePrice.toFixed(
            2
          )}`
        );
        await this.executeLongArbitrage(binancePrice);
      } else {
        console.log(`⚖️ Prices are equal, no arbitrage opportunity`);
      }
    } catch (error) {
      console.error(
        "❌ Error executing arbitrage wash trade:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute short arbitrage when orderbook price > Binance price
   */
  private async executeShortArbitrage(binancePrice: number): Promise<void> {
    const tradeSize = this.calculateTradeSize();

    // Place SELL order at Binance price
    console.log(
      `🔄 SHORT Arbitrage: Selling at Binance price $${binancePrice.toFixed(2)}`
    );

    await this.placeWashOrder(OrderSide.SELL, binancePrice, tradeSize);
  }

  /**
   * Execute long arbitrage when orderbook price < Binance price
   */
  private async executeLongArbitrage(binancePrice: number): Promise<void> {
    const tradeSize = this.calculateTradeSize();

    // Place BUY order at Binance price
    console.log(
      `🔄 LONG Arbitrage: Buying at Binance price $${binancePrice.toFixed(2)}`
    );

    await this.placeWashOrder(OrderSide.BUY, binancePrice, tradeSize);
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

      // Use limit order for precise price control
      const tx = await this.compositeClient.placeShortTermOrder(
        this.subaccount,
        this.config.marketId,
        side,
        price, // Use the calculated price for limit order
        roundedSize,
        clientId,
        goodTilBlock,
        Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED, // Good Till Time for limit orders
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
        `🔄 Arbitrage ${side} LIMIT order: ${roundedSize} ${
          this.config.marketId
        } at price $${price.toFixed(2)} (Client ID: ${clientId})`
      );

      return washOrder;
    } catch (error) {
      console.error(
        `❌ Failed to place arbitrage ${side} limit order:`,
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
   * Get orderbook mid price from local dYdX orderbook
   */
  private async getOrderbookPrice(): Promise<number | null> {
    try {
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
        const midPrice = (bestBid + bestAsk) / 2;
        return midPrice;
      }

      return null;
    } catch (error) {
      console.error("❌ Error getting orderbook price:", error);
      return null;
    }
  }

  /**
   * Get Binance futures price
   */
  private async getBinancePrice(): Promise<number | null> {
    try {
      // Try to get price from Binance futures first
      const binancePrice = await this.binancePriceService.getFuturesPrice(
        this.config.marketId
      );
      if (binancePrice) {
        return binancePrice;
      }

      // Fallback to Binance futures mid price from orderbook
      const binanceMidPrice = await this.binancePriceService.getFuturesMidPrice(
        this.config.marketId
      );
      if (binanceMidPrice) {
        return binanceMidPrice;
      }

      return null;
    } catch (error) {
      console.error("❌ Error getting Binance price:", error);
      return null;
    }
  }

  /**
   * Get current market price - prioritize Binance futures price (legacy method)
   */
  private async getCurrentMarketPrice(): Promise<number | null> {
    try {
      // 1. Try to get price from Binance futures first (primary source)
      const binancePrice = await this.binancePriceService.getFuturesPrice(
        this.config.marketId
      );
      if (binancePrice) {
        console.log(
          `🎯 Using Binance futures price: $${binancePrice.toFixed(2)}`
        );
        return binancePrice;
      }

      // 2. Fallback to Binance futures mid price from orderbook
      const binanceMidPrice = await this.binancePriceService.getFuturesMidPrice(
        this.config.marketId
      );
      if (binanceMidPrice) {
        console.log(
          `🎯 Using Binance futures mid price: $${binanceMidPrice.toFixed(2)}`
        );
        return binanceMidPrice;
      }

      // 3. Fallback to local orderbook
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
        const localMidPrice = (bestBid + bestAsk) / 2;
        console.log(
          `🎯 Using local orderbook mid price: $${localMidPrice.toFixed(2)}`
        );
        return localMidPrice;
      }

      // 4. Final fallback to CoinGecko
      const coinGeckoPrice = await this.coinGeckoService.getPrice(
        this.config.marketId
      );
      if (coinGeckoPrice) {
        console.log(
          `🎯 Using CoinGecko fallback price: $${coinGeckoPrice.toFixed(2)}`
        );
        return coinGeckoPrice;
      }

      console.warn("⚠️ Could not get any market price from all sources");
      return null;
    } catch (error) {
      console.error("❌ Error getting market price:", error);
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
