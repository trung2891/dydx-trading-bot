/**
 * Example script demonstrating the Oracle-based Market Making Strategy
 *
 * This example shows how to use the oracle strategy that:
 * 1. Compares current market price with configurable oracle price (Binance futures or CoinGecko)
 * 2. Triggers oracle-based orders when price difference exceeds threshold
 * 3. Places bid/ask orders around the oracle price
 */

import "dotenv/config";
import { MarketMakerBot } from "./market-maker-bot";
import {
  oracleStrategyConfig,
  conservativeOracleConfig,
  aggressiveOracleConfig,
  binanceOracleConfig,
  coinGeckoOracleConfig,
  hybridConfig,
} from "./config-examples";

async function runOracleStrategyExample() {
  console.log("🚀 Starting Oracle Strategy Example");
  console.log("=====================================");

  // Example 1: Standard Oracle Strategy
  console.log("\n📊 Example 1: Standard Oracle Strategy (BTC-USD)");
  console.log("Configuration:");
  console.log(
    `- Oracle Price Threshold: ${oracleStrategyConfig.oracleStrategy?.oraclePriceThreshold}%`
  );
  console.log(`- Standard Spread: ${oracleStrategyConfig.spread}%`);
  console.log(`- Standard Order Size: ${oracleStrategyConfig.orderSize}`);
  console.log(`- Max Orders: ${oracleStrategyConfig.maxOrders}`);

  const bot1 = new MarketMakerBot(oracleStrategyConfig);

  try {
    await bot1.initialize();
    console.log("✅ Standard Oracle Strategy Bot initialized");

    // Run for a short period to demonstrate
    console.log(
      "🔄 Running bot for 2 minutes to demonstrate oracle strategy..."
    );
    setTimeout(async () => {
      await bot1.stop();
      console.log("✅ Standard Oracle Strategy example completed");
    }, 120000); // 2 minutes

    await bot1.start();
  } catch (error) {
    console.error("❌ Error in standard oracle strategy:", error);
  }

  // Example 2: Conservative Oracle Strategy
  console.log("\n📊 Example 2: Conservative Oracle Strategy (ETH-USD)");
  console.log("Configuration:");
  console.log(
    `- Oracle Price Threshold: ${conservativeOracleConfig.oracleStrategy?.oraclePriceThreshold}%`
  );
  console.log(`- Standard Spread: ${conservativeOracleConfig.spread}%`);
  console.log(`- Standard Order Size: ${conservativeOracleConfig.orderSize}`);
  console.log(`- Max Orders: ${conservativeOracleConfig.maxOrders}`);

  const bot2 = new MarketMakerBot(conservativeOracleConfig);

  try {
    await bot2.initialize();
    console.log("✅ Conservative Oracle Strategy Bot initialized");

    // Run for a short period to demonstrate
    console.log(
      "🔄 Running bot for 2 minutes to demonstrate conservative oracle strategy..."
    );
    setTimeout(async () => {
      await bot2.stop();
      console.log("✅ Conservative Oracle Strategy example completed");
    }, 120000); // 2 minutes

    await bot2.start();
  } catch (error) {
    console.error("❌ Error in conservative oracle strategy:", error);
  }

  // Example 3: Aggressive Oracle Strategy
  console.log("\n📊 Example 3: Aggressive Oracle Strategy (SOL-USD)");
  console.log("Configuration:");
  console.log(
    `- Oracle Price Threshold: ${aggressiveOracleConfig.oracleStrategy?.oraclePriceThreshold}%`
  );
  console.log(`- Standard Spread: ${aggressiveOracleConfig.spread}%`);
  console.log(`- Standard Order Size: ${aggressiveOracleConfig.orderSize}`);
  console.log(`- Max Orders: ${aggressiveOracleConfig.maxOrders}`);

  const bot3 = new MarketMakerBot(aggressiveOracleConfig);

  try {
    await bot3.initialize();
    console.log("✅ Aggressive Oracle Strategy Bot initialized");

    // Run for a short period to demonstrate
    console.log(
      "🔄 Running bot for 2 minutes to demonstrate aggressive oracle strategy..."
    );
    setTimeout(async () => {
      await bot3.stop();
      console.log("✅ Aggressive Oracle Strategy example completed");
    }, 120000); // 2 minutes

    await bot3.start();
  } catch (error) {
    console.error("❌ Error in aggressive oracle strategy:", error);
  }

  // Example 4: Binance Oracle Strategy
  console.log("\n📊 Example 4: Binance Oracle Strategy (BTC-USD)");
  console.log("Configuration:");
  console.log(
    `- Oracle Provider: ${binanceOracleConfig.oracleStrategy?.provider}`
  );
  console.log(
    `- Oracle Price Threshold: ${binanceOracleConfig.oracleStrategy?.oraclePriceThreshold}%`
  );
  console.log(`- Standard Spread: ${binanceOracleConfig.spread}%`);

  const bot4 = new MarketMakerBot(binanceOracleConfig);

  try {
    await bot4.initialize();
    console.log("✅ Binance Oracle Strategy Bot initialized");

    setTimeout(async () => {
      await bot4.stop();
      console.log("✅ Binance Oracle Strategy example completed");
    }, 120000); // 2 minutes

    await bot4.start();
  } catch (error) {
    console.error("❌ Error in Binance oracle strategy:", error);
  }

  // Example 5: CoinGecko Oracle Strategy
  console.log("\n📊 Example 5: CoinGecko Oracle Strategy (ETH-USD)");
  console.log("Configuration:");
  console.log(
    `- Oracle Provider: ${coinGeckoOracleConfig.oracleStrategy?.provider}`
  );
  console.log(
    `- Oracle Price Threshold: ${coinGeckoOracleConfig.oracleStrategy?.oraclePriceThreshold}%`
  );
  console.log(`- Standard Spread: ${coinGeckoOracleConfig.spread}%`);

  const bot5 = new MarketMakerBot(coinGeckoOracleConfig);

  try {
    await bot5.initialize();
    console.log("✅ CoinGecko Oracle Strategy Bot initialized");

    setTimeout(async () => {
      await bot5.stop();
      console.log("✅ CoinGecko Oracle Strategy example completed");
    }, 120000); // 2 minutes

    await bot5.start();
  } catch (error) {
    console.error("❌ Error in CoinGecko oracle strategy:", error);
  }

  // Example 6: Hybrid Configuration
  console.log("\n📊 Example 6: Hybrid Configuration (SOL-USD)");
  console.log("Configuration:");
  console.log(`- Oracle Provider: ${hybridConfig.oracleStrategy?.provider}`);
  console.log(
    `- Binance Fallback: ${hybridConfig.orderConfig.useBinanceFallback}`
  );
  console.log(
    `- CoinGecko Fallback: ${hybridConfig.orderConfig.useCoinGeckoFallback}`
  );
  console.log(
    `- Oracle Price Threshold: ${hybridConfig.oracleStrategy?.oraclePriceThreshold}%`
  );

  const bot6 = new MarketMakerBot(hybridConfig);

  try {
    await bot6.initialize();
    console.log("✅ Hybrid Configuration Bot initialized");

    setTimeout(async () => {
      await bot6.stop();
      console.log("✅ Hybrid Configuration example completed");
    }, 120000); // 2 minutes

    await bot6.start();
  } catch (error) {
    console.error("❌ Error in hybrid configuration:", error);
  }
}

