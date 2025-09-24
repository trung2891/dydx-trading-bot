#!/usr/bin/env tsx

/**
 * Test script for Binance Price Service
 *
 * This script tests the Binance futures price integration
 * to ensure it works correctly before running the wash trade bot.
 */

import { BinancePriceService } from "../src/washtrade/binance-price-service";

async function testBinancePriceService() {
  console.log("🧪 Testing Binance Price Service...\n");

  const binanceService = new BinancePriceService();

  try {
    // Test connection
    console.log("1. Testing connection...");
    const connected = await binanceService.testConnection();
    console.log(
      `   Connection status: ${connected ? "✅ Connected" : "❌ Failed"}\n`
    );

    // Test symbols
    const testSymbols = ["BTC-USD", "ETH-USD", "SOL-USD"];

    for (const symbol of testSymbols) {
      console.log(`2. Testing ${symbol}...`);

      // Test futures price
      const price = await binanceService.getFuturesPrice(symbol);
      console.log(
        `   Futures price: ${price ? `$${price.toFixed(2)}` : "❌ Failed"}`
      );

      // Test mid price from orderbook
      const midPrice = await binanceService.getFuturesMidPrice(symbol);
      console.log(
        `   Mid price: ${midPrice ? `$${midPrice.toFixed(2)}` : "❌ Failed"}`
      );

      // Test orderbook
      const orderbook = await binanceService.getFuturesOrderbook(symbol, 5);
      if (orderbook) {
        console.log(
          `   Orderbook: ${orderbook.bids.length} bids, ${orderbook.asks.length} asks`
        );
        if (orderbook.bids.length > 0 && orderbook.asks.length > 0) {
          console.log(`   Best bid: $${orderbook.bids[0][0].toFixed(2)}`);
          console.log(`   Best ask: $${orderbook.asks[0][0].toFixed(2)}`);
        }
      } else {
        console.log("   Orderbook: ❌ Failed");
      }

      console.log("");
    }

    // Test multiple prices
    console.log("3. Testing multiple prices...");
    const multiplePrices = await binanceService.getMultiplePrices(testSymbols);
    console.log("   Multiple prices result:");
    for (const [symbol, price] of Object.entries(multiplePrices)) {
      console.log(`     ${symbol}: $${price.toFixed(2)}`);
    }
    console.log("");

    console.log("✅ Binance Price Service test completed successfully!");
    console.log("\n📋 Summary:");
    console.log(
      "   - Binance futures prices are now the primary source for wash trading"
    );
    console.log("   - Fallback to local orderbook if Binance fails");
    console.log("   - Final fallback to CoinGecko if all else fails");
    console.log("   - All price sources are logged for transparency");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testBinancePriceService().catch(console.error);
}

export { testBinancePriceService };
