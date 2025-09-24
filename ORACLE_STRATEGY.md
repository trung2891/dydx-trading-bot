# Oracle-Based Market Making Strategy

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
- The bot can use either the oracle price or current price as the primary reference

### 3. Order Placement

- Oracle-based orders are placed around the oracle price with a configurable spread
- Different order sizes and price levels can be configured for oracle orders
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
  spread: 0.1,
  orderSize: 0.001,
  maxOrders: 5,
  refreshInterval: 30000,
  orderType: OrderType.LONG_TERM,
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.5, // Trigger at 0.5% difference
    oracleSpread: 0.15, // 0.15% spread around oracle price
    oracleOrderSize: 0.002, // Larger orders for oracle strategy
    maxOracleOrders: 3, // 3 orders per side
    oraclePriceSteps: 3, // 3 price levels
    oracleStepSize: 0.05, // 0.05% step size
    useOracleAsPrimary: true, // Use oracle price as primary
  },
};
```

#### Conservative Oracle Strategy

```typescript
const conservativeOracleConfig: MarketMakerConfig = {
  marketId: "ETH-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.3, // Lower threshold (0.3%)
    oracleSpread: 0.2, // Wider spread
    oracleOrderSize: 0.01, // Smaller orders
    maxOracleOrders: 2, // Fewer orders
    oraclePriceSteps: 2, // 2 price levels
    oracleStepSize: 0.1, // Larger step size
    useOracleAsPrimary: false, // Use current price as primary
  },
};
```

#### Aggressive Oracle Strategy

```typescript
const aggressiveOracleConfig: MarketMakerConfig = {
  marketId: "SOL-USD",
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 1.0, // Higher threshold (1.0%)
    oracleSpread: 0.1, // Tighter spread
    oracleOrderSize: 0.2, // Larger orders
    maxOracleOrders: 5, // More orders
    oraclePriceSteps: 5, // 5 price levels
    oracleStepSize: 0.02, // Smaller step size
    useOracleAsPrimary: true, // Use oracle price as primary
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
ORACLE_SPREAD=0.15
ORACLE_ORDER_SIZE=0.002
MAX_ORACLE_ORDERS=3
ORACLE_PRICE_STEPS=3
ORACLE_STEP_SIZE=0.05
USE_ORACLE_AS_PRIMARY=true
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
    oracleSpread: 0.18, // Custom spread
    oracleOrderSize: 0.0015, // Custom order size
    maxOracleOrders: 3, // Custom max orders
    oraclePriceSteps: 3, // Custom price steps
    oracleStepSize: 0.06, // Custom step size
    useOracleAsPrimary: true, // Use oracle as primary
  },
};

const bot = new MarketMakerBot(customConfig);
```

### Running the Example

```bash
# Run the oracle strategy example
npm run build
node dist/mm/oracle-example.js
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

- Places orders around oracle price (or current price if `useOracleAsPrimary: false`)
- Uses oracle-specific configuration (spread, order size, price levels)
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

📦 Placing 6 oracle-based orders around $43000.00
✅ Oracle Strategy: Placed 6/6 orders for BTC-USD
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

## Risk Management

The oracle strategy includes several risk management features:

1. **Price Validation**: Validates oracle prices before use
2. **Threshold Control**: Configurable price difference thresholds
3. **Order Size Limits**: Separate order size limits for oracle orders
4. **Position Limits**: Respects maximum position size limits
5. **Error Handling**: Graceful fallback to standard strategy on errors

## Best Practices

### 1. Threshold Selection

- **Conservative**: 0.3-0.5% for stable markets
- **Standard**: 0.5-0.8% for normal volatility
- **Aggressive**: 0.8-1.5% for high volatility markets

### 2. Spread Configuration

- **Tight Spreads**: 0.1-0.15% for liquid markets
- **Wide Spreads**: 0.15-0.25% for less liquid markets
- **Dynamic**: Adjust based on market conditions

### 3. Order Sizing

- **Conservative**: Smaller oracle orders (1.5-2x standard size)
- **Aggressive**: Larger oracle orders (2-3x standard size)
- **Risk-Adjusted**: Based on position limits and risk tolerance

### 4. Monitoring

- Monitor oracle price accuracy
- Track strategy activation frequency
- Analyze performance vs standard strategy
- Adjust parameters based on market conditions

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

### Debug Mode

Enable detailed logging by setting log level to debug in your configuration.

## Performance Considerations

- **API Rate Limits**: CoinGecko has rate limits (30 requests/minute for free tier)
- **Caching**: Oracle prices are cached for 30 seconds to reduce API calls
- **Batch Processing**: Oracle orders support batch placement for efficiency
- **Error Recovery**: Graceful fallback to standard strategy on errors

## Future Enhancements

Potential improvements to the oracle strategy:

1. **Multiple Oracles**: Support for multiple price oracles
2. **Weighted Averages**: Combine multiple oracle prices
3. **Dynamic Thresholds**: Adjust thresholds based on volatility
4. **Machine Learning**: Learn optimal parameters from historical data
5. **Cross-Exchange**: Compare prices across multiple exchanges