// Example of how to create a custom oracle strategy
function createCustomOracleStrategy() {
  console.log("\n🛠️  Creating Custom Oracle Strategy");
  console.log("===================================");

  const customConfig = {
    marketId: "BTC-USD",
    spread: 0.12,
    stepSize: 0.01,
    orderSize: 0.001,
    maxOrders: 4,
    priceSteps: 4,
    refreshInterval: 45000, // 45 seconds
    maxPositionSize: 0.008,
    orderType: "LONG_TERM" as const,
    orderConfig: {
      goodTilTimeSeconds: 450,
      batchSize: 4,
      batchDelay: 150,
    },
    riskParameters: {
      maxDrawdown: 4,
      stopLoss: 1.8,
      takeProfitRatio: 1.8,
    },
    oracleStrategy: {
      enabled: true,
      oraclePriceThreshold: 0.7, // Custom threshold: 0.7%
      provider: "binance", // Use Binance futures as oracle
    },
  };

  console.log("Custom Oracle Strategy Configuration:");
  console.log(JSON.stringify(customConfig, null, 2));

  return customConfig;
}

// Example of environment-based oracle strategy
function demonstrateEnvironmentConfig() {
  console.log("\n🌍 Environment-Based Oracle Strategy");
  console.log("====================================");

  // Set environment variables for oracle strategy
  process.env.ORACLE_STRATEGY_ENABLED = "true";
  process.env.ORACLE_PRICE_THRESHOLD = "0.6";
  process.env.ORACLE_PROVIDER = "binance";

  console.log("Environment Variables Set:");
  console.log(
    `ORACLE_STRATEGY_ENABLED: ${process.env.ORACLE_STRATEGY_ENABLED}`
  );
  console.log(`ORACLE_PRICE_THRESHOLD: ${process.env.ORACLE_PRICE_THRESHOLD}%`);
  console.log(`ORACLE_PROVIDER: ${process.env.ORACLE_PROVIDER}`);
}

// Main execution
if (require.main === module) {
  console.log("🔮 Oracle Strategy Examples");
  console.log("===========================");
  console.log(
    "This example demonstrates different oracle-based market making strategies."
  );
  console.log(
    "The oracle strategy uses configurable price sources (Binance futures or CoinGecko) as a reference and places"
  );
  console.log(
    "orders when the current market price differs significantly from the oracle price.\n"
  );

  // Demonstrate configuration creation
  createCustomOracleStrategy();
  demonstrateEnvironmentConfig();

  // Run the examples
  runOracleStrategyExample().catch(console.error);
}

export {
  runOracleStrategyExample,
  createCustomOracleStrategy,
  demonstrateEnvironmentConfig,
};
