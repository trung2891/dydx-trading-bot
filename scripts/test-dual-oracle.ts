/**
 * Test script for dual oracle provider support in MM module
 * Tests both Binance futures and CoinGecko oracle integration
 */

import "dotenv/config";
import { BinancePriceService } from "../src/mm/binance-price-service";
import { CoinGeckoService } from "../src/mm/coingecko-service";
import { MarketDataManager } from "../src/mm/market-data";
import { OrderManager } from "../src/mm/order-manager";
import {
  binanceOracleConfig,
  coinGeckoOracleConfig,
  hybridConfig,
} from "../src/mm/config-examples";
import {
  Network,
  CompositeClient,
  LocalWallet,
  SubaccountInfo,
  BECH32_PREFIX,
} from "@oraichain/lfg-client-js";

async function testDualOracleSupport() {
  console.log("🚀 Testing Dual Oracle Provider Support");
  console.log("=====================================\n");

  // Initialize services
  const binanceService = new BinancePriceService();
  const coinGeckoService = new CoinGeckoService();

  // Test 1: Compare prices from both providers
  console.log("💰 Test 1: Comparing prices from both oracle providers...");
  const testMarkets = ["BTC-USD", "ETH-USD", "SOL-USD"];

  for (const market of testMarkets) {
    console.log(`\n📊 ${market}:`);

    // Get prices from both providers
    const [binancePrice, coinGeckoPrice] = await Promise.all([
      binanceService.getPrice(market),
      coinGeckoService.getPrice(market),
    ]);

    if (binancePrice && coinGeckoPrice) {
      const priceDiff = Math.abs(binancePrice - coinGeckoPrice);
      const priceDiffPercent = (priceDiff / coinGeckoPrice) * 100;

      console.log(`  Binance Futures: $${binancePrice.toFixed(2)}`);
      console.log(`  CoinGecko:       $${coinGeckoPrice.toFixed(2)}`);
      console.log(`  Difference:      ${priceDiffPercent.toFixed(3)}%`);

      if (priceDiffPercent > 1) {
        console.log(`  ⚠️  Large price difference detected!`);
      } else {
        console.log(`  ✅ Prices are reasonably close`);
      }
    } else {
      console.log(
        `  ❌ Failed to get prices (Binance: ${!!binancePrice}, CoinGecko: ${!!coinGeckoPrice})`
      );
    }
  }

  // Test 2: Test MarketDataManager with different oracle providers
  console.log(
    "\n🔗 Test 2: Testing MarketDataManager with different oracle providers..."
  );

  try {
    const network = Network.mainnet();
    network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL!;
    network.indexerConfig.websocketEndpoint =
      process.env.INDEXER_WEBSOCKET_URL!;
    network.validatorConfig.restEndpoint = process.env.REST_URL!;
    network.validatorConfig.chainId = process.env.CHAIN_ID!;

    const marketDataManager = new MarketDataManager(network);

    // Test with Binance oracle
    console.log("\n📈 Testing with Binance oracle provider...");
    const binanceMarketData = await marketDataManager.getMarketData(
      "BTC-USD",
      true,
      {
        useBinanceFallback: true,
        binanceSpread: 0.1,
        oracleProvider: "binance",
      }
    );

    if (binanceMarketData) {
      console.log(`✅ Binance oracle data: $${binanceMarketData.midPrice}`);
    } else {
      console.log("❌ Failed to get market data with Binance oracle");
    }

    // Test with CoinGecko oracle
    console.log("\n📈 Testing with CoinGecko oracle provider...");
    const coinGeckoMarketData = await marketDataManager.getMarketData(
      "BTC-USD",
      true,
      {
        useCoinGeckoFallback: true,
        coinGeckoSpread: 0.1,
        oracleProvider: "coingecko",
      }
    );

    if (coinGeckoMarketData) {
      console.log(`✅ CoinGecko oracle data: $${coinGeckoMarketData.midPrice}`);
    } else {
      console.log("❌ Failed to get market data with CoinGecko oracle");
    }
  } catch (error) {
    console.error("❌ MarketDataManager test failed:", error);
  }

  // Test 3: Test OrderManager oracle strategy with different providers
  console.log(
    "\n🎯 Test 3: Testing OrderManager oracle strategy with different providers..."
  );

  try {
    // Mock the composite client and subaccount for testing
    const mnemonic = process.env.DYDX_TEST_MNEMONIC;
    if (!mnemonic) {
      console.log(
        "⚠️  Skipping OrderManager test - DYDX_TEST_MNEMONIC not provided"
      );
    } else {
      const network = Network.mainnet();
      network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL!;
      network.indexerConfig.websocketEndpoint =
        process.env.INDEXER_WEBSOCKET_URL!;
      network.validatorConfig.restEndpoint = process.env.REST_URL!;
      network.validatorConfig.chainId = process.env.CHAIN_ID!;

      const wallet = await LocalWallet.fromMnemonic(mnemonic, BECH32_PREFIX);
      const compositeClient = await CompositeClient.connect(network);
      const subaccount = SubaccountInfo.forLocalWallet(wallet, 0);

      const orderManager = new OrderManager(compositeClient, subaccount);

      // Test Binance oracle strategy
      console.log("\n🔍 Testing shouldTriggerOracleStrategy with Binance...");
      const binanceOracleCheck = await orderManager.shouldTriggerOracleStrategy(
        "BTC-USD",
        50000, // Mock current price
        binanceOracleConfig
      );

      console.log(`Binance Oracle Check:`);
      console.log(`  Should Trigger: ${binanceOracleCheck.shouldTrigger}`);
      console.log(`  Oracle Price: $${binanceOracleCheck.oraclePrice}`);
      console.log(
        `  Price Difference: ${binanceOracleCheck.priceDifferencePercentage.toFixed(
          3
        )}%`
      );

      // Test CoinGecko oracle strategy
      console.log("\n🔍 Testing shouldTriggerOracleStrategy with CoinGecko...");
      const coinGeckoOracleCheck =
        await orderManager.shouldTriggerOracleStrategy(
          "ETH-USD",
          3000, // Mock current price
          coinGeckoOracleConfig
        );

      console.log(`CoinGecko Oracle Check:`);
      console.log(`  Should Trigger: ${coinGeckoOracleCheck.shouldTrigger}`);
      console.log(`  Oracle Price: $${coinGeckoOracleCheck.oraclePrice}`);
      console.log(
        `  Price Difference: ${coinGeckoOracleCheck.priceDifferencePercentage.toFixed(
          3
        )}%`
      );
    }
  } catch (error) {
    console.error("❌ OrderManager test failed:", error);
  }

  // Test 4: Configuration validation
  console.log("\n⚙️  Test 4: Validating configuration examples...");

  const configs = [
    { name: "Binance Oracle Config", config: binanceOracleConfig },
    { name: "CoinGecko Oracle Config", config: coinGeckoOracleConfig },
    { name: "Hybrid Config", config: hybridConfig },
  ];

  configs.forEach(({ name, config }) => {
    console.log(`\n📋 ${name}:`);
    console.log(`  Market: ${config.marketId}`);
    console.log(`  Oracle Enabled: ${config.oracleStrategy?.enabled}`);
    console.log(`  Oracle Provider: ${config.oracleStrategy?.provider}`);
    console.log(
      `  Oracle Threshold: ${config.oracleStrategy?.oraclePriceThreshold}%`
    );

    if (config.orderConfig.useBinanceFallback) {
      console.log(
        `  Binance Fallback: ✅ (spread: ${config.orderConfig.binanceSpread}%)`
      );
    }

    if (config.orderConfig.useCoinGeckoFallback) {
      console.log(
        `  CoinGecko Fallback: ✅ (spread: ${config.orderConfig.coinGeckoSpread}%)`
      );
    }

    // Validate configuration
    const isValid =
      config.oracleStrategy?.provider &&
      (config.oracleStrategy.provider === "binance" ||
        config.oracleStrategy.provider === "coingecko");
    console.log(`  Configuration: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
  });

  // Test 5: Performance comparison
  console.log(
    "\n⚡ Test 5: Performance comparison between oracle providers..."
  );

  const performanceTest = async (
    provider: "binance" | "coingecko",
    iterations: number = 5
  ) => {
    const service = provider === "binance" ? binanceService : coinGeckoService;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await service.getPrice("BTC-USD");
      const end = Date.now();
      times.push(end - start);

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { avgTime, minTime, maxTime };
  };

  try {
    const [binancePerf, coinGeckoPerf] = await Promise.all([
      performanceTest("binance"),
      performanceTest("coingecko"),
    ]);

    console.log(`\n📊 Performance Results (5 requests each):`);
    console.log(`Binance Futures:`);
    console.log(`  Average: ${binancePerf.avgTime.toFixed(1)}ms`);
    console.log(`  Range: ${binancePerf.minTime}ms - ${binancePerf.maxTime}ms`);

    console.log(`CoinGecko:`);
    console.log(`  Average: ${coinGeckoPerf.avgTime.toFixed(1)}ms`);
    console.log(
      `  Range: ${coinGeckoPerf.minTime}ms - ${coinGeckoPerf.maxTime}ms`
    );

    const fasterProvider =
      binancePerf.avgTime < coinGeckoPerf.avgTime ? "Binance" : "CoinGecko";
    const speedDiff = Math.abs(binancePerf.avgTime - coinGeckoPerf.avgTime);
    console.log(
      `\n🏆 ${fasterProvider} is faster by ${speedDiff.toFixed(1)}ms on average`
    );
  } catch (error) {
    console.error("❌ Performance test failed:", error);
  }

  console.log("\n✅ Dual Oracle Provider Test Complete!");
  console.log("\n📋 Summary:");
  console.log(
    "• Both Binance futures and CoinGecko oracle providers are supported"
  );
  console.log(
    "• Oracle provider can be configured via the 'provider' field in oracleStrategy"
  );
  console.log("• Fallback mechanisms support both providers independently");
  console.log("• Configuration examples demonstrate various usage patterns");
  console.log("• Performance characteristics vary between providers");
}

// Environment configuration examples
function showEnvironmentExamples() {
  console.log("\n🌍 Environment Configuration Examples:");
  console.log("=====================================");

  console.log("\n# Use Binance as oracle provider:");
  console.log("ORACLE_STRATEGY_ENABLED=true");
  console.log("ORACLE_PROVIDER=binance");
  console.log("ORACLE_PRICE_THRESHOLD=0.5");

  console.log("\n# Use CoinGecko as oracle provider:");
  console.log("ORACLE_STRATEGY_ENABLED=true");
  console.log("ORACLE_PROVIDER=coingecko");
  console.log("ORACLE_PRICE_THRESHOLD=0.4");

  console.log("\n# Default (if ORACLE_PROVIDER not set):");
  console.log("# Will use Binance as the default oracle provider");
}

// Run the test
if (require.main === module) {
  showEnvironmentExamples();
  testDualOracleSupport().catch(console.error);
}

export { testDualOracleSupport, showEnvironmentExamples };
