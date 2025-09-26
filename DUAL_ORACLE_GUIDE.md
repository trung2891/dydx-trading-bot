# Dual Oracle Provider Guide

The MM module now supports both **Binance Futures** and **CoinGecko** as oracle providers, giving you flexibility to choose the best price source for your market making strategy.

## Oracle Provider Options

### 🚀 Binance Futures Oracle

- **Type**: Real-time futures market data
- **Advantages**:
  - Lower latency (~50-200ms)
  - Higher rate limits (1200 req/min)
  - Futures prices often lead spot markets
  - Direct exchange API access
- **Best for**: High-frequency strategies, aggressive trading

### 📊 CoinGecko Oracle

- **Type**: Aggregated spot price data
- **Advantages**:
  - Aggregated from multiple exchanges
  - Stable, less volatile pricing
  - Good for conservative strategies
  - Free tier available
- **Best for**: Conservative strategies, backup oracle

## Configuration

### Basic Oracle Configuration

```typescript
import { MarketMakerConfig } from "./types";

const config: MarketMakerConfig = {
  // ... other config
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.5, // 0.5% difference threshold
    provider: "binance", // or "coingecko"
  },
};
```

### Fallback Configuration

```typescript
const hybridConfig: MarketMakerConfig = {
  // ... other config
  orderConfig: {
    // ... other orderConfig
    // Primary fallback (Binance)
    useBinanceFallback: true,
    binanceSpread: 0.1,
    // Secondary fallback (CoinGecko)
    useCoinGeckoFallback: true,
    coinGeckoSpread: 0.15,
  },
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.6,
    provider: "binance", // Primary oracle
  },
};
```

## Configuration Examples

### Binance Oracle Strategy

```typescript
import { binanceOracleConfig } from "./config-examples";

const bot = new MarketMakerBot(binanceOracleConfig);
```

### CoinGecko Oracle Strategy

```typescript
import { coinGeckoOracleConfig } from "./config-examples";

const bot = new MarketMakerBot(coinGeckoOracleConfig);
```

### Hybrid Configuration

```typescript
import { hybridConfig } from "./config-examples";

const bot = new MarketMakerBot(hybridConfig);
```

## Environment Variables

Set oracle provider via environment variables:

```bash
# Use Binance as oracle
ORACLE_STRATEGY_ENABLED=true
ORACLE_PROVIDER=binance
ORACLE_PRICE_THRESHOLD=0.5

# Use CoinGecko as oracle
ORACLE_STRATEGY_ENABLED=true
ORACLE_PROVIDER=coingecko
ORACLE_PRICE_THRESHOLD=0.4
```

## Performance Comparison

| Provider  | Avg Latency | Rate Limit | Data Type       | Best Use Case              |
| --------- | ----------- | ---------- | --------------- | -------------------------- |
| Binance   | ~100ms      | 1200/min   | Futures         | High-frequency, aggressive |
| CoinGecko | ~300ms      | 30/min     | Spot aggregated | Conservative, backup       |

## Usage Examples

### 1. Quick Start with Binance Oracle

```typescript
import { MarketMakerBot } from "./market-maker-bot";

const config = {
  marketId: "BTC-USD",
  spread: 0.1,
  // ... other config
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.5,
    provider: "binance",
  },
};

const bot = new MarketMakerBot(config);
await bot.initialize();
await bot.start();
```

### 2. Conservative Strategy with CoinGecko

```typescript
const conservativeConfig = {
  marketId: "ETH-USD",
  spread: 0.15,
  // ... other config
  oracleStrategy: {
    enabled: true,
    oraclePriceThreshold: 0.3, // Lower threshold
    provider: "coingecko",
  },
};
```

### 3. Dual Fallback System

```typescript
const robustConfig = {
  marketId: "SOL-USD",
  // ... other config
  orderConfig: {
    useBinanceFallback: true, // Primary fallback
    useCoinGeckoFallback: true, // Secondary fallback
  },
  oracleStrategy: {
    enabled: true,
    provider: "binance", // Primary oracle
    oraclePriceThreshold: 0.6,
  },
};
```

## Testing

Run the comprehensive test suite:

```bash
# Test both oracle providers
npx ts-node scripts/test-dual-oracle.ts

# Test specific provider
npx ts-node scripts/test-binance-oracle.ts
```

## Migration Guide

### From Binance-only to Dual Oracle

1. **Update configuration**:

   ```typescript
   // Before
   oracleStrategy: {
     enabled: true,
     oraclePriceThreshold: 0.5,
   }

   // After
   oracleStrategy: {
     enabled: true,
     oraclePriceThreshold: 0.5,
     provider: "binance", // Explicitly set provider
   }
   ```

2. **Add fallback options** (optional):

   ```typescript
   orderConfig: {
     // ... existing config
     useCoinGeckoFallback: true,
     coinGeckoSpread: 0.15,
   }
   ```

3. **Test configuration**:
   ```bash
   npx ts-node scripts/test-dual-oracle.ts
   ```

## Best Practices

### 🎯 **Strategy Selection**

- **Aggressive/HFT**: Use Binance futures oracle
- **Conservative**: Use CoinGecko oracle
- **Robust**: Use Binance primary + CoinGecko fallback

### ⚡ **Performance Optimization**

- Enable caching (automatically enabled)
- Set appropriate thresholds based on market volatility
- Use Binance for time-sensitive strategies

### 🛡️ **Risk Management**

- Always configure fallback providers
- Monitor oracle price differences
- Set reasonable threshold values (0.3-1.0%)

### 🔧 **Configuration Tips**

- Lower thresholds = more oracle triggers
- Higher thresholds = less frequent oracle usage
- Test with paper trading first

## Troubleshooting

### Common Issues

1. **Oracle not triggering**

   - Check threshold configuration
   - Verify oracle provider is working
   - Monitor price differences

2. **High latency**

   - Switch to Binance oracle for lower latency
   - Check network connection
   - Verify API rate limits

3. **Price discrepancies**
   - Normal between futures (Binance) and spot (CoinGecko)
   - Monitor differences for unusual spikes
   - Adjust thresholds accordingly

### Debug Commands

```bash
# Test oracle connectivity
npx ts-node -e "
import { BinancePriceService, CoinGeckoService } from './src/mm';
const binance = new BinancePriceService();
const coingecko = new CoinGeckoService();
Promise.all([
  binance.getPrice('BTC-USD'),
  coingecko.getPrice('BTC-USD')
]).then(console.log);
"
```

## Support

- 📚 See `ORACLE_STRATEGY.md` for detailed oracle strategy documentation
- 🔧 Check `config-examples.ts` for more configuration examples
- 🧪 Run `test-dual-oracle.ts` for comprehensive testing
- 📊 Use `oracle-example.ts` for live examples
