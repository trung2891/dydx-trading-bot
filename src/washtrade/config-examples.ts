import { WashTradeConfig } from "./types";

/**
 * Conservative wash trading configuration
 * - Low volume target
 * - Wide spreads
 * - Longer intervals
 * - Suitable for testing and small volume generation
 */
export const conservativeWashTradeConfig: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 1000, // $1000 per hour
  orderSize: 0.001, // 0.001 BTC per order
  spread: 0.2, // 0.2% spread
  minInterval: 2000, // 2 seconds minimum between trades (market orders execute immediately)
  maxInterval: 8000, // 8 seconds maximum between trades
  priceVariation: 0.1, // 0.1% price variation
  orderConfig: {
    goodTilBlocks: 10, // 10 blocks expiration
    batchSize: 1,
    batchDelay: 100,
    roundPrice: 3,
    roundSize: 4,
  },
  riskParameters: {
    maxPositionSize: 0.01, // Maximum 0.01 BTC position
    stopLoss: 1, // 1% stop loss
    maxDrawdown: 2, // 2% maximum drawdown
  },
  volumeStrategy: {
    type: "CONSTANT",
  },
};

/**
 * Moderate wash trading configuration
 * - Medium volume target
 * - Moderate spreads
 * - Balanced intervals
 * - Good for regular volume generation
 */
export const moderateWashTradeConfig: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 5000, // $5000 per hour
  orderSize: 0.005, // 0.005 BTC per order
  spread: 0.1, // 0.1% spread
  minInterval: 1000, // 1 second minimum between trades (market orders execute immediately)
  maxInterval: 4000, // 4 seconds maximum between trades
  priceVariation: 0.05, // 0.05% price variation
  orderConfig: {
    goodTilBlocks: 8, // 8 blocks expiration
    batchSize: 1,
    batchDelay: 50,
    roundPrice: 3,
    roundSize: 4,
  },
  riskParameters: {
    maxPositionSize: 0.05, // Maximum 0.05 BTC position
    stopLoss: 0.5, // 0.5% stop loss
    maxDrawdown: 1, // 1% maximum drawdown
  },
  volumeStrategy: {
    type: "RANDOM",
  },
};

/**
 * Aggressive wash trading configuration
 * - High volume target
 * - Tight spreads
 * - Short intervals
 * - For high-frequency volume generation
 */
export const aggressiveWashTradeConfig: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 20000, // $20000 per hour
  orderSize: 0.01, // 0.01 BTC per order
  spread: 0.05, // 0.05% spread
  minInterval: 200, // 0.2 seconds minimum between trades (market orders execute immediately)
  maxInterval: 1000, // 1 second maximum between trades
  priceVariation: 0.02, // 0.02% price variation
  orderConfig: {
    goodTilBlocks: 5, // 5 blocks expiration
    batchSize: 2,
    batchDelay: 25,
    roundPrice: 3,
    roundSize: 4,
  },
  riskParameters: {
    maxPositionSize: 0.1, // Maximum 0.1 BTC position
    stopLoss: 0.25, // 0.25% stop loss
    maxDrawdown: 0.5, // 0.5% maximum drawdown
  },
  volumeStrategy: {
    type: "BURST",
    burstSize: 5, // 5 trades per burst
    burstInterval: 5000, // 5 seconds between bursts
  },
};

/**
 * ETH wash trading configuration
 * - Optimized for ETH-USD market
 * - Moderate settings
 */
export const ethWashTradeConfig: WashTradeConfig = {
  marketId: "ETH-USD",
  volumeTarget: 3000, // $3000 per hour
  orderSize: 0.1, // 0.1 ETH per order
  spread: 0.15, // 0.15% spread
  minInterval: 3000, // 3 seconds minimum between trades
  maxInterval: 10000, // 10 seconds maximum between trades
  priceVariation: 0.08, // 0.08% price variation
  orderConfig: {
    goodTilBlocks: 8,
    batchSize: 1,
    batchDelay: 75,
    roundPrice: 2,
    roundSize: 3,
  },
  riskParameters: {
    maxPositionSize: 1, // Maximum 1 ETH position
    stopLoss: 0.75, // 0.75% stop loss
    maxDrawdown: 1.5, // 1.5% maximum drawdown
  },
  volumeStrategy: {
    type: "CONSTANT",
  },
};

/**
 * SOL wash trading configuration
 * - Optimized for SOL-USD market
 * - Higher volatility settings
 */
export const solWashTradeConfig: WashTradeConfig = {
  marketId: "SOL-USD",
  volumeTarget: 2000, // $2000 per hour
  orderSize: 1, // 1 SOL per order
  spread: 0.25, // 0.25% spread
  minInterval: 2000, // 2 seconds minimum between trades
  maxInterval: 6000, // 6 seconds maximum between trades
  priceVariation: 0.15, // 0.15% price variation
  orderConfig: {
    goodTilBlocks: 6,
    batchSize: 1,
    batchDelay: 50,
    roundPrice: 2,
    roundSize: 2,
  },
  riskParameters: {
    maxPositionSize: 10, // Maximum 10 SOL position
    stopLoss: 1, // 1% stop loss
    maxDrawdown: 2, // 2% maximum drawdown
  },
  volumeStrategy: {
    type: "RANDOM",
  },
};

/**
 * Test wash trading configuration
 * - Very low volume for testing
 * - Safe parameters
 * - Long intervals
 */
export const testWashTradeConfig: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 100, // $100 per hour
  orderSize: 0.0001, // 0.0001 BTC per order
  spread: 0.5, // 0.5% spread
  minInterval: 10000, // 10 seconds minimum between trades
  maxInterval: 30000, // 30 seconds maximum between trades
  priceVariation: 0.2, // 0.2% price variation
  orderConfig: {
    goodTilBlocks: 15, // 15 blocks expiration
    batchSize: 1,
    batchDelay: 200,
    roundPrice: 3,
    roundSize: 4,
  },
  riskParameters: {
    maxPositionSize: 0.001, // Maximum 0.001 BTC position
    stopLoss: 2, // 2% stop loss
    maxDrawdown: 5, // 5% maximum drawdown
  },
  volumeStrategy: {
    type: "CONSTANT",
  },
};

/**
 * Get configuration by name
 */
export function getWashTradeConfig(configName: string): WashTradeConfig {
  const configs: Record<string, WashTradeConfig> = {
    conservative: conservativeWashTradeConfig,
    moderate: moderateWashTradeConfig,
    aggressive: aggressiveWashTradeConfig,
    eth: ethWashTradeConfig,
    sol: solWashTradeConfig,
    test: testWashTradeConfig,
  };

  const config = configs[configName.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown wash trade configuration: ${configName}`);
  }

  return config;
}

/**
 * List available configurations
 */
export function listWashTradeConfigs(): string[] {
  return ["conservative", "moderate", "aggressive", "eth", "sol", "test"];
}
