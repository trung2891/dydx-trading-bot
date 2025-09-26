import {
  CompositeClient,
  OrderSide,
  Order_TimeInForce,
  OrderStatus,
  TickerType,
  SubaccountInfo,
  OrderType,
  OrderTimeInForce,
  OrderExecution,
  OrderFlags,
} from "@oraichain/lfg-client-js";
import {
  OrderInfo,
  MarketMakerConfig,
  OrderType as MMOrderType,
  MarketData,
} from "./types";
import { BinancePriceService } from "./binance-price-service";
import { CoinGeckoService } from "./coingecko-service";
import {
  generateRandomClientId,
  sleep,
  isValidPrice,
  isValidSize,
  roundPrice,
  roundSize,
  randomIntRange,
} from "./utils";

export class OrderManager {
  private compositeClient: CompositeClient;
  private subaccount: SubaccountInfo;
  private activeOrders: Map<string, OrderInfo> = new Map(); // clientId -> OrderInfo
  private ordersByMarket: Map<string, Set<string>> = new Map(); // marketId -> Set<clientId>
  private binancePriceService: BinancePriceService;
  private coinGeckoService: CoinGeckoService;

  constructor(compositeClient: CompositeClient, subaccount: SubaccountInfo) {
    this.compositeClient = compositeClient;
    this.subaccount = subaccount;
    this.binancePriceService = new BinancePriceService();
    this.coinGeckoService = new CoinGeckoService();
  }

