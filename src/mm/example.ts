/**
 * Example usage of the Market Maker Bot
 *
 * This example shows how to:
 * 1. Configure the market maker bot
 * 2. Start market making operations
 * 3. Handle graceful shutdown
 */

import "dotenv/config";
import { MarketMakerBot } from "./market-maker-bot";
import { MarketMakerConfig, OrderType } from "./types";

// Example configuration for BTC-USD market making
const btcConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.05, // 0.05% spread
  stepSize: 0.001, // 0.001% step size
  orderSize: 0.001, // 0.001 BTC per order
  maxOrders: 3, // 3 orders per side
  priceSteps: 3, // 3 price levels
  refreshInterval: 30000, // Refresh every 30 seconds
  maxPositionSize: 0.01, // Maximum 0.01 BTC position
  orderType: OrderType.LONG_TERM, // Use long-term orders
  orderConfig: {
    goodTilTimeSeconds: 300, // 5 minutes for long-term orders
    batchSize: 5, // Place 5 orders per batch
    batchDelay: 100, // 100ms delay between batches
  },
  riskParameters: {
    maxDrawdown: 5, // 5% maximum drawdown
    stopLoss: 2, // 2% stop loss
    takeProfitRatio: 1.5, // 1.5:1 risk/reward ratio
  },
};

// Example configuration for ETH-USD market making
const ethConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.08, // 0.08% spread (slightly wider for ETH)
  stepSize: 0.001, // 0.001% step size
  orderSize: 0.01, // 0.01 ETH per order
  maxOrders: 5, // 5 orders per side
  priceSteps: 5, // 5 price levels
  refreshInterval: 20000, // Refresh every 20 seconds
  maxPositionSize: 0.1, // Maximum 0.1 ETH position
  orderType: OrderType.SHORT_TERM, // Use short-term orders for faster trading
  orderConfig: {
    goodTilBlocks: 15, // 15 blocks for short-term orders
    batchSize: 10, // Place 10 orders per batch
    batchDelay: 50, // 50ms delay between batches
  },
  riskParameters: {
    maxDrawdown: 3, // 3% maximum drawdown
    stopLoss: 1.5, // 1.5% stop loss
    takeProfitRatio: 2, // 2:1 risk/reward ratio
  },
};

async function runMarketMakerExample() {
  console.log("🚀 Starting Market Maker Bot Example");

  // Create bot instance with BTC configuration
  const bot = new MarketMakerBot(btcConfig);

  // Set up graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutdown signal received...");
    await bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    // Start the market making bot
    await bot.start();
  } catch (error) {
    console.error(
      "❌ Market maker bot error:",
      error instanceof Error ? error.message : String(error)
    );
    await bot.stop();
    process.exit(1);
  }
}

async function runMultiMarketExample() {
  console.log("🚀 Starting Multi-Market Market Maker Example");

  // Create multiple bot instances
  const btcBot = new MarketMakerBot(btcConfig);
  const ethBot = new MarketMakerBot(ethConfig);

  // Set up graceful shutdown for both bots
  const shutdown = async () => {
    console.log("\n🛑 Shutdown signal received...");
    await Promise.all([btcBot.stop(), ethBot.stop()]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    // Start both bots concurrently
    await Promise.all([btcBot.start(), ethBot.start()]);
  } catch (error) {
    console.error(
      "❌ Multi-market bot error:",
      error instanceof Error ? error.message : String(error)
    );
    await Promise.all([btcBot.stop(), ethBot.stop()]);
    process.exit(1);
  }
}

// Example of dynamic configuration updates
async function runDynamicConfigExample() {
  console.log("🚀 Starting Dynamic Configuration Example");

  const bot = new MarketMakerBot(btcConfig);

  // Set up graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutdown signal received...");
    await bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    // Start the bot
    await bot.initialize();

    // Start market making in background
    bot.start().catch(console.error);

    // Example: Update configuration every 5 minutes
    setInterval(() => {
      // Adjust spread based on market conditions (example logic)
      const currentHour = new Date().getHours();
      let newSpread = 0.05;

      // Increase spread during less liquid hours
      if (currentHour < 6 || currentHour > 22) {
        newSpread = 0.08;
      }

      bot.updateConfig({ spread: newSpread });
      console.log(`⚙️ Updated spread to ${newSpread}%`);
    }, 5 * 60 * 1000); // 5 minutes
  } catch (error) {
    console.error(
      "❌ Dynamic config bot error:",
      error instanceof Error ? error.message : String(error)
    );
    await bot.stop();
    process.exit(1);
  }
}

// Run the example based on command line argument
const example = process.argv[2] || "single";

switch (example) {
  case "single":
    runMarketMakerExample();
    break;
  case "multi":
    runMultiMarketExample();
    break;
  case "dynamic":
    runDynamicConfigExample();
    break;
  default:
    console.log("Usage: npm run dev -- [single|multi|dynamic]");
    console.log("Examples:");
    console.log("  npm run dev -- single   # Single market (BTC-USD)");
    console.log(
      "  npm run dev -- multi    # Multiple markets (BTC-USD + ETH-USD)"
    );
    console.log("  npm run dev -- dynamic  # Dynamic configuration updates");
    process.exit(1);
}
