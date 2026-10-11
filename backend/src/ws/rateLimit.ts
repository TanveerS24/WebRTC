export interface TokenBucket {
  consume(): boolean;
}

// Token bucket rate limiter: 20 tokens/sec refill rate, 40 tokens maximum burst capacity
export function createTokenBucket(rate = 20, capacity = 40): TokenBucket {
  let tokens = capacity;
  let lastRefill = Date.now();

  return {
    consume(): boolean {
      const now = Date.now();
      const elapsedSeconds = (now - lastRefill) / 1000;
      tokens = Math.min(capacity, tokens + elapsedSeconds * rate);
      lastRefill = now;

      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      return false;
    },
  };
}
