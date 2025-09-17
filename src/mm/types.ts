import { OrderSide } from "@dydxprotocol/v4-client-js";

export enum OrderType {
  SHORT_TERM = "SHORT_TERM",
  LONG_TERM = "LONG_TERM",
}

export interface MarketMakerConfig {
  marketId: string;
  spread: number; // in percentage (e.g., 0.1 for 0.1%)
  orderSize: number; // base order size
  maxOrders: number; // max orders per side
  priceSteps: number; // number of price levels
  refreshInterval: number; // ms between order refreshes
  maxPositionSize: number; // maximum position size allowed
  orderType: OrderType; // SHORT_TERM or LONG_TERM orders
  orderConfig: {
    // For short-term orders
    goodTilBlocks?: number; // number of blocks until expiration (default: 20)
    // For long-term orders
    goodTilTimeSeconds?: number; // seconds until expiration (default: 300)
  };
  riskParameters: {
    maxDrawdown: number; // maximum allowed drawdown
    stopLoss: number; // stop loss percentage
    takeProfitRatio: number; // take profit ratio
  };
}

export interface OrderInfo {
  marketId: string;
  clientId: number;
  side: OrderSide;
  price: number;
  size: number;
  goodTilBlock?: number;
  orderId?: string;
}

export interface MarketData {
  marketId: string;
  midPrice: number;
  bestBid: number;
  bestAsk: number;
  bidSize: number;
  askSize: number;
  volume24h: number;
  timestamp: number;
}

export interface Position {
  marketId: string;
  side: "LONG" | "SHORT" | "NONE";
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface BalanceInfo {
  asset: string;
  size: string;
  available: string;
  locked: string;
}

export interface MarketMakerStats {
  totalTrades: number;
  totalVolume: number;
  totalPnl: number;
  winRate: number;
  averageSpread: number;
  uptime: number;
  lastUpdate: number;
}

export enum BotState {
  STOPPED = "STOPPED",
  STARTING = "STARTING",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
}

export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}
