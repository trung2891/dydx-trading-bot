/**
 * Wash Trade Bot Module
 *
 * This module provides wash trading functionality for generating artificial volume
 * on dYdX perpetual markets. Use with caution and ensure compliance with local regulations.
 */

export { WashTradeBot } from "./wash-trade-bot";
export {
  WashTradeConfig,
  WashTradeOrder,
  WashTradeStats,
  WashTradeState,
  VolumeTarget,
  TradePattern,
} from "./types";
export {
  conservativeWashTradeConfig,
  moderateWashTradeConfig,
  aggressiveWashTradeConfig,
  ethWashTradeConfig,
  solWashTradeConfig,
  testWashTradeConfig,
  getWashTradeConfig,
  listWashTradeConfigs,
} from "./config-examples";
export {
  main,
  runWithPredefinedConfig,
  demonstrateConfigSwitching,
} from "./example";

// Re-export commonly used types from the main mm module
export { OrderSide } from "@oraichain/lfg-client-js";