  /**
   * Place multiple orders around mid price.
   * Supports batch order placement for improved performance.
   */
  async placeOrdersAroundMidPrice(
    marketId: string,
    midPrice: number,
    config: MarketMakerConfig
  ): Promise<OrderInfo[]> {
    const placedOrders: OrderInfo[] = [];
    const batchSize = config.orderConfig.batchSize || 1;
    const batchDelay = config.orderConfig.batchDelay || 100;

    // Start timing
    const startTime = Date.now();

    try {
      // Get current block height once for short-term orders optimization
      let currentBlock: number | undefined;

      // Calculate order prices
      const { bidPrices, askPrices } = this.calculateOrderPrices(
        midPrice,
        config
      );

      console.log(
        `📊 Placing orders around mid price $${midPrice} with ${config.spread}% spread (batch size: ${batchSize})`
      );

      // Prepare all order requests
      const orderRequests: Array<{
        side: OrderSide;
        price: number;
        size: number;
      }> = [];

      // Prepare buy orders
      for (let i = 0; i < Math.min(bidPrices.length, config.maxOrders); i++) {
        const price = bidPrices[i];
        const size = this.calculateOrderSize(config.orderSize, i);

        if (isValidPrice(price) && isValidSize(size)) {
          orderRequests.push({ side: OrderSide.BUY, price, size });
        } else {
          console.warn(`Invalid price ${price} or size ${size} for buy order`);
        }
      }

      // Prepare sell orders
      for (let i = 0; i < Math.min(askPrices.length, config.maxOrders); i++) {
        const price = askPrices[i];
        const size = this.calculateOrderSize(config.orderSize, i);

        if (isValidPrice(price) && isValidSize(size)) {
          orderRequests.push({ side: OrderSide.SELL, price, size });
        } else {
          console.warn(`Invalid price ${price} or size ${size} for sell order`);
        }
      }

      // suffle orderRequests
      orderRequests.sort(() => Math.random() - 0.5);

      console.log(orderRequests);

      // Place orders in batches
      if (batchSize === 1) {
        // Sequential placement (original behavior)
        for (const request of orderRequests) {
          const orderInfo = await this.placeOrder(
            marketId,
            request.side,
            request.price,
            request.size,
            config,
            currentBlock
          );

          if (orderInfo) {
            placedOrders.push(orderInfo);
          }
        }
      } else {
        // Batch placement
        for (let i = 0; i < orderRequests.length; i += batchSize) {
          // if (config.orderType === MMOrderType.SHORT_TERM) {
          //   currentBlock =
          //     await this.compositeClient.validatorClient.get.latestBlockHeight();
          //   console.log(
          //     `📏 Current block height: ${currentBlock} (for batch optimization)`
          //   );
          // }

          const batch = orderRequests.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const batchStartTime = Date.now();

          console.log(
            `📦 Processing batch ${batchNumber} with ${batch.length} orders`
          );

          // Place orders in parallel within the batch
          const batchPromises = batch.map((request) =>
            this.placeOrder(
              marketId,
              request.side,
              request.price,
              request.size,
              config,
              currentBlock
            )
          );

          try {
            const batchResults = await Promise.allSettled(batchPromises);
            const batchEndTime = Date.now();
            const batchTime = batchEndTime - batchStartTime;

            let batchSuccessCount = 0;
            batchResults.forEach((result, index) => {
              if (result.status === "fulfilled" && result.value) {
                placedOrders.push(result.value);
                batchSuccessCount++;
              } else if (result.status === "rejected") {
                const request = batch[index];
                console.error(
                  `❌ Failed to place ${request.side} order at ${request.price}:`,
                  result.reason
                );
              }
            });

            // Log batch completion with timing
            console.log(
              `✅ Batch ${batchNumber} completed: ${batchSuccessCount}/${
                batch.length
              } orders in ${batchTime}ms (${(batchTime / batch.length).toFixed(
                1
              )}ms/order)`
            );

            // Add delay between batches (except for the last batch)
            if (i + batchSize < orderRequests.length && batchDelay > 0) {
              console.log(`⏳ Waiting ${batchDelay}ms before next batch...`);
              await sleep(batchDelay);
            }
          } catch (error) {
            console.error(
              `❌ Batch placement error:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      }

      // Calculate timing
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerOrder =
        orderRequests.length > 0 ? totalTime / orderRequests.length : 0;

      console.log(
        `✅ Placed ${placedOrders.length}/${orderRequests.length} orders for ${marketId}`
      );
      console.log(
        `⏱️  Total time: ${totalTime}ms | Avg per order: ${avgTimePerOrder.toFixed(
          1
        )}ms | Batch size: ${batchSize}`
      );

      // Log performance summary
      if (batchSize > 1) {
        const batchCount = Math.ceil(orderRequests.length / batchSize);
        const avgTimePerBatch = batchCount > 0 ? totalTime / batchCount : 0;
        console.log(
          `📊 Batch performance: ${batchCount} batches | Avg per batch: ${avgTimePerBatch.toFixed(
            1
          )}ms`
        );
      }

      return placedOrders;
    } catch (error) {
      console.error(
        `Error placing orders around mid price for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return placedOrders;
    }
  }

  /**
   * Place orders using oracle-based strategy.
   * Compares current market price with CoinGecko oracle price and places orders
   * when the difference exceeds the configured threshold.
   */
  async placeOracleBasedOrders(
    marketId: string,
    marketData: MarketData,
    config: MarketMakerConfig
  ): Promise<OrderInfo[]> {
    const placedOrders: OrderInfo[] = [];

    // Check if oracle strategy is enabled
    if (!config.oracleStrategy?.enabled) {
      console.log(`Oracle strategy not enabled for ${marketId}`);
      return placedOrders;
    }

    const oracleConfig = config.oracleStrategy;
    const startTime = Date.now();

    try {
      // Get oracle price based on configured provider
      const oracleProvider = config.oracleStrategy?.provider || "binance";
      let oraclePrice: number | null = null;

      if (oracleProvider === "binance") {
        console.log(`🔍 Using Binance futures as oracle for ${marketId}`);
        oraclePrice = await this.binancePriceService.getPrice(marketId);
      } else if (oracleProvider === "coingecko") {
        console.log(`🔍 Using CoinGecko as oracle for ${marketId}`);
        oraclePrice = await this.coinGeckoService.getPrice(marketId);
      }

      if (!oraclePrice || oraclePrice <= 0) {
        console.warn(
          `⚠️ No valid oracle price available from ${oracleProvider} for ${marketId}`
        );
        return placedOrders;
      }

      const currentPrice = marketData.midPrice;
      const priceDifference = Math.abs(currentPrice - oraclePrice);
      const priceDifferencePercentage = (priceDifference / oraclePrice) * 100;

      console.log(`🔍 Oracle Analysis for ${marketId}:`);
      console.log(`   Oracle Provider: ${oracleProvider}`);
      console.log(`   Current Price: $${currentPrice}`);
      console.log(`   Oracle Price: $${oraclePrice}`);
      console.log(`   Difference: ${priceDifferencePercentage.toFixed(3)}%`);
      console.log(`   Threshold: ${oracleConfig.oraclePriceThreshold}%`);

      // Check if price difference exceeds threshold
      if (priceDifferencePercentage < oracleConfig.oraclePriceThreshold) {
        console.log(
          `✅ Price difference ${priceDifferencePercentage.toFixed(
            3
          )}% is within threshold ${oracleConfig.oraclePriceThreshold}%`
        );
        return placedOrders;
      }

      console.log(
        `🚨 Price difference ${priceDifferencePercentage.toFixed(
          3
        )}% exceeds threshold ${
          oracleConfig.oraclePriceThreshold
        }% - Using Oracle Strategy`
      );

      // Use oracle price as primary when oracle strategy is triggered
      const primaryPrice = oraclePrice;
      const isCurrentPriceHigher = currentPrice > oraclePrice;

      console.log(
        `📊 Using ${oracleProvider} Oracle price as primary: $${primaryPrice}`
      );

      // Calculate oracle-based order prices using common config parameters
      const { bidPrices, askPrices } = this.calculateOracleOrderPrices(
        primaryPrice,
        config
      );

      // Prepare order requests
      const orderRequests: Array<{
        side: OrderSide;
        price: number;
        size: number;
        isOracleOrder: boolean;
      }> = [];

      // Prepare buy orders (bids) using common config parameters
      for (let i = 0; i < Math.min(bidPrices.length, config.maxOrders); i++) {
        const price = bidPrices[i];
        const size = this.calculateOrderSize(config.orderSize, i);

        if (isValidPrice(price) && isValidSize(size)) {
          orderRequests.push({
            side: OrderSide.BUY,
            price,
            size,
            isOracleOrder: true,
          });
        }
      }

      // Prepare sell orders (asks) using common config parameters
      for (let i = 0; i < Math.min(askPrices.length, config.maxOrders); i++) {
        const price = askPrices[i];
        const size = this.calculateOrderSize(config.orderSize, i);

        if (isValidPrice(price) && isValidSize(size)) {
          orderRequests.push({
            side: OrderSide.SELL,
            price,
            size,
            isOracleOrder: true,
          });
        }
      }

      // Shuffle order requests for better distribution
      orderRequests.sort(() => Math.random() - 0.5);

      console.log(
        `📦 Placing ${orderRequests.length} oracle-based orders around $${primaryPrice}`
      );

      // Place orders
      const batchSize = config.orderConfig.batchSize || 1;
      const batchDelay = config.orderConfig.batchDelay || 100;

      if (batchSize === 1) {
        // Sequential placement
        for (const request of orderRequests) {
          const orderInfo = await this.placeOrder(
            marketId,
            request.side,
            request.price,
            request.size,
            config
          );

          if (orderInfo) {
            placedOrders.push(orderInfo);
          }
        }
      } else {
        // Batch placement
        for (let i = 0; i < orderRequests.length; i += batchSize) {
          const batch = orderRequests.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;

          console.log(
            `📦 Processing oracle batch ${batchNumber} with ${batch.length} orders`
          );

          const batchPromises = batch.map((request) =>
            this.placeOrder(
              marketId,
              request.side,
              request.price,
              request.size,
              config
            )
          );

          try {
            const batchResults = await Promise.allSettled(batchPromises);
            let batchSuccessCount = 0;

            batchResults.forEach((result, index) => {
              if (result.status === "fulfilled" && result.value) {
                placedOrders.push(result.value);
                batchSuccessCount++;
              } else if (result.status === "rejected") {
                const request = batch[index];
                console.error(
                  `❌ Failed to place oracle ${request.side} order at ${request.price}:`,
                  result.reason
                );
              }
            });

            console.log(
              `✅ Oracle batch ${batchNumber} completed: ${batchSuccessCount}/${batch.length} orders`
            );

            // Add delay between batches
            if (i + batchSize < orderRequests.length && batchDelay > 0) {
              await sleep(batchDelay);
            }
          } catch (error) {
            console.error(`❌ Oracle batch placement error:`, error);
          }
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(
        `✅ Oracle Strategy: Placed ${placedOrders.length}/${orderRequests.length} orders for ${marketId}`
      );
      console.log(`⏱️  Oracle order placement time: ${totalTime}ms`);

      return placedOrders;
    } catch (error) {
      console.error(
        `❌ Error in oracle-based order placement for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return placedOrders;
    }
  }

  /**
   * Calculate oracle-based order prices around the oracle price using common config parameters.
   */
  private calculateOracleOrderPrices(
    oraclePrice: number,
    config: MarketMakerConfig
  ): { bidPrices: number[]; askPrices: number[] } {
    const bidPrices: number[] = [];
    const askPrices: number[] = [];
    const halfSpread = config.spread / 2;
    const stepSize = config.stepSize;

    for (let i = 0; i < config.priceSteps; i++) {
      const offset = (i + 1) * stepSize;
      bidPrices.push(
        roundPrice(
          oraclePrice * (1 - (halfSpread + offset) / 100),
          config.orderConfig.roundPrice || 3
        )
      );
      askPrices.push(
        roundPrice(
          oraclePrice * (1 + (halfSpread + offset) / 100),
          config.orderConfig.roundPrice || 3
        )
      );
    }

    return { bidPrices, askPrices };
  }

  /**
   * Check if oracle strategy should be triggered based on price difference.
   */
  async shouldTriggerOracleStrategy(
    marketId: string,
    currentPrice: number,
    config: MarketMakerConfig
  ): Promise<{
    shouldTrigger: boolean;
    oraclePrice: number | null;
    priceDifference: number;
    priceDifferencePercentage: number;
  }> {
    if (!config.oracleStrategy?.enabled) {
      return {
        shouldTrigger: false,
        oraclePrice: null,
        priceDifference: 0,
        priceDifferencePercentage: 0,
      };
    }

    try {
      // Get oracle price based on configured provider
      const oracleProvider = config.oracleStrategy?.provider || "binance";
      let oraclePrice: number | null = null;

      if (oracleProvider === "binance") {
        oraclePrice = await this.binancePriceService.getPrice(marketId);
      } else if (oracleProvider === "coingecko") {
        oraclePrice = await this.coinGeckoService.getPrice(marketId);
      }

      if (!oraclePrice || oraclePrice <= 0) {
        return {
          shouldTrigger: false,
          oraclePrice: null,
          priceDifference: 0,
          priceDifferencePercentage: 0,
        };
      }

      const priceDifference = Math.abs(currentPrice - oraclePrice);
      const priceDifferencePercentage = (priceDifference / oraclePrice) * 100;
      const shouldTrigger =
        priceDifferencePercentage >= config.oracleStrategy.oraclePriceThreshold;

      return {
        shouldTrigger,
        oraclePrice,
        priceDifference,
        priceDifferencePercentage,
      };
    } catch (error) {
      console.error(
        `❌ Error checking oracle strategy trigger for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return {
        shouldTrigger: false,
        oraclePrice: null,
        priceDifference: 0,
        priceDifferencePercentage: 0,
      };
    }
  }

  /**
   * Place a single order (short-term or long-term based on config).
   *
   * Short-term orders:
   * - Use goodTilBlock for expiration
   * - Faster execution and better time priority
   * - Higher rate limits
   * - Expire quickly (good for high-frequency trading)
   *
   * Long-term orders (stateful orders):
   * - Use GTT (Good Till Time) instead of goodTilBlock
   * - Sequence number validation (can be dropped if received out of order)
   * - Worse time priority (matched after being included in a block)
   * - More restrictive rate limits (max 2 per block / 20 per 100 blocks)
   * - Can only be canceled after being included in a block
   * - Better for market making as they don't expire as quickly
   */
  async placeOrder(
    marketId: string,
    side: OrderSide,
    price: number,
    size: number,
    config: MarketMakerConfig,
    currentBlock?: number
  ): Promise<OrderInfo | null> {
    try {
      const clientId = generateRandomClientId();
      const roundedPrice = roundPrice(
        price,
        config.orderConfig.roundPrice || 3
      );
      const roundedSize = roundSize(size, config.orderConfig.roundSize || 4);

      let tx: any;
      let orderInfo: OrderInfo;

      if (config.orderType === MMOrderType.SHORT_TERM) {
        // Place short-term order
        let blockHeight: number;
        if (currentBlock !== undefined) {
          blockHeight = currentBlock;
        } else {
          blockHeight =
            await this.compositeClient.validatorClient.get.latestBlockHeight();
        }

        const goodTilBlocks = config.orderConfig.goodTilBlocks || 20;
        const goodTilBlock =
          blockHeight + randomIntRange(goodTilBlocks / 2, goodTilBlocks);

        // const goodTilBlock = config.orderConfig.goodTilBlocks || 20;

        tx = await this.compositeClient.placeShortTermOrder(
          this.subaccount,
          marketId,
          side,
          roundedPrice,
          roundedSize,
          clientId,
          goodTilBlock,
          Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED,
          false // postOnly
        );

        orderInfo = {
          marketId,
          clientId,
          side,
          price: roundedPrice,
          size: roundedSize,
          goodTilBlock,
          orderId:
            typeof tx.hash === "string"
              ? tx.hash
              : Buffer.from(tx.hash).toString("hex"),
        };

        // console.log(
        //   `✅ Placed SHORT-TERM ${side} order: ${roundedSize} ${marketId} at ${roundedPrice} (Client ID: ${clientId}, GTB: ${goodTilBlock})`
        // );
      } else {
        // Place long-term order
        // const goodTilTimeInSeconds =
        //   Math.floor(Date.now() / 1000) +
        //   (config.orderConfig.goodTilTimeSeconds || 300);
        let goodTilTimeInSeconds = config.orderConfig.goodTilTimeSeconds || 300;
        goodTilTimeInSeconds = randomIntRange(
          Math.floor(goodTilTimeInSeconds / 2),
          goodTilTimeInSeconds
        );

        // console.log(
        //   `✅ Placing LONG-TERM ${side} order: ${roundedSize} ${marketId} at ${roundedPrice} (Client ID: ${clientId}, GTT: ${goodTilTimeInSeconds})`
        // );

        tx = await this.compositeClient.placeOrder(
          this.subaccount,
          marketId,
          OrderType.LIMIT,
          side,
          roundedPrice,
          roundedSize,
          clientId,
          OrderTimeInForce.GTT,
          // goodTilTimeInSeconds,
          goodTilTimeInSeconds,
          OrderExecution.DEFAULT,
          false, // postOnly
          false // reduceOnly
        );

        orderInfo = {
          marketId,
          clientId,
          side,
          price: roundedPrice,
          size: roundedSize,
          goodTilBlock: goodTilTimeInSeconds, // Store goodTilTime for long-term orders
          orderId:
            typeof tx.hash === "string"
              ? tx.hash
              : Buffer.from(tx.hash).toString("hex"),
        };

        console.log(
          `✅ Placed LONG-TERM ${side} order: ${roundedSize} ${marketId} at ${roundedPrice} (Client ID: ${clientId}, GTT: ${goodTilTimeInSeconds})`
        );
      }

      // Store order in our tracking maps
      this.activeOrders.set(clientId.toString(), orderInfo);

      if (!this.ordersByMarket.has(marketId)) {
        this.ordersByMarket.set(marketId, new Set());
      }
      this.ordersByMarket.get(marketId)!.add(clientId.toString());

      // console.log(
      //   `✅ Placed ${side} order: ${roundedSize} ${marketId} at ${roundedPrice} (Client ID: ${clientId})`
      // );
      return orderInfo;
    } catch (error) {
      console.error(
        `❌ Failed to place ${side} order for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Cancel all orders for a specific market.
   */
  async cancelAllOrdersForMarket(
    marketId: string,
    config?: MarketMakerConfig
  ): Promise<boolean> {
    try {
      const orderClientIds = this.ordersByMarket.get(marketId);

      if (!orderClientIds || orderClientIds.size === 0) {
        console.log(`No active orders to cancel for ${marketId}`);
        return true;
      }

      const clientIds = Array.from(orderClientIds).map((id) => parseInt(id));
      let cancelledCount = 0;

      // First, get the current orders from exchange to get their goodTilBlockTime
      const currentOrders = await this.fetchCurrentOrders(marketId);
      const orderMap = new Map();
      for (const order of currentOrders) {
        orderMap.set(parseInt(order.clientId), order);
      }

      // Determine order type for cancellation
      const orderType = config?.orderType || MMOrderType.LONG_TERM; // Default to long-term for backward compatibility

      if (orderType === MMOrderType.SHORT_TERM) {
        // Batch cancel short-term orders
        try {
          const currentBlock =
            await this.compositeClient.validatorClient.get.latestBlockHeight();
          const goodTilBlock = currentBlock + 10;

          const tx =
            await this.compositeClient.batchCancelShortTermOrdersWithMarketId(
              this.subaccount,
              [{ marketId, clientIds }],
              goodTilBlock
            );

          // Remove orders from our tracking
          clientIds.forEach((clientId) => {
            this.activeOrders.delete(clientId.toString());
          });
          this.ordersByMarket.delete(marketId);

          console.log(
            `✅ Cancelled ${clientIds.length} SHORT-TERM orders for ${marketId} (Tx: ${tx.hash})`
          );
          return true;
        } catch (error) {
          console.error(
            `❌ Failed to batch cancel SHORT-TERM orders for ${marketId}:`,
            error instanceof Error ? error.message : String(error)
          );
          return false;
        }
      } else {
        // Cancel long-term orders individually
        for (const clientId of clientIds) {
          try {
            // For long-term orders, goodTilBlock should be 0
            const goodTilBlock = 0;

            // Get the original order's goodTilBlockTime
            const originalOrder = orderMap.get(clientId);
            let goodTilTimeInSeconds: number;

            if (originalOrder && originalOrder.goodTilBlockTime) {
              // Use the original order's goodTilBlockTime
              goodTilTimeInSeconds = parseInt(originalOrder.goodTilBlockTime);
            } else {
              // Fallback: use the stored order info or a reasonable default
              const storedOrder = this.activeOrders.get(clientId.toString());
              if (storedOrder && storedOrder.goodTilBlock) {
                goodTilTimeInSeconds = storedOrder.goodTilBlock;
              } else {
                // Last resort: use a time in the future
                goodTilTimeInSeconds = Math.floor(Date.now() / 1000) + 60;
              }
            }

            const tx = await this.compositeClient.cancelOrder(
              this.subaccount,
              clientId,
              OrderFlags.LONG_TERM, // Use LONG_TERM flag for long-term orders
              marketId,
              goodTilBlock, // Must be 0 for long-term orders
              goodTilTimeInSeconds // Use original order's time
            );

            console.log(`✅ Cancelled order ${clientId} (Tx: ${tx.hash})`);
            cancelledCount++;

            // Remove from tracking
            this.activeOrders.delete(clientId.toString());
          } catch (error) {
            console.error(
              `❌ Failed to cancel order ${clientId}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        // Clean up market tracking if all orders were processed
        if (cancelledCount > 0) {
          this.ordersByMarket.delete(marketId);
        }

        console.log(
          `✅ Cancelled ${cancelledCount}/${clientIds.length} LONG-TERM orders for ${marketId}`
        );
        return cancelledCount === clientIds.length;
      } // Close the else block
    } catch (error) {
      console.error(
        `❌ Failed to cancel orders for ${marketId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Cancel all active orders across all markets.
   */
  async cancelAllOrders(config?: MarketMakerConfig): Promise<boolean> {
    try {
      const markets = Array.from(this.ordersByMarket.keys());
      const cancelPromises = markets.map((marketId) =>
        this.cancelAllOrdersForMarket(marketId, config)
      );

      const results = await Promise.all(cancelPromises);
      const success = results.every((result) => result);

      if (success) {
        console.log(
          `✅ Successfully cancelled all orders across ${markets.length} markets`
        );
      } else {
        console.warn(`⚠️ Some order cancellations failed`);
      }

      return success;
    } catch (error) {
      console.error(
        `❌ Error cancelling all orders:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Fetch current orders from the exchange.
   */
  async fetchCurrentOrders(marketId?: string): Promise<any[]> {
    try {
      const orders =
        await this.compositeClient.indexerClient.account.getSubaccountOrders(
          this.subaccount.address,
          this.subaccount.subaccountNumber,
          marketId,
          TickerType.PERPETUAL,
          undefined, // side
          OrderStatus.OPEN
        );

      console.log(
        `📊 Found ${orders.length} open orders${
          marketId ? ` for ${marketId}` : ""
        }`
      );
      return orders;
    } catch (error) {
      console.error(
        `❌ Error fetching current orders:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get locally tracked active orders.
   */
  getActiveOrders(marketId?: string): OrderInfo[] {
    if (marketId) {
      const clientIds = this.ordersByMarket.get(marketId);
      if (!clientIds) return [];

      return Array.from(clientIds)
        .map((clientId) => this.activeOrders.get(clientId))
        .filter((order) => order !== undefined) as OrderInfo[];
    }

    return Array.from(this.activeOrders.values());
  }

  /**
   * Sync local order tracking with exchange orders.
   */
  async syncOrdersWithExchange(marketId?: string): Promise<void> {
    try {
      const exchangeOrders = await this.fetchCurrentOrders(marketId);
      const exchangeClientIds = new Set(
        exchangeOrders
          .map((order) => order.clientId?.toString())
          .filter(Boolean)
      );

      // Remove locally tracked orders that are no longer on exchange
      const localOrders = this.getActiveOrders(marketId);
      for (const order of localOrders) {
        if (!exchangeClientIds.has(order.clientId.toString())) {
          this.removeOrderFromTracking(
            order.clientId.toString(),
            order.marketId
          );
        }
      }

      console.log(`🔄 Synced order tracking for ${marketId || "all markets"}`);
    } catch (error) {
      console.error(
        `❌ Error syncing orders:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Calculate order prices around mid price.
   */
  private calculateOrderPrices(
    midPrice: number,
    config: MarketMakerConfig
  ): { bidPrices: number[]; askPrices: number[] } {
    const bidPrices: number[] = [];
    const askPrices: number[] = [];
    const halfSpread = config.spread / 2;
    const stepSize = config.stepSize;

    for (let i = 0; i < config.priceSteps; i++) {
      const offset = (i + 1) * stepSize;
      bidPrices.push(
        roundPrice(
          midPrice * (1 - (halfSpread + offset) / 100),
          config.orderConfig.roundPrice || 3
        )
      );
      askPrices.push(
        roundPrice(
          midPrice * (1 + (halfSpread + offset) / 100),
          config.orderConfig.roundPrice || 3
        )
      );
    }

    return { bidPrices, askPrices };
  }

  /**
   * Calculate order size with scaling.
   */
  private calculateOrderSize(baseSize: number, level: number): number {
    // Slightly increase size for orders further from mid price
    const sizeMultiplier = 1 + level * 0.01;
    return roundSize(baseSize * sizeMultiplier);
  }

  /**
   * Remove order from local tracking.
   */
  private removeOrderFromTracking(clientId: string, marketId: string): void {
    this.activeOrders.delete(clientId);

    const marketOrders = this.ordersByMarket.get(marketId);
    if (marketOrders) {
      marketOrders.delete(clientId);
      if (marketOrders.size === 0) {
        this.ordersByMarket.delete(marketId);
      }
    }
  }

  /**
   * Get order statistics.
   */
  getOrderStats(): {
    totalOrders: number;
    ordersByMarket: Map<string, number>;
  } {
    const ordersByMarket = new Map<string, number>();

    this.ordersByMarket.forEach((clientIds, marketId) => {
      ordersByMarket.set(marketId, clientIds.size);
    });

    return {
      totalOrders: this.activeOrders.size,
      ordersByMarket,
    };
  }

  /**
   * Clear all local order tracking.
   */
  clearOrderTracking(): void {
    this.activeOrders.clear();
    this.ordersByMarket.clear();
  }
}
