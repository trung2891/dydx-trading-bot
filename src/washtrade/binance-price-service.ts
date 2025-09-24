import ccxt, { Exchange } from "ccxt";

export interface BinancePriceServiceConfig {
  apiKey?: string;
  secret?: string;
  sandbox?: boolean;
  timeout?: number;
}

export class BinancePriceService {
  private exchange: Exchange;
  private config: BinancePriceServiceConfig;

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
   * Get current futures price for a symbol
   */
  async getFuturesPrice(symbol: string): Promise<number | null> {
    try {
      // Convert market symbol to Binance futures format
      const binanceSymbol = this.convertToBinanceSymbol(symbol);

      // Fetch ticker from Binance futures
      const ticker = await this.exchange.fetchTicker(binanceSymbol);

      if (ticker && ticker.last) {
        console.log(`📊 Binance futures price for ${symbol}: $${ticker.last}`);
        return ticker.last;
      }

      console.warn(`⚠️ No price data from Binance for ${symbol}`);
      return null;
    } catch (error) {
      console.error(
        `❌ Error fetching Binance futures price for ${symbol}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get orderbook from Binance futures
   */
  async getFuturesOrderbook(
    symbol: string,
    limit: number = 20
  ): Promise<{ bids: number[][]; asks: number[][] } | null> {
    try {
      const binanceSymbol = this.convertToBinanceSymbol(symbol);

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
        `❌ Error fetching Binance orderbook for ${symbol}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get mid price from Binance futures orderbook
   */
  async getFuturesMidPrice(symbol: string): Promise<number | null> {
    try {
      const orderbook = await this.getFuturesOrderbook(symbol, 5);

      if (orderbook && orderbook.bids.length > 0 && orderbook.asks.length > 0) {
        const bestBid = orderbook.bids[0][0];
        const bestAsk = orderbook.asks[0][0];
        const midPrice = (bestBid + bestAsk) / 2;

        console.log(
          `📊 Binance futures mid price for ${symbol}: $${midPrice.toFixed(
            2
          )} (bid: $${bestBid}, ask: $${bestAsk})`
        );
        return midPrice;
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Error calculating Binance mid price for ${symbol}:`,
        error
      );
      return null;
    }
  }

  /**
   * Convert market symbol to Binance futures format
   */
  private convertToBinanceSymbol(marketId: string): string {
    // Convert from dYdX format (e.g., "BTC-USD") to Binance format (e.g., "BTC/USDT:USDT")
    const [base, quote] = marketId.split("-");

    // Map common quote currencies
    const quoteMap: Record<string, string> = {
      USD: "USDT",
      USDC: "USDT",
    };

    const binanceQuote = quoteMap[quote] || quote;
    return `${base}/${binanceQuote}:${binanceQuote}`;
  }

  /**
   * Get multiple symbols prices at once
   */
  async getMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    try {
      // Fetch all tickers at once for efficiency
      const tickers = await this.exchange.fetchTickers();

      for (const symbol of symbols) {
        const binanceSymbol = this.convertToBinanceSymbol(symbol);
        const ticker = tickers[binanceSymbol];

        if (ticker && ticker.last) {
          prices[symbol] = ticker.last;
        }
      }

      return prices;
    } catch (error) {
      console.error("❌ Error fetching multiple prices from Binance:", error);
      return prices;
    }
  }

  /**
   * Test connection to Binance
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.exchange.fetchStatus();
      console.log("✅ Binance connection successful");
      return true;
    } catch (error) {
      console.error("❌ Binance connection failed:", error);
      return false;
    }
  }

  /**
   * Get exchange info
   */
  async getExchangeInfo(): Promise<any> {
    try {
      return await this.exchange.fetchMarkets();
    } catch (error) {
      console.error("❌ Error fetching exchange info:", error);
      return null;
    }
  }
}
