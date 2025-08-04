import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

// Create a new cache instance with standard TTL of 10 minutes
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes in seconds
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Don't clone objects (for performance)
  deleteOnExpire: true, // Delete expired items
});

// Cache middleware for GET requests
export const cacheMiddleware = (duration = 600) => {
  return (req, res, next) => {
    //  Skip caching for non-GET requests or authenticated routes
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    //  Create a cache key from the request path and query parameters
    const key = `__express__${req.originalUrl || req.url}`;

    //  Try to get the cached response for this key
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      //  If cache hit, return cached response immediately
      logger.debug(`Cache hit for ${key}`);
      res.send(cachedResponse);
      return;
    }

    //  Store the original send function to call later
    const originalSend = res.send;

    //  Override the send function to cache the response body
    res.send = function (body) {
      // Only cache successful (2xx) responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, duration);
        logger.debug(`Cache set for ${key}`);
      }
      // Call the original send function
      originalSend.call(this, body);
    };

    next();
  };
};

// Function to clear cache for specific routes or all cache
export const clearCache = (routePattern) => {
  const keys = cache.keys();

  if (routePattern) {
    //  Clear cache entries matching the route pattern (regex)
    const regex = new RegExp(routePattern);
    const matchedKeys = keys.filter(key => regex.test(key));

    matchedKeys.forEach(key => {
      cache.del(key);
      logger.debug(`Cache cleared for ${key}`);
    });

    return matchedKeys.length;
  } else {
    //  Clear all cache entries if no pattern provided
    cache.flushAll();
    logger.debug('All cache cleared');
    return keys.length;
  }
};

export default { cacheMiddleware, clearCache };