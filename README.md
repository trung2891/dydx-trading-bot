# dYdX Market Maker Bot

A sophisticated TypeScript-based market maker bot for dYdX v4 protocol. This bot automatically places and manages orders around the mid price to provide liquidity and capture spreads.

## Features

- 🎯 **Multi-Order Placement**: Places multiple long-term orders at different price levels around mid price
- 📊 **Real-time Market Data**: Fetches live market data and orderbook information
- 🔄 **Order Management**: Automatically refreshes orders based on market conditions
- 💰 **Position Tracking**: Monitors positions, PnL, and balances
- ⚡ **Risk Management**: Built-in risk controls including position limits and drawdown protection
- 🛡️ **Error Handling**: Comprehensive error handling with emergency stop functionality
- 📈 **Statistics**: Tracks performance metrics and trading statistics
- 🏗️ **Long-term Orders**: Uses dYdX long-term (stateful) orders for better market making performance

## Project Structure

```
src/
├── mm/                          # Market maker bot implementation
│   ├── market-maker-bot.ts     # Main bot class
│   ├── market-data.ts          # Market data and orderbook management
│   ├── order-manager.ts        # Order placement and management
│   ├── position-manager.ts     # Position and balance tracking
│   ├── types.ts               # TypeScript interfaces and types
│   ├── utils.ts               # Utility functions
│   ├── example.ts             # Usage examples
│   └── index.ts               # Module exports
├── sample/                      # Original dYdX sample scripts
└── index.ts                    # Main entry point
```

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
DYDX_TEST_MNEMONIC=your_wallet_mnemonic_phrase_here
```

### 3. Run the Bot

```bash
# Run the basic market maker
yarn dev

# Run examples with different configurations
yarn example single    # Single market (BTC-USD)
yarn example multi     # Multiple markets
yarn example dynamic   # Dynamic configuration
```

## Configuration

The bot supports both **short-term** and **long-term** order types, each with different characteristics and use cases.

### Order Type Configuration

```typescript
import { MarketMakerConfig, OrderType } from "./mm";

// Long-term orders (recommended for market making)
const longTermConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.1, // 0.1% spread
  orderSize: 0.001, // 0.001 BTC per order
  maxOrders: 3, // 3 orders per side
  priceSteps: 3, // 3 price levels
  refreshInterval: 60000, // Refresh every 1 minute
  maxPositionSize: 0.005, // Maximum 0.005 BTC position
  orderType: OrderType.LONG_TERM, // Use long-term orders
  orderConfig: {
    goodTilTimeSeconds: 300, // 5 minutes validity
    batchSize: 5, // Place 5 orders per batch
    batchDelay: 100, // 100ms delay between batches
  },
  riskParameters: {
    maxDrawdown: 5, // 5% maximum drawdown
    stopLoss: 2, // 2% stop loss
    takeProfitRatio: 1.5, // 1.5:1 risk/reward ratio
  },
};

