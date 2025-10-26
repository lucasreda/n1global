// 🇪🇺 European Fulfillment Sync Worker - Automated synchronization with intelligent scheduling
// Priority: Initial (90 days) > Deep (30 days, 2x daily) > Fast (10 days, every 30min)

import { EuropeanFulfillmentSyncService } from '../services/european-fulfillment-sync-service';

const syncService = new EuropeanFulfillmentSyncService();

// Track last execution times
let lastInitialSync: Date | null = null;
let lastFastSync: Date | null = null;
let lastDeepSync: Date | null = null;

// Reentrancy guard
let isInitialRunning = false;
let isSyncLoopRunning = false;

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
 * Check if initial sync is needed (highest priority)
 * Only check every hour to avoid spamming DB
 */
function shouldRunInitialSync(): boolean {
  if (!lastInitialSync) {
    return true; // Always check on first run
  }
  
  const now = new Date();
  const hoursSinceLastCheck = (now.getTime() - lastInitialSync.getTime()) / (1000 * 60 * 60);
  
  // Check every hour for accounts needing initial sync
  return hoursSinceLastCheck >= 1;
}

/**
 * Main sync loop - runs every minute to check if sync is needed
 * Priority: Initial (90 days) > Deep (30 days) > Fast (10 days)
 */
async function syncLoop() {
  // Prevent concurrent executions
  if (isSyncLoopRunning) {
    console.log('⏭️  European Fulfillment sync loop already running, skipping...');
    return;
  }
  
  isSyncLoopRunning = true;
  
  try {
    console.log('🔍 European Fulfillment Worker: Checking sync schedule...');
    
    // Block deep/fast while initial sync is running
    if (isInitialRunning) {
      console.log('⏳ European Fulfillment initial sync in progress, skipping deep/fast syncs...');
      return;
    }
    
    // HIGHEST PRIORITY: Initial sync for accounts that haven't completed 90-day backfill
    if (shouldRunInitialSync()) {
      console.log('🔍 Checking for European Fulfillment accounts needing initial sync...');
      lastInitialSync = new Date();
      isInitialRunning = true;
      
      try {
        // syncInitial() will check if any accounts need it and handle gracefully
        await syncService.syncInitial();
      } finally {
        isInitialRunning = false;
      }
      
      // Skip other syncs this cycle (deep/fast will catch up on next cycles)
      return;
    }
    
    // SECOND PRIORITY: Deep sync (priority over fast)
    if (shouldRunDeepSync()) {
      console.log('🕐 Time for European Fulfillment deep sync (6h or 18h UTC)');
      lastDeepSync = new Date();
      await syncService.syncDeep();
      lastFastSync = new Date(); // Reset fast sync timer since deep sync covers it
      return;
    }
    
    // THIRD PRIORITY: Fast sync
    if (shouldRunFastSync()) {
      console.log('⏰ Time for European Fulfillment fast sync (30min interval)');
      lastFastSync = new Date();
      await syncService.syncFast();
      return;
    }
    
    console.log('⏭️  No European Fulfillment sync needed at this time');
    
  } catch (error: any) {
    console.error('❌ European Fulfillment Worker: Sync error:', error);
  } finally {
    isSyncLoopRunning = false;
  }
}

/**
 * Start the worker
 */
export function startEuropeanFulfillmentWorker() {
  console.log('🚀 European Fulfillment Sync Worker started');
  console.log('   🚀 Initial sync: 90-day backfill (PRIORITY - runs first)');
  console.log('   🔄 Deep sync: 30 days, 2x daily at 6h and 18h UTC');
  console.log('   ⚡ Fast sync: 10 days, every 30 minutes');
  
  // Run initial check after 15 seconds (give server time to start, stagger with FHB)
  setTimeout(() => {
    console.log('🏁 Running initial European Fulfillment sync check...');
    syncLoop();
  }, 15000);
  
  // Then run every minute to check schedule
  setInterval(syncLoop, 60 * 1000); // Check every minute
  
  console.log('✅ European Fulfillment Worker scheduled successfully');
}

/**
 * Manual trigger for testing (export for admin routes)
 */
export async function triggerInitialSync() {
  if (isInitialRunning) {
    console.log('⚠️ European Fulfillment initial sync already running, skipping manual trigger');
    return;
  }
  
  console.log('🎯 Manual European Fulfillment initial sync triggered');
  isInitialRunning = true;
  try {
    await syncService.syncInitial();
  } finally {
    isInitialRunning = false;
  }
}

export async function triggerFastSync() {
  if (isInitialRunning) {
    console.log('⚠️ European Fulfillment initial sync is running, cannot run fast sync');
    return;
  }
  
  console.log('🎯 Manual European Fulfillment fast sync triggered');
  await syncService.syncFast();
}

export async function triggerDeepSync() {
  if (isInitialRunning) {
    console.log('⚠️ European Fulfillment initial sync is running, cannot run deep sync');
    return;
  }
  
  console.log('🎯 Manual European Fulfillment deep sync triggered');
  await syncService.syncDeep();
}

export async function getSyncStatus() {
  return {
    lastInitialSync,
    lastFastSync,
    lastDeepSync,
    nextFastSync: lastFastSync 
      ? new Date(lastFastSync.getTime() + 30 * 60 * 1000)
      : new Date(),
    nextDeepSync: calculateNextDeepSync(),
    nextInitialCheck: lastInitialSync
      ? new Date(lastInitialSync.getTime() + 60 * 60 * 1000)
      : new Date()
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
