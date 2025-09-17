import { IndexerClient, Network } from "@dydxprotocol/v4-client-js";
import { MarketData, OrderBook, OrderBookEntry } from "./types";
import { calculateMidPrice, getCurrentTimestamp } from "./utils";

export class MarketDataManager {
  private indexerClient: IndexerClient;
  private marketDataCache: Map<string, MarketData> = new Map();
  private orderBookCache: Map<string, OrderBook> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private readonly CACHE_TTL = 1000; // 1 second cache TTL

  constructor(network: Network) {
    this.indexerClient = new IndexerClient(network.indexerConfig);
  }

  /**
   * Get current market data for a specific market.
   */
  async getMarketData(
    marketId: string,
    forceRefresh: boolean = false
  ): Promise<MarketData | null> {
    try {
      const lastUpdate = this.lastUpdateTime.get(marketId) || 0;
      const now = getCurrentTimestamp() * 1000; // Convert to milliseconds

      if (
        !forceRefresh &&
        this.marketDataCache.has(marketId) &&
        now - lastUpdate < this.CACHE_TTL
      ) {
        return this.marketDataCache.get(marketId)!;
      }

      // Get market data
      const marketsResponse =
        await this.indexerClient.markets.getPerpetualMarkets(marketId);
      const market = marketsResponse.markets?.[marketId];

      if (!market) {
        console.error(`No market data found for market ${marketId}`);
        return null;
      }

      // Get orderbook data for more accurate pricing
      const orderBookData = await this.getOrderBook(marketId, true);

      let bestBid = 0;
      let bestAsk = 0;
      let bidSize = 0;
      let askSize = 0;

      // Use orderbook data if available and more recent
      if (
        orderBookData &&
        orderBookData.bids.length > 0 &&
        orderBookData.asks.length > 0
      ) {
        bestBid = orderBookData.bids[0].price;
        bestAsk = orderBookData.asks[0].price;
        bidSize = orderBookData.bids[0].size;
        askSize = orderBookData.asks[0].size;
      }

      const midPrice = calculateMidPrice(bestBid, bestAsk);

      const marketData: MarketData = {
        marketId,
        midPrice,
        bestBid,
        bestAsk,
        bidSize,
        askSize,
        volume24h: parseFloat(market.volume24H) || 0,
        timestamp: getCurrentTimestamp(),
      };

      this.marketDataCache.set(marketId, marketData);
      this.lastUpdateTime.set(marketId, now);

      return marketData;
    } catch (error) {
      console.error(
        `Error fetching market data for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get order book data for a specific market.
   */
  async getOrderBook(
    marketId: string,
    forceRefresh: boolean = false
  ): Promise<OrderBook | null> {
    try {
      const lastUpdate = this.lastUpdateTime.get(`${marketId}_orderbook`) || 0;
      const now = getCurrentTimestamp() * 1000;

      if (
        !forceRefresh &&
        this.orderBookCache.has(marketId) &&
        now - lastUpdate < this.CACHE_TTL
      ) {
        return this.orderBookCache.get(marketId)!;
      }

      const orderBookResponse =
        await this.indexerClient.markets.getPerpetualMarketOrderbook(marketId);

      if (
        !orderBookResponse ||
        !orderBookResponse.bids ||
        !orderBookResponse.asks
      ) {
        console.error(`No orderbook data found for market ${marketId}`);
        return null;
      }

      const bids: OrderBookEntry[] = orderBookResponse.bids
        .map((bid: any) => ({
          price: parseFloat(bid.price),
          size: parseFloat(bid.size),
        }))
        .filter((bid: OrderBookEntry) => bid.price > 0 && bid.size > 0);

      const asks: OrderBookEntry[] = orderBookResponse.asks
        .map((ask: any) => ({
          price: parseFloat(ask.price),
          size: parseFloat(ask.size),
        }))
        .filter((ask: OrderBookEntry) => ask.price > 0 && ask.size > 0);

      // Sort to ensure best prices are first
      bids.sort((a, b) => b.price - a.price); // Highest bid first
      asks.sort((a, b) => a.price - b.price); // Lowest ask first

      const orderBook: OrderBook = { bids, asks };

      this.orderBookCache.set(marketId, orderBook);
      this.lastUpdateTime.set(`${marketId}_orderbook`, now);

      return orderBook;
    } catch (error) {
      console.error(
        `Error fetching orderbook for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get multiple market data at once.
   */
  async getMultipleMarketData(
    marketIds: string[]
  ): Promise<Map<string, MarketData>> {
    const results = new Map<string, MarketData>();

    const promises = marketIds.map(async (marketId) => {
      const data = await this.getMarketData(marketId);
      if (data) {
        results.set(marketId, data);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get market statistics.
   */
  async getMarketStats(marketId: string): Promise<any> {
    try {
      const marketsResponse =
        await this.indexerClient.markets.getPerpetualMarkets(marketId);
      return marketsResponse.markets?.[marketId];
    } catch (error) {
      console.error(
        `Error fetching market stats for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Clear cache for a specific market or all markets.
   */
  clearCache(marketId?: string): void {
    if (marketId) {
      this.marketDataCache.delete(marketId);
      this.orderBookCache.delete(marketId);
      this.lastUpdateTime.delete(marketId);
      this.lastUpdateTime.delete(`${marketId}_orderbook`);
    } else {
      this.marketDataCache.clear();
      this.orderBookCache.clear();
      this.lastUpdateTime.clear();
    }
  }

  /**
   * Get cached market data without making API call.
   */
  getCachedMarketData(marketId: string): MarketData | null {
    return this.marketDataCache.get(marketId) || null;
  }

  /**
   * Check if market data is stale.
   */
  isMarketDataStale(marketId: string, maxAgeMs: number = 5000): boolean {
    const lastUpdate = this.lastUpdateTime.get(marketId) || 0;
    const now = getCurrentTimestamp() * 1000;
    return now - lastUpdate > maxAgeMs;
  }
}
