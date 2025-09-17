import { MAX_UINT_32 } from "@dydxprotocol/v4-client-js";

/**
 * Returns a random integer value between 0 and (n-1).
 */
export function randomInt(n: number): number {
  return Math.floor(Math.random() * n);
}

export function randomIntRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random clientId for orders.
 */
export function generateRandomClientId(): number {
  return randomInt(MAX_UINT_32 + 1);
}

/**
 * Sleep for a specified number of milliseconds.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate the mid price from bid and ask.
 */
export function calculateMidPrice(bestBid: number, bestAsk: number): number {
  return (bestBid + bestAsk) / 2;
}

/**
 * Calculate spread percentage between bid and ask.
 */
export function calculateSpread(bestBid: number, bestAsk: number): number {
  const midPrice = calculateMidPrice(bestBid, bestAsk);
  return ((bestAsk - bestBid) / midPrice) * 100;
}

/**
 * Round price to appropriate decimal places based on market.
 */
export function roundPrice(price: number, decimals: number = 2): number {
  return Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Round size to appropriate decimal places.
 */
export function roundSize(size: number, decimals: number = 4): number {
  return Math.round(size * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate order prices around mid price with spread.
 */
export function calculateOrderPrices(
  midPrice: number,
  spread: number,
  steps: number,
  stepSize: number = 0.1
): { bidPrices: number[]; askPrices: number[] } {
  const halfSpread = spread / 2;
  const bidPrices: number[] = [];
  const askPrices: number[] = [];

  for (let i = 0; i < steps; i++) {
    const offset = (i + 1) * stepSize;
    bidPrices.push(roundPrice(midPrice * (1 - (halfSpread + offset) / 100)));
    askPrices.push(roundPrice(midPrice * (1 + (halfSpread + offset) / 100)));
  }

  return { bidPrices, askPrices };
}

/**
 * Check if a number is within a percentage range of another number.
 */
export function isWithinPercentage(
  value: number,
  target: number,
  percentage: number
): boolean {
  const diff = Math.abs(value - target);
  const threshold = target * (percentage / 100);
  return diff <= threshold;
}

/**
 * Format number to string with specified decimal places.
 */
export function formatNumber(num: number, decimals: number = 4): string {
  return num.toFixed(decimals);
}

/**
 * Calculate percentage change between two values.
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Validate if a price is reasonable (not zero, negative, or too extreme).
 */
export function isValidPrice(price: number): boolean {
  return price > 0 && price < Number.MAX_SAFE_INTEGER && !isNaN(price);
}

/**
 * Validate if a size is reasonable.
 */
export function isValidSize(size: number): boolean {
  return size > 0 && size < Number.MAX_SAFE_INTEGER && !isNaN(size);
}

/**
 * Get current timestamp in seconds.
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Convert timestamp to readable date string.
 */
export function timestampToDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}
