import { db } from "./db";
import { orders } from "@shared/schema";
import { europeanFulfillmentService } from "./fulfillment-service";
import { eq, and, not, inArray } from "drizzle-orm";

interface SyncOptions {
  forceFullSync?: boolean;
  maxPages?: number;
  statusFilter?: string[];
}

export class SmartSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;
  
  // Status que não precisam mais ser atualizados (pedidos finalizados)
  private finalStatuses = ['delivered', 'cancelled', 'refused', 'returned'];
  
  // Status que precisam ser monitorados
  private activeStatuses = ['new order', 'confirmed', 'packed', 'shipped', 'in transit'];

  async startIncrementalSync(options: SyncOptions = {}): Promise<{
    success: boolean;
    newLeads: number;
    updatedLeads: number;
    skippedLeads: number;
    totalProcessed: number;
    duration: number;
    message: string;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        skippedLeads: 0,
        totalProcessed: 0,
        duration: 0,
        message: "Sincronização já está em execução"
      };
    }

    const startTime = Date.now();
    this.isRunning = true;

    try {
      console.log("🔄 Iniciando sincronização inteligente...");

      console.log("📋 Iniciando sincronização incremental...");

      let newLeads = 0;
      let updatedLeads = 0;
      let skippedLeads = 0;
      let totalProcessed = 0;

      // 1. Buscar leads existentes que precisam ser atualizados
      const leadsToUpdate = await db
        .select()
        .from(orders)
        .where(
          and(
            not(inArray(orders.status, this.finalStatuses)),
            // Atualizar leads modificados nas últimas 48h ou com status ativo
            inArray(orders.status, this.activeStatuses)
          )
        );

      console.log(`📋 Encontrados ${leadsToUpdate.length} leads para atualização`);

      // 2. Atualizar leads existentes com status não-final
      for (const lead of leadsToUpdate) {
        if (lead.id) {
          try {
            const leadDetails = await europeanFulfillmentService.getLeadStatus(lead.id);
            
            if (leadDetails && leadDetails.status !== lead.status) {
              await db
                .update(orders)
                .set({
                  status: leadDetails.status,
                  updatedAt: new Date(),
                })
                .where(eq(orders.id, lead.id));
              
              updatedLeads++;
              console.log(`✏️  Lead ${lead.id} atualizado: ${lead.status} → ${leadDetails.status}`);
            } else {
              skippedLeads++;
            }
          } catch (error) {
            console.warn(`⚠️  Erro ao atualizar lead ${lead.id}:`, error);
          }
        }
        totalProcessed++;
      }

      // 3. Buscar novos leads da API (apenas as primeiras páginas para otimizar)
      const maxPages = options.maxPages || 3; // Limitar a 3 páginas (45 leads mais recentes)
      let apiLeads: any[] = [];

      for (let page = 1; page <= maxPages; page++) {
        try {
          const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", page);
          
          if (!pageLeads || pageLeads.length === 0) break;
          
          apiLeads = apiLeads.concat(pageLeads);
          
          // Se encontrou menos que 15 leads, provavelmente chegou ao fim
          if (pageLeads.length < 15) break;
        } catch (error) {
          console.warn(`⚠️  Erro ao buscar página ${page}:`, error);
          break;
        }
      }

      console.log(`🌐 Recuperados ${apiLeads.length} leads da API`);

      // 4. Processar novos leads
      for (const apiLead of apiLeads) {
        try {
          // Verificar se o lead já existe
          const [existingLead] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, apiLead.n_lead))
            .limit(1);

          if (!existingLead) {
            // Lead novo - inserir com dados básicos da API
            await db.insert(orders).values({
              id: apiLead.n_lead,
              customerName: apiLead.name,
              customerPhone: apiLead.phone,
              customerCity: apiLead.city,
              customerCountry: "IT",
              total: apiLead.lead_value,
              status: apiLead.status_livrison || "new order",
              paymentMethod: apiLead.method_payment || "COD",
              provider: "european_fulfillment",
            });

            newLeads++;
            console.log(`✅ Novo lead adicionado: ${apiLead.n_lead}`);
          } else if (!this.finalStatuses.includes(existingLead.status)) {
            // Lead existente com status não-final - já foi processado acima
            skippedLeads++;
          }
          
          totalProcessed++;
        } catch (error) {
          console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
        }
      }

      // 5. Finalizar sincronização
      console.log(`📊 Sincronização finalizada: processados ${totalProcessed}, novos ${newLeads}, atualizados ${updatedLeads}`);

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      const message = `Sincronização concluída: ${newLeads} novos, ${updatedLeads} atualizados, ${skippedLeads} ignorados`;
      
      console.log(`✅ ${message} em ${duration}ms`);

      return {
        success: true,
        newLeads,
        updatedLeads,
        skippedLeads,
        totalProcessed,
        duration,
        message
      };

    } catch (error) {
      console.error("❌ Erro na sincronização:", error);
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        skippedLeads: 0,
        totalProcessed: 0,
        duration: Date.now() - startTime,
        message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  async scheduleAutoSync(): Promise<void> {
    // Sincronização automática a cada 5 minutos para pedidos ativos
    setInterval(async () => {
      if (!this.isRunning) {
        console.log("🔄 Executando sincronização automática...");
        await this.startIncrementalSync({ maxPages: 2 });
      }
    }, 5 * 60 * 1000); // 5 minutos

    console.log("⏰ Sincronização automática agendada para cada 5 minutos");
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  async getSyncStats(): Promise<{
    totalLeads: number;
    activeLeads: number;
    finalizedLeads: number;
    lastSync: Date | null;
    isRunning: boolean;
  }> {
    const allLeads = await db.select().from(orders);
    const totalCount = allLeads.length;
    const activeCount = allLeads.filter(lead => this.activeStatuses.includes(lead.status)).length;
    const finalizedCount = allLeads.filter(lead => this.finalStatuses.includes(lead.status)).length;

    return {
      totalLeads: totalCount,
      activeLeads: activeCount,
      finalizedLeads: finalizedCount,
      lastSync: this.lastSyncTime,
      isRunning: this.isRunning
    };
  }
}

export const smartSyncService = new SmartSyncService();