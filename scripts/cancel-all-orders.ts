#!/usr/bin/env ts-node

/**
 * Simple script to cancel all open orders
 *
 * Usage:
 *   ts-node scripts/cancel-all-orders.ts
 *   or
 *   npm run cancel-orders
 */

import "dotenv/config";
import {
  CompositeClient,
  LocalWallet,
  SubaccountInfo,
  BECH32_PREFIX,
  Network,
  OrderStatus,
  TickerType,
  OrderFlags,
} from "@dydxprotocol/v4-client-js";

function getDefaultNetwork(): Network {
  const network = Network.mainnet();
  // Use custom endpoints if provided in samples
  network.indexerConfig.restEndpoint = "http://65.109.74.254:3002";
  network.indexerConfig.websocketEndpoint = "http://65.109.74.254:3003";
  network.validatorConfig.restEndpoint = "http://65.109.74.254:56657";
  network.validatorConfig.chainId = "testing";
  return network;
}

async function cancelAllOrders() {
  try {
    console.log("🚀 Starting order cancellation script...");

    // Check environment variables
    if (!process.env.DYDX_TEST_MNEMONIC) {
      console.error("❌ DYDX_TEST_MNEMONIC environment variable is required");
      console.log("Please create a .env file with your dYdX wallet mnemonic:");
      console.log("DYDX_TEST_MNEMONIC=your_wallet_mnemonic_here");
      process.exit(1);
    }

    // Initialize wallet
    const wallet = await LocalWallet.fromMnemonic(
      process.env.DYDX_TEST_MNEMONIC,
      BECH32_PREFIX
    );
    console.log(`✅ Wallet initialized: ${wallet.address}`);

    // Initialize network and client
    const network = getDefaultNetwork();
    const client = await CompositeClient.connect(network);
    console.log("✅ Connected to dYdX");

    // Initialize subaccount
    const subaccount = new SubaccountInfo(wallet, 0);
    console.log(`✅ Subaccount initialized: ${subaccount.address}`);

    // Fetch all open orders
    console.log("📊 Fetching all open orders...");
    const orders = await client.indexerClient.account.getSubaccountOrders(
      subaccount.address,
      subaccount.subaccountNumber,
      undefined, // marketId (undefined = all markets)
      TickerType.PERPETUAL,
      undefined, // side (undefined = all sides)
      OrderStatus.OPEN
    );

    if (!orders || orders.length === 0) {
      console.log("✅ No open orders found!");
      return;
    }

    console.log(`📋 Found ${orders.length} open orders to cancel`);

    // Group orders by market for better logging
    const ordersByMarket = new Map<string, any[]>();
    for (const order of orders) {
      const market = order.ticker || "UNKNOWN";
      if (!ordersByMarket.has(market)) {
        ordersByMarket.set(market, []);
      }
      ordersByMarket.get(market)!.push(order);
    }

    // Display orders by market
    console.log("\n📊 Orders by market:");
    ordersByMarket.forEach((marketOrders, market) => {
      console.log(`  ${market}: ${marketOrders.length} orders`);
    });

    // Show first order details for debugging
    if (orders.length > 0) {
      console.log("\n🔍 Sample order details:");
      const sampleOrder = orders[0];
      console.log(`  Client ID: ${sampleOrder.clientId}`);
      console.log(`  Market: ${sampleOrder.ticker}`);
      console.log(
        `  goodTilBlockTime: ${sampleOrder.goodTilBlockTime || "undefined"}`
      );
      console.log(`  goodTilBlock: ${sampleOrder.goodTilBlock || "undefined"}`);
    }

    // Ask for confirmation
    console.log(
      `\n⚠️  About to cancel ${orders.length} orders. Continue? (y/N)`
    );

    // For script automation, we'll proceed automatically
    // In interactive mode, you could add readline here
    console.log("🔄 Proceeding with cancellation...");

    let cancelledCount = 0;
    let failedCount = 0;

    // Cancel each order individually (required for long-term orders)
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const clientId = parseInt(order.clientId);
      const marketId = order.ticker;

      try {
        console.log(
          `[${i + 1}/${
            orders.length
          }] Cancelling order ${clientId} (${marketId})...`
        );

        // For long-term orders, goodTilBlock should be 0
        const goodTilBlock = 0;

        // For cancellation, we need to use the original order's goodTilBlockTime
        // Parse the goodTilBlockTime from the original order
        let goodTilTimeInSeconds: number;

        if (order.goodTilBlockTime) {
          // Use the original order's goodTilBlockTime
          goodTilTimeInSeconds = parseInt(order.goodTilBlockTime);
          console.log(
            `  Using original goodTilBlockTime: ${goodTilTimeInSeconds}`
          );
        } else {
          // Fallback: use a reasonable time in the future
          goodTilTimeInSeconds = Math.floor(Date.now() / 1000) + 60;
          console.log(
            `  No goodTilBlockTime found, using fallback: ${goodTilTimeInSeconds}`
          );
        }

        const tx = await client.cancelOrder(
          subaccount,
          clientId,
          OrderFlags.LONG_TERM, // Assuming long-term orders
          marketId,
          goodTilBlock, // Must be 0 for long-term orders
          goodTilTimeInSeconds // Use original order's time
        );

        console.log(`✅ Cancelled order ${clientId} (Tx: ${tx.hash})`);
        cancelledCount++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `❌ Failed to cancel order ${clientId}:`,
          error instanceof Error ? error.message : String(error)
        );
        failedCount++;
      }
    }

    // Summary
    console.log("\n📊 Cancellation Summary:");
    console.log(`✅ Successfully cancelled: ${cancelledCount} orders`);
    console.log(`❌ Failed to cancel: ${failedCount} orders`);
    console.log(`📋 Total processed: ${orders.length} orders`);

    if (cancelledCount === orders.length) {
      console.log("🎉 All orders cancelled successfully!");
    } else if (cancelledCount > 0) {
      console.log(
        "⚠️ Some orders were cancelled, but some failed. Check the logs above."
      );
    } else {
      console.log("❌ No orders were cancelled successfully.");
    }
  } catch (error) {
    console.error(
      "❌ Script failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Script interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Script terminated");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  cancelAllOrders()
    .then(() => {
      console.log("✅ Script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        "❌ Script error:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    });
}
