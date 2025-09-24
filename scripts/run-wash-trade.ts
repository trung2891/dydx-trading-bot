#!/usr/bin/env ts-node

/**
 * Script to run the wash trading bot
 *
 * Usage:
 *   npm run wash-trade
 *   npm run wash-trade -- --config=moderate
 *   npm run wash-trade -- --config=aggressive --market=ETH-USD
 */

import "dotenv/config";
import {
  LocalWallet,
  BECH32_PREFIX,
  CompositeClient,
  Network,
} from "@oraichain/lfg-client-js";
import {
  WashTradeBot,
  WashTradeConfig,
  getWashTradeConfig,
  listWashTradeConfigs,
} from "../src/washtrade";
import { MarketMakerBot } from "../src/mm/market-maker-bot";
import { SubaccountInfo } from "@oraichain/lfg-client-js";

// Parse command line arguments
const args = process.argv.slice(2);
const configArg = args.find((arg) => arg.startsWith("--config="));
const marketArg = args.find((arg) => arg.startsWith("--market="));

const configName = configArg ? configArg.split("=")[1] : "moderate";
const marketId = marketArg ? marketArg.split("=")[1] : undefined;

const defaultConfig: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 2000000, // $200000 per hour
  orderSize: 0.02, // 0.01 BTC per order
  spread: 0.001, // 0.05% spread
  minInterval: 100, // 0.5 seconds minimum between trades
  maxInterval: 2000, // 3 seconds maximum between trades
  priceVariation: 0.02, // 0.02% price variation
  orderConfig: {
    goodTilBlocks: 20, // 5 blocks expiration
    batchSize: 2,
    batchDelay: 25,
    roundPrice: 3,
    roundSize: 4,
  },
  riskParameters: {
    maxPositionSize: 100, // Maximum 0.1 BTC position
    stopLoss: 1, // 0.25% stop loss
    maxDrawdown: 10, // 0.5% maximum drawdown
  },
  volumeStrategy: {
    type: "BURST",
    burstSize: 5, // 5 trades per burst
    burstInterval: 5000, // 10 seconds between bursts
  },
};

async function main() {
  console.log("🚀 Wash Trade Bot Script starting...");

  // Validate configuration name

  // Check environment variables
  if (!process.env.DYDX_TEST_MNEMONIC) {
    console.error("❌ DYDX_TEST_MNEMONIC environment variable is required");
    console.log("Please create a .env file with your dYdX wallet mnemonic:");
    console.log("DYDX_TEST_MNEMONIC=your_wallet_mnemonic_here");
    process.exit(1);
  }

  try {
    // Get configuration
    let config = defaultConfig;

    // Override market if specified
    if (marketId) {
      config = { ...config, marketId };
      console.log(`📊 Using market: ${marketId}`);
    }

    console.log(`📊 Using configuration: ${configName}`);
    console.log(`📊 Target volume: $${config.volumeTarget}/hour`);
    console.log(`📊 Order size: ${config.orderSize}`);
    console.log(`📊 Spread: ${config.spread}%`);

    const network = MarketMakerBot.getDefaultNetwork();

    // Initialize dYdX client
    const compositeClient = await CompositeClient.connect(network);

    // Get subaccount info
    const wallet = await LocalWallet.fromMnemonic(
      process.env.WASH_TRADE_MNEMONIC!,
      BECH32_PREFIX
    );
    const subaccount = SubaccountInfo.forLocalWallet(wallet, 0);
    console.log(`📊 Subaccount: ${subaccount.address}`);

    // Create and start wash trade bot
    const bot = new WashTradeBot(compositeClient, subaccount, config);

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

    // Start the bot
    await bot.start();
  } catch (error) {
    console.error(
      "❌ Failed to start wash trade bot:",
      error instanceof Error ? error.message : String(error)
    );
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
