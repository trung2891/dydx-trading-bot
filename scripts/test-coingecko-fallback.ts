/**
 * Test script for CoinGecko price fallback functionality
 * This script demonstrates how the bot handles orderbook failures by using CoinGecko prices
 */

import "dotenv/config";
import { Network } from "@oraichain/lfg-client-js";
import { MarketDataManager, CoinGeckoService } from "../src/mm";

// Test markets
const TEST_MARKETS = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "DOGE-USD",
  "INVALID-MARKET", // This should fail
];

async function testCoinGeckoService() {
  console.log("🧪 Testing CoinGecko Service...\n");

  const coinGeckoService = new CoinGeckoService();

  // Test individual price fetching
  console.log("📊 Testing individual price fetching:");
  for (const market of TEST_MARKETS.slice(0, 4)) {
    // Skip invalid market
    try {
      const price = await coinGeckoService.getPrice(market);
      if (price) {
        console.log(`✅ ${market}: $${price.toFixed(2)}`);
      } else {
        console.log(`❌ ${market}: No price available`);
      }
    } catch (error) {
      console.log(`❌ ${market}: Error - ${error}`);
    }
  }

  console.log("\n📊 Testing batch price fetching:");
  try {
    const prices = await coinGeckoService.getPrices(TEST_MARKETS.slice(0, 4));
    prices.forEach((price, market) => {
      console.log(`✅ ${market}: $${price.toFixed(2)}`);
    });
  } catch (error) {
    console.log(`❌ Batch fetch error: ${error}`);
  }

  // Test cache
  console.log("\n🗄️ Testing cache functionality:");
  const cacheStats = coinGeckoService.getCacheStats();
  console.log(`Cache size: ${cacheStats.size} entries`);
  cacheStats.entries.forEach((entry) => {
    console.log(
      `  ${entry.marketId}: $${entry.price.toFixed(2)} (age: ${(
        entry.age / 1000
      ).toFixed(1)}s)`
    );
  });

  return coinGeckoService;
}

async function testMarketDataFallback() {
  console.log("\n🧪 Testing MarketDataManager with CoinGecko fallback...\n");

  // Create a network configuration
  function getDefaultNetwork(): Network {
    const network = Network.mainnet();
    // Use environment variables if available, otherwise use defaults
    if (process.env.INDEXER_REST_URL) {
      network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL;
    }
    if (process.env.INDEXER_WEBSOCKET_URL) {
      network.indexerConfig.websocketEndpoint =
        process.env.INDEXER_WEBSOCKET_URL;
    }
    if (process.env.REST_URL) {
      network.validatorConfig.restEndpoint = process.env.REST_URL;
    }
    if (process.env.CHAIN_ID) {
      network.validatorConfig.chainId = process.env.CHAIN_ID;
    }
    return network;
  }

  const network = getDefaultNetwork();
  const marketDataManager = new MarketDataManager(network);

  // Test with CoinGecko fallback enabled
  console.log("📈 Testing with CoinGecko fallback ENABLED:");
  for (const market of TEST_MARKETS.slice(0, 4)) {
    try {
      const marketData = await marketDataManager.getMarketData(
        market,
        true, // Force refresh
        {
          useCoinGeckoFallback: true,
          coinGeckoSpread: 0.2, // 0.2% spread
        }
      );

      if (marketData) {
        console.log(`✅ ${market}:`);
        console.log(`   Mid Price: $${marketData.midPrice.toFixed(2)}`);
        console.log(`   Best Bid: $${marketData.bestBid.toFixed(2)}`);
        console.log(`   Best Ask: $${marketData.bestAsk.toFixed(2)}`);
        console.log(
          `   Spread: ${(
            ((marketData.bestAsk - marketData.bestBid) / marketData.midPrice) *
            100
          ).toFixed(3)}%`
        );
        console.log(`   Volume 24h: $${marketData.volume24h.toLocaleString()}`);
        console.log(`   Bid Size: ${marketData.bidSize}`);
        console.log(`   Ask Size: ${marketData.askSize}`);

        // Check if this looks like CoinGecko data (no orderbook sizes)
        if (marketData.bidSize === 0 && marketData.askSize === 0) {
          console.log(`   🔍 Source: CoinGecko fallback (no orderbook data)`);
        } else {
          console.log(`   📊 Source: dYdX orderbook`);
        }
      } else {
        console.log(`❌ ${market}: Failed to get market data`);
      }
      console.log("");
    } catch (error) {
      console.log(`❌ ${market}: Error - ${error}`);
      console.log("");
    }
  }

  // Test with CoinGecko fallback disabled
  console.log("📈 Testing with CoinGecko fallback DISABLED:");
  try {
    const marketData = await marketDataManager.getMarketData("BTC-USD", true, {
      useCoinGeckoFallback: false,
    });

    if (marketData) {
      console.log(`✅ BTC-USD: Got data from dYdX orderbook`);
      console.log(`   Mid Price: $${marketData.midPrice.toFixed(2)}`);
    } else {
      console.log(`❌ BTC-USD: No data available (fallback disabled)`);
    }
  } catch (error) {
    console.log(`❌ BTC-USD: Error - ${error}`);
  }
}

async function main() {
  console.log("🚀 CoinGecko Fallback Test Suite\n");
  console.log("This script tests the CoinGecko price fallback functionality");
  console.log("when dYdX orderbook data is unavailable.\n");

  try {
    // Test CoinGecko service directly
    await testCoinGeckoService();

    // Test market data manager with fallback
    await testMarketDataFallback();

    console.log("\n✅ All tests completed!");
    console.log("\n💡 Key Features Demonstrated:");
    console.log("   • CoinGecko API integration");
    console.log("   • Price caching (30 second TTL)");
    console.log("   • Batch price fetching");
    console.log("   • Configurable spread for fallback pricing");
    console.log("   • Graceful fallback when orderbook is unavailable");
    console.log("   • Option to disable fallback if needed");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Test interrupted by user");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
