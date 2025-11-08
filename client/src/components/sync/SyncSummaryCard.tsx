import { motion } from "framer-motion";
import { CheckCircle, Clock, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopifyProgress {
  processedOrders: number;
  totalOrders: number;
  newOrders: number;
  updatedOrders: number;
  currentPage: number;
  totalPages: number;
  percentage: number;
}

interface StagingProgress {
  processedLeads: number;
  totalLeads: number;
  newLeads: number;
  updatedLeads: number;
}

interface SyncSummaryCardProps {
  shopifyProgress: ShopifyProgress;
  stagingProgress: StagingProgress;
  startTime: Date | null;
  endTime: Date | null;
  errors: number;
  onClose: () => void;
}

export function SyncSummaryCard({
  shopifyProgress,
  stagingProgress,
  startTime,
  endTime,
  errors,
  onClose
}: SyncSummaryCardProps) {
  const getDuration = () => {
    if (!startTime || !endTime) return '<1s';
    const milliseconds = new Date(endTime).getTime() - new Date(startTime).getTime();
    const seconds = Math.max(1, Math.floor(milliseconds / 1000)); // Garantir pelo menos 1 segundo se for muito rápido
    
    if (seconds < 60) {
      // Se foi muito rápido (< 1s), mostrar tempo mínimo mas indicar que foi rápido
      if (milliseconds < 1000) {
        return '<1s';
      }
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Total de novos pedidos (Shopify + Transportadora, sem duplicação)
  const totalNew = shopifyProgress.newOrders + stagingProgress.newLeads;
  
  // Total de pedidos atualizados: apenas pedidos que tiveram atualizações de status reais
  // stagingProgress.updatedLeads = pedidos que foram atualizados pela transportadora (mudanças de status)
  // shopifyProgress.updatedOrders = pedidos que foram atualizados no Shopify (podem ser mudanças de dados, não necessariamente status)
  // Para mostrar apenas pedidos com atualizações de status, usamos apenas stagingProgress.updatedLeads
  // Se não houver atualizações de status da transportadora, mas houver atualizações do Shopify,
  // mostramos apenas se realmente houve mudanças de status (verificar se stagingProgress.updatedLeads > 0)
  const totalUpdated = stagingProgress.updatedLeads > 0 
    ? stagingProgress.updatedLeads 
    : (shopifyProgress.updatedOrders > 0 ? shopifyProgress.updatedOrders : 0);
  
  // Verificar se há atualizações reais de status
  const hasStatusUpdates = stagingProgress.updatedLeads > 0;
  const hasShopifyUpdates = shopifyProgress.updatedOrders > 0 && stagingProgress.updatedLeads === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="mt-6 p-6 bg-muted/50 border border-border rounded-xl space-y-4"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
        className="flex items-center justify-center mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
      </motion.div>

      {/* Title */}
      <h3 className="text-xl font-bold text-center text-foreground">
        Sincronização Concluída!
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total new */}
        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Novos Pedidos</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            +{totalNew.toLocaleString()}
          </p>
        </div>

        {/* Total updated - apenas se houver atualizações reais */}
        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">
              {hasStatusUpdates || hasShopifyUpdates ? "Atualizados" : "Sem Atualizações"}
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {hasStatusUpdates || hasShopifyUpdates ? totalUpdated.toLocaleString() : "0"}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 pt-4 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shopify:</span>
          <span className="text-foreground font-medium">
            {shopifyProgress.newOrders.toLocaleString()} novos{shopifyProgress.updatedOrders > 0 ? `, ${shopifyProgress.updatedOrders.toLocaleString()} atualizados` : ''}
          </span>
        </div>
        {stagingProgress.updatedLeads > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status da Transportadora:</span>
            <span className="text-foreground font-medium">
              {stagingProgress.updatedLeads.toLocaleString()} pedido{stagingProgress.updatedLeads !== 1 ? 's' : ''} com atualização de status
            </span>
          </div>
        )}
        {errors > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Erros:</span>
            <span className="text-red-500 font-medium">
              {errors.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
        <Clock className="w-4 h-4" />
        <span>Tempo total: {getDuration()}</span>
      </div>

      {/* Close button */}
      <div className="pt-4">
        <Button
          onClick={onClose}
          className="w-full"
          size="lg"
        >
          Concluir
        </Button>
      </div>
    </motion.div>
  );
}
