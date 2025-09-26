/**
 * Configuration examples for different trading strategies
 */

import { MarketMakerConfig, OrderType } from "./types";

// Long-term order configuration (better for market making)
export const longTermConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.1, // 0.1% spread
  stepSize: 0.01, // 0.01% step size
  orderSize: 0.001, // 0.001 BTC per order
  maxOrders: 5, // 5 orders per side
  priceSteps: 5, // 5 price levels
  refreshInterval: 60000, // Refresh every 1 minute
  maxPositionSize: 0.01, // Maximum 0.01 BTC position
  orderType: OrderType.LONG_TERM,
  orderConfig: {
    goodTilTimeSeconds: 300, // 5 minutes validity
    batchSize: 5, // Place 5 orders per batch
    batchDelay: 100, // 100ms delay between batches
  },
  riskParameters: {
    maxDrawdown: 5, // 5% maximum drawdown
    stopLoss: 2, // 2% stop loss
    takeProfitRatio: 1.5, // 1.5:1 risk/reward ratio
  },
};

// Short-term order configuration (better for high-frequency trading)
export const shortTermConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.05, // 0.05% spread (tighter)
  stepSize: 0.01, // 0.01% step size
  orderSize: 0.01, // 0.01 ETH per order
  maxOrders: 3, // 3 orders per side
  priceSteps: 3, // 3 price levels
  refreshInterval: 10000, // Refresh every 10 seconds
  maxPositionSize: 0.1, // Maximum 0.1 ETH position
  orderType: OrderType.SHORT_TERM,
  orderConfig: {
    goodTilBlocks: 5, // 5 blocks validity (~30 seconds)
    batchSize: 20, // Place 20 orders per batch (high-frequency)
    batchDelay: 50, // 50ms delay between batches
  },
  riskParameters: {
    maxDrawdown: 3, // 3% maximum drawdown
    stopLoss: 1, // 1% stop loss
    takeProfitRatio: 2, // 2:1 risk/reward ratio
  },
};

// Conservative long-term configuration
export const conservativeLongTermConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.2, // 0.2% spread (wider)
  stepSize: 0.01, // 0.01% step size
  orderSize: 0.0005, // 0.0005 BTC per order (smaller)
  maxOrders: 3, // 3 orders per side
  priceSteps: 3, // 3 price levels
  refreshInterval: 300000, // Refresh every 5 minutes
  maxPositionSize: 0.005, // Maximum 0.005 BTC position
  orderType: OrderType.LONG_TERM,
  orderConfig: {
    goodTilTimeSeconds: 600, // 10 minutes validity
  },
  riskParameters: {
    maxDrawdown: 2, // 2% maximum drawdown
    stopLoss: 1, // 1% stop loss
    takeProfitRatio: 3, // 3:1 risk/reward ratio
  },
};

// Aggressive short-term configuration
export const aggressiveShortTermConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.03, // 0.03% spread (very tight)
  stepSize: 0.01, // 0.01% step size
  orderSize: 0.02, // 0.02 ETH per order
  maxOrders: 7, // 7 orders per side
  priceSteps: 7, // 7 price levels
  refreshInterval: 5000, // Refresh every 5 seconds
  maxPositionSize: 0.2, // Maximum 0.2 ETH position
  orderType: OrderType.SHORT_TERM,
  orderConfig: {
    goodTilBlocks: 3, // 3 blocks validity (~18 seconds)
  },
  riskParameters: {
    maxDrawdown: 5, // 5% maximum drawdown
    stopLoss: 2, // 2% stop loss
    takeProfitRatio: 1.2, // 1.2:1 risk/reward ratio
  },
};

// Multi-asset configurations
export const btcLongTermConfig: MarketMakerConfig = {
  ...longTermConfig,
  marketId: "BTC-USD",
  spread: 0.08,
  orderSize: 0.001,
  maxPositionSize: 0.01,
};

export const ethShortTermConfig: MarketMakerConfig = {
  ...shortTermConfig,
  marketId: "ETH-USD",
  spread: 0.06,
  orderSize: 0.01,
  maxPositionSize: 0.1,
};

export const solLongTermConfig: MarketMakerConfig = {
  ...longTermConfig,
  marketId: "SOL-USD",
  spread: 0.12,
  orderSize: 0.1,
  maxPositionSize: 1.0,
};

// Configuration factory function
export function createConfig(
  marketId: string,
  orderType: OrderType,
  options: Partial<MarketMakerConfig> = {}
): MarketMakerConfig {
  const baseConfig =
    orderType === OrderType.LONG_TERM ? longTermConfig : shortTermConfig;

  return {
    ...baseConfig,
    marketId,
    orderType,
    ...options,
  };
}

// Oracle-based strategy configuration
export const oracleStrategyConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.1, // Standard spread for normal market making
  stepSize: 0.01,
  orderSize: 0.001,
  maxOrders: 5,
  priceSteps: 5,
  refreshInterval: 30000, // 30 seconds
  maxPositionSize: 0.01,
  orderType: OrderType.LONG_TERM,
  orderConfig: {
    goodTilTimeSeconds: 300,
    batchSize: 5,
    batchDelay: 100,
  },
  riskParameters: {
    maxDrawdown: 5,
    stopLoss: 2,
    takeProfitRatio: 1.5,
  },
  // Oracle strategy configuration
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.5, // Trigger when price differs by 0.5%
    provider: "binance", // Use Binance futures as oracle
  },
};

