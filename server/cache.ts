// Simple in-memory cache for API responses
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache: Map<string, CacheItem> = new Map();

  set(key: string, data: any, ttlMinutes: number = 5): void {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    };
    this.cache.set(key, item);
    console.log(`💾 Cached ${Array.isArray(data) ? data.length : 'object'} items for: ${key} (TTL: ${ttlMinutes}min)`);
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      console.log(`🗑️  Cache expired for: ${key}`);
      return null;
    }

    console.log(`✅ Cache hit for: ${key} - ${Array.isArray(item.data) ? item.data.length : 'object'} items`);
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

export const apiCache = new ApiCache();