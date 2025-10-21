// 🤖 FHB Sync Worker - Automated synchronization with intelligent scheduling
// Deep sync: 30 days, 2x daily (6h and 18h)
// Fast sync: 10 days, every 30min

import { FHBSyncService } from '../services/fhb-sync-service';

const syncService = new FHBSyncService();

// Track last execution times
let lastFastSync: Date | null = null;
let lastDeepSync: Date | null = null;

/**
 * Check if it's time for deep sync (6h or 18h UTC)
 */
function shouldRunDeepSync(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Run at 6h or 18h UTC
  if (hour !== 6 && hour !== 18) {
    return false;
  }
  
  // Only run once per hour window
  if (lastDeepSync) {
    const hoursSinceLastDeep = (now.getTime() - lastDeepSync.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastDeep < 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if it's time for fast sync (every 30min)
 */
function shouldRunFastSync(): boolean {
  if (!lastFastSync) {
    return true; // Run on first check
  }
  
  const now = new Date();
  const minutesSinceLastFast = (now.getTime() - lastFastSync.getTime()) / (1000 * 60);
  
  return minutesSinceLastFast >= 30;
}

/**
 * Main sync loop - runs every minute to check if sync is needed
 */
async function syncLoop() {
  try {
    console.log('🔍 FHB Worker: Checking sync schedule...');
    
    // Check if deep sync is needed (priority)
    if (shouldRunDeepSync()) {
      console.log('🕐 Time for deep sync (6h or 18h UTC)');
      lastDeepSync = new Date();
      await syncService.syncDeep();
      lastFastSync = new Date(); // Reset fast sync timer since deep sync covers it
      return;
    }
    
    // Check if fast sync is needed
    if (shouldRunFastSync()) {
      console.log('⏰ Time for fast sync (30min interval)');
      lastFastSync = new Date();
      await syncService.syncFast();
      return;
    }
    
    console.log('⏭️  No sync needed at this time');
    
  } catch (error: any) {
    console.error('❌ FHB Worker: Sync error:', error);
  }
}

/**
 * Start the worker
 */
export function startFHBWorker() {
  console.log('🚀 FHB Sync Worker started');
  console.log('   ⚡ Fast sync: Every 30 minutes');
  console.log('   🔄 Deep sync: 2x daily at 6h and 18h UTC');
  
  // Run initial sync after 10 seconds (give server time to start)
  setTimeout(() => {
    console.log('🏁 Running initial sync...');
    syncLoop();
  }, 10000);
  
  // Then run every minute to check schedule
  setInterval(syncLoop, 60 * 1000); // Check every minute
  
  console.log('✅ FHB Worker scheduled successfully');
}

/**
 * Manual trigger for testing (export for admin routes)
 */
export async function triggerFastSync() {
  console.log('🎯 Manual fast sync triggered');
  await syncService.syncFast();
}

export async function triggerDeepSync() {
  console.log('🎯 Manual deep sync triggered');
  await syncService.syncDeep();
}

export async function getSyncStatus() {
  return {
    lastFastSync,
    lastDeepSync,
    nextFastSync: lastFastSync 
      ? new Date(lastFastSync.getTime() + 30 * 60 * 1000)
      : new Date(),
    nextDeepSync: calculateNextDeepSync()
  };
}

function calculateNextDeepSync(): Date {
  const now = new Date();
  const currentHour = now.getUTCHours();
  
  // Find next 6h or 18h
  let nextDeepHour: number;
  if (currentHour < 6) {
    nextDeepHour = 6;
  } else if (currentHour < 18) {
    nextDeepHour = 18;
  } else {
    // After 18h, next is tomorrow at 6h
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(6, 0, 0, 0);
    return tomorrow;
  }
  
  const nextSync = new Date(now);
  nextSync.setUTCHours(nextDeepHour, 0, 0, 0);
  return nextSync;
}