// Conservative oracle strategy (lower threshold, smaller orders)
export const conservativeOracleConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.15,
  stepSize: 0.01,
  orderSize: 0.005,
  maxOrders: 3,
  priceSteps: 3,
  refreshInterval: 60000, // 1 minute
  maxPositionSize: 0.05,
  orderType: OrderType.LONG_TERM,
  orderConfig: {
    goodTilTimeSeconds: 600,
    batchSize: 3,
    batchDelay: 200,
  },
  riskParameters: {
    maxDrawdown: 3,
    stopLoss: 1.5,
    takeProfitRatio: 2,
  },
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.3, // Lower threshold (0.3%)
    provider: "coingecko", // Use CoinGecko as oracle for conservative strategy
  },
};

// Aggressive oracle strategy (higher threshold, larger orders)
export const aggressiveOracleConfig: MarketMakerConfig = {
  marketId: "SOL-USD",
  spread: 0.08,
  stepSize: 0.01,
  orderSize: 0.1,
  maxOrders: 7,
  priceSteps: 7,
  refreshInterval: 15000, // 15 seconds
  maxPositionSize: 1.0,
  orderType: OrderType.SHORT_TERM,
  orderConfig: {
    goodTilBlocks: 10,
    batchSize: 10,
    batchDelay: 50,
  },
  riskParameters: {
    maxDrawdown: 8,
    stopLoss: 3,
    takeProfitRatio: 1.2,
  },
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 1.0, // Higher threshold (1.0%)
    provider: "binance", // Use Binance futures for aggressive strategy
  },
};

// Multi-asset oracle configurations
export const btcOracleConfig: MarketMakerConfig = {
  ...oracleStrategyConfig,
  marketId: "BTC-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.4,
    provider: "binance",
  },
};

export const ethOracleConfig: MarketMakerConfig = {
  ...oracleStrategyConfig,
  marketId: "ETH-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.6,
    provider: "coingecko",
  },
};

export const solOracleConfig: MarketMakerConfig = {
  ...oracleStrategyConfig,
  marketId: "SOL-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.8,
    provider: "binance",
  },
};

// Environment-based configuration
export function getConfigFromEnv(): MarketMakerConfig {
  const orderType =
    process.env.ORDER_TYPE === "SHORT_TERM"
      ? OrderType.SHORT_TERM
      : OrderType.LONG_TERM;

  const config = createConfig(process.env.MARKET_ID || "BTC-USD", orderType, {
    spread: parseFloat(process.env.SPREAD || "0.1"),
    orderSize: parseFloat(process.env.ORDER_SIZE || "0.001"),
    maxOrders: parseInt(process.env.MAX_ORDERS || "3"),
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || "30000"),
    orderConfig: {
      goodTilTimeSeconds: parseInt(process.env.GOOD_TIL_TIME_SECONDS || "300"),
      goodTilBlocks: parseInt(process.env.GOOD_TIL_BLOCKS || "20"),
    },
  });

  // Add oracle strategy if enabled via environment
  if (process.env.ORACLE_STRATEGY_ENABLED === "true") {
    config.oracleStrategy = {
      enabled: true,
      oraclePriceThreshold: parseFloat(
        process.env.ORACLE_PRICE_THRESHOLD || "0.5"
      ),
      provider:
        (process.env.ORACLE_PROVIDER as "binance" | "coingecko") || "binance",
    };
  }

  return config;
}

// Additional oracle configuration examples showcasing different providers

// Binance-only oracle configuration
export const binanceOracleConfig: MarketMakerConfig = {
  ...oracleStrategyConfig,
  marketId: "BTC-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.5,
    provider: "binance", // Fast, real-time futures prices
  },
};

// CoinGecko-only oracle configuration
export const coinGeckoOracleConfig: MarketMakerConfig = {
  ...oracleStrategyConfig,
  marketId: "ETH-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.4,
    provider: "coingecko", // Aggregated spot prices
  },
};

// Mixed configuration showing both fallback options
export const hybridConfig: MarketMakerConfig = {
  marketId: "SOL-USD",
  spread: 0.1,
  stepSize: 0.01,
  orderSize: 0.01,
  maxOrders: 5,
  priceSteps: 5,
  refreshInterval: 30000,
  maxPositionSize: 0.1,
  orderType: OrderType.LONG_TERM,
  orderConfig: {
    goodTilTimeSeconds: 300,
    batchSize: 5,
    batchDelay: 100,
    // Support both fallback providers
    useBinanceFallback: true,
    binanceSpread: 0.1,
    useCoinGeckoFallback: true, // Fallback to CoinGecko if Binance fails
    coinGeckoSpread: 0.15,
  },
  riskParameters: {
    maxDrawdown: 5,
    stopLoss: 2,
    takeProfitRatio: 1.5,
  },
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.6,
    provider: "binance", // Primary oracle: Binance futures
  },
};
