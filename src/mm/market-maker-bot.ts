import "dotenv/config";
import {
  CompositeClient,
  LocalWallet,
  SubaccountInfo,
  BECH32_PREFIX,
  Network,
} from "@oraichain/lfg-client-js";

import { MarketDataManager } from "./market-data";
import { OrderManager } from "./order-manager";
import { PositionManager } from "./position-manager";
import {
  MarketMakerConfig,
  BotState,
  MarketMakerStats,
  MarketData,
} from "./types";
import { sleep, getCurrentTimestamp, isWithinPercentage } from "./utils";

export class MarketMakerBot {
  private compositeClient!: CompositeClient;
  private wallet!: LocalWallet;
  private subaccount!: SubaccountInfo;
  private marketDataManager!: MarketDataManager;
  private orderManager!: OrderManager;
  private positionManager!: PositionManager;

  private config: MarketMakerConfig;
  private state: BotState = BotState.STOPPED;
  private stats: MarketMakerStats;
  private lastOrderRefresh: number = 0;
  private lastMarketDataUpdate: number = 0;
  private emergencyStop: boolean = false;
  private network: Network;

  constructor(config: MarketMakerConfig, network?: Network) {
    this.config = config;
    this.network = network || this.getDefaultNetwork();

    this.stats = {
      totalTrades: 0,
      totalVolume: 0,
      totalPnl: 0,
      winRate: 0,
      averageSpread: 0,
      uptime: getCurrentTimestamp(),
      lastUpdate: getCurrentTimestamp(),
    };

    console.log(`🤖 Market Maker Bot initialized for ${config.marketId}`);
    console.log(
      `📊 Config: Spread ${config.spread}%, Max Orders: ${config.maxOrders}, Refresh: ${config.refreshInterval}ms`
    );
  }

