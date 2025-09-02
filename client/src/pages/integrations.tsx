import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EuropeanFulfillmentPanel } from "@/components/integration/european-fulfillment-panel";
import { ShopifyIntegration } from "@/components/integrations/shopify-integration";
import { Settings, CheckCircle, AlertCircle, Package, Truck, Globe, Store } from "lucide-react";
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
    style={{ width: size || 36, height: size || 36 }}
  />
);

export default function Integrations() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { selectedOperation } = useCurrentOperation();

  // Debug logs
  console.log("🔍 Component render - selectedOperation:", selectedOperation);

  // Usar a operação atual do hook
  const operationId = selectedOperation;

  // State for integration data
  const [shopifyData, setShopifyData] = useState(null);
  const [europeanFulfillmentData, setEuropeanFulfillmentData] = useState(null);

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

  // Fetch European Fulfillment integration when operation changes
  useEffect(() => {
    const fetchEuropeanFulfillmentIntegration = async () => {
      if (!selectedOperation) {
        setEuropeanFulfillmentData(null);
        return;
      }
      
      console.log("🔄 Fetching European Fulfillment integration for operation:", selectedOperation);
      try {
        const response = await authenticatedApiRequest("GET", `/api/integrations/european-fulfillment/test?operationId=${selectedOperation}`);
        if (response.status === 404 || !response.ok) {
          console.log("📋 No European Fulfillment integration found for", selectedOperation);
          setEuropeanFulfillmentData(null);
          return;
        }
        const data = await response.json();
        console.log("📋 European Fulfillment integration found for", selectedOperation, ":", data?.connected);
        setEuropeanFulfillmentData(data?.connected ? { status: 'active' } : null);
      } catch (error) {
        console.error("❌ Error fetching European Fulfillment integration:", error);
        setEuropeanFulfillmentData(null);
      }
    };

    fetchEuropeanFulfillmentIntegration();
  }, [selectedOperation]);

  const shopifyIntegration = shopifyData;
  const europeanFulfillmentIntegration = europeanFulfillmentData;

  // Determinar status real da integração Shopify
  const getShopifyStatus = () => {
    if (!shopifyIntegration) return "pending";
    return shopifyIntegration.status || "pending";
  };

  // Determinar status real da integração European Fulfillment
  const getEuropeanFulfillmentStatus = () => {
    if (!europeanFulfillmentIntegration) return "pending";
    return europeanFulfillmentIntegration.status || "pending";
  };

  // Integrações de E-commerce
  const ecommerceIntegrations = [
    {
      id: "shopify",
      name: "Shopify Store",
      status: getShopifyStatus(),
      description: "Integração com loja Shopify para importar pedidos e produtos",
      icon: ShopifyIcon,
      color: "green",
      hasPanel: true,
    },
  ];

  // Provedores de Fulfillment
  const fulfillmentIntegrations = [
    {
      id: "european-fulfillment",
      name: "European Fulfillment Center",
      status: getEuropeanFulfillmentStatus(),
      description: "Centro de fulfillment para Europa com API completa",
      icon: Package,
      color: "blue",
      hasPanel: true,
    },
    {
      id: "wapi",
      name: "WAPI",
      status: "coming-soon",
      description: "Em breve - Integração WhatsApp Business",
      icon: Globe,
      color: "green",
      hasPanel: false,
    },
  ];


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

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Integrações" 
        subtitle="Configure e gerencie as integrações com plataformas e serviços" 
      />
      
      {/* Integrações de E-commerce */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Store className="text-green-400" size={20} />
          </div>
          <h3 className="text-xl font-semibold text-white">Plataformas de E-commerce</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ecommerceIntegrations.map((integration) => {
            const statusInfo = getStatusInfo(integration.status);
            const IconComponent = integration.icon;
            
            return (
              <div key={integration.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid={`integration-${integration.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-16 h-16 rounded-lg bg-${integration.color}-500/20 flex items-center justify-center`}>
                      <IconComponent className={`text-${integration.color}-400`} size={integration.id === 'shopify' ? 40 : 20} />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{integration.name}</h4>
                      <p className="text-gray-400 text-sm">{integration.description}</p>
                    </div>
                  </div>
                  
                  {getStatusIcon(integration.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                  
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
                          <IconComponent className={`text-${integration.color}-400`} size={20} />
                          <span>{integration.name}</span>
                        </DialogTitle>
                      </DialogHeader>
                      {integration.id === "shopify" && <ShopifyIntegration />}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provedores de Fulfillment */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Truck className="text-blue-400" size={20} />
          </div>
          <h3 className="text-xl font-semibold text-white">Provedores de Fulfillment</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fulfillmentIntegrations.map((integration) => {
            const statusInfo = getStatusInfo(integration.status);
            const IconComponent = integration.icon;
            
            return (
              <div key={integration.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid={`integration-${integration.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-16 h-16 rounded-lg bg-${integration.color}-500/20 flex items-center justify-center`}>
                      <IconComponent className={`text-${integration.color}-400`} size={20} />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{integration.name}</h4>
                      <p className="text-gray-400 text-sm">{integration.description}</p>
                    </div>
                  </div>
                  
                  {getStatusIcon(integration.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                  
                  {integration.hasPanel ? (
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
                            <IconComponent className={`text-${integration.color}-400`} size={20} />
                            <span>{integration.name}</span>
                          </DialogTitle>
                        </DialogHeader>
                        {integration.id === "european-fulfillment" && <EuropeanFulfillmentPanel />}
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 cursor-not-allowed"
                      disabled
                      data-testid={`button-configure-${integration.id}`}
                    >
                      <Settings size={16} className="mr-2" />
                      Em Breve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      
      {/* Status das Integrações */}
      <div className="glassmorphism rounded-2xl p-6">
        <h4 className="text-white font-medium mb-4 flex items-center space-x-2">
          <Package className="text-blue-400" size={18} />
          <span>Status das Integrações</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {[...ecommerceIntegrations, ...fulfillmentIntegrations].filter(i => i.status === "active").length}
            </div>
            <div className="text-sm text-gray-400">Ativas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {[...ecommerceIntegrations, ...fulfillmentIntegrations].filter(i => i.status === "pending").length}
            </div>
            <div className="text-sm text-gray-400">Pendentes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {ecommerceIntegrations.length + fulfillmentIntegrations.length}
            </div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
