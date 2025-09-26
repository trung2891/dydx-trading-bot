/**
 * Test script for Binance futures oracle integration in MM module
 */

import "dotenv/config";
import { BinancePriceService } from "../src/mm/binance-price-service";
import { MarketDataManager } from "../src/mm/market-data";
import { Network } from "@oraichain/lfg-client-js";

async function testBinanceOracle() {
  console.log("🚀 Testing Binance Futures Oracle Integration");
  console.log("=============================================\n");

  const binanceService = new BinancePriceService();

  // Test 1: Basic connection test
  console.log("📡 Test 1: Testing Binance connection...");
  const connectionTest = await binanceService.testConnection();
  console.log(
    `Connection status: ${connectionTest ? "✅ Success" : "❌ Failed"}\n`
  );

  if (!connectionTest) {
    console.error("❌ Cannot proceed without Binance connection");
    return;
  }

  // Test 2: Single price fetch
  console.log("💰 Test 2: Fetching single price...");
  const btcPrice = await binanceService.getPrice("BTC-USD");
  console.log(`BTC-USD price: ${btcPrice ? `$${btcPrice}` : "❌ Failed"}\n`);

  // Test 3: Multiple prices fetch
  console.log("📊 Test 3: Fetching multiple prices...");
  const testMarkets = ["BTC-USD", "ETH-USD", "SOL-USD"];
  const prices = await binanceService.getPrices(testMarkets);

  console.log("Price results:");
  for (const [market, price] of prices.entries()) {
    console.log(`  ${market}: $${price}`);
  }
  console.log();

  // Test 4: Mid price calculation
  console.log("🎯 Test 4: Testing mid price calculation...");
  const ethMidPrice = await binanceService.getMidPrice("ETH-USD");
  console.log(
    `ETH-USD mid price: ${ethMidPrice ? `$${ethMidPrice}` : "❌ Failed"}\n`
  );

  // Test 5: Cache functionality
  console.log("💾 Test 5: Testing cache functionality...");
  console.log("Fetching BTC price again (should use cache)...");
  const btcPriceCached = await binanceService.getPrice("BTC-USD");
  console.log(
    `BTC-USD price (cached): ${
      btcPriceCached ? `$${btcPriceCached}` : "❌ Failed"
    }`
  );

  const cacheStats = binanceService.getCacheStats();
  console.log(`Cache size: ${cacheStats.size} entries`);
  console.log();

  // Test 6: MarketDataManager integration
  console.log("🔗 Test 6: Testing MarketDataManager integration...");
  try {
    // Create a test network configuration
    const network = Network.mainnet();
    network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL!;
    network.indexerConfig.websocketEndpoint =
      process.env.INDEXER_WEBSOCKET_URL!;
    network.validatorConfig.restEndpoint = process.env.REST_URL!;
    network.validatorConfig.chainId = process.env.CHAIN_ID!;

    const marketDataManager = new MarketDataManager(network);

    // Test with Binance fallback enabled
    console.log("Testing MarketDataManager with Binance fallback...");
    const marketData = await marketDataManager.getMarketData(
      "BTC-USD",
      true, // force refresh
      {
        useBinanceFallback: true,
        binanceSpread: 0.1,
      }
    );

    if (marketData) {
      console.log(`✅ Market data retrieved successfully:`);
      console.log(`  Market: ${marketData.marketId}`);
      console.log(`  Mid Price: $${marketData.midPrice}`);
      console.log(`  Best Bid: $${marketData.bestBid}`);
      console.log(`  Best Ask: $${marketData.bestAsk}`);
      console.log(`  Volume 24h: ${marketData.volume24h}`);
    } else {
      console.log("❌ Failed to retrieve market data");
    }
  } catch (error) {
    console.error("❌ MarketDataManager test failed:", error);
  }
  console.log();

  // Test 7: Oracle price comparison simulation
  console.log("🔮 Test 7: Oracle price comparison simulation...");
  const currentPrice = btcPrice || 0;
  const oraclePrice = await binanceService.getPrice("BTC-USD");

  if (currentPrice && oraclePrice) {
    const priceDifference = Math.abs(currentPrice - oraclePrice);
    const priceDifferencePercentage = (priceDifference / oraclePrice) * 100;

    console.log(`Current Price: $${currentPrice}`);
    console.log(`Oracle Price: $${oraclePrice}`);
    console.log(`Price Difference: ${priceDifferencePercentage.toFixed(4)}%`);

    const threshold = 0.5; // 0.5% threshold
    const shouldTriggerOracle = priceDifferencePercentage >= threshold;

    console.log(`Oracle Threshold: ${threshold}%`);
    console.log(
      `Should Trigger Oracle Strategy: ${shouldTriggerOracle ? "YES" : "NO"}`
    );
  }
  console.log();

  console.log("✅ Binance Oracle Integration Test Complete!");
  console.log(
    "The MM module is now using Binance futures as the oracle instead of CoinGecko."
  );
}

// Run the test
if (require.main === module) {
  testBinanceOracle().catch(console.error);
}

export { testBinanceOracle };
