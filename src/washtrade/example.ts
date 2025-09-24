/**
 * Example usage of the Wash Trade Bot
 *
 * This file demonstrates how to use the wash trading bot with different configurations.
 * For more advanced examples, see the main index.ts file.
 */

import "dotenv/config";
import {
  CompositeClient,
  Network,
  SubaccountInfo,
} from "@oraichain/lfg-client-js";
import { WashTradeBot } from "./wash-trade-bot";
import { WashTradeConfig } from "./types";
import { getWashTradeConfig } from "./config-examples";

console.log("🚀 Wash Trade Bot Example starting...");

// Example configuration for BTC-USD wash trading
const exampleConfig: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 2000, // $2000 per hour
  orderSize: 0.002, // 0.002 BTC per order
  spread: 0.1, // 0.1% spread
  minInterval: 3000, // 3 seconds minimum between trades
  maxInterval: 8000, // 8 seconds maximum between trades
  priceVariation: 0.05, // 0.05% price variation
  orderConfig: {
    goodTilBlocks: 8, // 8 blocks expiration
    batchSize: 1,
    batchDelay: 100,
    roundPrice: 3,
    roundSize: 4,
  },
  riskParameters: {
    maxPositionSize: 0.02, // Maximum 0.02 BTC position
    stopLoss: 0.5, // 0.5% stop loss
    maxDrawdown: 1, // 1% maximum drawdown
  },
  volumeStrategy: {
    type: "RANDOM", // Random volume generation
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

  try {
    // Initialize dYdX client
    const compositeClient = await CompositeClient.connect(Network.testnet());

    // Get subaccount info
    const subaccount =
      await compositeClient.indexerClient.account.getSubaccount(
        process.env.DYDX_TEST_MNEMONIC!,
        0
      );

    console.log(`📊 Subaccount: ${subaccount.address}`);
    console.log(`📊 Subaccount Number: ${subaccount.subaccountNumber}`);

    // Create wash trade bot
    const bot = new WashTradeBot(compositeClient, subaccount, exampleConfig);

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

    // Start the wash trading bot
    await bot.start();
  } catch (error) {
    console.error(
      "❌ Failed to start wash trade bot:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Example function to run with predefined configurations
async function runWithPredefinedConfig(configName: string) {
  try {
    const config = getWashTradeConfig(configName);
    console.log(
      `🚀 Starting wash trade bot with ${configName} configuration...`
    );

    // Initialize dYdX client
    const compositeClient = await CompositeClient.connect(Network.testnet());

    const subaccount =
      await compositeClient.indexerClient.account.getSubaccount(
        process.env.DYDX_TEST_MNEMONIC!,
        0
      );

    const bot = new WashTradeBot(compositeClient, subaccount, config);

    // Set up graceful shutdown
    const shutdown = async () => {
      console.log("\n🛑 Shutdown signal received...");
      await bot.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await bot.start();
  } catch (error) {
    console.error(
      `❌ Failed to start wash trade bot with ${configName} config:`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Example function to demonstrate configuration switching
async function demonstrateConfigSwitching() {
  try {
    const compositeClient = await CompositeClient.connect(Network.testnet());

    const subaccount =
      await compositeClient.indexerClient.account.getSubaccount(
        process.env.DYDX_TEST_MNEMONIC!,
        0
      );

    // Start with conservative config
    let config = getWashTradeConfig("conservative");
    const bot = new WashTradeBot(compositeClient, subaccount, config);

    console.log("🚀 Starting with conservative configuration...");
    await bot.start();

    // After 2 minutes, switch to moderate config
    setTimeout(async () => {
      console.log("🔄 Switching to moderate configuration...");
      const moderateConfig = getWashTradeConfig("moderate");
      bot.updateConfig(moderateConfig);
    }, 2 * 60 * 1000);

    // After 4 minutes, switch to aggressive config
    setTimeout(async () => {
      console.log("🔄 Switching to aggressive configuration...");
      const aggressiveConfig = getWashTradeConfig("aggressive");
      bot.updateConfig(aggressiveConfig);
    }, 4 * 60 * 1000);

    // Stop after 6 minutes
    setTimeout(async () => {
      console.log("🛑 Stopping bot after 6 minutes...");
      await bot.stop();
      process.exit(0);
    }, 6 * 60 * 1000);
  } catch (error) {
    console.error(
      "❌ Failed to demonstrate config switching:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Export functions for use in other files
export { main, runWithPredefinedConfig, demonstrateConfigSwitching };

// Run the main function if this file is executed directly
if (require.main === module) {
  // You can change this to run different examples:
  // main(); // Run with custom config
  // runWithPredefinedConfig("moderate"); // Run with predefined config
  demonstrateConfigSwitching(); // Demonstrate config switching
}
