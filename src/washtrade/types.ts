import { OrderSide } from "@oraichain/lfg-client-js";

export interface WashTradeConfig {
  marketId: string;
  volumeTarget: number; // Target volume in USD per hour
  orderSize: number; // Base order size
  spread: number; // Spread percentage (e.g., 0.1 for 0.1%)
  minInterval: number; // Minimum interval between trades in milliseconds
  maxInterval: number; // Maximum interval between trades in milliseconds
  priceVariation: number; // Price variation percentage (e.g., 0.05 for 0.05%)
  orderConfig: {
    goodTilTimeSeconds?: number; // seconds until expiration (default: 60)
    goodTilBlocks?: number; // blocks until expiration (default: 10)
    batchSize?: number; // number of orders to place in a single batch (default: 1)
    batchDelay?: number; // milliseconds delay between batches (default: 100)
    roundPrice?: number; // number of decimal places to round the price (default: 3)
    roundSize?: number; // number of decimal places to round the size (default: 4)
  };
  riskParameters: {
    maxPositionSize: number; // Maximum position size allowed
    stopLoss: number; // Stop loss percentage
    maxDrawdown: number; // Maximum drawdown percentage
  };
  volumeStrategy: {
    type: "CONSTANT" | "RANDOM" | "BURST"; // Volume generation strategy
    burstSize?: number; // Number of trades in a burst (for BURST strategy)
    burstInterval?: number; // Interval between bursts in milliseconds
  };
}

export interface WashTradeOrder {
  marketId: string;
  clientId: number;
  side: OrderSide;
  price: number;
  size: number;
  timestamp: number;
  orderId?: string;
  isWashTrade: boolean;
}

export interface WashTradeStats {
  totalTrades: number;
  totalVolume: number;
  totalVolumeUSD: number;
  averageTradeSize: number;
  tradesPerHour: number;
  volumePerHour: number;
  uptime: number;
  lastUpdate: number;
  currentPosition: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export enum WashTradeState {
  STOPPED = "STOPPED",
  STARTING = "STARTING",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
}

export interface VolumeTarget {
  hourly: number; // Target volume per hour in USD
  daily: number; // Target volume per day in USD
  current: number; // Current volume in current period
  periodStart: number; // Timestamp when current period started
}

export interface TradePattern {
  type: "BUY_SELL" | "SELL_BUY" | "RANDOM";
  minDelay: number; // Minimum delay between buy and sell
  maxDelay: number; // Maximum delay between buy and sell
  priceOffset: number; // Price offset percentage for second trade
}