// Short-term orders (for high-frequency trading)
const shortTermConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.05, // 0.05% spread (tighter)
  orderSize: 0.01, // 0.01 ETH per order
  maxOrders: 5, // 5 orders per side
  priceSteps: 5, // 5 price levels
  refreshInterval: 10000, // Refresh every 10 seconds
  maxPositionSize: 0.1, // Maximum 0.1 ETH position
  orderType: OrderType.SHORT_TERM, // Use short-term orders
  orderConfig: {
    goodTilBlocks: 20, // 20 blocks validity (~2 minutes)
    batchSize: 20, // Place 20 orders per batch
    batchDelay: 50, // 50ms delay between batches
  },
  riskParameters: {
    maxDrawdown: 3, // 3% maximum drawdown
    stopLoss: 1, // 1% stop loss
    takeProfitRatio: 2, // 2:1 risk/reward ratio
  },
};
```

### Configuration Parameters

| Parameter                        | Type      | Description                                      |
| -------------------------------- | --------- | ------------------------------------------------ |
| `marketId`                       | string    | Trading pair (e.g., "BTC-USD", "ETH-USD")        |
| `spread`                         | number    | Spread percentage around mid-price               |
| `orderSize`                      | number    | Size of each order                               |
| `maxOrders`                      | number    | Maximum orders per side                          |
| `priceSteps`                     | number    | Number of price levels                           |
| `refreshInterval`                | number    | Milliseconds between order refreshes             |
| `maxPositionSize`                | number    | Maximum position size allowed                    |
| `orderType`                      | OrderType | SHORT_TERM or LONG_TERM                          |
| `orderConfig.goodTilTimeSeconds` | number    | Validity time for long-term orders (seconds)     |
| `orderConfig.goodTilBlocks`      | number    | Validity blocks for short-term orders            |
| `orderConfig.batchSize`          | number    | Orders per batch (1 = sequential, >1 = parallel) |
| `orderConfig.batchDelay`         | number    | Milliseconds delay between batches               |
| `riskParameters`                 | object    | Risk management settings                         |

## Usage Examples

### Basic Usage

```typescript
import { MarketMakerBot, MarketMakerConfig } from "./mm";

const config: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.08,
  orderSize: 0.01,
  maxOrders: 5,
  priceSteps: 5,
  refreshInterval: 20000,
  maxPositionSize: 0.1,
  riskParameters: {
    maxDrawdown: 3,
    stopLoss: 1.5,
    takeProfitRatio: 2,
  },
};

const bot = new MarketMakerBot(config);
await bot.start();
```

### Advanced Usage with Multiple Markets

```typescript
// Create multiple bot instances for different markets
const btcBot = new MarketMakerBot(btcConfig);
const ethBot = new MarketMakerBot(ethConfig);

// Start both bots concurrently
await Promise.all([btcBot.start(), ethBot.start()]);
```

## API Reference

### MarketMakerBot

Main bot class that orchestrates all market making operations.

#### Methods

- `initialize()`: Initialize the bot with wallet and clients
- `start()`: Start market making operations
- `stop()`: Stop the bot gracefully
- `pause()`: Pause operations
- `resume()`: Resume operations
- `updateConfig(config)`: Update bot configuration
- `getState()`: Get current bot state
- `getStats()`: Get performance statistics

### MarketDataManager

Manages market data fetching and caching.

#### Methods

- `getMarketData(marketId)`: Get current market data
- `getOrderBook(marketId)`: Get orderbook data
- `getMultipleMarketData(marketIds)`: Get data for multiple markets
- `clearCache()`: Clear cached data

### OrderManager

Handles order placement, management, and cancellation.

#### Methods

- `placeOrdersAroundMidPrice(marketId, midPrice, config)`: Place orders around mid price
- `cancelAllOrdersForMarket(marketId)`: Cancel all orders for a market
- `fetchCurrentOrders(marketId?)`: Fetch current open orders
- `getActiveOrders(marketId?)`: Get locally tracked orders
- `syncOrdersWithExchange(marketId?)`: Sync local tracking with exchange

### PositionManager

Manages positions, balances, and portfolio tracking.

#### Methods

- `fetchPositions()`: Fetch all current positions
- `getPosition(marketId)`: Get position for specific market
- `fetchBalances()`: Fetch account balances
- `calculatePortfolioValue()`: Calculate total portfolio value
- `getTotalUnrealizedPnL()`: Get total unrealized PnL
- `getPositionSummary()`: Get formatted position summary

## Risk Management

The bot includes several risk management features:

- **Position Limits**: Maximum position size per market
- **Drawdown Protection**: Stops trading if losses exceed threshold
- **Balance Checks**: Ensures sufficient collateral before placing orders
- **Market Condition Checks**: Pauses during extreme volatility
- **Emergency Stop**: Automatic shutdown on critical errors

## Sample Scripts

The `src/sample/` directory contains example scripts from dYdX:

```bash
# View account information
yarn sample:account

