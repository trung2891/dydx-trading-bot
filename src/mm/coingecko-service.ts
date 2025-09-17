/**
 * CoinGecko API service for fetching cryptocurrency prices
 * Used as fallback when orderbook data is not available
 */

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

interface CoinGeckoPriceCache {
  price: number;
  timestamp: number;
}

export class CoinGeckoService {
  private static readonly BASE_URL = "https://api.coingecko.com/api/v3";
  private static readonly CACHE_TTL = 30000; // 30 seconds cache
  private priceCache: Map<string, CoinGeckoPriceCache> = new Map();

  // Market ID to CoinGecko ID mapping
  private readonly marketToCoinGeckoId: Map<string, string> = new Map([
    ["BTC-USD", "bitcoin"],
    ["ETH-USD", "ethereum"],
    ["SOL-USD", "solana"],
    ["AVAX-USD", "avalanche-2"],
    ["MATIC-USD", "matic-network"],
    ["DOT-USD", "polkadot"],
    ["ADA-USD", "cardano"],
    ["LINK-USD", "chainlink"],
    ["UNI-USD", "uniswap"],
    ["ATOM-USD", "cosmos"],
    ["NEAR-USD", "near"],
    ["FTM-USD", "fantom"],
    ["ALGO-USD", "algorand"],
    ["XTZ-USD", "tezos"],
    ["ICP-USD", "internet-computer"],
    ["APT-USD", "aptos"],
    ["ARB-USD", "arbitrum"],
    ["OP-USD", "optimism"],
    ["LDO-USD", "lido-dao"],
    ["MKR-USD", "maker"],
    ["SNX-USD", "havven"],
    ["AAVE-USD", "aave"],
    ["CRV-USD", "curve-dao-token"],
    ["COMP-USD", "compound-governance-token"],
    ["YFI-USD", "yearn-finance"],
    ["SUSHI-USD", "sushi"],
    ["1INCH-USD", "1inch"],
    ["ENS-USD", "ethereum-name-service"],
    ["DYDX-USD", "dydx"],
    ["GMX-USD", "gmx"],
    ["BLUR-USD", "blur"],
    ["PEPE-USD", "pepe"],
    ["WLD-USD", "worldcoin-wld"],
    ["TIA-USD", "celestia"],
    ["SEI-USD", "sei-network"],
    ["ORDI-USD", "ordinals"],
    ["PYTH-USD", "pyth-network"],
    ["JTO-USD", "jito-governance-token"],
    ["BONK-USD", "bonk"],
    ["WIF-USD", "dogwifcoin"],
    ["JUP-USD", "jupiter-exchange-solana"],
    ["STRK-USD", "starknet"],
    ["SHIB-USD", "shiba-inu"],
    ["DOGE-USD", "dogecoin"],
    ["LTC-USD", "litecoin"],
    ["BCH-USD", "bitcoin-cash"],
    ["XRP-USD", "ripple"],
    ["TRX-USD", "tron"],
    ["TON-USD", "the-open-network"],
    ["ILV-USD", "illuvium"],
    ["SUI-USD", "sui"],
    ["RUNE-USD", "thorchain"],
    ["IMX-USD", "immutable-x"],
    ["MEME-USD", "memecoin-2"],
    ["RNDR-USD", "render-token"],
    ["FET-USD", "fetch-ai"],
    ["AGIX-USD", "singularitynet"],
    ["OCEAN-USD", "ocean-protocol"],
  ]);

  /**
   * Get price from CoinGecko for a given market
   */
  async getPrice(marketId: string): Promise<number | null> {
    try {
      // Check cache first
      const cached = this.priceCache.get(marketId);
      if (
        cached &&
        Date.now() - cached.timestamp < CoinGeckoService.CACHE_TTL
      ) {
        console.log(
          `📊 Using cached CoinGecko price for ${marketId}: $${cached.price}`
        );
        return cached.price;
      }

      // Get CoinGecko ID for the market
      const coinGeckoId = this.marketToCoinGeckoId.get(marketId);
      if (!coinGeckoId) {
        console.warn(`⚠️ No CoinGecko mapping found for ${marketId}`);
        return null;
      }

      console.log(
        `🔍 Fetching CoinGecko price for ${marketId} (${coinGeckoId})`
      );

      // Fetch from CoinGecko API
      const response = await fetch(
        `${CoinGeckoService.BASE_URL}/simple/price?ids=${coinGeckoId}&vs_currencies=usd`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `CoinGecko API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as CoinGeckoResponse;
      const price = data[coinGeckoId]?.usd;

      if (!price || price <= 0) {
        console.warn(`⚠️ Invalid price data from CoinGecko for ${marketId}`);
        return null;
      }

      // Cache the result
      this.priceCache.set(marketId, {
        price,
        timestamp: Date.now(),
      });

      console.log(`✅ CoinGecko price for ${marketId}: $${price}`);
      return price;
    } catch (error) {
      console.error(
        `❌ Failed to fetch CoinGecko price for ${marketId}:`,
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
      // Filter out cached prices and get CoinGecko IDs
      const uncachedMarkets: string[] = [];
      const coinGeckoIds: string[] = [];

      for (const marketId of marketIds) {
        const cached = this.priceCache.get(marketId);
        if (
          cached &&
          Date.now() - cached.timestamp < CoinGeckoService.CACHE_TTL
        ) {
          prices.set(marketId, cached.price);
        } else {
          const coinGeckoId = this.marketToCoinGeckoId.get(marketId);
          if (coinGeckoId) {
            uncachedMarkets.push(marketId);
            coinGeckoIds.push(coinGeckoId);
          }
        }
      }

      if (coinGeckoIds.length === 0) {
        return prices; // All prices were cached
      }

      console.log(
        `🔍 Fetching CoinGecko prices for ${uncachedMarkets.length} markets`
      );

      // Fetch uncached prices
      const response = await fetch(
        `${CoinGeckoService.BASE_URL}/simple/price?ids=${coinGeckoIds.join(
          ","
        )}&vs_currencies=usd`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `CoinGecko API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as CoinGeckoResponse;

      // Process results
      for (const marketId of uncachedMarkets) {
        const coinGeckoId = this.marketToCoinGeckoId.get(marketId)!;
        const price = data[coinGeckoId]?.usd;

        if (price && price > 0) {
          prices.set(marketId, price);

          // Cache the result
          this.priceCache.set(marketId, {
            price,
            timestamp: Date.now(),
          });
        } else {
          console.warn(`⚠️ Invalid price data from CoinGecko for ${marketId}`);
        }
      }

      console.log(
        `✅ Fetched ${
          prices.size - (marketIds.length - uncachedMarkets.length)
        } new prices from CoinGecko`
      );
      return prices;
    } catch (error) {
      console.error(
        `❌ Failed to fetch CoinGecko prices:`,
        error instanceof Error ? error.message : String(error)
      );
      return prices; // Return whatever we managed to get
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log("🗑️ CoinGecko price cache cleared");
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
