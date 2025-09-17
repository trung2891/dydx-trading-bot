/**
 * Configuration examples for different trading strategies
 */

import { MarketMakerConfig, OrderType } from "./types";

// Long-term order configuration (better for market making)
export const longTermConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.1, // 0.1% spread
  orderSize: 0.001, // 0.001 BTC per order
  maxOrders: 5, // 5 orders per side
  priceSteps: 5, // 5 price levels
  refreshInterval: 60000, // Refresh every 1 minute
  maxPositionSize: 0.01, // Maximum 0.01 BTC position
  orderType: OrderType.LONG_TERM,
  orderConfig: {
    goodTilTimeSeconds: 300, // 5 minutes validity
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
  orderSize: 0.01, // 0.01 ETH per order
  maxOrders: 3, // 3 orders per side
  priceSteps: 3, // 3 price levels
  refreshInterval: 10000, // Refresh every 10 seconds
  maxPositionSize: 0.1, // Maximum 0.1 ETH position
  orderType: OrderType.SHORT_TERM,
  orderConfig: {
    goodTilBlocks: 5, // 5 blocks validity (~30 seconds)
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

// Environment-based configuration
export function getConfigFromEnv(): MarketMakerConfig {
  const orderType =
    process.env.ORDER_TYPE === "SHORT_TERM"
      ? OrderType.SHORT_TERM
      : OrderType.LONG_TERM;

  return createConfig(process.env.MARKET_ID || "BTC-USD", orderType, {
    spread: parseFloat(process.env.SPREAD || "0.1"),
    orderSize: parseFloat(process.env.ORDER_SIZE || "0.001"),
    maxOrders: parseInt(process.env.MAX_ORDERS || "3"),
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || "30000"),
    orderConfig: {
      goodTilTimeSeconds: parseInt(process.env.GOOD_TIL_TIME_SECONDS || "300"),
      goodTilBlocks: parseInt(process.env.GOOD_TIL_BLOCKS || "20"),
    },
  });
}
