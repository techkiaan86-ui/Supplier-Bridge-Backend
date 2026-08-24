import { Redis } from 'ioredis';

// Attempt to connect to local Redis. If not available, we'll handle errors gracefully.
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  }
});

redisClient.on('error', (err) => {
  // console.warn('Redis connection error (fallback will be used):', err.message);
});

export const getCachedOrFetch = async (key: string, fetchFn: () => Promise<any>, ttlSeconds: number = 60) => {
  try {
    if (redisClient.status === 'ready') {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.warn(`Redis get error for key ${key}:`, error);
  }

  // Fallback / Cache Miss
  const data = await fetchFn();

  try {
    if (redisClient.status === 'ready') {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
    }
  } catch (error) {
    console.warn(`Redis set error for key ${key}:`, error);
  }

  return data;
};
