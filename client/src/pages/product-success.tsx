import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, ArrowLeft, Clock } from "lucide-react";

interface ProductData {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  price: number;
  costPrice: number;
  initialStock: number;
  lowStock: number;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ProductSuccess() {
  const [, setLocation] = useLocation();
  const [showAnimation, setShowAnimation] = useState(true);
  const [productData, setProductData] = useState<ProductData | null>(null);

  useEffect(() => {
    // Recupera dados do produto do sessionStorage
    const savedProduct = sessionStorage.getItem('createdProduct');
    if (savedProduct) {
      setProductData(JSON.parse(savedProduct));
      sessionStorage.removeItem('createdProduct');
    }

    // Mostra animação por 3 segundos
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Se não há dados do produto, redireciona
  useEffect(() => {
    if (!showAnimation && !productData) {
      setLocation('/supplier');
    }
  }, [showAnimation, productData, setLocation]);

  if (!showAnimation && !productData) {
    return null;
  }

  // Animação de sucesso
  if (showAnimation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="h-12 w-12 text-white animate-bounce" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-green-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white animate-fade-in">
              Produto Salvo com Sucesso!
            </h1>
            <p className="text-gray-300 animate-fade-in-delay">
              Redirecionando para o resumo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de resumo do produto
  return (
    <div className="container mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/supplier')}
          className="flex items-center gap-2 mb-4"
          style={{ marginTop: '-20px' }}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Dashboard
        </Button>
        
        <div style={{ marginTop: '10px' }}>
          <h1 className="text-2xl font-bold">Produto Criado com Sucesso</h1>
          <p className="text-muted-foreground">
            Resumo do produto criado e status de verificação
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card className="border-yellow-700 bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Clock className="h-5 w-5" />
              Status de Verificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-yellow-900/50 text-yellow-400 border-yellow-700">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
              <span className="text-sm text-gray-300">
                Aguardando verificação
              </span>
            </div>
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="font-medium text-gray-200 mb-2">
                Próximos Passos:
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• O produto foi enviado para análise do time N1</li>
                <li>• Verificação de conformidade e qualidade</li>
                <li>• Você será notificado quando aprovado</li>
                <li>• Após aprovação, o produto ficará disponível para vinculação</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Product Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Resumo do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productData?.imageUrl && (
              <div className="w-32 h-32 mx-auto mb-4">
                <img
                  src={productData.imageUrl}
                  alt={productData.name}
                  className="w-full h-full object-cover rounded border"
                />
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-400">SKU</label>
                <p className="text-gray-200">{productData?.sku}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Nome</label>
                <p className="text-gray-200">{productData?.name}</p>
              </div>
              
              {productData?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Descrição</label>
                  <p className="text-gray-200">{productData.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Tipo</label>
                  <p className="text-gray-200 capitalize">{productData?.type}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">Preço B2B</label>
                  <p className="text-gray-200">€{productData?.price.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Custo de Produção</label>
                  <p className="text-gray-200">€{productData?.costPrice.toFixed(2)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">Estoque Inicial</label>
                  <p className="text-gray-200">{productData?.initialStock}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <Button
          variant="outline"
          onClick={() => setLocation('/supplier/create-product')}
          data-testid="button-create-another"
        >
          Criar Outro Produto
        </Button>
        <Button
          onClick={() => setLocation('/supplier')}
          className="text-white [&>svg]:text-white"
          data-testid="button-back-to-dashboard"
        >
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}