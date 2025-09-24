# Arbitrage Wash Trading Strategy

This document describes the simplified arbitrage-based wash trading strategy that compares orderbook prices with Binance futures prices to create trading opportunities.

## Overview

The wash trading bot has been simplified to focus on arbitrage opportunities between the local dYdX orderbook and Binance futures prices. This strategy creates volume while potentially profiting from price discrepancies.

## Strategy Logic

### 🎯 Core Arbitrage Logic

```
IF orderbook_price > binance_price:
    → SHORT (Sell at Binance price)

IF orderbook_price < binance_price:
    → LONG (Buy at Binance price)

IF orderbook_price = binance_price:
    → NO ACTION (Prices are equal)
```

### 📊 Price Comparison

The bot continuously compares:

- **Orderbook Price**: Mid price from dYdX local orderbook (bid + ask) / 2
- **Binance Price**: Futures price from Binance via CCXT

### 🔄 Trading Execution

1. **Price Fetching**: Get both orderbook and Binance prices
2. **Comparison**: Calculate price difference and percentage
3. **Decision**: Determine if arbitrage opportunity exists
4. **Execution**: Place limit order at Binance price
5. **Logging**: Record all actions and price differences

## Key Features

### 🎯 Simplified Strategy

- **Single Decision Point**: Compare two prices
- **Clear Logic**: Simple if/else conditions
- **No Complex Patterns**: Removed buy-sell sequences
- **Focused Approach**: Pure arbitrage-based trading

### 📈 Arbitrage Opportunities

- **Price Discrepancies**: Exploits differences between exchanges
- **Volume Generation**: Creates trading volume on dYdX
- **Market Efficiency**: Helps equalize prices across markets
- **Risk Management**: Uses limit orders for price control

### 🔧 Technical Implementation

- **Limit Orders**: Precise price control instead of market orders
- **Real-time Prices**: Live data from both sources
- **Error Handling**: Graceful fallbacks if data unavailable
- **Transparent Logging**: Clear indication of strategy decisions

## Configuration

### Wash Trade Configurations

All existing configurations work with the arbitrage strategy:

- `conservative`: Low volume, wide spreads
- `moderate`: Medium volume, balanced settings
- `aggressive`: High volume, tight spreads
- `eth`: Optimized for ETH-USD
- `sol`: Optimized for SOL-USD
- `test`: Very low volume for testing

### Key Parameters

```typescript
{
  orderSize: 0.001,        // Base trade size
  minInterval: 2000,       // Minimum delay between trades
  maxInterval: 8000,       // Maximum delay between trades
  orderConfig: {
    goodTilBlocks: 10,     // Order expiration
    roundPrice: 3,         // Price precision
    roundSize: 4,          // Size precision
  }
}
```

## Usage

### 1. Test Arbitrage Strategy

```bash
npm run test-arbitrage
```

This will test:

- Price comparison logic
- Arbitrage decision making
- Strategy simulation for multiple symbols

### 2. Run Arbitrage Wash Trading

```bash
npm run wash-trade
```

The bot will:

1. Fetch orderbook and Binance prices
2. Compare prices and calculate differences
3. Execute arbitrage trades based on price discrepancies
4. Log all decisions and actions

### 3. Monitor Logs

Look for these log messages:

- `📊 Price Comparison: Orderbook: $XX.XX | Binance: $XX.XX | Diff: $XX.XX (X.XXX%)`
- `📉 Orderbook > Binance: SHORTING to equalize prices`
- `📈 Orderbook < Binance: LONGING to equalize prices`
- `🔄 Arbitrage BUY/SELL LIMIT order: X.XXXX at price $XX.XX`

## Technical Details

### Price Sources

1. **Orderbook Price**: dYdX local orderbook mid price
2. **Binance Price**: Binance futures price via CCXT
3. **Fallbacks**: Multiple fallback sources for reliability

### Order Types

- **Limit Orders**: Used for precise price control
- **Good Till Time**: Orders expire after specified blocks
- **No Market Orders**: Avoids slippage and ensures price control

### Error Handling

- **Price Fetching**: Graceful fallbacks if sources unavailable
- **Order Placement**: Error logging and retry logic
- **Connection Issues**: Continues operation with available data

## Benefits

### 🚀 Simplified Logic

- **Easy to Understand**: Clear if/else conditions
- **Predictable Behavior**: Consistent decision making
- **Reduced Complexity**: No complex pattern generation
- **Focused Strategy**: Single arbitrage objective

### 📊 Market Efficiency

- **Price Discovery**: Helps equalize prices across markets
- **Volume Generation**: Creates consistent trading volume
- **Arbitrage Opportunities**: Exploits price discrepancies
- **Market Making**: Provides liquidity at fair prices

### 🛡️ Risk Management

- **Limit Orders**: Precise price control
- **Position Limits**: Configurable maximum position sizes
- **Error Handling**: Robust fallback mechanisms
- **Transparent Logging**: Full visibility into decisions

## Monitoring

### Key Metrics to Watch

1. **Price Differences**

   - Average price discrepancy between sources
   - Percentage differences over time
   - Frequency of arbitrage opportunities

2. **Trade Execution**

   - Success rate of arbitrage trades
   - Order fill rates
   - Price improvement achieved

3. **Strategy Performance**
   - Number of arbitrage opportunities
   - Volume generated
   - Market impact

### Log Analysis

```bash
# Filter for price comparisons
grep "Price Comparison" wash-trade.log

# Filter for arbitrage decisions
grep "SHORTING\|LONGING" wash-trade.log

# Filter for trade execution
grep "Arbitrage.*LIMIT order" wash-trade.log
```

## Troubleshooting

### Common Issues

1. **No Arbitrage Opportunities**

   - Prices may be very close between sources
   - Check if both price sources are working
   - Consider adjusting price sensitivity

2. **Orders Not Filling**

   - Price may have moved before order placement
   - Check order expiration settings
   - Verify order size and price precision

3. **Price Source Errors**
   - Check Binance connection
   - Verify dYdX orderbook availability
   - Review fallback mechanisms

### Debug Mode

Enable detailed logging:

```bash
DEBUG=arbitrage:*
npm run wash-trade
```

## Compliance Notes

⚠️ **Important**: This strategy is for testing and development purposes only.

- Ensure compliance with local regulations
- Do not use for market manipulation
- Respect exchange terms of service
- Monitor for regulatory changes

## Support

For issues or questions:

1. Check the logs for error messages
2. Test arbitrage logic with `npm run test-arbitrage`
3. Verify price source connectivity
4. Review configuration settings

The arbitrage strategy is designed to be simple, transparent, and effective at generating volume while creating market efficiency through price equalization.
