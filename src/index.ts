/**
 * Main entry point for the dYdX Trading Bot
 *
 * This file demonstrates how to use the market maker bot.
 * For more advanced examples, see src/mm/example.ts
 */

import "dotenv/config";
import { MarketMakerBot, MarketMakerConfig, OrderType } from "./mm";

console.log("🚀 dYdX Market Maker Bot starting...");

// Default configuration for BTC-USD market making
const defaultConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.001, // 0.1% spread
  stepSize: 0.001, // 0.01% step size
  orderSize: 0.01, // 0.001 BTC per order
  maxOrders: 2000, // 3 orders per side
  priceSteps: 1000, // 3 price levels
  refreshInterval: 5000, // Refresh every 30 seconds
  maxPositionSize: 100, // Maximum 0.005 BTC position
  orderType: OrderType.SHORT_TERM, // Use long-term orders (better for market making)
  orderConfig: {
    goodTilTimeSeconds: 120, // 2 minutes for long-term orders
    goodTilBlocks: 20, // 5 blocks for short-term orders (if switched)
    batchSize: 200, // Place 1000 orders per batch
    batchDelay: 100, // 100ms delay between batches
    roundPrice: 4, // 3 decimal places for price
    roundSize: 5, // 4 decimal places for size
    useCoinGeckoFallback: true, // Use CoinGecko when orderbook has no price
    coinGeckoSpread: 0.01, // 0.1% spread for CoinGecko fallback pricing
  },
  riskParameters: {
    maxDrawdown: 100, // 5% maximum drawdown
    stopLoss: 20, // 2% stop loss
    takeProfitRatio: 1.5, // 1.5:1 risk/reward ratio
  },
  oracleStrategy: {
    enabled: true, // enable oracle-based strategy
    oraclePriceThreshold: 0.01, // percentage difference to trigger oracle orders (e.g., 0.5 for 0.5%)
  },
};

async function main() {
  // Check if required environment variables are set
  if (!process.env.DYDX_TEST_MNEMONIC) {
    console.error("❌ DYDX_TEST_MNEMONIC environment variable is required");
    console.log("Please create a .env file with your dYdX wallet mnemonic:");
    console.log("DYDX_TEST_MNEMONIC=your_wallet_mnemonic_here");
    process.exit(1);
  }

  // Create and start the market maker bot
  const bot = new MarketMakerBot(defaultConfig);

  // Set up graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutdown signal received...");
    await bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught exception:", error);
    shutdown();
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
    shutdown();
  });

  try {
    // Start the market making operations
    await bot.start();
  } catch (error) {
    console.error(
      "❌ Failed to start market maker bot:",
      error instanceof Error ? error.message : String(error)
    );
    await bot.stop();
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error(
    "❌ Fatal error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});

export { MarketMakerBot, MarketMakerConfig };
