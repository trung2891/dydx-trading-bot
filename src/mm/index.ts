/**
 * Market Maker Module Exports
 *
 * This file exports all the components needed to use the market maker bot.
 */

export { MarketMakerBot } from "./market-maker-bot";
export { MarketDataManager } from "./market-data";
export { OrderManager } from "./order-manager";
export { PositionManager } from "./position-manager";
export { CoinGeckoService } from "./coingecko-service";

export * from "./types";
export * from "./utils";

// Re-export commonly used dYdX types for convenience
export {
  OrderSide,
  OrderStatus,
  Network,
  CompositeClient,
  LocalWallet,
  SubaccountInfo,
  BECH32_PREFIX,
} from "@oraichain/lfg-client-js";
