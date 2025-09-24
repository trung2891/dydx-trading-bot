# Oracle-Based Market Making Strategy (Simplified)

## Overview

The Oracle-based Market Making Strategy is an advanced trading strategy that uses CoinGecko as an external price oracle to make informed trading decisions. When the current market price differs significantly from the oracle price, the strategy switches to oracle-based order placement to capitalize on price discrepancies.

## How It Works

### 1. Price Comparison

- The bot continuously compares the current market price with the CoinGecko oracle price
- It calculates the percentage difference between the two prices
- When the difference exceeds a configured threshold, the oracle strategy is triggered

### 2. Strategy Activation

- **Standard Mode**: Normal market making around current market price
- **Oracle Mode**: When price difference > threshold, switch to oracle-based orders
- Uses oracle price as the primary reference when triggered

### 3. Order Placement

- Oracle-based orders are placed around the oracle price using the same configuration parameters as the main strategy
- Uses the same spread, order size, price levels, and other parameters from the main configuration
- Orders are placed using the same order types (short-term or long-term) as configured

## Configuration

### Oracle Strategy Parameters

```typescript
oracleStrategy: {
  enabled: boolean; // Enable/disable oracle strategy
  oraclePriceThreshold: number; // Price difference threshold (e.g., 0.5 for 0.5%)
}
```

**Note**: All other parameters (spread, order size, max orders, price steps, etc.) are inherited from the main configuration. When oracle strategy is triggered, it uses the oracle price as the primary price but applies the same spread, order size, and other parameters as configured in the main strategy.

### Example Configurations

#### Standard Oracle Strategy

```typescript
const oracleStrategyConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.1, // Standard spread for normal market making
  orderSize: 0.001,
  maxOrders: 5,
  priceSteps: 5,
  refreshInterval: 30000,
  orderType: OrderType.LONG_TERM,
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.5, // Trigger at 0.5% difference
  },
};
```

#### Conservative Oracle Strategy

```typescript
const conservativeOracleConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  spread: 0.15,
  orderSize: 0.005,
  maxOrders: 3,
  priceSteps: 3,
  refreshInterval: 60000,
  orderType: OrderType.LONG_TERM,
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.3, // Lower threshold (0.3%)
  },
};
```

#### Aggressive Oracle Strategy

```typescript
const aggressiveOracleConfig: MarketMakerConfig = {
  marketId: "SOL-USD",
  spread: 0.08,
  orderSize: 0.1,
  maxOrders: 7,
  priceSteps: 7,
  refreshInterval: 15000,
  orderType: OrderType.SHORT_TERM,
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 1.0, // Higher threshold (1.0%)
  },
};
```

## Environment Variables

You can configure the oracle strategy using environment variables:

```bash
# Enable oracle strategy
ORACLE_STRATEGY_ENABLED=true

# Oracle strategy parameters
ORACLE_PRICE_THRESHOLD=0.5
```

## Usage Examples

### Basic Usage

```typescript
import { MarketMakerBot } from "./market-maker-bot";
import { oracleStrategyConfig } from "./config-examples";

const bot = new MarketMakerBot(oracleStrategyConfig);
await bot.initialize();
await bot.start();
```

### Custom Configuration

```typescript
const customConfig: MarketMakerConfig = {
  marketId: "BTC-USD",
  spread: 0.1,
  orderSize: 0.001,
  maxOrders: 5,
  refreshInterval: 30000,
  orderType: OrderType.LONG_TERM,
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.7, // Custom threshold
  },
};

const bot = new MarketMakerBot(customConfig);
```

## Strategy Behavior

### Normal Market Making

- When price difference < threshold: Standard market making around current price
- Uses configured spread, order size, and price levels
- Regular order refresh cycle

### Oracle Strategy Activation

- When price difference ≥ threshold: Oracle strategy is triggered
- Logs detailed oracle analysis including:
  - Current market price
  - Oracle price from CoinGecko
  - Price difference percentage
  - Strategy decision

