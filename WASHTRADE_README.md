# Wash Trading Bot

A simple wash trading bot for generating artificial volume on dYdX perpetual markets.

## ⚠️ Important Disclaimer

**This bot is for educational and testing purposes only. Wash trading may be illegal in your jurisdiction and could violate exchange terms of service. Use at your own risk and ensure compliance with all applicable laws and regulations.**

## Features

- **Volume Generation**: Generate artificial trading volume with configurable targets
- **Market Orders**: Uses market orders for immediate execution and guaranteed fills
- **Multiple Strategies**: Support for constant, random, and burst volume patterns
- **Risk Management**: Built-in position limits and risk controls
- **Multiple Markets**: Support for BTC-USD, ETH-USD, SOL-USD and other perpetual markets
- **Configurable Parameters**: Flexible configuration for different trading scenarios

## Quick Start

### 1. Environment Setup

Create a `.env` file with your dYdX wallet mnemonic:

```bash
DYDX_TEST_MNEMONIC=your_wallet_mnemonic_here
```

### 2. Run with Predefined Configuration

```bash
# Run with moderate configuration
npm run wash-trade -- --config=moderate

# Run with aggressive configuration
npm run wash-trade -- --config=aggressive

# Run with specific market
npm run wash-trade -- --config=conservative --market=ETH-USD
```

### 3. Available Configurations

- **conservative**: Low volume, wide spreads, safe parameters
- **moderate**: Balanced settings for regular volume generation
- **aggressive**: High volume, tight spreads, fast execution
- **eth**: Optimized for ETH-USD market
- **sol**: Optimized for SOL-USD market
- **test**: Very low volume for testing purposes

## Configuration

### Basic Configuration

```typescript
const config: WashTradeConfig = {
  marketId: "BTC-USD",
  volumeTarget: 2000, // $2000 per hour
  orderSize: 0.002, // 0.002 BTC per order
  spread: 0.1, // 0.1% spread
  minInterval: 3000, // 3 seconds minimum between trades
  maxInterval: 8000, // 8 seconds maximum between trades
  priceVariation: 0.05, // 0.05% price variation
  // ... other settings
};
```

### Volume Strategies

1. **CONSTANT**: Steady volume generation with regular intervals
2. **RANDOM**: Variable volume with random timing
3. **BURST**: High volume bursts followed by quiet periods

### Risk Parameters

- `maxPositionSize`: Maximum position size allowed
- `stopLoss`: Stop loss percentage
- `maxDrawdown`: Maximum drawdown percentage

## Usage Examples

### Basic Usage

```typescript
import { WashTradeBot, moderateWashTradeConfig } from "./src/washtrade";

const bot = new WashTradeBot(
  compositeClient,
  subaccount,
  moderateWashTradeConfig
);
await bot.start();
```

### Custom Configuration

```typescript
import { WashTradeBot, WashTradeConfig } from "./src/washtrade";

const customConfig: WashTradeConfig = {
  marketId: "ETH-USD",
  volumeTarget: 5000,
  orderSize: 0.1,
  spread: 0.15,
  minInterval: 2000,
  maxInterval: 6000,
  priceVariation: 0.08,
  orderConfig: {
    goodTilBlocks: 8,
    batchSize: 1,
    batchDelay: 100,
    roundPrice: 2,
    roundSize: 3,
  },
  riskParameters: {
    maxPositionSize: 1,
    stopLoss: 0.75,
    maxDrawdown: 1.5,
  },
  volumeStrategy: {
    type: "RANDOM",
  },
};

const bot = new WashTradeBot(compositeClient, subaccount, customConfig);
await bot.start();
```

### Configuration Switching

```typescript
// Start with conservative config
let config = getWashTradeConfig("conservative");
const bot = new WashTradeBot(compositeClient, subaccount, config);
await bot.start();

// Switch to moderate config after 2 minutes
setTimeout(() => {
  const moderateConfig = getWashTradeConfig("moderate");
  bot.updateConfig(moderateConfig);
}, 2 * 60 * 1000);
```

## Monitoring

The bot provides real-time statistics:

```
📊 Wash Trade Stats [2024-01-15T10:30:00.000Z]
   Total Trades: 45
   Total Volume: 0.0900 BTC
   Total Volume USD: $3,600.00
   Current Position: 0.0000
   Trades/Hour: 90.0
   Volume/Hour: $7,200.00
   Uptime: 30.0 minutes
```

## Safety Features

- **Position Limits**: Automatic position size monitoring
- **Risk Controls**: Stop loss and drawdown protection
- **Market Orders**: Immediate execution with guaranteed fills
- **Order Expiration**: Short-term market orders with automatic expiration
- **Graceful Shutdown**: Clean shutdown with order cancellation

## Scripts

### Run Wash Trade Bot

```bash
# Basic usage
npm run wash-trade

# With specific configuration
npm run wash-trade -- --config=aggressive

# With specific market
npm run wash-trade -- --config=moderate --market=SOL-USD
```

### Available Scripts

- `npm run wash-trade`: Run the wash trading bot
- `npm run build`: Build the project
- `npm run dev`: Run in development mode

## File Structure

```
src/washtrade/
├── index.ts              # Main exports
├── types.ts              # Type definitions
├── wash-trade-bot.ts     # Main bot implementation
├── config-examples.ts    # Predefined configurations
└── example.ts            # Usage examples

scripts/
└── run-wash-trade.ts     # Command line script
```

## API Reference

### WashTradeBot

Main class for wash trading operations.

#### Methods

- `start()`: Start the wash trading bot
- `stop()`: Stop the bot and cancel all orders
- `getStats()`: Get current trading statistics
- `getState()`: Get current bot state
- `updateConfig(config)`: Update bot configuration

### WashTradeConfig

Configuration interface for the wash trading bot.

### WashTradeStats

Statistics interface containing trading metrics.

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure `DYDX_TEST_MNEMONIC` is set
2. **Network Connection**: Check internet connectivity
3. **Insufficient Balance**: Ensure sufficient account balance
4. **Market Availability**: Verify market is available and active

### Error Messages

- `❌ DYDX_TEST_MNEMONIC environment variable is required`: Set your wallet mnemonic
- `❌ Failed to get market price`: Check market availability
- `❌ Invalid price or size`: Adjust configuration parameters

## Legal Notice

This software is provided for educational purposes only. Users are responsible for ensuring compliance with all applicable laws and regulations in their jurisdiction. Wash trading may be illegal and could result in severe penalties.

## Support

For issues and questions, please refer to the main project documentation or create an issue in the repository.