# Get current orders
yarn sample:orders

# Place short-term orders
yarn sample:short-term
```

## Development

### Building

```bash
yarn build
```

### Running in Production

```bash
yarn build
yarn start
```

### TypeScript Configuration

The project uses TypeScript with strict mode enabled. Configuration is in `tsconfig.json`.

## Order Types: Long-term vs Short-term

The bot now supports both order types, allowing you to choose the best strategy for your use case:

### Long-term Orders (Recommended for Market Making)

✅ **Advantages:**

- Longer validity period (GTT - Good Till Time, configurable seconds)
- Better for market making strategies
- More stable order book presence
- Less frequent order refreshing needed

⚠️ **Considerations:**

- Sequence number validation (orders can be dropped if received out of order)
- Worse time priority (matched after being included in a block)
- More restrictive rate limits (max 2 per block / 20 per 100 blocks)
- Can only be canceled after being included in a block
- Individual cancellation required (slower for bulk cancellations)

### Short-term Orders (Better for High-Frequency Trading)

✅ **Advantages:**

- Faster execution and better time priority
- Higher rate limits (better for frequent trading)
- Batch cancellation support (faster bulk operations)
- Immediate cancellation possible

⚠️ **Considerations:**

- Expire quickly (good for high-frequency trading but requires frequent refreshing)
- Use block-based expiration (goodTilBlock)
- Less suitable for long-term market making due to quick expiration

### Choosing the Right Order Type

| Use Case               | Recommended Order Type | Reason                                            |
| ---------------------- | ---------------------- | ------------------------------------------------- |
| Market Making          | LONG_TERM              | Stable liquidity provision, less frequent updates |
| High-Frequency Trading | SHORT_TERM             | Fast execution, frequent order updates            |
| Scalping               | SHORT_TERM             | Quick in/out, better time priority                |
| Conservative Trading   | LONG_TERM              | Longer-term positions, stable strategy            |

### Batch Order Placement

The bot supports batch order placement to improve performance when placing multiple orders:

```typescript
const config: MarketMakerConfig = {
  // ... other settings
  orderConfig: {
    batchSize: 20, // Place 20 orders in parallel per batch
    batchDelay: 200, // Wait 200ms between batches
    // ... other order config
  },
};
```

**Batch Configuration:**

- `batchSize: 1` - Sequential order placement (default, safest)
- `batchSize: >1` - Parallel order placement within batches
- `batchDelay` - Delay between batches to avoid rate limiting

**Benefits:**

- ✅ Faster order placement for large order counts
- ✅ Reduced total execution time
- ✅ Better for high-frequency strategies
- ⚠️ May hit rate limits if batch size is too large
- ⚠️ Some orders may fail in parallel execution

**Recommended Batch Sizes:**

- Long-term orders: 5-10 (rate limited)
- Short-term orders: 10-20 (higher rate limits)

## Important Notes

⚠️ **Risk Warning**: This is a trading bot that can lose money. Always test thoroughly with small amounts first.

⚠️ **Network Configuration**: The bot uses mainnet by default. For testnet, update the network configuration in `market-maker-bot.ts`.

⚠️ **API Limits**: Be aware of dYdX API rate limits and long-term order placement restrictions (max 2 per block).

## Troubleshooting

### Common Issues

1. **"DYDX_TEST_MNEMONIC not found"**: Make sure you have a `.env` file with your wallet mnemonic
2. **Network connection errors**: Check if the dYdX endpoints are accessible
3. **Insufficient balance**: Ensure your wallet has enough USDC for trading
4. **Order placement failures**: Check if the market is active and you have sufficient collateral

### Logging

The bot provides detailed logging:

- ✅ Success operations (green checkmark)
- ⚠️ Warnings (yellow warning)
- ❌ Errors (red X)
- 📊 Status updates (chart emoji)
- 🎯 Important events (target emoji)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This software is provided for educational purposes only. Trading cryptocurrencies involves substantial risk of loss. Use at your own risk.
