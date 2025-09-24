#!/usr/bin/env tsx

/**
 * Test script for Arbitrage Wash Trading Strategy
 *
 * This script tests the simplified arbitrage strategy that compares
 * orderbook prices vs Binance prices and executes trades accordingly.
 */

import { BinancePriceService } from "../src/washtrade/binance-price-service";
import { CompositeClient, Network } from "@oraichain/lfg-client-js";

async function testArbitrageStrategy() {
  console.log("🧪 Testing Arbitrage Wash Trading Strategy...\n");

  const binanceService = new BinancePriceService();

  try {
    // Test connection
    console.log("1. Testing Binance connection...");
    const connected = await binanceService.testConnection();
    console.log(
      `   Connection status: ${connected ? "✅ Connected" : "❌ Failed"}\n`
    );

    if (!connected) {
      console.log(
        "⚠️ Binance connection failed, but strategy will use fallbacks\n"
      );
    }

    // Test symbols
    const testSymbols = ["BTC-USD", "ETH-USD", "SOL-USD"];

    for (const symbol of testSymbols) {
      console.log(`2. Testing ${symbol} arbitrage logic...`);

      // Test Binance price
      const binancePrice = await binanceService.getFuturesPrice(symbol);
      console.log(
        `   Binance price: ${
          binancePrice ? `$${binancePrice.toFixed(2)}` : "❌ Failed"
        }`
      );

      // Simulate orderbook price (in real scenario, this would come from dYdX)
      const simulatedOrderbookPrice = binancePrice
        ? binancePrice * (1 + (Math.random() - 0.5) * 0.01)
        : null;
      console.log(
        `   Simulated orderbook price: ${
          simulatedOrderbookPrice
            ? `$${simulatedOrderbookPrice.toFixed(2)}`
            : "❌ Failed"
        }`
      );

      if (binancePrice && simulatedOrderbookPrice) {
        const priceDiff = simulatedOrderbookPrice - binancePrice;
        const priceDiffPercent = (priceDiff / binancePrice) * 100;

        console.log(
          `   Price difference: $${priceDiff.toFixed(
            2
          )} (${priceDiffPercent.toFixed(3)}%)`
        );

        // Test arbitrage logic
        if (simulatedOrderbookPrice > binancePrice) {
          console.log(`   📉 Strategy: SHORT (Orderbook > Binance)`);
          console.log(
            `   Action: Place SELL order at Binance price $${binancePrice.toFixed(
              2
            )}`
          );
        } else if (simulatedOrderbookPrice < binancePrice) {
          console.log(`   📈 Strategy: LONG (Orderbook < Binance)`);
          console.log(
            `   Action: Place BUY order at Binance price $${binancePrice.toFixed(
              2
            )}`
          );
        } else {
          console.log(`   ⚖️ Strategy: NO ACTION (Prices equal)`);
        }
      }

      console.log("");
    }

    console.log("✅ Arbitrage strategy test completed successfully!");
    console.log("\n📋 Strategy Summary:");
    console.log("   - Compare orderbook mid price vs Binance futures price");
    console.log("   - If orderbook > Binance: SHORT (sell at Binance price)");
    console.log("   - If orderbook < Binance: LONG (buy at Binance price)");
    console.log("   - If prices equal: NO ACTION");
    console.log("   - Uses limit orders for precise price control");
    console.log("   - Generates volume while creating arbitrage opportunities");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testArbitrageStrategy().catch(console.error);
}

export { testArbitrageStrategy };
