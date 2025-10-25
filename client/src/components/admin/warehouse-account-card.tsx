import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface WarehouseAccountCardProps {
  account: {
    id: string;
    displayName: string;
    providerKey: string;
    providerName: string;
    isActive: boolean;
    initialSyncCompleted: boolean;
    initialSyncCompletedAt?: Date | string | null;
    lastTestedAt?: Date | string | null;
    lastSyncAt?: Date | string | null;
    operationIds?: string[];
  };
  operations?: Array<{ id: string; name: string }>;
  onEdit?: (accountId: string) => void;
  onDelete?: (accountId: string) => void;
  onTest?: (accountId: string) => void;
  showActions?: boolean;
}

export function WarehouseAccountCard({
  account,
  operations = [],
  onEdit,
  onDelete,
  onTest,
  showActions = true
}: WarehouseAccountCardProps) {
  const getProviderIcon = (providerKey: string) => {
    switch (providerKey) {
      case 'fhb':
        return '🏢';
      case 'european_fulfillment':
        return '🇪🇺';
      case 'elogy':
        return '📦';
      default:
        return '🏭';
    }
  };

  const getStatusBadge = () => {
    if (!account.isActive) {
      return (
        <Badge variant="secondary" className="gap-1" data-testid={`badge-status-${account.id}`}>
          <XCircle className="h-3 w-3" />
          Inativa
        </Badge>
      );
    }

    if (!account.initialSyncCompleted) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600" data-testid={`badge-status-${account.id}`}>
          <Clock className="h-3 w-3" />
          Sincronizando...
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-1 bg-green-500" data-testid={`badge-status-${account.id}`}>
        <CheckCircle className="h-3 w-3" />
        Ativa
      </Badge>
    );
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return 'Nunca';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'Data inválida';
    }
  };

  const linkedOperations = operations.filter(op => 
    account.operationIds?.includes(op.id)
  );

  return (
    <Card 
      className="hover:shadow-md transition-shadow" 
      data-testid={`card-warehouse-account-${account.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl" data-testid={`icon-provider-${account.id}`}>
                {getProviderIcon(account.providerKey)}
              </span>
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-semibold text-sm truncate" 
                  data-testid={`text-account-name-${account.id}`}
                >
                  {account.displayName}
                </h3>
                <p 
                  className="text-xs text-muted-foreground" 
                  data-testid={`text-provider-${account.id}`}
                >
                  {account.providerName}
                </p>
              </div>
              {getStatusBadge()}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
              <div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Último Teste
                </div>
                <div 
                  className="font-medium" 
                  data-testid={`text-last-tested-${account.id}`}
                >
                  {formatDate(account.lastTestedAt)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Última Sync
                </div>
                <div 
                  className="font-medium" 
                  data-testid={`text-last-sync-${account.id}`}
                >
                  {formatDate(account.lastSyncAt)}
                </div>
              </div>
            </div>

            {/* Linked Operations */}
            {linkedOperations.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Operações Vinculadas ({linkedOperations.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {linkedOperations.map((op) => (
                    <Badge 
                      key={op.id} 
                      variant="outline" 
                      className="text-xs"
                      data-testid={`badge-operation-${account.id}-${op.id}`}
                    >
                      {op.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No operations warning */}
            {linkedOperations.length === 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Nenhuma operação vinculada
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex flex-col gap-1">
              {onTest && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onTest(account.id)}
                  title="Testar Conexão"
                  data-testid={`button-test-${account.id}`}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(account.id)}
                  title="Editar"
                  data-testid={`button-edit-${account.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(account.id)}
                  title="Excluir"
                  data-testid={`button-delete-${account.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
