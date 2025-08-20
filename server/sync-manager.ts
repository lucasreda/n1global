import { db } from "./db";
import { facebookAdAccounts } from "@shared/schema";
import { eq } from "drizzle-orm";


export class SyncManager {
  private static instance: SyncManager;
  private lastSyncTime: Date | null = null;
  private lastShippingSyncTime: Date | null = null;
  private readonly SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Verifica se precisa fazer sincronização automática do Facebook
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
   * Verifica se precisa fazer sincronização automática da transportadora
   * Retorna true se o último sync foi há mais de 30 minutos
   */
  shouldAutoSyncShipping(): boolean {
    if (!this.lastShippingSyncTime) {
      return true; // Primeiro acesso sempre sincroniza
    }
    
    const timeSinceLastSync = Date.now() - this.lastShippingSyncTime.getTime();
    return timeSinceLastSync >= this.SYNC_INTERVAL_MS;
  }

  /**
   * Atualiza o timestamp do último sync do Facebook
   */
  updateLastSyncTime(): void {
    this.lastSyncTime = new Date();
  }

  /**
   * Atualiza o timestamp do último sync da transportadora
   */
  updateLastShippingSyncTime(): void {
    this.lastShippingSyncTime = new Date();
  }

  /**
   * Retorna informações sobre o último sync do Facebook
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
   * Retorna informações sobre o último sync da transportadora
   */
  getShippingSyncInfo(): { lastSync: Date | null; canAutoSync: boolean; nextAutoSync: Date | null } {
    const canAutoSync = this.shouldAutoSyncShipping();
    let nextAutoSync: Date | null = null;
    
    if (this.lastShippingSyncTime && !canAutoSync) {
      nextAutoSync = new Date(this.lastShippingSyncTime.getTime() + this.SYNC_INTERVAL_MS);
    }

    return {
      lastSync: this.lastShippingSyncTime,
      canAutoSync,
      nextAutoSync
    };
  }

  /**
   * Executa sincronização automática da transportadora se necessário
   */
  async autoSyncShippingIfNeeded(): Promise<{ executed: boolean; reason: string }> {
    if (!this.shouldAutoSyncShipping()) {
      const nextSync = this.lastShippingSyncTime 
        ? new Date(this.lastShippingSyncTime.getTime() + this.SYNC_INTERVAL_MS)
        : new Date();
      
      return {
        executed: false,
        reason: `Última sincronização muito recente. Próxima sincronização em: ${nextSync.toLocaleString()}`
      };
    }

    try {
      console.log('🔄 Iniciando sincronização automática da transportadora...');
      const { SmartSyncService } = await import("./smart-sync-service");
      const smartSyncService = new SmartSyncService();
      await smartSyncService.startIntelligentSync();
      
      this.updateLastShippingSyncTime();
      console.log('✅ Sincronização automática da transportadora concluída');
      
      return {
        executed: true,
        reason: 'Sincronização automática executada com sucesso'
      };
    } catch (error) {
      console.error('❌ Erro na sincronização automática da transportadora:', error);
      return {
        executed: false,
        reason: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
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