  /**
   * Initialize the bot with wallet and clients.
   */
  async initialize(): Promise<boolean> {
    try {
      this.state = BotState.STARTING;
      console.log("🚀 Initializing Market Maker Bot...");

      // Initialize wallet
      const mnemonic = process.env.DYDX_TEST_MNEMONIC;
      if (!mnemonic) {
        throw new Error("DYDX_TEST_MNEMONIC environment variable is required");
      }

      this.wallet = await LocalWallet.fromMnemonic(mnemonic, BECH32_PREFIX);
      console.log(`✅ Wallet initialized: ${this.wallet.address}`);

      // Initialize composite client
      this.compositeClient = await CompositeClient.connect(this.network);
      console.log("✅ Composite client connected");

      // Initialize subaccount
      this.subaccount = SubaccountInfo.forLocalWallet(this.wallet, 0);
      console.log(`✅ Subaccount initialized: ${this.subaccount.address}`);

      // Initialize managers
      this.marketDataManager = new MarketDataManager(this.network);
      this.orderManager = new OrderManager(
        this.compositeClient,
        this.subaccount
      );
      this.positionManager = new PositionManager(
        this.compositeClient,
        this.subaccount
      );

      console.log("✅ All managers initialized");

      // Validate market and fetch initial data
      const marketData = await this.marketDataManager.getMarketData(
        this.config.marketId,
        false,
        {
          useCoinGeckoFallback: this.config.orderConfig.useCoinGeckoFallback,
          coinGeckoSpread: this.config.orderConfig.coinGeckoSpread,
        }
      );
      if (!marketData) {
        throw new Error(
          `Failed to fetch market data for ${this.config.marketId}`
        );
      }

      console.log(`✅ Market data validated for ${this.config.marketId}`);
      console.log(`📊 Current mid price: $${marketData.midPrice}`);

      this.state = BotState.RUNNING;
      console.log("🎯 Market Maker Bot initialized successfully!");

      return true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize bot:",
        error instanceof Error ? error.message : String(error)
      );
      this.state = BotState.ERROR;
      return false;
    }
  }

  /**
   * Start the market making bot.
   */
  async start(): Promise<void> {
    if (this.state !== BotState.RUNNING) {
      const initialized = await this.initialize();
      if (!initialized) {
        return;
      }
    }

    console.log("🎯 Starting market making operations...");

    // Initial position check
    await this.logPositionSummary();

    // Main bot loop
    while (this.state === BotState.RUNNING && !this.emergencyStop) {
      try {
        await this.runMarketMakingCycle();
        await sleep(1000); // 1 second between cycles
      } catch (error) {
        console.error(
          "❌ Error in market making cycle:",
          error instanceof Error ? error.message : String(error)
        );

        // Emergency stop on critical errors
        if (this.shouldEmergencyStop(error)) {
          console.error("🚨 EMERGENCY STOP TRIGGERED");
          await this.emergencyStopBot();
          break;
        }

        await sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Main market making cycle.
   */
  private async runMarketMakingCycle(): Promise<void> {
    const now = getCurrentTimestamp() * 1000;

    // 1. Fetch market data
    const marketData = await this.marketDataManager.getMarketData(
      this.config.marketId,
      false,
      {
        useCoinGeckoFallback: this.config.orderConfig.useCoinGeckoFallback,
        coinGeckoSpread: this.config.orderConfig.coinGeckoSpread,
      }
    );
    if (!marketData) {
      console.warn("⚠️ No market data available, skipping cycle");
      return;
    }

    this.lastMarketDataUpdate = now;

    // 2. Risk management checks
    const riskCheckPassed = await this.performRiskChecks(marketData);
    if (!riskCheckPassed) {
      console.warn("⚠️ Risk checks failed, skipping order placement");
      return;
    }

    // 3. Check if we need to refresh orders
    const shouldRefreshOrders =
      now - this.lastOrderRefresh > this.config.refreshInterval;

    if (shouldRefreshOrders) {
      await this.refreshOrders(marketData);
      this.lastOrderRefresh = now;
    }

    // 4. Update statistics
    await this.updateStats();

    // 5. Log status periodically
    if (now % 30000 < 1000) {
      // Every 30 seconds
      await this.logStatus(marketData);
    }
  }

  /**
   * Refresh orders around current mid price.
   */
  private async refreshOrders(marketData: MarketData): Promise<void> {
    const refreshStartTime = Date.now();

    try {
      console.log(
        `🔄 Refreshing orders for ${this.config.marketId} at mid price $${marketData.midPrice}`
      );

      // 1. Cancel existing orders
      const cancelStartTime = Date.now();
      // await this.orderManager.cancelAllOrdersForMarket(
      //   this.config.marketId,
      //   this.config
      // );
      const cancelTime = Date.now() - cancelStartTime;
      console.log(`🗑️  Order cancellation completed in ${cancelTime}ms`);

      await sleep(1000); // Wait for cancellations to process

      // 2. Sync with exchange to ensure clean state
      const syncStartTime = Date.now();
      await this.orderManager.syncOrdersWithExchange(this.config.marketId);
      const syncTime = Date.now() - syncStartTime;
      console.log(`🔄 Order sync completed in ${syncTime}ms`);

      // 3. Place new orders
      const placedOrders = await this.orderManager.placeOrdersAroundMidPrice(
        this.config.marketId,
        marketData.midPrice,
        this.config
      );

      const totalRefreshTime = Date.now() - refreshStartTime;
      console.log(
        `✅ Refreshed orders: ${placedOrders.length} new orders placed`
      );
      console.log(
        `🕒 Total refresh cycle: ${totalRefreshTime}ms (Cancel: ${cancelTime}ms, Sync: ${syncTime}ms, Place: ${
          totalRefreshTime - cancelTime - syncTime - 1000
        }ms)`
      );
    } catch (error) {
      console.error(
        "❌ Error refreshing orders:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Perform risk management checks.
   */
  private async performRiskChecks(marketData: MarketData): Promise<boolean> {
    try {
      // 1. Check position size limits
      const currentPosition = await this.positionManager.getPositionSize(
        this.config.marketId
      );
      if (currentPosition >= this.config.maxPositionSize) {
        console.warn(
          `⚠️ Position size ${currentPosition} exceeds maximum ${this.config.maxPositionSize}`
        );
        return false;
      }

      // 2. Check unrealized PnL
      const totalUnrealizedPnL =
        await this.positionManager.getTotalUnrealizedPnL();
      const portfolioValue =
        await this.positionManager.calculatePortfolioValue();

      if (portfolioValue > 0) {
        const drawdownPercentage = (totalUnrealizedPnL / portfolioValue) * 100;
        if (drawdownPercentage < -this.config.riskParameters.maxDrawdown) {
          console.warn(
            `⚠️ Drawdown ${drawdownPercentage.toFixed(2)}% exceeds maximum ${
              this.config.riskParameters.maxDrawdown
            }%`
          );
          return false;
        }
      }

      // 3. Check market conditions (basic volatility check)
      // const spread =
      //   ((marketData.bestAsk - marketData.bestBid) / marketData.midPrice) * 100;
      // if (spread > this.config.spread * 5) {
      //   // If spread is 5x our target spread
      //   console.warn(`⚠️ Market spread ${spread.toFixed(2)}% is too wide`);
      //   return false;
      // }

      // 4. Check USDC balance
      const usdcBalance = await this.positionManager.getUSDCBalance();
      if (usdcBalance < 10) {
        // Minimum $100 required
        console.warn(`⚠️ USDC balance ${usdcBalance} is too low`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ Error in risk checks:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Update bot statistics.
   */
  private async updateStats(): Promise<void> {
    try {
      // Update basic stats
      this.stats.lastUpdate = getCurrentTimestamp();

      // Get current orders for spread calculation
      const activeOrders = this.orderManager.getActiveOrders(
        this.config.marketId
      );
      if (activeOrders.length > 0) {
        const buyOrders = activeOrders.filter((order) => order.side === "BUY");
        const sellOrders = activeOrders.filter(
          (order) => order.side === "SELL"
        );

        if (buyOrders.length > 0 && sellOrders.length > 0) {
          const avgBuyPrice =
            buyOrders.reduce((sum, order) => sum + order.price, 0) /
            buyOrders.length;
          const avgSellPrice =
            sellOrders.reduce((sum, order) => sum + order.price, 0) /
            sellOrders.length;
          this.stats.averageSpread =
            ((avgSellPrice - avgBuyPrice) /
              ((avgSellPrice + avgBuyPrice) / 2)) *
            100;
        }
      }

      // Update PnL
      this.stats.totalPnl = await this.positionManager.getTotalRealizedPnL();
    } catch (error) {
      console.error(
        "❌ Error updating stats:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Log current bot status.
   */
  private async logStatus(marketData: MarketData): Promise<void> {
    try {
      const orderStats = this.orderManager.getOrderStats();
      const uptime = getCurrentTimestamp() - this.stats.uptime;

      console.log(`\n📊 Bot Status (${this.config.marketId}):`);
      console.log(`🎯 State: ${this.state}`);
      console.log(`💰 Mid Price: $${marketData.midPrice}`);
      console.log(
        `📈 Spread: ${(
          ((marketData.bestAsk - marketData.bestBid) / marketData.midPrice) *
          100
        ).toFixed(3)}%`
      );
      console.log(`🎪 Active Orders: ${orderStats.totalOrders}`);
      console.log(`💵 Total PnL: $${this.stats.totalPnl.toFixed(2)}`);
      console.log(`⏰ Uptime: ${Math.floor(uptime / 60)} minutes`);
    } catch (error) {
      console.error(
        "❌ Error logging status:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Log position summary.
   */
  private async logPositionSummary(): Promise<void> {
    try {
      const summary = await this.positionManager.getPositionSummary();
      console.log(summary);
    } catch (error) {
      console.error(
        "❌ Error logging position summary:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Stop the bot gracefully.
   */
  async stop(): Promise<void> {
    console.log("🛑 Stopping Market Maker Bot...");
    this.state = BotState.STOPPED;

    try {
      // Cancel all orders
      await this.orderManager.cancelAllOrders(this.config);
      console.log("✅ All orders cancelled");

      // Log final position summary
      await this.logPositionSummary();

      // Log final stats
      const uptime = getCurrentTimestamp() - this.stats.uptime;
      console.log(`\n📊 Final Bot Statistics:`);
      console.log(`⏰ Total Uptime: ${Math.floor(uptime / 60)} minutes`);
      console.log(`💵 Final PnL: $${this.stats.totalPnl.toFixed(2)}`);
      console.log(`🎪 Total Trades: ${this.stats.totalTrades}`);

      console.log("✅ Market Maker Bot stopped gracefully");
    } catch (error) {
      console.error(
        "❌ Error stopping bot:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Emergency stop the bot.
   */
  private async emergencyStopBot(): Promise<void> {
    this.emergencyStop = true;
    this.state = BotState.ERROR;

    try {
      // Try to cancel all orders
      await this.orderManager.cancelAllOrders();
      console.log("🚨 Emergency stop: All orders cancelled");
    } catch (error) {
      console.error(
        "🚨 Emergency stop: Failed to cancel orders:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check if error should trigger emergency stop.
   */
  private shouldEmergencyStop(error: any): boolean {
    const criticalErrors = [
      "insufficient funds",
      "account suspended",
      "invalid signature",
      "network error",
    ];

    const errorMessage = error.message?.toLowerCase() || "";
    return criticalErrors.some((criticalError) =>
      errorMessage.includes(criticalError)
    );
  }

  /**
   * Get default network configuration.
   */
  private getDefaultNetwork(): Network {
    const network = Network.mainnet();
    // Use custom endpoints if provided in samples
    network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL!;
    network.indexerConfig.websocketEndpoint =
      process.env.INDEXER_WEBSOCKET_URL!;

    network.validatorConfig.restEndpoint = process.env.REST_URL!;
    network.validatorConfig.chainId = process.env.CHAIN_ID!;
    return network;
  }

  /**
   * Get current bot state.
   */
  getState(): BotState {
    return this.state;
  }

  /**
   * Get bot statistics.
   */
  getStats(): MarketMakerStats {
    return { ...this.stats };
  }

  /**
   * Update bot configuration.
   */
  updateConfig(newConfig: Partial<MarketMakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`⚙️ Configuration updated for ${this.config.marketId}`);
  }

  /**
   * Pause the bot.
   */
  pause(): void {
    if (this.state === BotState.RUNNING) {
      this.state = BotState.PAUSED;
      console.log("⏸️ Bot paused");
    }
  }

  /**
   * Resume the bot.
   */
  resume(): void {
    if (this.state === BotState.PAUSED) {
      this.state = BotState.RUNNING;
      console.log("▶️ Bot resumed");
    }
  }
}
