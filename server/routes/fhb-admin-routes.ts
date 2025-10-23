// 🏦 FHB Admin Routes - Admin-level FHB account management
import type { Express, Response } from "express";
import { db } from "../db";
import { fhbAccounts, insertFhbAccountSchema, updateFhbAccountSchema } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { FHBService } from "../fulfillment-providers/fhb-service";
import type { AuthRequest } from "../auth-middleware";

/**
 * Middleware para verificar role de super admin
 */
const requireSuperAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Acesso negado: requer permissões de super administrador" });
  }
  next();
};

export function registerFhbAdminRoutes(app: Express, authenticateToken: any, requireSuperAdminMiddleware: any) {
  // GET /api/admin/fhb-accounts - Listar todas as contas FHB
  app.get("/api/admin/fhb-accounts", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      console.log("📋 Admin: Listando contas FHB");
      
      const accounts = await db
        .select()
        .from(fhbAccounts)
        .orderBy(fhbAccounts.createdAt);
      
      // Não retornar secrets sensíveis
      const sanitizedAccounts = accounts.map(acc => ({
        ...acc,
        secret: '••••••••' // Ocultar secret
      }));
      
      console.log(`✅ ${accounts.length} contas FHB encontradas`);
      res.json(sanitizedAccounts);
    } catch (error: any) {
      console.error("❌ Erro ao listar contas FHB:", error);
      res.status(500).json({ message: "Erro ao listar contas FHB" });
    }
  });

  // GET /api/admin/fhb-accounts/:id - Buscar conta FHB específica
  app.get("/api/admin/fhb-accounts/:id", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const account = await db.query.fhbAccounts.findFirst({
        where: eq(fhbAccounts.id, id)
      });
      
      if (!account) {
        return res.status(404).json({ message: "Conta FHB não encontrada" });
      }
      
      // Ocultar secret
      const sanitized = {
        ...account,
        secret: '••••••••'
      };
      
      res.json(sanitized);
    } catch (error: any) {
      console.error("❌ Erro ao buscar conta FHB:", error);
      res.status(500).json({ message: "Erro ao buscar conta FHB" });
    }
  });

  // POST /api/admin/fhb-accounts - Criar nova conta FHB
  app.post("/api/admin/fhb-accounts", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      console.log("➕ Admin: Criando nova conta FHB");
      
      const validatedData = insertFhbAccountSchema.parse(req.body);
      
      const [newAccount] = await db
        .insert(fhbAccounts)
        .values(validatedData)
        .returning();
      
      console.log(`✅ Conta FHB criada: ${newAccount.name} (${newAccount.id})`);
      
      // 🚀 IMPORTANTE: Iniciar initial sync automaticamente para nova conta
      // Isso garante que o histórico completo seja puxado imediatamente
      console.log(`🚀 Iniciando initial sync automático para conta ${newAccount.name}...`);
      
      try {
        // Importar e executar o sync inicial de forma assíncrona (não bloqueia a resposta)
        const { triggerInitialSync } = await import('../workers/fhb-sync-worker');
        
        // Executar em background - não esperar a conclusão
        triggerInitialSync().then(() => {
          console.log(`✅ Initial sync concluído para ${newAccount.name}`);
        }).catch(error => {
          console.error(`❌ Erro no initial sync automático para ${newAccount.name}:`, error);
        });
        
        console.log(`✅ Initial sync iniciado em background para ${newAccount.name}`);
      } catch (importError) {
        console.error(`❌ Erro ao importar worker para ${newAccount.name}:`, importError);
      }
      
      // Ocultar secret na resposta
      const sanitized = {
        ...newAccount,
        secret: '••••••••'
      };
      
      res.status(201).json(sanitized);
    } catch (error: any) {
      console.error("❌ Erro ao criar conta FHB:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Erro ao criar conta FHB" });
    }
  });

  // PUT /api/admin/fhb-accounts/:id - Atualizar conta FHB
  app.put("/api/admin/fhb-accounts/:id", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`✏️  Admin: Atualizando conta FHB ${id}`);
      
      const validatedData = updateFhbAccountSchema.parse(req.body);
      
      const [updatedAccount] = await db
        .update(fhbAccounts)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(fhbAccounts.id, id))
        .returning();
      
      if (!updatedAccount) {
        return res.status(404).json({ message: "Conta FHB não encontrada" });
      }
      
      console.log(`✅ Conta FHB atualizada: ${updatedAccount.name}`);
      
      // Ocultar secret na resposta
      const sanitized = {
        ...updatedAccount,
        secret: '••••••••'
      };
      
      res.json(sanitized);
    } catch (error: any) {
      console.error("❌ Erro ao atualizar conta FHB:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Erro ao atualizar conta FHB" });
    }
  });

  // DELETE /api/admin/fhb-accounts/:id - Deletar conta FHB
  app.delete("/api/admin/fhb-accounts/:id", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`🗑️  Admin: Deletando conta FHB ${id}`);
      
      const { fulfillmentIntegrations, fhbSyncLogs, fhbOrders } = await import("@shared/schema");
      
      // 1. Limpar fhbAccountId em integrações que usam esta conta (não bloqueia, apenas desvincula)
      const clearedIntegrations = await db
        .update(fulfillmentIntegrations)
        .set({ fhbAccountId: null })
        .where(eq(fulfillmentIntegrations.fhbAccountId, id))
        .returning();
      
      if (clearedIntegrations.length > 0) {
        console.log(`🔗 ${clearedIntegrations.length} integração(ões) desvinculadas da conta`);
      }
      
      // 2. Deletar sync logs relacionados (histórico de sincronizações)
      console.log(`🧹 Deletando sync logs da conta ${id}...`);
      const deletedLogs = await db
        .delete(fhbSyncLogs)
        .where(eq(fhbSyncLogs.fhbAccountId, id))
        .returning();
      
      console.log(`✅ ${deletedLogs.length} sync logs deletados`);
      
      // 3. Contar pedidos antes de desvincular
      const orderCountBefore = await db
        .select({ count: sql<number>`count(*)` })
        .from(fhbOrders)
        .where(eq(fhbOrders.fhbAccountId, id));
      
      const preservedOrders = Number(orderCountBefore[0]?.count) || 0;
      
      // 4. Limpar fhbAccountId em pedidos (mantém pedidos, apenas remove referência)
      // Isso permite deletar a conta sem violar foreign key
      if (preservedOrders > 0) {
        console.log(`🔗 Desvinculando ${preservedOrders} pedidos FHB da conta ${id}...`);
        await db
          .update(fhbOrders)
          .set({ fhbAccountId: sql`NULL` })
          .where(eq(fhbOrders.fhbAccountId, id));
      }
      
      console.log(`✅ ${preservedOrders} pedidos FHB desvinculados (permanecem na staging table)`);
      
      // 5. Deletar a conta FHB
      const deleted = await db
        .delete(fhbAccounts)
        .where(eq(fhbAccounts.id, id))
        .returning();
      
      if (deleted.length === 0) {
        return res.status(404).json({ message: "Conta FHB não encontrada" });
      }
      
      console.log(`✅ Conta FHB deletada: ${id}`);
      res.json({ 
        message: "Conta FHB deletada com sucesso. Pedidos importados permanecem disponíveis para as operações.",
        clearedIntegrations: clearedIntegrations.length,
        deletedSyncLogs: deletedLogs.length,
        preservedOrders
      });
    } catch (error: any) {
      console.error("❌ Erro ao deletar conta FHB:", error);
      res.status(500).json({ message: "Erro ao deletar conta FHB" });
    }
  });

  // POST /api/admin/fhb-accounts/:id/test - Testar conexão com conta FHB
  app.post("/api/admin/fhb-accounts/:id/test", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`🔧 Admin: Testando conexão FHB ${id}`);
      
      const account = await db.query.fhbAccounts.findFirst({
        where: eq(fhbAccounts.id, id)
      });
      
      if (!account) {
        return res.status(404).json({ message: "Conta FHB não encontrada" });
      }
      
      // Criar serviço FHB temporário para teste
      const fhbService = new FHBService({
        appId: account.appId,
        secret: account.secret,
        apiUrl: account.apiUrl
      });
      
      // Testar conexão
      const testResult = await fhbService.testConnection();
      
      // Salvar resultado do teste
      await db
        .update(fhbAccounts)
        .set({
          lastTestedAt: new Date(),
          testResult: testResult.connected ? 'success' : 'failed',
          status: testResult.connected ? 'active' : 'inactive'
        })
        .where(eq(fhbAccounts.id, id));
      
      console.log(`${testResult.connected ? '✅' : '❌'} Teste de conexão: ${testResult.message}`);
      
      res.json({
        connected: testResult.connected,
        message: testResult.message,
        testedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("❌ Erro ao testar conta FHB:", error);
      
      // Salvar resultado de erro
      await db
        .update(fhbAccounts)
        .set({
          lastTestedAt: new Date(),
          testResult: 'error',
          status: 'inactive'
        })
        .where(eq(fhbAccounts.id, req.params.id));
      
      res.status(500).json({ 
        connected: false,
        message: `Erro ao testar conexão: ${error.message}` 
      });
    }
  });

  // GET /api/admin/fhb-sync/status - Get sync status for dashboard
  app.get("/api/admin/fhb-sync/status", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      console.log("📊 Admin: Getting FHB sync status");
      
      const { FHBSyncService } = await import("../services/fhb-sync-service");
      const { getSyncStatus } = await import("../workers/fhb-sync-worker");
      
      const syncService = new FHBSyncService();
      const syncStatus = await syncService.getSyncStatus();
      const workerStatus = await getSyncStatus();
      
      res.json({
        worker: workerStatus,
        ...syncStatus // includes: accounts, pendingInitialCount, totalAccounts
      });
    } catch (error: any) {
      console.error("❌ Erro ao obter status de sincronização:", error);
      res.status(500).json({ message: "Erro ao obter status de sincronização" });
    }
  });

  // POST /api/admin/fhb-sync/trigger - Trigger manual sync
  app.post("/api/admin/fhb-sync/trigger", authenticateToken, requireSuperAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { syncType } = req.body;
      console.log(`🎯 Admin: Triggering manual ${syncType} sync`);
      
      const { triggerInitialSync, triggerFastSync, triggerDeepSync } = await import("../workers/fhb-sync-worker");
      
      if (syncType === 'initial') {
        // Don't await - return immediately and run in background
        triggerInitialSync().catch(err => console.error("Initial sync error:", err));
        res.json({ message: "Initial sync (1 year) iniciado em background. Isso pode levar vários minutos." });
      } else if (syncType === 'fast') {
        // Don't await - return immediately and run in background
        triggerFastSync().catch(err => console.error("Fast sync error:", err));
        res.json({ message: "Fast sync iniciado em background" });
      } else if (syncType === 'deep') {
        // Don't await - return immediately and run in background
        triggerDeepSync().catch(err => console.error("Deep sync error:", err));
        res.json({ message: "Deep sync iniciado em background" });
      } else {
        res.status(400).json({ message: "Tipo de sync inválido. Use 'initial', 'fast' ou 'deep'" });
      }
    } catch (error: any) {
      console.error("❌ Erro ao disparar sincronização:", error);
      res.status(500).json({ message: "Erro ao disparar sincronização" });
    }
  });
}
