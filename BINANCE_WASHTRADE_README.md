# Binance-Based Wash Trading Strategy

This document describes the updated wash trading strategy that uses Binance futures prices as the primary price source for wash trading on dYdX.

## Overview

The wash trading bot has been enhanced to use Binance futures prices as the base for all wash trades, providing more accurate and real-time price data compared to relying solely on local orderbook data.

## Key Features

### 🎯 Binance Futures Price Integration

- **Primary Source**: Binance futures prices via CCXT
- **Real-time Data**: Live price feeds from Binance futures markets
- **Multiple Fallbacks**: Robust fallback system ensures continuous operation

### 📊 Price Source Hierarchy

1. **Binance Futures Price** (Primary)

   - Direct ticker price from Binance futures
   - Most accurate and up-to-date pricing

2. **Binance Futures Mid Price** (Secondary)

   - Calculated from Binance orderbook (bid + ask) / 2
   - Used when direct ticker is unavailable

3. **Local Orderbook Mid Price** (Tertiary)

   - dYdX local orderbook mid price
   - Fallback when Binance is unavailable

4. **CoinGecko Price** (Final Fallback)
   - External price feed as last resort
   - Ensures bot continues operating

### 🔄 Enhanced Wash Trading

- **Market Orders**: Uses market orders for immediate execution
- **Binance-Based Pricing**: All trades reference Binance futures prices
- **Transparent Logging**: Clear indication of price source used
- **Error Handling**: Graceful degradation through fallback chain

## Configuration

### Binance Price Service

```typescript
const binanceService = new BinancePriceService({
  apiKey: "your-api-key", // Optional: for higher rate limits
  secret: "your-secret", // Optional: for higher rate limits
  sandbox: false, // Use production Binance
  timeout: 10000, // 10 second timeout
});
```

### Wash Trade Configurations

All existing configurations work with the new Binance-based strategy:

- `conservative`: Low volume, wide spreads
- `moderate`: Medium volume, balanced settings
- `aggressive`: High volume, tight spreads
- `eth`: Optimized for ETH-USD
- `sol`: Optimized for SOL-USD
- `test`: Very low volume for testing

## Usage

### 1. Test Binance Connection

```bash
npm run test-binance
```

This will test:

- Binance connection
- Price fetching for BTC, ETH, SOL
- Orderbook data retrieval
- Multiple symbol price fetching

### 2. Run Wash Trading

```bash
npm run wash-trade
```

The bot will:

1. Test Binance connection on startup
2. Use Binance futures prices for all trades
3. Log price source for each trade
4. Fall back gracefully if Binance is unavailable

### 3. Monitor Logs

Look for these log messages:

- `🎯 Using Binance futures price: $XX.XX`
- `🎯 Using Binance futures mid price: $XX.XX`
- `🎯 Using local orderbook mid price: $XX.XX`
- `🎯 Using CoinGecko fallback price: $XX.XX`

## Technical Implementation

### BinancePriceService

```typescript
// Get current futures price
const price = await binanceService.getFuturesPrice("BTC-USD");

// Get mid price from orderbook
const midPrice = await binanceService.getFuturesMidPrice("BTC-USD");

// Get full orderbook
const orderbook = await binanceService.getFuturesOrderbook("BTC-USD", 20);
```

### Symbol Conversion

The service automatically converts dYdX market symbols to Binance format:

- `BTC-USD` → `BTCUSDT`
- `ETH-USD` → `ETHUSDT`
- `SOL-USD` → `SOLUSDT`

### Error Handling

- Connection timeouts: 10 seconds
- Rate limiting: Built into CCXT
- Graceful fallbacks: Multiple price sources
- Detailed logging: All errors are logged

## Benefits

### 🚀 Improved Accuracy

- Real-time Binance futures prices
- More accurate market pricing
- Better trade execution

### 🛡️ Enhanced Reliability

- Multiple fallback sources
- Graceful error handling
- Continuous operation

### 📈 Better Performance

- Faster price updates
- Reduced slippage
- More efficient trading

## Monitoring

### Key Metrics to Watch

1. **Price Source Distribution**

   - How often each fallback is used
   - Binance connection success rate

2. **Trade Execution**

   - Order placement success rate
   - Price accuracy vs Binance

3. **Performance**
   - Latency between price fetch and trade
   - Volume generation efficiency

### Log Analysis

```bash
# Filter for price source logs
grep "🎯 Using" wash-trade.log

# Filter for Binance connection issues
grep "Binance connection" wash-trade.log

# Filter for trade execution
grep "Wash.*MARKET order" wash-trade.log
```

## Troubleshooting

### Common Issues

1. **Binance Connection Failed**

   - Check internet connection
   - Verify Binance API status
   - Bot will use fallback sources

2. **Price Fetching Errors**

   - Check symbol format
   - Verify market availability
   - Review rate limits

3. **High Fallback Usage**
   - Investigate Binance connectivity
   - Check API key limits
   - Monitor network stability

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
DEBUG=binance:*
npm run wash-trade
```

## Compliance Notes

⚠️ **Important**: Wash trading may be subject to regulatory restrictions in your jurisdiction. Ensure compliance with local laws and regulations before using this bot.

- Use only for testing and development
- Do not use for market manipulation
- Respect exchange terms of service
- Monitor for any regulatory changes

## Support

For issues or questions:

1. Check the logs for error messages
2. Test Binance connection with `npm run test-binance`
3. Verify configuration settings
4. Review fallback behavior

The bot is designed to be robust and continue operating even when Binance is unavailable, ensuring consistent wash trading volume generation.
