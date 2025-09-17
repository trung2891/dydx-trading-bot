import "dotenv/config";
import {
  BECH32_PREFIX,
  Order_TimeInForce,
  CompositeClient,
  MAX_UINT_32,
} from "@dydxprotocol/v4-client-js";
import { Network, OrderSide } from "@dydxprotocol/v4-client-js";
import { LocalWallet } from "@dydxprotocol/v4-client-js";
import { SubaccountInfo } from "@dydxprotocol/v4-client-js";
import "dotenv/config";

/**
 * Returns a random integer value between 0 and (n-1).
 */
function randomInt(n: number): number {
  return Math.floor(Math.random() * n);
}

/**
 * Generate a random clientId.
 */
function generateRandomClientId(): number {
  return randomInt(MAX_UINT_32 + 1);
}

async function placeShortTermOrderWithTiming(): Promise<void> {
  const startTime = performance.now();

  try {
    console.log("🚀 Starting short-term order placement...");

    // Initialize wallet
    const walletStartTime = performance.now();
    const wallet = await LocalWallet.fromMnemonic(
      process.env.DYDX_TEST_MNEMONIC!,
      BECH32_PREFIX
    );
    const walletEndTime = performance.now();
    console.log(
      `⏱️  Wallet initialization: ${(walletEndTime - walletStartTime).toFixed(
        2
      )}ms`
    );

    // Connect to network
    const clientStartTime = performance.now();
    const network = Network.mainnet();
    network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL!;
    network.indexerConfig.websocketEndpoint =
      process.env.INDEXER_WEBSOCKET_URL!;

    network.validatorConfig.restEndpoint = process.env.REST_URL!;
    network.validatorConfig.chainId = process.env.CHAIN_ID!;

    const client = await CompositeClient.connect(network);
    const clientEndTime = performance.now();
    console.log(
      `⏱️  Client connection: ${(clientEndTime - clientStartTime).toFixed(2)}ms`
    );

    // Setup subaccount and get current block
    const setupStartTime = performance.now();
    const subaccount = new SubaccountInfo(wallet, 0);
    const currentBlock = await client.validatorClient.get.latestBlockHeight();
    const goodTilBlock = currentBlock + 10;
    const setupEndTime = performance.now();
    console.log(
      `⏱️  Setup and block height: ${(setupEndTime - setupStartTime).toFixed(
        2
      )}ms`
    );

    // Order parameters
    const orderParams = {
      marketId: "BTC-USD",
      clientId: generateRandomClientId(),
      side: OrderSide.BUY,
      price: 115000, // Conservative price for ETH
      size: 0.001, // Small size for testing
    };

    console.log(`📋 Order Details:
    Market: ${orderParams.marketId}
    Side: ${orderParams.side}
    Price: $${orderParams.price}
    Size: ${orderParams.size} ETH
    Client ID: ${orderParams.clientId}
    Good Till Block: ${goodTilBlock}`);

    // Place the order
    const orderStartTime = performance.now();
    const tx = await client.placeShortTermOrder(
      subaccount,
      orderParams.marketId,
      orderParams.side,
      orderParams.price,
      orderParams.size,
      orderParams.clientId,
      goodTilBlock,
      Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED,
      false
    );
    const orderEndTime = performance.now();

    console.log(`✅ Order placed successfully!`);
    console.log(`📝 Transaction Hash: ${tx.hash}`);
    console.log(
      `⏱️  Order placement: ${(orderEndTime - orderStartTime).toFixed(2)}ms`
    );
  } catch (error) {
    console.error("❌ Order placement failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  } finally {
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    console.log(
      `⏱️  Total execution time: ${totalTime.toFixed(2)}ms (${(
        totalTime / 1000
      ).toFixed(2)}s)`
    );
  }
}

// Performance summary function
function logPerformanceSummary() {
  console.log(`
🔍 Performance Analysis:
- Wallet initialization typically takes 10-50ms
- Client connection can take 100-500ms depending on network
- Block height retrieval usually takes 50-200ms
- Order placement typically takes 200-1000ms
- Total execution time varies from 500ms to 2s

💡 Tips for optimization:
- Reuse client connections when placing multiple orders
- Consider connection pooling for high-frequency trading
- Monitor network latency and adjust timeouts accordingly
`);
}

// Main execution
async function main() {
  console.log("🎯 DYdX Short-Term Order Placement with Performance Timing");
  console.log("=".repeat(60));

  await placeShortTermOrderWithTiming();

  console.log("=".repeat(60));
  logPerformanceSummary();
}

main()
  .then(() => {
    console.log("🎉 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script execution failed:", error.message);
    process.exit(1);
  });
