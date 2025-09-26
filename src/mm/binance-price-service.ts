/**
 * Binance Futures API service for fetching cryptocurrency prices
 * Used as oracle for market making strategies
 */

import ccxt, { Exchange } from "ccxt";

export interface BinancePriceServiceConfig {
  apiKey?: string;
  secret?: string;
  sandbox?: boolean;
  timeout?: number;
}

interface BinancePriceCache {
  price: number;
  timestamp: number;
}

export class BinancePriceService {
  private static readonly CACHE_TTL = 5000; // 5 seconds cache
  private priceCache: Map<string, BinancePriceCache> = new Map();
  private exchange: Exchange;
  private config: BinancePriceServiceConfig;

  //   // Market ID to Binance futures symbol mapping
  //   private readonly marketToBinanceSymbol: Map<string, string> = new Map([
  //     ["BTC-USD", "BTC/USDT:USDT"],
  //     ["ETH-USD", "ETH/USDT:USDT"],
  //     ["SOL-USD", "SOL/USDT:USDT"],
  //     ["AVAX-USD", "AVAX/USDT:USDT"],
  //     ["MATIC-USD", "MATIC/USDT:USDT"],
  //     ["DOT-USD", "DOT/USDT:USDT"],
  //     ["ADA-USD", "ADA/USDT:USDT"],
  //     ["LINK-USD", "LINK/USDT:USDT"],
  //     ["UNI-USD", "UNI/USDT:USDT"],
  //     ["ATOM-USD", "ATOM/USDT:USDT"],
  //     ["NEAR-USD", "NEAR/USDT:USDT"],
  //     ["FTM-USD", "FTM/USDT:USDT"],
  //     ["ALGO-USD", "ALGO/USDT:USDT"],
  //     ["XTZ-USD", "XTZ/USDT:USDT"],
  //     ["ICP-USD", "ICP/USDT:USDT"],
  //     ["APT-USD", "APT/USDT:USDT"],
  //     ["ARB-USD", "ARB/USDT:USDT"],
  //     ["OP-USD", "OP/USDT:USDT"],
  //     ["LDO-USD", "LDO/USDT:USDT"],
  //     ["MKR-USD", "MKR/USDT:USDT"],
  //     ["SNX-USD", "SNX/USDT:USDT"],
  //     ["AAVE-USD", "AAVE/USDT:USDT"],
  //     ["CRV-USD", "CRV/USDT:USDT"],
  //     ["COMP-USD", "COMP/USDT:USDT"],
  //     ["YFI-USD", "YFI/USDT:USDT"],
  //     ["SUSHI-USD", "SUSHI/USDT:USDT"],
  //     ["1INCH-USD", "1INCH/USDT:USDT"],
  //     ["ENS-USD", "ENS/USDT:USDT"],
  //     ["DYDX-USD", "DYDX/USDT:USDT"],
  //     ["GMX-USD", "GMX/USDT:USDT"],
  //     ["BLUR-USD", "BLUR/USDT:USDT"],
  //     ["PEPE-USD", "PEPE/USDT:USDT"],
  //     ["WLD-USD", "WLD/USDT:USDT"],
  //     ["TIA-USD", "TIA/USDT:USDT"],
  //     ["SEI-USD", "SEI/USDT:USDT"],
  //     ["ORDI-USD", "ORDI/USDT:USDT"],
  //     ["PYTH-USD", "PYTH/USDT:USDT"],
  //     ["JTO-USD", "JTO/USDT:USDT"],
  //     ["BONK-USD", "BONK/USDT:USDT"],
  //     ["WIF-USD", "WIF/USDT:USDT"],
  //     ["JUP-USD", "JUP/USDT:USDT"],
  //     ["STRK-USD", "STRK/USDT:USDT"],
  //     ["SHIB-USD", "SHIB/USDT:USDT"],
  //     ["DOGE-USD", "DOGE/USDT:USDT"],
  //     ["LTC-USD", "LTC/USDT:USDT"],
  //     ["BCH-USD", "BCH/USDT:USDT"],
  //     ["XRP-USD", "XRP/USDT:USDT"],
  //     ["TRX-USD", "TRX/USDT:USDT"],
  //     ["TON-USD", "TON/USDT:USDT"],
  //     ["ILV-USD", "ILV/USDT:USDT"],
  //     ["SUI-USD", "SUI/USDT:USDT"],
  //     ["RUNE-USD", "RUNE/USDT:USDT"],
  //     ["IMX-USD", "IMX/USDT:USDT"],
  //     ["MEME-USD", "MEME/USDT:USDT"],
  //     ["RNDR-USD", "RENDER/USDT:USDT"],
  //     ["FET-USD", "FET/USDT:USDT"],
  //     ["AGIX-USD", "AGIX/USDT:USDT"],
  //     ["OCEAN-USD", "OCEAN/USDT:USDT"],
  //   ]);

  private marketToBinanceSymbol(marketId: string): string {
    const [base, quote] = marketId.split("-");

    return `${base}/USDT:USDT`;
  }

  constructor(config: BinancePriceServiceConfig = {}) {
    this.config = {
      sandbox: false,
      timeout: 10000,
      ...config,
    };

    this.exchange = new ccxt.binance({
      apiKey: this.config.apiKey,
      secret: this.config.secret,
      sandbox: this.config.sandbox,
      timeout: this.config.timeout,
      enableRateLimit: true,
    });
  }

