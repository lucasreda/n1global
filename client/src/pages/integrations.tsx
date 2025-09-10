import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MultiProviderPanel } from "@/components/integration/multi-provider-panel";
import { ShopifyIntegration } from "@/components/integrations/shopify-integration";
import { Settings, CheckCircle, AlertCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import shopifyIcon from "@assets/shopify_1756413996883.webp";

// Componente customizado para o ícone do Shopify
const ShopifyIcon = ({ className, size }: { className?: string; size?: number }) => (
  <img 
    src={shopifyIcon} 
    alt="Shopify" 
    className={`${className} object-contain`}
    style={{ width: size || 30, height: size || 30 }}
  />
);

export default function Integrations() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { selectedOperation } = useCurrentOperation();
  const [shopifyData, setShopifyData] = useState(null);

  console.log("🔍 Component render - selectedOperation:", selectedOperation);

  // Fetch shopify integration when operation changes
  useEffect(() => {
    const fetchShopifyIntegration = async () => {
      if (!selectedOperation) {
        setShopifyData(null);
        return;
      }
      
      console.log("🔄 Fetching Shopify integration for operation:", selectedOperation);
      try {
        const response = await authenticatedApiRequest("GET", `/api/integrations/shopify?operationId=${selectedOperation}`);
        if (response.status === 404) {
          console.log("📋 No Shopify integration found for", selectedOperation);
          setShopifyData(null);
          return;
        }
        const data = await response.json();
        console.log("📋 Shopify integration found for", selectedOperation, ":", data?.id);
        setShopifyData(data);
      } catch (error) {
        console.error("❌ Error fetching Shopify integration:", error);
        setShopifyData(null);
      }
    };

    fetchShopifyIntegration();
  }, [selectedOperation]);

  // Determinar status real da integração Shopify
  const getShopifyStatus = () => {
    if (!shopifyData) return "pending";
    return (shopifyData as any).status || "pending";
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { text: "Ativo", color: "text-green-400", bgColor: "bg-green-500/20" };
      case "connected":
        return { text: "Conectado", color: "text-green-400", bgColor: "bg-green-500/20" };
      case "coming-soon":
        return { text: "Em breve", color: "text-blue-400", bgColor: "bg-blue-500/20" };
      case "pending":
        return { text: "Pendente", color: "text-yellow-400", bgColor: "bg-yellow-500/20" };
      default:
        return { text: "Inativo", color: "text-gray-400", bgColor: "bg-gray-500/20" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "connected":
        return <CheckCircle className="text-green-400" size={20} />;
      case "coming-soon":
        return <AlertCircle className="text-blue-400" size={20} />;
      default:
        return <AlertCircle className="text-yellow-400" size={20} />;
    }
  };

  // Integrações de E-commerce
  const ecommerceIntegrations = [
    {
      id: "shopify",
      name: "Shopify",
      status: getShopifyStatus(),
      description: "Integração com loja Shopify para importar pedidos e produtos",
      icon: ShopifyIcon,
      color: "green",
      hasPanel: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Título da Página */}
      <div className="px-6 pt-6">
        <h1 className="text-white font-semibold mb-2" style={{ fontSize: '22px' }}>Integrações</h1>
        <p className="text-gray-400 text-sm">Configure e gerencie as integrações com plataformas e serviços</p>
      </div>
      
      {/* Integrações de E-commerce */}
      <div className="p-6">
        {/* Título da Seção */}
        <div className="flex items-center space-x-3 mb-6">
          <Store className="text-blue-400" size={20} />
          <h2 className="text-white font-semibold" style={{ fontSize: '20px' }}>Plataformas</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ecommerceIntegrations.map((integration) => {
            const IconComponent = integration.icon;
            
            return (
              <div key={integration.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid={`integration-${integration.id}`}>
                <div className="flex items-center space-x-3 mb-4">
                  <IconComponent className={`text-${integration.color}-400`} size={30} />
                  <div>
                    <h4 className="text-white font-medium">{integration.name}</h4>
                    <p className="text-gray-400 text-sm">{integration.description}</p>
                  </div>
                </div>
                
                <Dialog open={openDialog === integration.id} onOpenChange={(open) => setOpenDialog(open ? integration.id : null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                      data-testid={`button-configure-${integration.id}`}
                    >
                      <Settings size={16} className="mr-2" />
                      Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glassmorphism border-0 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white flex items-center space-x-2">
                        <IconComponent className={`text-${integration.color}-400`} size={30} />
                        <span>{integration.name}</span>
                      </DialogTitle>
                    </DialogHeader>
                    {integration.id === "shopify" && <ShopifyIntegration />}
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provedores de Fulfillment - Multi-Provider */}
      <MultiProviderPanel />
    </div>
  );
}