### Oracle Order Placement

- Places orders around oracle price using the same configuration as main strategy
- Uses the same spread, order size, price levels, and step size
- Supports both sequential and batch order placement
- Maintains same order type (short-term/long-term) as configured

## Monitoring and Logging

The bot provides comprehensive logging for oracle strategy:

```
🔍 Oracle Analysis for BTC-USD:
   Current Price: $43250.50
   Oracle Price: $43000.00
   Difference: 0.580%
   Threshold: 0.500%

🚨 Price difference 0.580% exceeds threshold 0.500% - Using Oracle Strategy

📊 Using Oracle price as primary: $43000.00

📦 Placing 10 oracle-based orders around $43000.00
✅ Oracle Strategy: Placed 10/10 orders for BTC-USD
```

### Status Monitoring

The bot status includes oracle strategy information:

```
🔮 Oracle Strategy Status:
   Enabled: true
   Threshold: 0.5%
   Current Difference: 0.234%
   Oracle Price: $43000.00
   Strategy Active: NO
```

## Key Benefits of Simplified Configuration

1. **Easier Configuration**: Only need to set `enabled` and `oraclePriceThreshold`
2. **Consistent Behavior**: Uses same parameters as main strategy for predictable behavior
3. **Less Complexity**: No need to manage separate oracle-specific parameters
4. **Unified Management**: All order parameters managed in one place

## Best Practices

### 1. Threshold Selection

- **Conservative**: 0.3-0.5% for stable markets
- **Standard**: 0.5-0.8% for normal volatility
- **Aggressive**: 0.8-1.5% for high volatility markets

### 2. Main Strategy Configuration

- Configure your main strategy parameters (spread, order size, etc.) as you normally would
- These same parameters will be used when oracle strategy is triggered
- Consider using slightly larger order sizes or tighter spreads for better oracle performance

### 3. Monitoring

- Monitor oracle price accuracy
- Track strategy activation frequency
- Analyze performance vs standard strategy
- Adjust threshold based on market conditions

## Supported Markets

The oracle strategy supports all markets with CoinGecko price data:

- **Major Cryptocurrencies**: BTC, ETH, SOL, AVAX, MATIC, etc.
- **DeFi Tokens**: UNI, AAVE, COMP, CRV, etc.
- **Layer 2 Tokens**: ARB, OP, STRK, etc.
- **Meme Coins**: PEPE, DOGE, SHIB, etc.

See `coingecko-service.ts` for the complete list of supported markets.

## Troubleshooting

### Common Issues

1. **Oracle Price Not Available**

   - Check internet connection
   - Verify CoinGecko API status
   - Check market ID mapping

2. **Strategy Not Triggering**

   - Verify threshold configuration
   - Check price difference calculations
   - Ensure oracle strategy is enabled

3. **Orders Not Placing**
   - Check order size limits
   - Verify price validation
   - Check account balance

## Performance Considerations

- **API Rate Limits**: CoinGecko has rate limits (30 requests/minute for free tier)
- **Caching**: Oracle prices are cached for 30 seconds to reduce API calls
- **Batch Processing**: Oracle orders support batch placement for efficiency
- **Error Recovery**: Graceful fallback to standard strategy on errors

## Migration from Complex Configuration

If you were using the previous complex oracle configuration, here's how to migrate:

### Before (Complex)

```typescript
oracleStrategy: {
  enabled: true,
  oraclePriceThreshold: 0.5,
  oracleSpread: 0.15,
  oracleOrderSize: 0.002,
  maxOracleOrders: 3,
  oraclePriceSteps: 3,
  oracleStepSize: 0.05,
  useOracleAsPrimary: true,
}
```

### After (Simplified)

```typescript
oracleStrategy: {
  enabled: true,
  oraclePriceThreshold: 0.5,
}
```

The simplified version will use your main strategy's `spread`, `orderSize`, `maxOrders`, `priceSteps`, and `stepSize` parameters automatically.