  /**
   * Get price from Binance futures for a given market
   */
  async getPrice(marketId: string): Promise<number | null> {
    try {
      // Check cache first
      const cached = this.priceCache.get(marketId);
      if (
        cached &&
        Date.now() - cached.timestamp < BinancePriceService.CACHE_TTL
      ) {
        console.log(
          `📊 Using cached Binance futures price for ${marketId}: $${cached.price}`
        );
        return cached.price;
      }

      // Get Binance symbol for the market
      const binanceSymbol = this.marketToBinanceSymbol(marketId);
      if (!binanceSymbol) {
        console.warn(`⚠️ No Binance futures mapping found for ${marketId}`);
        return null;
      }

      console.log(
        `🔍 Fetching Binance futures price for ${marketId} (${binanceSymbol})`
      );

      // Fetch from Binance futures
      const ticker = await this.exchange.fetchTicker(binanceSymbol);

      if (!ticker || !ticker.last || ticker.last <= 0) {
        console.warn(
          `⚠️ Invalid price data from Binance futures for ${marketId}`
        );
        return null;
      }

      const price = ticker.last;

      // Cache the result
      this.priceCache.set(marketId, {
        price,
        timestamp: Date.now(),
      });

      console.log(`✅ Binance futures price for ${marketId}: $${price}`);
      return price;
    } catch (error) {
      console.error(
        `❌ Failed to fetch Binance futures price for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get multiple prices at once (more efficient for multiple markets)
   */
  async getPrices(marketIds: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    try {
      // Filter out cached prices and get Binance symbols
      const uncachedMarkets: string[] = [];
      const binanceSymbols: string[] = [];

      for (const marketId of marketIds) {
        const cached = this.priceCache.get(marketId);
        if (
          cached &&
          Date.now() - cached.timestamp < BinancePriceService.CACHE_TTL
        ) {
          prices.set(marketId, cached.price);
        } else {
          const binanceSymbol = this.marketToBinanceSymbol(marketId);
          if (binanceSymbol) {
            uncachedMarkets.push(marketId);
            binanceSymbols.push(binanceSymbol);
          }
        }
      }

      if (binanceSymbols.length === 0) {
        return prices; // All prices were cached
      }

      console.log(
        `🔍 Fetching Binance futures prices for ${uncachedMarkets.length} markets`
      );

      // Fetch all tickers at once for efficiency
      const tickers = await this.exchange.fetchTickers();

      // Process results
      for (const marketId of uncachedMarkets) {
        const binanceSymbol = this.marketToBinanceSymbol(marketId);
        const ticker = tickers[binanceSymbol];

        if (ticker && ticker.last && ticker.last > 0) {
          const price = ticker.last;
          prices.set(marketId, price);

          // Cache the result
          this.priceCache.set(marketId, {
            price,
            timestamp: Date.now(),
          });
        } else {
          console.warn(
            `⚠️ Invalid price data from Binance futures for ${marketId}`
          );
        }
      }

      console.log(
        `✅ Fetched ${
          prices.size - (marketIds.length - uncachedMarkets.length)
        } new prices from Binance futures`
      );
      return prices;
    } catch (error) {
      console.error(
        `❌ Failed to fetch Binance futures prices:`,
        error instanceof Error ? error.message : String(error)
      );
      return prices; // Return whatever we managed to get
    }
  }

  /**
   * Get mid price from Binance futures orderbook
   */
  async getMidPrice(marketId: string): Promise<number | null> {
    try {
      const binanceSymbol = this.marketToBinanceSymbol(marketId);
      if (!binanceSymbol) {
        console.warn(`⚠️ No Binance futures mapping found for ${marketId}`);
        return null;
      }

      const orderbook = await this.exchange.fetchOrderBook(binanceSymbol, 5);

      if (orderbook && orderbook.bids.length > 0 && orderbook.asks.length > 0) {
        const bestBid = orderbook.bids[0]?.[0];
        const bestAsk = orderbook.asks[0]?.[0];

        if (!bestBid || !bestAsk) {
          console.warn(
            `⚠️ Invalid orderbook data from Binance futures for ${marketId}`
          );
          return null;
        }

        const midPrice = (bestBid + bestAsk) / 2;

        console.log(
          `📊 Binance futures mid price for ${marketId}: $${midPrice.toFixed(
            2
          )} (bid: $${bestBid}, ask: $${bestAsk})`
        );
        return midPrice;
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Error calculating Binance futures mid price for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get orderbook data from Binance futures
   */
  async getOrderbook(
    marketId: string,
    limit: number = 20
  ): Promise<{ bids: number[][]; asks: number[][] } | null> {
    try {
      const binanceSymbol = this.marketToBinanceSymbol(marketId);
      if (!binanceSymbol) {
        console.warn(`⚠️ No Binance futures mapping found for ${marketId}`);
        return null;
      }

      const orderbook = await this.exchange.fetchOrderBook(
        binanceSymbol,
        limit
      );

      if (orderbook && orderbook.bids && orderbook.asks) {
        return {
          bids: orderbook.bids.map(([price, amount]) => [
            Number(price),
            Number(amount),
          ]),
          asks: orderbook.asks.map(([price, amount]) => [
            Number(price),
            Number(amount),
          ]),
        };
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Error fetching Binance futures orderbook for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Test connection to Binance
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.exchange.fetchStatus();
      console.log("✅ Binance futures connection successful");
      return true;
    } catch (error) {
      console.error("❌ Binance futures connection failed:", error);
      return false;
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log("🗑️ Binance futures price cache cleared");
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ marketId: string; price: number; age: number }>;
  } {
    const entries = Array.from(this.priceCache.entries()).map(
      ([marketId, data]) => ({
        marketId,
        price: data.price,
        age: Date.now() - data.timestamp,
      })
    );

    return {
      size: this.priceCache.size,
      entries,
    };
  }
}
