import { db } from "./db";
import { facebookAdAccounts } from "@shared/schema";
import { eq } from "drizzle-orm";

export class SyncManager {
  private static instance: SyncManager;
  private lastSyncTime: Date | null = null;
  private readonly SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Verifica se precisa fazer sincronização automática
   * Retorna true se o último sync foi há mais de 30 minutos
   */
  shouldAutoSync(): boolean {
    if (!this.lastSyncTime) {
      return true; // Primeiro acesso sempre sincroniza
    }
    
    const timeSinceLastSync = Date.now() - this.lastSyncTime.getTime();
    return timeSinceLastSync >= this.SYNC_INTERVAL_MS;
  }

  /**
   * Atualiza o timestamp do último sync
   */
  updateLastSyncTime(): void {
    this.lastSyncTime = new Date();
  }

  /**
   * Retorna informações sobre o último sync
   */
  getSyncInfo(): { lastSync: Date | null; canAutoSync: boolean; nextAutoSync: Date | null } {
    const canAutoSync = this.shouldAutoSync();
    let nextAutoSync: Date | null = null;
    
    if (this.lastSyncTime && !canAutoSync) {
      nextAutoSync = new Date(this.lastSyncTime.getTime() + this.SYNC_INTERVAL_MS);
    }

    return {
      lastSync: this.lastSyncTime,
      canAutoSync,
      nextAutoSync
    };
  }

  /**
   * Verifica se existem contas ativas do Facebook
   */
  async hasActiveFacebookAccounts(): Promise<boolean> {
    const activeAccounts = await db
      .select()
      .from(facebookAdAccounts)
      .where(eq(facebookAdAccounts.isActive, true));
    
    return activeAccounts.length > 0;
  }
}

export const syncManager = SyncManager.getInstance();